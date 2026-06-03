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

@Entity('task_links')
export class TaskLink {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'task_id', type: 'uuid' })
  taskId!: string;

  @Column({ type: 'varchar', length: 2048 })
  url!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  title!: string | null;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @ManyToOne(() => Task, (t) => t.links, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task!: Task;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator!: User;
}
