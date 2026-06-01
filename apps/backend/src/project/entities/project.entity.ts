import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { ProjectMember } from '../../auth/entities/project-member.entity';
import type { ProjectStatus } from '@mpm/shared-types';

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

  // Relations
  @ManyToOne(() => User)
  @JoinColumn({ name: 'owner_id' })
  owner!: User;

  @OneToMany(() => ProjectMember, (pm) => pm.project)
  members!: ProjectMember[];
}
