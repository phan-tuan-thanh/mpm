import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, RequestUser } from '../auth/decorators/current-user.decorator';
import { AdminService, AdminUserResponse } from './admin.service';
import { ChangeRoleDto } from './dto/change-role.dto';

/**
 * Admin Controller — endpoints quản trị user
 *
 * Tất cả endpoints yêu cầu System Role = Admin.
 * Guard chain: JwtAuthGuard (global) → RolesGuard → Handler
 *
 * Endpoints:
 * - GET  /api/admin/users          — Liệt kê tất cả users
 * - PATCH /api/admin/users/:id/role — Thay đổi system role
 * - POST /api/admin/users/:id/disable — Disable account
 */
@Controller('api/admin')
@UseGuards(RolesGuard)
@Roles('Admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  /**
   * GET /api/admin/users — Liệt kê tất cả users
   *
   * Trả về: id, email, displayName, systemRole, isActive, createdAt
   */
  @Get('users')
  async listUsers(): Promise<AdminUserResponse[]> {
    return this.adminService.listUsers();
  }

  /**
   * PATCH /api/admin/users/:id/role — Thay đổi system role
   *
   * Body: { role: 'Admin' | 'User' }
   *
   * Side effects:
   * - Cập nhật role trong database
   * - Thu hồi tất cả sessions (buộc re-login)
   * - Ghi audit log
   *
   * Errors:
   * - 404: User not found
   * - 400: Last admin protection
   */
  @Patch('users/:id/role')
  async changeRole(
    @Param('id', ParseUUIDPipe) targetUserId: string,
    @Body() dto: ChangeRoleDto,
    @CurrentUser() admin: RequestUser,
    @Req() req: Request,
  ): Promise<AdminUserResponse> {
    const ipAddress = this.extractIpAddress(req);
    const userAgent = req.headers['user-agent'] ?? 'unknown';

    return this.adminService.changeRole(
      targetUserId,
      dto.role,
      admin.id,
      ipAddress,
      userAgent,
    );
  }

  /**
   * POST /api/admin/users/:id/disable — Disable account
   */
  @Post('users/:id/disable')
  async disableAccountPost(
    @Param('id', ParseUUIDPipe) targetUserId: string,
    @CurrentUser() admin: RequestUser,
    @Req() req: Request,
  ): Promise<AdminUserResponse> {
    return this.disableAccount(targetUserId, admin, req);
  }

  /**
   * PATCH /api/admin/users/:id/disable — Disable account
   */
  @Patch('users/:id/disable')
  async disableAccount(
    @Param('id', ParseUUIDPipe) targetUserId: string,
    @CurrentUser() admin: RequestUser,
    @Req() req: Request,
  ): Promise<AdminUserResponse> {
    const ipAddress = this.extractIpAddress(req);
    const userAgent = req.headers['user-agent'] ?? 'unknown';

    return this.adminService.disableAccount(
      targetUserId,
      admin.id,
      ipAddress,
      userAgent,
    );
  }

  /**
   * POST /api/admin/users/:id/enable — Enable account
   */
  @Post('users/:id/enable')
  async enableAccountPost(
    @Param('id', ParseUUIDPipe) targetUserId: string,
    @CurrentUser() admin: RequestUser,
    @Req() req: Request,
  ): Promise<AdminUserResponse> {
    return this.enableAccount(targetUserId, admin, req);
  }

  /**
   * PATCH /api/admin/users/:id/enable — Enable account
   */
  @Patch('users/:id/enable')
  async enableAccount(
    @Param('id', ParseUUIDPipe) targetUserId: string,
    @CurrentUser() admin: RequestUser,
    @Req() req: Request,
  ): Promise<AdminUserResponse> {
    const ipAddress = this.extractIpAddress(req);
    const userAgent = req.headers['user-agent'] ?? 'unknown';

    return this.adminService.enableAccount(
      targetUserId,
      admin.id,
      ipAddress,
      userAgent,
    );
  }

  // ─── Private Helpers ────────────────────────────────────────────────────────

  /**
   * Extract IP address từ request
   * Ưu tiên X-Forwarded-For header (khi đứng sau reverse proxy)
   */
  private extractIpAddress(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return req.ip ?? req.socket.remoteAddress ?? 'unknown';
  }
}
