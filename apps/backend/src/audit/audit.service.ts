import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';
import type { AuditQueryDto } from './dto/audit-query.dto';
import type { AuthEventType } from '../auth/constants/auth-events';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Response format cho paginated audit log query
 */
export interface AuditLogPaginatedResponse {
  data: AuditLog[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Audit Service — ghi và truy vấn audit log
 *
 * Chức năng:
 * - `log()`: Non-blocking write to PostgreSQL (fire-and-forget)
 *   - Nếu write thất bại → ghi lỗi vào file system, không block operation gốc
 * - `findAll()`: Query audit logs với filters và pagination
 *
 * Design decisions:
 * - log() không throw exception — caller không bao giờ bị block
 * - Sử dụng Promise.catch() thay vì try/catch để đảm bảo non-blocking
 * - Fallback logging ghi vào file `audit-errors.log` trong thư mục logs/
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  /** Đường dẫn file fallback khi DB write thất bại */
  private readonly fallbackLogPath: string;

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {
    // Tạo thư mục logs nếu chưa tồn tại
    const logsDir = path.resolve(process.cwd(), 'logs');
    try {
      fs.mkdirSync(logsDir, { recursive: true });
    } catch {
      // Nếu không tạo được thư mục, sẽ fallback sang Logger
    }
    this.fallbackLogPath = path.join(logsDir, 'audit-errors.log');
  }

  /**
   * Ghi audit log — NON-BLOCKING (fire-and-forget)
   *
   * Method này KHÔNG throw exception và KHÔNG block caller.
   * Nếu write thất bại, lỗi được ghi vào file system.
   *
   * @param eventType - Loại sự kiện (từ AuthEvent constants)
   * @param userId - ID người dùng (null nếu chưa xác thực, vd: login_failed)
   * @param ipAddress - Địa chỉ IP của client
   * @param userAgent - User-Agent header
   * @param metadata - Thông tin bổ sung (project_id, target_user_id, etc.)
   */
  log(
    eventType: AuthEventType,
    userId: string | null,
    ipAddress: string,
    userAgent: string,
    metadata?: Record<string, unknown> | null,
  ): void {
    // Fire-and-forget: tạo Promise nhưng không await
    const auditEntry = this.auditLogRepository.create({
      eventType,
      userId,
      ipAddress,
      userAgent,
      timestamp: new Date(),
      metadata: metadata ?? null,
    });

    // Non-blocking write — Promise chạy background
    this.auditLogRepository
      .save(auditEntry)
      .catch((error: unknown) => {
        // Không throw — ghi lỗi vào file system và Logger
        this.handleWriteFailure(eventType, userId, ipAddress, userAgent, metadata, error);
      });
  }

  /**
   * Truy vấn audit logs với filters và pagination
   *
   * Filters:
   * - userId: lọc theo user_id
   * - eventType: lọc theo event_type
   * - startDate/endDate: lọc theo khoảng thời gian
   *
   * Pagination:
   * - page: số trang (default 1)
   * - pageSize: số records mỗi trang (default 20, max 100)
   *
   * Kết quả sắp xếp theo timestamp giảm dần (mới nhất trước).
   * Trả về empty array với total=0 khi filter không match.
   *
   * @param query - DTO chứa filter và pagination params
   * @returns Paginated response: { data, total, page, pageSize }
   */
  async findAll(query: AuditQueryDto): Promise<AuditLogPaginatedResponse> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    // Xây dựng where conditions
    const where: Record<string, unknown> = {};

    if (query.userId) {
      where.userId = query.userId;
    }

    if (query.eventType) {
      where.eventType = query.eventType;
    }

    // Time range filter
    if (query.startDate && query.endDate) {
      where.timestamp = Between(new Date(query.startDate), new Date(query.endDate));
    } else if (query.startDate) {
      where.timestamp = MoreThanOrEqual(new Date(query.startDate));
    } else if (query.endDate) {
      where.timestamp = LessThanOrEqual(new Date(query.endDate));
    }

    const [data, total] = await this.auditLogRepository.findAndCount({
      where,
      order: { timestamp: 'DESC' },
      skip,
      take: pageSize,
    });

    return {
      data,
      total,
      page,
      pageSize,
    };
  }

  // ─── Private Helpers ────────────────────────────────────────────────────────

  /**
   * Xử lý khi write audit log thất bại
   *
   * Ghi thông tin lỗi vào:
   * 1. NestJS Logger (stderr)
   * 2. File system (audit-errors.log)
   *
   * KHÔNG throw exception — đảm bảo operation gốc không bị ảnh hưởng.
   */
  private handleWriteFailure(
    eventType: AuthEventType,
    userId: string | null,
    ipAddress: string,
    userAgent: string,
    metadata: Record<string, unknown> | null | undefined,
    error: unknown,
  ): void {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Log qua NestJS Logger
    this.logger.error(
      `Failed to write audit log: ${errorMessage}`,
      error instanceof Error ? error.stack : undefined,
    );

    // Ghi vào file system để không mất dữ liệu audit
    const fallbackEntry = {
      timestamp: new Date().toISOString(),
      eventType,
      userId,
      ipAddress,
      userAgent,
      metadata: metadata ?? null,
      error: errorMessage,
    };

    try {
      fs.appendFileSync(
        this.fallbackLogPath,
        JSON.stringify(fallbackEntry) + '\n',
        'utf-8',
      );
    } catch (fsError: unknown) {
      // Nếu cả file system cũng thất bại, chỉ log qua Logger
      const fsErrorMessage = fsError instanceof Error ? fsError.message : String(fsError);
      this.logger.error(
        `Failed to write audit fallback log to file system: ${fsErrorMessage}`,
      );
    }
  }
}
