import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Project } from '../../project/entities/project.entity';

@Entity('labels')
export class Label {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 10, default: 'project' })
  scope!: 'workspace' | 'project';

  @Column({ name: 'workspace_id', type: 'uuid', nullable: true })
  workspaceId!: string | null;

  @Column({ name: 'project_id', type: 'uuid', nullable: true })
  projectId!: string | null;

  @Column({ type: 'varchar', length: 50 })
  name!: string;

  @Column({ type: 'char', length: 7, default: '#6B7280' })
  color!: string;

  @Column({ name: 'is_exclusive', type: 'boolean', default: true })
  isExclusive!: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToOne(() => Project, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'project_id' })
  project!: Project | null;
}
