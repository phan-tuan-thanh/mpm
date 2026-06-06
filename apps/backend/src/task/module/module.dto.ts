import type { ModuleScope, ModuleStatusType } from '../entities/module.entity';

/**
 * DTO và interface types cho Module domain
 */

/** Query params khi lấy danh sách modules */
export interface ModuleQueryDto {
  status?: ModuleStatusType;
  scope?: 'workspace' | 'project' | 'all';
}

/** DTO tạo module mới */
export interface CreateModuleDto {
  name: string;
  description?: string | null;
  status?: ModuleStatusType;
  startDate?: string | null;
  endDate?: string | null;
}

/** DTO cập nhật module (partial update) */
export interface UpdateModuleDto {
  name?: string;
  description?: string | null;
  status?: ModuleStatusType;
  startDate?: string | null;
  endDate?: string | null;
}

/** Module với progress computed từ task count */
export interface ModuleWithProgress {
  id: string;
  scope: ModuleScope;
  workspaceId: string;
  projectId: string | null;
  name: string;
  description: string | null;
  status: ModuleStatusType;
  startDate: string | null;
  endDate: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  taskCount: number;
  completedCount: number;
  /** Progress tính bằng phần trăm (0-100), 0 nếu không có task */
  progress: number;
}
