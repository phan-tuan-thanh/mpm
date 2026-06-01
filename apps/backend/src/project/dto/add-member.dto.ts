import { IsEmail, IsEnum } from 'class-validator';
import { ProjectRole } from '@mpm/shared-types';

export class AddMemberDto {
  @IsEmail()
  email!: string;

  @IsEnum(['Scrum_Master', 'Product_Owner', 'Developer', 'QA', 'Stakeholder'], {
    message: 'Invalid project role.',
  })
  projectRole!: ProjectRole;
}
