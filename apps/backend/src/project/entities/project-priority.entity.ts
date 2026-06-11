import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Project } from './project.entity';

@Entity('project_priority')
export class ProjectPriority {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'project_id', type: 'uuid' })
  projectId!: string;

  @Column({ type: 'varchar', length: 50 })
  name!: string;

  @Column({ type: 'varchar', length: 50 })
  value!: string;

  @Column({ name: 'color_light', type: 'char', length: 7, default: '#9CA3AF' })
  colorLight!: string;

  @Column({ name: 'color_dark', type: 'char', length: 7, default: '#6B7280' })
  colorDark!: string;

  @Column({ type: 'varchar', length: 100, default: 'pi pi-flag' })
  icon!: string;

  @Column({ type: 'smallint', default: 0 })
  order!: number;

  @Column({ name: 'is_system', type: 'boolean', default: false })
  isSystem!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project!: Project;
}
