import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { ProjectMember } from '../../auth/entities/project-member.entity';
import { ProjectState } from './project-state.entity';
import { ProjectEstimateConfig } from './project-estimate-config.entity';
import { ProjectStatus, ProjectNetwork, StateGroup, ProjectFeatures } from '@mpm/shared-types';

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'varchar', length: 2000, nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', length: 5, unique: true })
  key!: string;

  @Column({
    type: 'enum',
    enum: ['active', 'archived'],
    default: 'active',
  })
  status!: ProjectStatus;

  @Column({ name: 'owner_id', type: 'uuid' })
  ownerId!: string;

  @Column({ name: 'task_counter', type: 'integer', default: 0 })
  taskCounter!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @Column({ name: 'archived_at', type: 'timestamptz', nullable: true })
  archivedAt!: Date | null;

  // New Fields
  @Column({ type: 'varchar', length: 10, nullable: true })
  emoji!: string | null;

  @Column({ name: 'cover_image_url', type: 'varchar', length: 500, nullable: true })
  coverImageUrl!: string | null;

  @Column({
    type: 'enum',
    enum: ['public', 'secret'],
    default: 'secret',
  })
  network!: ProjectNetwork;

  @Column({ name: 'lead_id', type: 'uuid', nullable: true })
  leadId!: string | null;

  @Column({ type: 'varchar', length: 50, default: 'Asia/Ho_Chi_Minh' })
  timezone!: string;

  @Column({ name: 'feature_cycles', type: 'boolean', default: true })
  featureCycles!: boolean;

  @Column({ name: 'feature_modules', type: 'boolean', default: true })
  featureModules!: boolean;

  @Column({ name: 'feature_views', type: 'boolean', default: true })
  featureViews!: boolean;

  @Column({ name: 'feature_pages', type: 'boolean', default: true })
  featurePages!: boolean;

  @Column({ name: 'feature_intake', type: 'boolean', default: false })
  featureIntake!: boolean;

  @Column({ name: 'feature_time_tracking', type: 'boolean', default: false })
  featureTimeTracking!: boolean;

  // Relations
  @ManyToOne(() => User)
  @JoinColumn({ name: 'owner_id' })
  owner!: User;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'lead_id' })
  lead!: User | null;

  @OneToMany(() => ProjectMember, (pm) => pm.project)
  members!: ProjectMember[];

  @OneToMany(() => ProjectState, (ps) => ps.project)
  states!: ProjectState[];

  @OneToOne(() => ProjectEstimateConfig, (pec) => pec.project)
  estimateConfig!: ProjectEstimateConfig;

  // Virtual / computed fields for response
  stateStats?: Record<StateGroup, number>;
  features?: ProjectFeatures;
}
