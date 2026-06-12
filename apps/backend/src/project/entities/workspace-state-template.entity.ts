import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { StateGroup } from '@mpm/shared-types';

@Entity('workspace_state_templates')
export class WorkspaceStateTemplate {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId!: string;

  @Column({ type: 'varchar', length: 50 })
  name!: string;

  @Column({ name: 'color_light', type: 'char', length: 7, default: '#6B7280' })
  colorLight!: string;

  @Column({ name: 'color_dark', type: 'char', length: 7, default: '#6B7280' })
  colorDark!: string;

  @Column({
    type: 'varchar',
    length: 20,
    name: 'group',
  })
  group!: StateGroup;

  @Column({ name: 'is_default', type: 'boolean', default: false })
  isDefault!: boolean;

  @Column({ type: 'smallint', default: 0 })
  order!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
