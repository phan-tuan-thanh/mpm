import { IsEnum } from 'class-validator';
import { ProjectRole } from '@mpm/shared-types';

export class UpdateMemberRoleDto {
  @IsEnum(['Scrum_Master', 'Product_Owner', 'Developer', 'QA', 'Stakeholder'], {
    message: 'Invalid project role.',
  })
  projectRole!: ProjectRole;
}
