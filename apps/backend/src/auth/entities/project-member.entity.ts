import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import type { ProjectRole } from '@mpm/shared-types';
import { User } from './user.entity';
import { Project } from '../../project/entities/project.entity';

/**
 * ProjectMember entity — ánh xạ bảng `project_members`
 *
 * Liên kết user với project và gán project role.
 * Mỗi user chỉ có tối đa 1 role trong 1 project (unique constraint).
 */
@Entity('project_members')
export class ProjectMember {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'project_id', type: 'uuid' })
  projectId!: string;

  @Column({
    name: 'project_role',
    type: 'enum',
    enum: ['Scrum_Master', 'Product_Owner', 'Developer', 'QA', 'Stakeholder'],
  })
  projectRole!: ProjectRole;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @ManyToOne(() => User, (user) => user.projectMembers)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToOne(() => Project, (project) => project.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project!: Project;
}
