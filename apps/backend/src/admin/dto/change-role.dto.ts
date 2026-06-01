import { IsIn, IsNotEmpty, IsString } from 'class-validator';
import type { SystemRole } from '@mpm/shared-types';

/**
 * DTO cho endpoint PATCH /api/admin/users/:id/role
 *
 * Validate rằng role mới phải là một trong các SystemRole hợp lệ.
 */
export class ChangeRoleDto {
  /** System role mới cần gán cho user */
  @IsString()
  @IsNotEmpty()
  @IsIn(['Admin', 'User'], { message: 'role must be either Admin or User' })
  role!: SystemRole;
}
