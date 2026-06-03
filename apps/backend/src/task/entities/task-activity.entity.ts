import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Task } from './task.entity';
import { User } from '../../auth/entities/user.entity';

export type TaskActivityType =
  | 'created'
  | 'title_changed'
  | 'description_changed'
  | 'state_changed'
  | 'priority_changed'
  | 'type_changed'
  | 'parent_changed'
  | 'estimate_changed'
  | 'start_date_changed'
  | 'due_date_changed'
  | 'assignee_added'
  | 'assignee_removed'
  | 'label_added'
  | 'label_removed'
  | 'attachment_added'
  | 'attachment_removed'
  | 'link_added'
  | 'link_removed'
  | 'relation_added'
  | 'relation_removed'
  | 'comment_added'
  | 'comment_edited'
  | 'comment_deleted'
  | 'deleted'
  | 'completed'
  | 'reopened';

@Entity('task_activity')
export class TaskActivity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'task_id', type: 'uuid' })
  taskId!: string;

  @Column({ name: 'actor_id', type: 'uuid' })
  actorId!: string;

  @Column({
    name: 'entry_type',
    type: 'enum',
    enumName: 'task_activity_type_enum',
    enum: [
      'created', 'title_changed', 'description_changed', 'state_changed',
      'priority_changed', 'type_changed', 'parent_changed', 'estimate_changed',
      'start_date_changed', 'due_date_changed', 'assignee_added', 'assignee_removed',
      'label_added', 'label_removed', 'attachment_added', 'attachment_removed',
      'link_added', 'link_removed', 'relation_added', 'relation_removed',
      'comment_added', 'comment_edited', 'comment_deleted', 'deleted', 'completed', 'reopened',
    ],
  })
  entryType!: TaskActivityType;

  @Column({ type: 'varchar', length: 100, nullable: true })
  field!: string | null;

  @Column({ name: 'old_value', type: 'text', nullable: true })
  oldValue!: string | null;

  @Column({ name: 'new_value', type: 'text', nullable: true })
  newValue!: string | null;

  @Column({ type: 'text', nullable: true })
  comment!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToOne(() => Task, (t) => t.activities, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task!: Task;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'actor_id' })
  actor!: User;
}
