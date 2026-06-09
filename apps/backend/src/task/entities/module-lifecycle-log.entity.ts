import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import type { ModuleLifecycleStatus } from '@mpm/shared-types';
import { Module } from './module.entity';
import { User } from '../../auth/entities/user.entity';

@Entity('module_lifecycle_logs')
@Index('idx_mlcl_module_id', ['moduleId'])
@Index('idx_mlcl_changed_at', ['changedAt'])
export class ModuleLifecycleLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'module_id', type: 'uuid' })
  moduleId!: string;

  @Column({ name: 'previous_status', type: 'enum', enumName: 'module_lifecycle_status_enum' })
  previousStatus!: ModuleLifecycleStatus;

  @Column({ name: 'new_status', type: 'enum', enumName: 'module_lifecycle_status_enum' })
  newStatus!: ModuleLifecycleStatus;

  @Column({ name: 'changed_by', type: 'uuid', nullable: true })
  changedBy!: string | null;

  @Column({ name: 'changed_at', type: 'timestamptz', default: () => 'now()' })
  changedAt!: Date;

  @Column({ type: 'text', nullable: true })
  reason!: string | null;

  @ManyToOne(() => Module, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'module_id' })
  module!: Module;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'changed_by' })
  changedByUser!: User | null;
}
