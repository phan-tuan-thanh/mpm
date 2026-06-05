import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  PrimaryColumn,
  CreateDateColumn,
} from 'typeorm';
import { Task } from './task.entity';
import { Module } from './module.entity';

@Entity('task_modules')
export class TaskModule {
  @PrimaryColumn({ name: 'task_id', type: 'uuid' })
  taskId!: string;

  @PrimaryColumn({ name: 'module_id', type: 'uuid' })
  moduleId!: string;

  @CreateDateColumn({ name: 'added_at', type: 'timestamptz' })
  addedAt!: Date;

  // ─── Relations ──────────────────────────────────────────────────────────

  @ManyToOne(() => Task, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task!: Task;

  @ManyToOne(() => Module, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'module_id' })
  module!: Module;
}
