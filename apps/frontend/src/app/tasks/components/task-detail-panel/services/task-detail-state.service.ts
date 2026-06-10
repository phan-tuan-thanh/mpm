import { Injectable, computed, inject, signal } from '@angular/core';

import { TaskStore } from '../../../state/task.store';
import type {
  ActivityFilterType,
  SectionCollapseState,
} from '@mpm/shared-types';

const STORAGE_KEY = 'task-detail-collapse-state';
const SIDEBAR_STATE_KEY = 'task-detail-sidebar-expanded';

/**
 * Signal-based state service scoped to the TaskDetailPanel component.
 * Manages local UI state (sub-items, activity, sidebar, saving fields)
 * and delegates core task state to the global TaskStore.
 *
 * Provided at component level — NOT root.
 */
@Injectable()
export class TaskDetailStateService {
  private readonly taskStore = inject(TaskStore);

  // ─── Core task state (delegated to TaskStore) ──────────────────────────

  readonly task = computed(() => this.taskStore.currentTask());
  readonly saveStatus = computed(() => this.taskStore.saveStatus());

  // ─── Sub-items (delegated to TaskStore) ────────────────────────────────

  readonly subItemsTree = computed(() => this.taskStore.subItemsTree());
  readonly subItemsLoading = computed(() => this.taskStore.subItemsLoading());
  readonly subItemsTotalCount = computed(() => this.taskStore.subItemsTotalCount());
  readonly subItemsDoneCount = computed(() => this.taskStore.subItemsDoneCount());

  // ─── Activity (delegated to TaskStore) ─────────────────────────────────

  readonly activityEntries = computed(() => this.taskStore.activityEntries());
  readonly activityFilter = computed(() => this.taskStore.activityFilter());
  readonly activityPage = computed(() => this.taskStore.activityPage());
  readonly activityHasMore = computed(() => this.taskStore.activityHasMore());
  readonly activityLoading = computed(() => this.taskStore.activityLoading());

  // ─── Sidebar ───────────────────────────────────────────────────────────

  readonly sidebarExpanded = signal(true);
  readonly sectionCollapseState = signal<SectionCollapseState>({
    details: true,
    structure: true,
  });

  // ─── Property save queue ───────────────────────────────────────────────

  readonly savingFields = signal<Set<string>>(new Set());

  // ─── Constructor — restore persisted state ─────────────────────────────

  constructor() {
    this.restoreCollapseState();
    this.restoreSidebarState();
  }

  // ─── Public methods ────────────────────────────────────────────────────

  /** Toggle the sidebar between expanded and collapsed. Persists to session storage (Req 8.7). */
  toggleSidebar(): void {
    this.sidebarExpanded.update((expanded) => {
      const next = !expanded;
      this.persistSidebarState(next);
      return next;
    });
  }

  /** Toggle a specific section's collapse state and persist to session storage. */
  toggleSection(key: string): void {
    this.sectionCollapseState.update((state) => {
      const updated = { ...state, [key]: !state[key] };
      this.persistCollapseState(updated);
      return updated;
    });
  }

  /** Set the activity filter type and reset pagination via TaskStore. */
  setActivityFilter(filter: ActivityFilterType, projectId: string, taskId: string): void {
    this.taskStore.loadActivity(projectId, taskId, filter, 1);
  }

  /** Load sub-items tree via TaskStore. */
  loadSubItemsTree(projectId: string, taskId: string): void {
    this.taskStore.loadSubItemsTree(projectId, taskId);
  }

  /** Load activity entries via TaskStore. */
  loadActivity(projectId: string, taskId: string, filter: ActivityFilterType, page = 1, limit = 20): void {
    this.taskStore.loadActivity(projectId, taskId, filter, page, limit);
  }

  /** Load more activity entries (next page) via TaskStore. */
  loadMoreActivity(projectId: string, taskId: string): void {
    this.taskStore.loadMoreActivity(projectId, taskId);
  }

  /** Mark a field as currently saving. */
  addSavingField(field: string): void {
    this.savingFields.update((prev) => {
      const next = new Set(prev);
      next.add(field);
      return next;
    });
  }

  /** Remove a field from the saving state. */
  removeSavingField(field: string): void {
    this.savingFields.update((prev) => {
      const next = new Set(prev);
      next.delete(field);
      return next;
    });
  }

  // ─── Session storage persistence ──────────────────────────────────────

  /** Persist section collapse state to session storage. */
  persistCollapseState(state?: SectionCollapseState): void {
    try {
      const toSave = state ?? this.sectionCollapseState();
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch {
      // Session storage unavailable — silent fallback (no toast)
    }
  }

  /** Restore section collapse state from session storage. */
  restoreCollapseState(): void {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: SectionCollapseState = JSON.parse(raw);
        this.sectionCollapseState.set(parsed);
      }
    } catch {
      // Session storage unavailable or corrupted — use defaults
    }
  }

  // ─── Sidebar expanded state persistence (Req 8.7) ─────────────────────

  /** Persist sidebar expanded/collapsed state to session storage. */
  private persistSidebarState(expanded: boolean): void {
    try {
      sessionStorage.setItem(SIDEBAR_STATE_KEY, JSON.stringify(expanded));
    } catch {
      // Session storage unavailable — silent fallback
    }
  }

  /** Restore sidebar expanded/collapsed state from session storage. */
  private restoreSidebarState(): void {
    try {
      const raw = sessionStorage.getItem(SIDEBAR_STATE_KEY);
      if (raw !== null) {
        const expanded: boolean = JSON.parse(raw);
        this.sidebarExpanded.set(expanded);
      }
      // If no persisted state, keep default (true = expanded, Req 8.5)
    } catch {
      // Session storage unavailable or corrupted — use default (expanded)
    }
  }
}
