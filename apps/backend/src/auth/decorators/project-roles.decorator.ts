import { SetMetadata } from '@nestjs/common';
import type { ProjectRole } from '@mpm/shared-types';

/**
 * Metadata key cho Project Roles decorator
 * Sử dụng bởi ProjectRolesGuard để đọc danh sách roles yêu cầu
 */
export const PROJECT_ROLES_KEY = 'projectRoles';

/**
 * @ProjectRoles() decorator — chỉ định Project Roles cần thiết để truy cập endpoint
 *
 * Guard sẽ kiểm tra user có ít nhất một trong các roles được chỉ định
 * trong project tương ứng (extract projectId từ route params hoặc body).
 *
 * Admin (systemRole) bypass kiểm tra project role.
 *
 * @example
 * ```typescript
 * @Post()
 * @ProjectRoles('Scrum_Master', 'Product_Owner')
 * createSprint(@Param('projectId') projectId: string) {
 *   // Chỉ Scrum_Master hoặc Product_Owner trong project mới truy cập được
 * }
 * ```
 */
export const ProjectRoles = (...roles: ProjectRole[]) =>
  SetMetadata(PROJECT_ROLES_KEY, roles);
