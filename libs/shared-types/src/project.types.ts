import { ProjectRole } from './auth.types';
import type { TiptapDoc } from './task.types';

export type ProjectStatus = 'active' | 'archived';

export enum StateGroup {
  BACKLOG = 'backlog',
  UNSTARTED = 'unstarted',
  STARTED = 'started',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export enum EstimateType {
  POINTS = 'points',
  CATEGORIES = 'categories',
  TIME = 'time'
}

export enum ProjectNetwork {
  PUBLIC = 'public',
  SECRET = 'secret'
}

export type ProjectAuditEvent =
  | 'project_created'
  | 'project_updated'
  | 'project_archived'
  | 'project_deleted'
  | 'member_added'
  | 'member_removed'
  | 'member_role_changed'
  | 'project_features_updated'
  | 'project_state_created'
  | 'project_state_updated'
  | 'project_state_deleted'
  | 'project_estimate_updated'
  | 'member_joined_public';

export interface ProjectFeatures {
  cycles: boolean;
  modules: boolean;
  views: boolean;
  pages: boolean;
  intake: boolean;
  timeTracking: boolean;
}

export interface Project {
  id: string;
  name: string;
  description: TiptapDoc | null;
  key: string;
  status: ProjectStatus;
  ownerId: string;
  workspaceId: string | null;
  taskCounter: number;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
  emoji: string | null;
  coverImageUrl: string | null;
  network: ProjectNetwork;
  lead: MemberResponse | null;
  timezone: string;
  features: ProjectFeatures;
  stateStats: Record<StateGroup, number>;
}

export interface ProjectListItem {
  id: string;
  name: string;
  key: string;
  status: ProjectStatus;
  myRole: ProjectRole;
  createdAt: Date;
  emoji?: string | null;
  network?: ProjectNetwork;
  lead?: MemberResponse | null;
}

export interface MemberResponse {
  userId: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  projectRole: ProjectRole;
  joinedAt: Date;
}

export interface ProjectState {
  id: string;
  projectId: string;
  name: string;
  color: string;
  group: StateGroup;
  icon?: string | null;
  isDefault: boolean;
  order: number;
  templateId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkspaceStateTemplate {
  id: string;
  workspaceId: string;
  name: string;
  color: string;
  group: StateGroup;
  isDefault: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectStateGrouped {
  backlog: ProjectState[];
  unstarted: ProjectState[];
  started: ProjectState[];
  completed: ProjectState[];
  cancelled: ProjectState[];
}

export interface EstimateConfig {
  id: string;
  projectId: string;
  estimateType: EstimateType;
  values: any[];
  createdAt: Date;
  updatedAt: Date;
}

export type StateTemplate = 'blank' | 'workspace';

export interface CreateProjectDto {
  name: string;
  key: string;
  description?: TiptapDoc;
  emoji?: string | null;
  network?: ProjectNetwork;
  leadId?: string | null;
  timezone?: string;
  stateTemplate?: StateTemplate;
}

export interface UpdateProjectDto {
  name?: string;
  description?: TiptapDoc | null;
  emoji?: string | null;
  network?: ProjectNetwork;
  leadId?: string | null;
  timezone?: string;
}

export interface UpdateProjectGeneralDto {
  name?: string;
  description?: TiptapDoc | null;
  emoji?: string | null;
  network?: ProjectNetwork;
  leadId?: string | null;
  timezone?: string;
}

export interface CreateStateDto {
  name: string;
  color: string;
  group: StateGroup;
  icon?: string;
}

export interface UpdateStateDto {
  name?: string;
  color?: string;
  group?: StateGroup;
  order?: number;
  isDefault?: boolean;
  icon?: string | null;
}

export interface ReorderItem {
  stateId: string;
  order: number;
}

export interface ReorderStatesDto {
  items: ReorderItem[];
}

export interface MigrateStateDto {
  fromStateId: string;
  toStateId: string;
}

export interface UpdateEstimateConfigDto {
  estimateType: EstimateType;
  values: any[];
}

export interface UpdateFeaturesDto {
  cycles?: boolean;
  modules?: boolean;
  views?: boolean;
  pages?: boolean;
  intake?: boolean;
  timeTracking?: boolean;
}

export interface AddMemberDto {
  email: string;
  projectRole: ProjectRole;
}

export interface UpdateMemberRoleDto {
  projectRole: ProjectRole;
}

export interface ProjectPriority {
  id: string;
  projectId: string;
  name: string;
  value: string;
  colorLight: string;
  colorDark: string;
  icon: string;
  order: number;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePriorityDto {
  name: string;
  value: string;
  colorLight: string;
  colorDark: string;
  icon: string;
}

export interface UpdatePriorityDto {
  name?: string;
  colorLight?: string;
  colorDark?: string;
  icon?: string;
}

export interface ReorderPrioritiesDto {
  items: { priorityId: string; order: number }[];
}

export interface DeletePriorityDto {
  migrateToValue: string;
}
