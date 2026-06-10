import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  ManyToMany,
  JoinColumn,
  JoinTable,
} from 'typeorm';
import { Project } from '../../project/entities/project.entity';
import { ProjectState } from '../../project/entities/project-state.entity';
import { User } from '../../auth/entities/user.entity';
import { Label } from './label.entity';
import { Module } from './module.entity';
import { TaskAttachment } from './task-attachment.entity';
import { TaskLink } from './task-link.entity';
import { TaskRelation } from './task-relation.entity';
import { TaskActivity } from './task-activity.entity';

export type TaskType = 'epic' | 'story' | 'task' | 'subtask';
export type TaskPriority = 'urgent' | 'high' | 'medium' | 'low' | 'none';

@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'task_id', type: 'varchar', length: 20 })
  taskId!: string;

  @Column({ name: 'project_id', type: 'uuid' })
  projectId!: string;

  @Column({ type: 'enum', enum: ['epic', 'story', 'task', 'subtask'], enumName: 'task_type_enum', default: 'task' })
  type!: TaskType;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'jsonb', nullable: true })
  description!: Record<string, any> | null;

  @Column({ name: 'description_plain', type: 'text', nullable: true })
  descriptionPlain!: string | null;

  @Column({ type: 'enum', enum: ['urgent', 'high', 'medium', 'low', 'none'], enumName: 'task_priority_enum', default: 'none' })
  priority!: TaskPriority;

  @Column({ name: 'state_id', type: 'uuid' })
  stateId!: string;

  @Column({ name: 'estimate_value', type: 'numeric', precision: 6, scale: 1, nullable: true })
  estimateValue!: number | null;

  @Column({ name: 'reporter_id', type: 'uuid' })
  reporterId!: string;

  @Column({ name: 'parent_id', type: 'uuid', nullable: true })
  parentId!: string | null;

  @Column({ name: 'backlog_order', type: 'float8', default: 0 })
  backlogOrder!: number;

  @Column({ name: 'is_draft', type: 'boolean', default: false })
  isDraft!: boolean;

  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate!: string | null;

  @Column({ name: 'due_date', type: 'date', nullable: true })
  dueDate!: string | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt!: Date | null;

  @Column({ name: 'cycle_id', type: 'uuid', nullable: true })
  cycleId!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  // ─── Relations ──────────────────────────────────────────────────────────

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project!: Project;

  @ManyToOne(() => ProjectState, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'state_id' })
  state!: ProjectState;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'reporter_id' })
  reporter!: User;

  @ManyToOne(() => Task, (t) => t.children, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parent_id' })
  parent!: Task | null;

  @OneToMany(() => Task, (t) => t.parent)
  children!: Task[];

  @ManyToMany(() => User)
  @JoinTable({
    name: 'task_assignees',
    joinColumn: { name: 'task_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'user_id', referencedColumnName: 'id' },
  })
  assignees!: User[];

  @ManyToMany(() => Label)
  @JoinTable({
    name: 'task_labels',
    joinColumn: { name: 'task_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'label_id', referencedColumnName: 'id' },
  })
  labels!: Label[];

  @ManyToMany(() => Module)
  @JoinTable({
    name: 'task_modules',
    joinColumn: { name: 'task_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'module_id', referencedColumnName: 'id' },
  })
  modules!: Module[];

  @OneToMany(() => TaskAttachment, (a) => a.task)
  attachments!: TaskAttachment[];

  @OneToMany(() => TaskLink, (l) => l.task)
  links!: TaskLink[];

  @OneToMany(() => TaskRelation, (r) => r.sourceTask)
  relations!: TaskRelation[];

  @OneToMany(() => TaskActivity, (a) => a.task)
  activities!: TaskActivity[];
}
