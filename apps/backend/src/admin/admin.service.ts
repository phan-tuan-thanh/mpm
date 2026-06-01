import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { SystemRole } from '@mpm/shared-types';
import { User } from '../auth/entities/user.entity';
import { SessionService } from '../auth/session.service';
import { AuditService } from '../audit/audit.service';
import { AuthEvent } from '../auth/constants/auth-events';

/**
 * Response format cho user list endpoint
 */
export interface AdminUserResponse {
  id: string;
  email: string;
  displayName: string;
  systemRole: SystemRole;
  isActive: boolean;
  createdAt: Date;
}

/**
 * Admin Service — business logic cho quản trị user
 *
 * Chức năng:
 * - Liệt kê tất cả users
 * - Thay đổi system role (với last-admin protection)
 * - Disable account (full session invalidation)
 */
@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly sessionService: SessionService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Liệt kê tất cả users trong hệ thống
   *
   * Trả về thông tin cơ bản: id, email, displayName, systemRole, isActive, createdAt
   */
  async listUsers(): Promise<AdminUserResponse[]> {
    const users = await this.userRepository.find({
      select: ['id', 'email', 'displayName', 'systemRole', 'isActive', 'createdAt'],
      order: { createdAt: 'DESC' },
    });

    return users.map((user) => ({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      systemRole: user.systemRole,
      isActive: user.isActive,
      createdAt: user.createdAt,
    }));
  }

  /**
   * Thay đổi system role của user
   *
   * Flow:
   * 1. Tìm user theo ID
   * 2. Kiểm tra last-admin protection
   * 3. Cập nhật role trong database
   * 4. Thu hồi tất cả sessions (buộc re-login với claims mới)
   * 5. Ghi audit log
   *
   * @param targetUserId - ID user cần thay đổi role
   * @param newRole - Role mới
   * @param adminId - ID admin thực hiện thao tác
   * @param ipAddress - IP address của admin
   * @param userAgent - User-Agent của admin
   */
  async changeRole(
    targetUserId: string,
    newRole: SystemRole,
    adminId: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<AdminUserResponse> {
    // Bước 1: Tìm user
    const targetUser = await this.userRepository.findOne({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      throw new NotFoundException({
        statusCode: 404,
        error: 'Not Found',
        message: `User with ID ${targetUserId} not found`,
        errorCode: 'USER_NOT_FOUND',
        timestamp: new Date().toISOString(),
      });
    }

    const oldRole = targetUser.systemRole;

    // Nếu role không thay đổi, trả về user hiện tại
    if (oldRole === newRole) {
      return this.toAdminUserResponse(targetUser);
    }

    // Bước 2: Last-admin protection
    // Chỉ kiểm tra khi đang hạ role từ Admin xuống User
    if (oldRole === 'Admin' && newRole !== 'Admin') {
      await this.ensureNotLastAdmin(targetUserId);
    }

    // Bước 3: Cập nhật role trong database
    targetUser.systemRole = newRole;
    await this.userRepository.save(targetUser);

    // Bước 4: Thu hồi tất cả sessions — buộc user re-login với claims mới
    await this.sessionService.revokeAllSessions(targetUserId);

    // Bước 5: Ghi audit log
    this.auditService.log(
      AuthEvent.SYSTEM_ROLE_CHANGED,
      adminId,
      ipAddress,
      userAgent,
      {
        targetUserId,
        oldRole,
        newRole,
      },
    );

    this.logger.log(
      `System role changed: user ${targetUserId} from ${oldRole} to ${newRole} by admin ${adminId}`,
    );

    return this.toAdminUserResponse(targetUser);
  }

  /**
   * Disable account — vô hiệu hóa tài khoản user
   *
   * Flow:
   * 1. Tìm user theo ID
   * 2. Kiểm tra last-admin protection (không cho disable admin cuối cùng)
   * 3. Set isActive = false
   * 4. Full session invalidation: revokeAll + forcedLogout
   * 5. Ghi audit log
   *
   * @param targetUserId - ID user cần disable
   * @param adminId - ID admin thực hiện thao tác
   * @param ipAddress - IP address của admin
   * @param userAgent - User-Agent của admin
   */
  async disableAccount(
    targetUserId: string,
    adminId: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<AdminUserResponse> {
    // Bước 1: Tìm user
    const targetUser = await this.userRepository.findOne({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      throw new NotFoundException({
        statusCode: 404,
        error: 'Not Found',
        message: `User with ID ${targetUserId} not found`,
        errorCode: 'USER_NOT_FOUND',
        timestamp: new Date().toISOString(),
      });
    }

    // Nếu đã disabled, trả về user hiện tại
    if (!targetUser.isActive) {
      return this.toAdminUserResponse(targetUser);
    }

    // Bước 2: Last-admin protection — không cho disable admin cuối cùng
    if (targetUser.systemRole === 'Admin') {
      await this.ensureNotLastAdmin(targetUserId);
    }

    // Bước 3: Set isActive = false
    targetUser.isActive = false;
    await this.userRepository.save(targetUser);

    // Bước 4: Full session invalidation
    await this.sessionService.revokeAllSessions(targetUserId);
    await this.sessionService.addToForcedLogout(targetUserId);

    // Bước 5: Ghi audit log
    this.auditService.log(
      AuthEvent.ACCOUNT_DISABLED,
      adminId,
      ipAddress,
      userAgent,
      {
        targetUserId,
        targetEmail: targetUser.email,
      },
    );

    this.logger.log(
      `Account disabled: user ${targetUserId} (${targetUser.email}) by admin ${adminId}`,
    );

    return this.toAdminUserResponse(targetUser);
  }

  // ─── Private Helpers ────────────────────────────────────────────────────────

  /**
   * Kiểm tra last-admin protection
   *
   * Đếm số Admin active trong hệ thống. Nếu chỉ còn 1 Admin
   * và đó chính là user đang bị thay đổi → reject.
   */
  private async ensureNotLastAdmin(targetUserId: string): Promise<void> {
    const adminCount = await this.userRepository.count({
      where: { systemRole: 'Admin' as SystemRole, isActive: true },
    });

    if (adminCount <= 1) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Cannot demote or disable the last admin. The system must have at least one active admin.',
        errorCode: 'LAST_ADMIN_PROTECTION',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Convert User entity sang AdminUserResponse
   */
  private toAdminUserResponse(user: User): AdminUserResponse {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      systemRole: user.systemRole,
      isActive: user.isActive,
      createdAt: user.createdAt,
    };
  }
}
