import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import type { SystemRole } from '@mpm/shared-types';
import { ROLES_KEY } from '../decorators/roles.decorator';
import type { RequestUser } from '../decorators/current-user.decorator';

/**
 * Roles Guard — kiểm tra System Role cho protected endpoints
 *
 * Flow:
 * 1. Đọc metadata @Roles() từ handler/class qua Reflector
 * 2. Nếu không có metadata → cho qua (endpoint không yêu cầu role cụ thể)
 * 3. Extract user từ request (đã được JwtAuthGuard populate)
 * 4. Kiểm tra user.systemRole có nằm trong required roles
 * 5. Nếu không đủ quyền → HTTP 403 với errorCode INSUFFICIENT_ROLE + ghi audit log
 *
 * Guard này PHẢI chạy SAU JwtAuthGuard để đảm bảo request.user đã tồn tại.
 *
 * @example
 * ```typescript
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @Roles('Admin')
 * @Get('admin/users')
 * listUsers() { ... }
 * ```
 */
@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Bước 1: Đọc required roles từ metadata
    const requiredRoles = this.reflector.getAllAndOverride<SystemRole[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Bước 2: Nếu không có @Roles() decorator → cho qua
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // Bước 3: Extract user từ request context
    const request = context.switchToHttp().getRequest<Request & { user?: RequestUser }>();
    const user = request.user;

    if (!user) {
      // Trường hợp này không nên xảy ra vì JwtAuthGuard chạy trước
      // Nhưng phòng trường hợp guard order bị sai
      this.logger.error('RolesGuard: request.user is undefined — JwtAuthGuard may not have run');
      throw new ForbiddenException({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Access denied: unable to determine user role',
        errorCode: 'INSUFFICIENT_ROLE',
        timestamp: new Date().toISOString(),
      });
    }

    // Bước 4: Kiểm tra user.systemRole có nằm trong required roles
    const hasRole = requiredRoles.includes(user.systemRole);

    if (!hasRole) {
      // Ghi Audit Log khi access bị denied (dùng Logger, AuditService sẽ wire sau)
      this.logger.warn(
        `Access denied: user ${user.id} (role=${user.systemRole}) attempted to access endpoint requiring roles [${requiredRoles.join(', ')}]`,
      );

      throw new ForbiddenException({
        statusCode: 403,
        error: 'Forbidden',
        message: `Access denied: requires one of the following roles: ${requiredRoles.join(', ')}`,
        errorCode: 'INSUFFICIENT_ROLE',
        timestamp: new Date().toISOString(),
      });
    }

    return true;
  }
}
