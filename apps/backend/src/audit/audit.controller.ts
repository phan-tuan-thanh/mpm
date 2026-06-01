import {
  Controller,
  Get,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuditService } from './audit.service';
import { AuditQueryDto } from './dto/audit-query.dto';
import type { AuditLogPaginatedResponse } from './audit.service';

/**
 * Audit Controller — endpoint quản trị cho audit logs
 *
 * Endpoints:
 * - GET /api/admin/audit-logs — truy vấn audit logs (Admin only)
 *
 * Bảo vệ bởi:
 * - JWT Auth Guard (global) — xác thực token
 * - Roles Guard — kiểm tra System Role = Admin
 *
 * Filters hỗ trợ:
 * - userId: lọc theo user_id (UUID)
 * - eventType: lọc theo event_type (audit_event_type_enum)
 * - startDate: lọc từ thời điểm (ISO 8601)
 * - endDate: lọc đến thời điểm (ISO 8601)
 *
 * Pagination:
 * - page: số trang (default 1)
 * - pageSize: số records mỗi trang (default 20, max 100)
 *
 * Response format:
 * { data: AuditLog[], total: number, page: number, pageSize: number }
 */
@Controller('api/admin/audit-logs')
@UseGuards(RolesGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  /**
   * GET /api/admin/audit-logs — Truy vấn audit logs
   *
   * Chỉ Admin mới được truy cập (HTTP 403 nếu không đủ quyền).
   * Trả về empty array với total=0 khi filter không match record nào.
   */
  @Get()
  @Roles('Admin')
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  async getAuditLogs(
    @Query() query: AuditQueryDto,
  ): Promise<AuditLogPaginatedResponse> {
    return this.auditService.findAll(query);
  }
}
