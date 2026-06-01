import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import type { ProjectRole } from '@mpm/shared-types';
import { User } from '../../auth/entities/user.entity';

/**
 * Trạng thái của invitation trong lifecycle
 *
 * pending → accepted (khi user accept trước expires_at)
 * pending → expired (khi quá expires_at)
 * pending → cancelled (khi admin/scrum_master thu hồi)
 */
export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'cancelled';

/**
 * Invitation entity — ánh xạ bảng `invitations`
 *
 * Quản lý lời mời tham gia project. Mỗi invitation có token duy nhất
 * (min 32 chars random) và thời hạn 7 ngày.
 */
@Entity('invitations')
export class Invitation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'project_id', type: 'uuid' })
  projectId!: string;

  @Column({ type: 'varchar', length: 255 })
  email!: string;

  @Column({
    name: 'project_role',
    type: 'enum',
    enum: ['Scrum_Master', 'Product_Owner', 'Developer', 'QA', 'Stakeholder'],
  })
  projectRole!: ProjectRole;

  /** Token duy nhất, tối thiểu 32 ký tự ngẫu nhiên (crypto.randomBytes) */
  @Column({ type: 'varchar', length: 255, unique: true })
  token!: string;

  @Column({
    type: 'enum',
    enum: ['pending', 'accepted', 'expired', 'cancelled'],
    default: 'pending',
  })
  status!: InvitationStatus;

  /** User ID của người tạo invitation */
  @Column({ name: 'invited_by', type: 'uuid' })
  invitedBy!: string;

  /** User ID của người accept invitation (nullable) */
  @Column({ name: 'accepted_by', type: 'uuid', nullable: true })
  acceptedBy!: string | null;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  // ─── Relations ──────────────────────────────────────────────────────────────

  @ManyToOne(() => User)
  @JoinColumn({ name: 'invited_by' })
  inviter!: User;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'accepted_by' })
  acceptor!: User | null;
}
