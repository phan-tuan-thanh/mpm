import type { TaskType, TaskPriority, TaskStateRef, TaskAssignee, TaskActivity } from './task.types';

// ─── Sub-Item Tree ────────────────────────────────────────────────────────────

/**
 * Sub-item tree node for hierarchical display in task detail panel.
 * Represents a single node in the sub-items tree with its children.
 */
export interface SubItemTreeNode {
  id: string;
  taskId: string;          // display ID e.g. "PROJ-6"
  title: string;
  type: TaskType;
  priority: TaskPriority;
  stateId: string;
  state?: TaskStateRef;
  assignees: TaskAssignee[];
  dueDate: string | null;
  children: SubItemTreeNode[];
  childrenCount: number;   // total descendants
  doneCount: number;       // descendants in "completed" state group
  expanded: boolean;       // UI state
}

/**
 * Response from GET /api/projects/:projectId/tasks/:taskId/children
 */
export interface SubItemsTreeResponse {
  items: SubItemTreeNode[];
  totalCount: number;
  doneCount: number;
}

// ─── Activity Filter ──────────────────────────────────────────────────────────

/**
 * Filter type for activity panel tabs.
 * - 'all': all entries
 * - 'activity': system-generated entries only
 * - 'comments': comment entries only
 * - 'history': state_changed entries only
 */
export type ActivityFilterType = 'all' | 'activity' | 'comments' | 'history';

/**
 * Paginated response for filtered activity entries.
 * Used by GET /api/projects/:projectId/tasks/:taskId/activity
 */
export interface ActivityFilteredResponse {
  data: TaskActivity[];
  total: number;
  page: number;
  hasMore: boolean;
}

// ─── Section Collapse State ───────────────────────────────────────────────────

/**
 * Persisted collapse state for properties sidebar sections.
 * Stored in session storage; true = expanded, false = collapsed.
 */
export interface SectionCollapseState {
  [sectionKey: string]: boolean;
}

// ─── Inline Property Editing ──────────────────────────────────────────────────

/**
 * Item in the property save queue for debounced inline edits.
 * Tracks field name, new value, and timestamp for queue management.
 */
export interface PropertySaveQueueItem {
  field: string;
  value: unknown;
  timestamp: number;
}

// ─── Sub-Item Creation ────────────────────────────────────────────────────────

/**
 * DTO for creating a sub-item via quick-action toolbar.
 * Contains required title + parentId and optional toolbar selections.
 */
export interface CreateSubItemDto {
  title: string;
  parentId: string;
  assigneeIds?: string[];
  priority?: TaskPriority;
  dueDate?: string | null;
}
