import type { ModuleScope } from '../entities/module.entity';
import type { ModuleLifecycleStatus } from '@mpm/shared-types';

/**
 * DTO và interface types cho Module domain
 */

/** Query params khi lấy danh sách modules — hỗ trợ multi-value status */
export interface ModuleQueryDto {
  /** Single status hoặc mảng statuses để filter (multi-value: ?status=active,maintenance) */
  status?: ModuleLifecycleStatus | ModuleLifecycleStatus[];
  scope?: 'workspace' | 'project' | 'all';
}

/** DTO tạo module mới — status mặc định 'planning' nếu không truyền */
export interface CreateModuleDto {
  name: string;
  description?: Record<string, any> | null;
  status?: ModuleLifecycleStatus;
  startDate?: string | null;
  endDate?: string | null;
}

/** DTO cập nhật module (partial update) */
export interface UpdateModuleDto {
  name?: string;
  description?: Record<string, any> | null;
  status?: ModuleLifecycleStatus;
  startDate?: string | null;
  endDate?: string | null;
}

/** Module với progress computed từ task count + allowedTransitions */
export interface ModuleWithProgress {
  id: string;
  scope: ModuleScope;
  workspaceId: string;
  projectId: string | null;
  name: string;
  description: Record<string, any> | null;
  status: ModuleLifecycleStatus;
  startDate: string | null;
  endDate: string | null;
  version: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  taskCount: number;
  completedCount: number;
  /** Progress tính bằng phần trăm (0-100), 0 nếu không có task */
  progress: number;
  /** Các transitions hợp lệ từ trạng thái hiện tại */
  allowedTransitions: ModuleLifecycleStatus[];
}
