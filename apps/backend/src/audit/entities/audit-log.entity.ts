import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import type { AuthEventType } from '../../auth/constants/auth-events';
import { User } from '../../auth/entities/user.entity';

/**
 * AuditLog entity — ánh xạ bảng `audit_logs` trong PostgreSQL
 *
 * Ghi lại tất cả sự kiện authentication & authorization:
 * login, logout, token refresh, role changes, session revocation, rate limit, etc.
 *
 * Metadata (jsonb) chứa thông tin bổ sung tuỳ theo event type:
 * - project_id, target_user_id, old_role, new_role, attempt_count, etc.
 */
@Entity('audit_logs')
@Index('idx_audit_log_user', ['userId'])
@Index('idx_audit_log_event_type', ['eventType'])
@Index('idx_audit_log_timestamp', ['timestamp'])
@Index('idx_audit_log_composite', ['userId', 'eventType', 'timestamp'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    name: 'event_type',
    type: 'enum',
    enum: [
      'login_success',
      'login_failed',
      'logout',
      'token_refresh',
      'token_refresh_failed',
      'token_theft_detected',
      'system_role_changed',
      'project_role_changed',
      'session_revoked',
      'all_sessions_revoked',
      'rate_limit_login',
      'rate_limit_refresh',
      'account_disabled',
      'account_enabled',
      'password_changed',
      'invitation_created',
      'invitation_accepted',
      'invitation_cancelled',
      'access_denied',
      'profile_updated',
    ],
    enumName: 'audit_event_type_enum',
  })
  eventType!: AuthEventType;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId!: string | null;

  @Column({ name: 'ip_address', type: 'varchar', length: 45 })
  ipAddress!: string;

  @Column({ name: 'user_agent', type: 'varchar', length: 512 })
  userAgent!: string;

  @Column({
    name: 'timestamp',
    type: 'timestamptz',
    default: () => 'now()',
  })
  timestamp!: Date;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;

  // ─── Relations ────────────────────────────────────────────────────────────

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user?: User;
}
