import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Sprint } from './sprint.entity';

@Entity('sprint_snapshots')
export class SprintSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'sprint_id', type: 'uuid' })
  sprintId!: string;

  @Column({ name: 'snapshot_date', type: 'date' })
  snapshotDate!: string;

  @Column({ name: 'remaining_story_points', type: 'numeric', precision: 8, scale: 1, default: 0 })
  remainingStoryPoints!: number;

  @Column({ name: 'remaining_tasks_count', type: 'integer', default: 0 })
  remainingTasksCount!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;

  // ─── Relations ──────────────────────────────────────────────────────────────

  @ManyToOne(() => Sprint, (s) => s.snapshots, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sprint_id' })
  sprint!: Sprint;
}
