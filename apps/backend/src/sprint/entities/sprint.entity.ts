import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Project } from '../../project/entities/project.entity';
import { User } from '../../auth/entities/user.entity';
import { SprintStatus } from '../types/sprint.types';
import { SprintMemberCapacity } from './sprint-member-capacity.entity';
import { SprintSnapshot } from './sprint-snapshot.entity';

@Entity('sprints')
export class Sprint {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'project_id', type: 'uuid' })
  projectId!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  goal!: string | null;

  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate!: string | null;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate!: string | null;

  @Column({
    type: 'enum',
    enum: ['planning', 'active', 'completed'],
    enumName: 'sprint_status_enum',
    default: 'planning',
  })
  status!: SprintStatus;

  @Column({ name: 'target_capacity', type: 'numeric', precision: 8, scale: 2, nullable: true })
  targetCapacity!: number | null;

  @Column({ name: 'initial_story_points', type: 'numeric', precision: 8, scale: 1, nullable: true })
  initialStoryPoints!: number | null;

  @Column({ name: 'initial_tasks_count', type: 'integer', nullable: true })
  initialTasksCount!: number | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt!: Date | null;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;

  // ─── Relations ──────────────────────────────────────────────────────────────

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project!: Project;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by' })
  creator!: User;

  @OneToMany(() => SprintMemberCapacity, (c) => c.sprint)
  memberCapacities!: SprintMemberCapacity[];

  @OneToMany(() => SprintSnapshot, (s) => s.sprint)
  snapshots!: SprintSnapshot[];
}
