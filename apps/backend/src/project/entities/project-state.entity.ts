import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Project } from './project.entity';
import { Task } from '../../task/entities/task.entity';
import { WorkspaceStateTemplate } from './workspace-state-template.entity';
import { StateGroup } from '@mpm/shared-types';

@Entity('project_states')
export class ProjectState {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'project_id', type: 'uuid' })
  projectId!: string;

  @Column({ type: 'varchar', length: 50 })
  name!: string;

  @Column({ type: 'char', length: 7, default: '#6B7280' })
  color!: string;

  @Column({
    type: 'enum',
    enum: ['backlog', 'unstarted', 'started', 'completed', 'cancelled'],
    name: 'group',
  })
  group!: StateGroup;

  @Column({ name: 'is_default', type: 'boolean', default: false })
  isDefault!: boolean;

  @Column({ type: 'smallint', default: 0 })
  order!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @Column({ name: 'template_id', type: 'uuid', nullable: true })
  templateId!: string | null;

  // Relations
  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project!: Project;

  @ManyToOne(() => WorkspaceStateTemplate, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'template_id' })
  template!: WorkspaceStateTemplate | null;

  @OneToMany(() => Task, (task) => task.state)
  tasks!: Task[];
}
