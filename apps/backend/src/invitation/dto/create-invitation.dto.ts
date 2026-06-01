import { IsEmail, IsIn, IsNotEmpty } from 'class-validator';
import type { ProjectRole } from '@mpm/shared-types';

/**
 * DTO cho tạo invitation mới
 *
 * Validate:
 * - email: phải là email hợp lệ
 * - projectRole: phải là một trong 5 project roles
 */
export class CreateInvitationDto {
  @IsEmail({}, { message: 'Email phải là địa chỉ email hợp lệ' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  email!: string;

  @IsIn(
    ['Scrum_Master', 'Product_Owner', 'Developer', 'QA', 'Stakeholder'],
    { message: 'Project role phải là một trong: Scrum_Master, Product_Owner, Developer, QA, Stakeholder' },
  )
  @IsNotEmpty({ message: 'Project role không được để trống' })
  projectRole!: ProjectRole;
}
