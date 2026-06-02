import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Project } from './project.entity';
import { EstimateType } from '@mpm/shared-types';

@Entity('project_estimate_configs')
export class ProjectEstimateConfig {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'project_id', type: 'uuid', unique: true })
  projectId!: string;

  @Column({
    name: 'estimate_type',
    type: 'enum',
    enum: ['points', 'categories', 'time'],
    default: 'points',
  })
  estimateType!: EstimateType;

  @Column({ type: 'jsonb', default: '[0, 0.5, 1, 2, 3, 5, 8, 13, 21]' })
  values!: any[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  // Relations
  @OneToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project!: Project;
}
