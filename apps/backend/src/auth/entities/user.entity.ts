import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import type { SystemRole } from '@mpm/shared-types';
import { ProjectMember } from './project-member.entity';

/**
 * User entity — ánh xạ bảng `users` trong PostgreSQL
 *
 * Người dùng được tạo/cập nhật khi đăng nhập qua Authentik.
 * external_id là sub claim từ Authentik ID token.
 */
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Authentik sub claim — unique identifier từ IdP */
  @Column({ name: 'external_id', type: 'varchar', length: 255, unique: true })
  externalId!: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string;

  @Column({ name: 'display_name', type: 'varchar', length: 100 })
  displayName!: string;

  @Column({ name: 'avatar_url', type: 'varchar', length: 2048, nullable: true })
  avatarUrl!: string | null;

  @Column({
    name: 'system_role',
    type: 'enum',
    enum: ['Admin', 'User'],
    default: 'User',
  })
  systemRole!: SystemRole;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany(() => ProjectMember, (pm) => pm.user)
  projectMembers!: ProjectMember[];
}
