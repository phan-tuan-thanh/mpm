import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import type { JwtPayload } from '@mpm/shared-types';

/**
 * Thông tin user được gắn vào request bởi JWT Auth Guard
 *
 * Mapping từ JwtPayload: sub → id, giữ nguyên email, systemRole, projectRoles
 */
export interface RequestUser {
  /** User ID (UUID) — mapped từ JWT sub claim */
  id: string;
  /** Email người dùng */
  email: string;
  /** Vai trò cấp hệ thống */
  systemRole: JwtPayload['systemRole'];
  /** Danh sách vai trò trong các project */
  projectRoles: JwtPayload['projectRoles'];
}

/**
 * @CurrentUser() decorator — extract user info từ request context
 *
 * Sử dụng sau khi JWT Auth Guard đã xác thực và gắn user vào request.
 * Trả về RequestUser object hoặc undefined nếu endpoint là @Public().
 *
 * @example
 * ```typescript
 * @Get('profile')
 * getProfile(@CurrentUser() user: RequestUser) {
 *   return this.profileService.getProfile(user.id);
 * }
 * ```
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestUser | undefined => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return (request as Request & { user?: RequestUser }).user;
  },
);
