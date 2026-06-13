import type { ModuleLifecycleStatus } from './module.types';

export type TiptapDoc = Record<string, any>;

export type TaskType = 'epic' | 'story' | 'task' | 'subtask';

export type TaskPriority = string;

export type TaskRelationType = 'blocking' | 'blocked_by' | 'relates_to' | 'duplicate_of';

export type TaskActivityType =
  | 'created'
  | 'title_changed'
  | 'description_changed'
  | 'state_changed'
  | 'priority_changed'
  | 'type_changed'
  | 'parent_changed'
  | 'estimate_changed'
  | 'start_date_changed'
  | 'due_date_changed'
  | 'assignee_added'
  | 'assignee_removed'
  | 'label_added'
  | 'label_removed'
  | 'attachment_added'
  | 'attachment_removed'
  | 'link_added'
  | 'link_removed'
  | 'relation_added'
  | 'relation_removed'
  | 'comment_added'
  | 'comment_edited'
  | 'comment_deleted'
  | 'deleted'
  | 'completed'
  | 'reopened';

export interface TaskAssignee {
  userId: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  assignedAt: Date;
}

export type LabelScope = 'workspace' | 'project';

export interface Label {
  id: string;
  projectId: string | null;
  name: string;
  colorLight: string;
  colorDark: string;
  icon?: string | null;
  scope?: LabelScope;
  workspaceId?: string;
  taskCount?: number;
  isExclusive?: boolean;
  description?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskAttachment {
  id: string;
  taskId: string;
  originalName: string;
  title?: string | null;
  sortOrder?: number;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  uploaderId: string;
  uploaderName?: string;
  createdAt: Date;
}

export interface TaskLink {
  id: string;
  taskId: string;
  url: string;
  title: string | null;
  createdBy: string;
  createdAt: Date;
}

export interface TaskRelation {
  id: string;
  sourceTaskId: string;
  targetTaskId: string;
  relationType: TaskRelationType;
  createdBy: string;
  createdAt: Date;
  targetTask?: TaskListItem;
}

export interface TaskActivity {
  id: string;
  taskId: string;
  actorId: string;
  actorName?: string;
  actorAvatar?: string | null;
  entryType: TaskActivityType;
  field: string | null;
  oldValue: string | null;
  newValue: string | null;
  comment: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskStateRef {
  id: string;
  name: string;
  colorLight: string;
  colorDark: string;
  group: string;
  icon?: string | null;
}

export interface TaskParentRef {
  id: string;
  taskId: string;
  title: string;
  type: TaskType;
}

export interface TaskListItem {
  id: string;
  taskId: string;
  projectId: string;
  type: TaskType;
  title: string;
  priority: TaskPriority;
  stateId: string;
  state?: TaskStateRef;
  assignees: TaskAssignee[];
  labels: Label[];
  modules?: TaskModuleRef[];
  estimateValue: number | null;
  startDate: string | null;
  dueDate: string | null;
  completedAt: Date | null;
  backlogOrder: number;
  isDraft: boolean;
  parentId: string | null;
  parent?: TaskParentRef | null;
  reporterId: string;
  cycleId: string | null;
  sprintId?: string | null;
  subItemCount: number;
  attachmentCount: number;
  linkCount: number;
  createdAt: Date;
  updatedAt: Date;
}


export interface Task extends TaskListItem {
  description: TiptapDoc | null;
  parent?: TaskParentRef | null;
  children?: TaskListItem[];
  attachments: TaskAttachment[];
  links: TaskLink[];
  relations: TaskRelation[];
  reporter: { userId: string; displayName: string; avatarUrl: string | null };
}

export interface TaskGrouped {
  groupKey: string;
  groupLabel: string;
  tasks: TaskListItem[];
  total: number;
}

export interface TaskListResponse {
  data: TaskListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface TaskGroupedResponse {
  groups: TaskGrouped[];
  total: number;
}

// ─── DTOs ─────────────────────────────────────────────────────────────────

export interface CreateTaskDto {
  title: string;
  type?: TaskType;
  priority?: TaskPriority;
  description?: TiptapDoc;
  stateId?: string;
  assigneeIds?: string[];
  labelIds?: string[];
  moduleIds?: string[];
  estimateValue?: number;
  startDate?: string;
  dueDate?: string;
  parentId?: string;
  isDraft?: boolean;
}

export interface UpdateTaskDto {
  title?: string;
  type?: TaskType;
  priority?: TaskPriority;
  description?: TiptapDoc | null;
  stateId?: string;
  assigneeIds?: string[];
  labelIds?: string[];
  moduleIds?: string[];
  estimateValue?: number | null;
  startDate?: string | null;
  dueDate?: string | null;
  parentId?: string | null;
  isDraft?: boolean;
  sprintId?: string | null;
}

export interface ReorderTaskItem {
  taskId: string;
  backlogOrder: number;
}

export interface ReorderTasksDto {
  items: ReorderTaskItem[];
}

export interface BulkDeleteTasksDto {
  taskIds: string[];
}

export interface CreateLabelDto {
  name: string;
  colorLight: string;
  colorDark: string;
  icon?: string | null;
  isExclusive?: boolean;
  description?: string | null;
}

export interface UpdateLabelDto {
  name?: string;
  colorLight?: string;
  colorDark?: string;
  icon?: string | null;
  isExclusive?: boolean;
  description?: string | null;
}

export interface CreateLinkDto {
  url: string;
  title?: string;
}

export interface CreateRelationDto {
  targetTaskId: string;
  relationType: TaskRelationType;
}

export interface CreateCommentDto {
  content: string;
  parentId?: string | null;
}

export interface UpdateCommentDto {
  content: string;
}

export interface TaskCommentReaction {
  emoji: string;
  count: number;
  userIds: string[];
}

export interface TaskComment {
  id: string;
  taskId: string;
  authorId: string;
  authorName?: string | null;
  authorAvatar?: string | null;
  parentId: string | null;
  content: string | null;
  mentions: string[];
  editedAt: Date | string | null;
  deletedAt: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  replies?: TaskComment[];
  reactions?: TaskCommentReaction[];
}

export interface TaskQueryDto {
  types?: TaskType[];
  stateIds?: string[];
  priorities?: TaskPriority[];
  assigneeIds?: string[];
  labelIds?: string[];
  moduleIds?: string[];
  search?: string;
  groupBy?: 'state' | 'priority' | 'label' | 'assignee' | 'none';
  orderBy?: 'rank' | 'created_at' | 'updated_at' | 'start_date' | 'due_date' | 'priority';
  page?: number;
  limit?: number;
  parentId?: string | null;
  /** UUID sprint hoặc 'none' = task chưa thuộc sprint */
  sprintId?: string;
}

// ─── Modules ──────────────────────────────────────────────────────────────────

/** @deprecated Use ModuleLifecycleStatus from module.types instead */
export type ModuleStatus = 'backlog' | 'in_progress' | 'paused' | 'completed' | 'cancelled';

export interface ProjectModule {
  id: string;
  scope: 'workspace' | 'project';
  workspaceId: string;
  projectId: string | null;
  name: string;
  description: TiptapDoc | null;
  status: ModuleLifecycleStatus;
  startDate: string | null;
  endDate: string | null;
  version: number;
  taskCount: number;
  completedCount: number;
  progress: number;
  allowedTransitions: ModuleLifecycleStatus[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskModuleRef {
  id: string;
  name: string;
  scope: 'workspace' | 'project';
  status: ModuleLifecycleStatus;
}

// ─── Display Properties ───────────────────────────────────────────────────────

export interface DisplayProperties {
  showAssignee: boolean;
  showPriority: boolean;
  showDueDate: boolean;
  showStartDate: boolean;
  showLabels: boolean;
  showEstimate: boolean;
  showSubItemCount: boolean;
  showParent: boolean;
  showState: boolean;
  showModules: boolean;
  showSprint?: boolean;
  alwaysShowLabels: boolean;
  labelMode: 'badge' | 'dot';
  maxLabels: number;   // 1–4
  maxModules: number;  // 1–3
  taskCreationViewMode?: 'right-pane' | 'full-page' | 'popup';
  taskDetailViewMode?: 'right-pane' | 'full-page' | 'popup';
  maxSubItemDepth: number; // 0 = ẩn sub-items, 1 = chỉ con trực tiếp, v.v.
  kanbanColumnWidth?: number; // chiều rộng cột kanban
}

export const DEFAULT_DISPLAY_PROPS: DisplayProperties = {
  showAssignee: true,
  showPriority: true,
  showDueDate: true,
  showStartDate: false,
  showLabels: true,
  showEstimate: true,
  showSubItemCount: true,
  showParent: true,
  showState: true,
  showModules: true,
  showSprint: true,
  alwaysShowLabels: false,
  labelMode: 'badge',
  maxLabels: 2,
  maxModules: 1,
  taskCreationViewMode: 'popup',
  taskDetailViewMode: 'right-pane',
  maxSubItemDepth: 3,
  kanbanColumnWidth: 288,
};
