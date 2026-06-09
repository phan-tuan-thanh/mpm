import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  VersionColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import type { ModuleLifecycleStatus } from '@mpm/shared-types';
import { MODULE_LIFECYCLE_STATUSES } from '@mpm/shared-types';
import { Project } from '../../project/entities/project.entity';
import { User } from '../../auth/entities/user.entity';

export type ModuleScope = 'workspace' | 'project';

@Entity('modules')
export class Module {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 10 })
  scope!: ModuleScope;

  @Column({ name: 'workspace_id', type: 'uuid', nullable: true })
  workspaceId!: string | null;

  @Column({ name: 'project_id', type: 'uuid', nullable: true })
  projectId!: string | null;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'jsonb', nullable: true })
  description!: Record<string, any> | null;

  @Column({ name: 'description_plain', type: 'text', nullable: true })
  descriptionPlain!: string | null;

  @Column({
    type: 'enum',
    enum: MODULE_LIFECYCLE_STATUSES,
    enumName: 'module_lifecycle_status_enum',
    default: 'planning',
  })
  status!: ModuleLifecycleStatus;

  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate!: string | null;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate!: string | null;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy!: string;

  @VersionColumn()
  version!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  // ─── Relations ──────────────────────────────────────────────────────────

  @ManyToOne(() => Project, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'project_id' })
  project!: Project | null;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by' })
  creator!: User;
}
