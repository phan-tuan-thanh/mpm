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
import { User } from '../../auth/entities/user.entity';

@Entity('sprint_member_capacities')
export class SprintMemberCapacity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'sprint_id', type: 'uuid' })
  sprintId!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ type: 'numeric', precision: 7, scale: 2, default: 0 })
  capacity!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;

  // ─── Relations ──────────────────────────────────────────────────────────────

  @ManyToOne(() => Sprint, (s) => s.memberCapacities, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sprint_id' })
  sprint!: Sprint;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;
}
