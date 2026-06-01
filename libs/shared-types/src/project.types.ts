import { ProjectRole } from './auth.types';

export type ProjectStatus = 'active' | 'archived';

export type ProjectAuditEvent =
  | 'project_created'
  | 'project_updated'
  | 'project_archived'
  | 'project_deleted'
  | 'member_added'
  | 'member_removed'
  | 'member_role_changed';

export interface Project {
  id: string;
  name: string;
  description: string | null;
  key: string;
  status: ProjectStatus;
  ownerId: string;
  taskCounter: number;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
}

export interface ProjectListItem {
  id: string;
  name: string;
  key: string;
  status: ProjectStatus;
  myRole: ProjectRole;
  createdAt: Date;
}

export interface MemberResponse {
  userId: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  projectRole: ProjectRole;
  joinedAt: Date;
}

export interface CreateProjectDto {
  name: string;
  key: string;
  description?: string;
}

export interface UpdateProjectDto {
  name?: string;
  description?: string;
}

export interface AddMemberDto {
  email: string;
  projectRole: ProjectRole;
}

export interface UpdateMemberRoleDto {
  projectRole: ProjectRole;
}
