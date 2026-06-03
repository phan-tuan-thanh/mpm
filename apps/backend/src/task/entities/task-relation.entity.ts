import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Task } from './task.entity';
import { User } from '../../auth/entities/user.entity';

export type TaskRelationType = 'blocking' | 'blocked_by' | 'relates_to' | 'duplicate_of';

@Entity('task_relations')
export class TaskRelation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'source_task_id', type: 'uuid' })
  sourceTaskId!: string;

  @Column({ name: 'target_task_id', type: 'uuid' })
  targetTaskId!: string;

  @Column({
    name: 'relation_type',
    type: 'enum',
    enum: ['blocking', 'blocked_by', 'relates_to', 'duplicate_of'],
    enumName: 'task_relation_type_enum',
  })
  relationType!: TaskRelationType;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @ManyToOne(() => Task, (t) => t.relations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'source_task_id' })
  sourceTask!: Task;

  @ManyToOne(() => Task, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'target_task_id' })
  targetTask!: Task;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator!: User;
}
