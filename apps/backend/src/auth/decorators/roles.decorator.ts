import { SetMetadata } from '@nestjs/common';
import type { SystemRole } from '@mpm/shared-types';

/**
 * Metadata key cho @Roles() decorator
 * RolesGuard sử dụng key này qua Reflector để xác định required system roles
 */
export const ROLES_KEY = 'roles';

/**
 * @Roles() decorator — yêu cầu System Role cụ thể để truy cập endpoint
 *
 * Guard sẽ kiểm tra user.systemRole có nằm trong danh sách roles được chỉ định.
 * Nếu không đủ quyền → HTTP 403 với errorCode INSUFFICIENT_ROLE.
 *
 * Decorator này chạy cùng RolesGuard, SAU JwtAuthGuard (request.user đã được populate).
 *
 * @param roles - Danh sách SystemRole được phép truy cập endpoint
 *
 * @example
 * ```typescript
 * @Roles('Admin')
 * @Get('admin/users')
 * listUsers() { ... }
 * ```
 *
 * @example
 * ```typescript
 * @Roles('Admin', 'User')
 * @Get('dashboard')
 * getDashboard() { ... }
 * ```
 */
export const Roles = (...roles: SystemRole[]) => SetMetadata(ROLES_KEY, roles);
