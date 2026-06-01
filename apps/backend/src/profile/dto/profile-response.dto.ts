import type { SystemRole, ProjectRole } from '@mpm/shared-types';

/**
 * Project membership info trong profile response
 */
export interface ProfileProjectEntry {
  projectId: string;
  role: ProjectRole;
}

/**
 * DTO cho response của GET/PATCH /api/profile
 *
 * Trả về thông tin cá nhân kèm danh sách projects + roles.
 */
export interface ProfileResponseDto {
  /** User ID (UUID) */
  id: string;
  /** Tên hiển thị */
  displayName: string;
  /** Email (synced từ Authentik) */
  email: string;
  /** URL avatar (nullable) */
  avatarUrl: string | null;
  /** Vai trò cấp hệ thống */
  systemRole: SystemRole;
  /** Danh sách project và role tương ứng */
  projects: ProfileProjectEntry[];
}
