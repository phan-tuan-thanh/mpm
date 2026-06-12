import { Injectable, inject, signal, computed } from '@angular/core';
import { catchError, finalize } from 'rxjs/operators';
import { of } from 'rxjs';
import { TaskService } from '../services/task.service';
import { LabelStore } from './label.store';
import type {
  Task,
  TaskAttachment,
  TaskListItem,
  TaskActivity,
  Label,
  TaskQueryDto,
  CreateTaskDto,
  UpdateTaskDto,
  ReorderTaskItem,
  SubItemTreeNode,
  ActivityFilterType,
  TaskComment,
} from '@mpm/shared-types';

@Injectable({ providedIn: 'root' })
export class TaskStore {
  private readonly taskService = inject(TaskService);
  private readonly labelStore = inject(LabelStore);

  // ─── Signals ────────────────────────────────────────────────────────────
  readonly tasks = signal<TaskListItem[]>([]);
  readonly currentTask = signal<Task | null>(null);
  readonly activity = signal<TaskActivity[]>([]);
  readonly comments = signal<TaskComment[]>([]);
  readonly labels = this.labelStore.labels;
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly saveStatus = signal<'idle' | 'saving' | 'saved' | 'error'>('idle');
  readonly error = signal<string | null>(null);
  readonly selectedTaskIds = signal<Set<string>>(new Set());
  readonly filter = signal<TaskQueryDto>({});
  readonly groupBy = signal<string>('none');
  readonly orderBy = signal<string>('rank');
  readonly total = signal(0);
  readonly page = signal(1);

  // ─── Sub-items signals ──────────────────────────────────────────────────
  readonly subItemsTree = signal<SubItemTreeNode[]>([]);
  readonly subItemsLoading = signal(false);
  readonly subItemsTotalCount = signal(0);
  readonly subItemsDoneCount = signal(0);

  // ─── Activity pagination signals ────────────────────────────────────────
  readonly activityEntries = signal<TaskActivity[]>([]);
  readonly activityFilter = signal<ActivityFilterType>('all');
  readonly activityPage = signal(1);
  readonly activityHasMore = signal(true);
  readonly activityLoading = signal(false);

  // ─── Computed ────────────────────────────────────────────────────────────
  readonly hasSelection = computed(() => this.selectedTaskIds().size > 0);
  readonly selectionCount = computed(() => this.selectedTaskIds().size);

  // ─── Methods ─────────────────────────────────────────────────────────────

  loadBacklog(projectId: string, query?: TaskQueryDto): void {
    this.isLoading.set(true);
    this.error.set(null);

    const currentFilter = this.filter();
    const hasActiveFilters = !!(
      (currentFilter.search || query?.search) ||
      (currentFilter.assigneeIds?.length || query?.assigneeIds?.length) ||
      (currentFilter.labelIds?.length || query?.labelIds?.length) ||
      (currentFilter.priorities?.length || query?.priorities?.length) ||
      (currentFilter.stateIds?.length || query?.stateIds?.length) ||
      (currentFilter.types?.length || query?.types?.length) ||
      (currentFilter.sprintId || query?.sprintId)
    );

    const q: TaskQueryDto = {
      parentId: hasActiveFilters ? undefined : null,
      ...currentFilter,
      ...query,
      groupBy: this.groupBy() as TaskQueryDto['groupBy'],
      orderBy: this.orderBy() as TaskQueryDto['orderBy'],
      page: this.page(),
    };

    if (query && 'parentId' in query) {
      q.parentId = query.parentId;
    }

    this.taskService
      .getTasks(projectId, q)
      .pipe(
        catchError((err) => {
          this.error.set(err.error?.message || 'Không thể tải danh sách task');
          return of({ data: [], total: 0, page: 1, pageSize: 50 });
        }),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe((res) => {
        this.tasks.set(res.data);
        this.total.set(res.total);
      });
  }

  loadChildren(projectId: string, parentId: string): void {
    const alreadyLoaded = this.tasks().some((t) => t.parentId === parentId);
    if (alreadyLoaded) return;

    this.taskService
      .getTasks(projectId, { parentId })
      .pipe(
        catchError(() => of({ data: [], total: 0, page: 1, pageSize: 50 })),
      )
      .subscribe((res) => {
        if (res && res.data.length > 0) {
          this.tasks.update((prev) => {
            const newTasks = res.data.filter(nt => !prev.some(pt => pt.id === nt.id));
            return [...prev, ...newTasks];
          });
        }
      });
  }

  loadTask(projectId: string, taskId: string): void {
    this.taskService
      .getTask(projectId, taskId)
      .pipe(catchError(() => of(null)))
      .subscribe((task) => {
        if (task) this.currentTask.set(task);
      });
  }

  addAttachment(attachment: TaskAttachment): void {
    this.currentTask.update(task => {
      if (!task) return task;
      return {
        ...task,
        attachments: [...(task.attachments ?? []), attachment],
        attachmentCount: (task.attachmentCount ?? 0) + 1,
      };
    });
  }

  batchUpdateAttachments(items: Array<{ id: string; title?: string | null; sortOrder?: number }>): void {
    this.currentTask.update(task => {
      if (!task) return task;
      const map = new Map(items.map(i => [i.id, i]));
      return {
        ...task,
        attachments: (task.attachments ?? []).map(a => {
          const u = map.get(a.id);
          return u ? { ...a, ...u } : a;
        }),
      };
    });
  }

  updateAttachmentTitle(attachmentId: string, title: string | null): void {
    this.currentTask.update(task => {
      if (!task) return task;
      return {
        ...task,
        attachments: (task.attachments ?? []).map(a =>
          a.id === attachmentId ? { ...a, title } : a,
        ),
      };
    });
  }

  removeAttachment(attachmentId: string): void {
    this.currentTask.update(task => {
      if (!task) return task;
      return {
        ...task,
        attachments: (task.attachments ?? []).filter(a => a.id !== attachmentId),
        attachmentCount: Math.max(0, (task.attachmentCount ?? 0) - 1),
      };
    });
  }

  createTask(projectId: string, dto: CreateTaskDto): Promise<Task | null> {
    return new Promise((resolve) => {
      this.isSaving.set(true);
      this.taskService
        .createTask(projectId, dto)
        .pipe(
          catchError(() => of(null)),
          finalize(() => this.isSaving.set(false)),
        )
        .subscribe((task) => {
          if (task && !task.isDraft) {
            this.tasks.update((prev) => [task as unknown as TaskListItem, ...prev]);
          }
          resolve(task);
        });
    });
  }

  updateTask(projectId: string, taskId: string, dto: UpdateTaskDto): void {
    this.saveStatus.set('saving');
    this.taskService
      .updateTask(projectId, taskId, dto)
      .pipe(
        catchError(() => {
          this.saveStatus.set('error');
          setTimeout(() => this.saveStatus.set('idle'), 3000);
          return of(null);
        }),
      )
      .subscribe((updated) => {
        if (updated) {
          this.saveStatus.set('saved');
          // Update currentTask in-place (không dùng .set() để tránh trigger effect
          // ở TaskDetailPanelComponent vì effect track task().id)
          this.currentTask.update((prev) =>
            prev ? { ...prev, ...updated } : updated,
          );
          this.tasks.update((prev) => {
            const exists = prev.some((t) => t.id === taskId);
            if (!exists && !updated.isDraft) {
              return [updated as unknown as TaskListItem, ...prev];
            }
            return prev.map((t) => (t.id === taskId ? ({ ...t, ...updated } as TaskListItem) : t));
          });
          setTimeout(() => this.saveStatus.set('idle'), 2000);
        }
      });
  }

  moveToState(projectId: string, taskId: string, stateId: string, backlogOrder: number): void {
    // Optimistic update — task moves to new group immediately
    this.tasks.update((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, stateId, backlogOrder } : t)),
    );
    this.taskService.updateTask(projectId, taskId, { stateId })
      .pipe(catchError(() => of(null)))
      .subscribe();
    this.taskService.reorderTasks(projectId, { items: [{ taskId, backlogOrder }] })
      .pipe(catchError(() => of(null)))
      .subscribe();
  }

  deleteTask(projectId: string, taskId: string): void {
    this.taskService
      .deleteTask(projectId, taskId)
      .pipe(catchError(() => of(null)))
      .subscribe(() => {
        this.tasks.update((prev) => prev.filter((t) => t.id !== taskId));
        if (this.currentTask()?.id === taskId) this.currentTask.set(null);
      });
  }

  bulkDelete(projectId: string): void {
    const ids = Array.from(this.selectedTaskIds());
    if (!ids.length) return;

    this.taskService
      .bulkDeleteTasks(projectId, { taskIds: ids })
      .pipe(catchError(() => of(null)))
      .subscribe((result) => {
        if (result) {
          this.tasks.update((prev) => prev.filter((t) => !result.succeeded.includes(t.id)));
          this.selectedTaskIds.set(new Set());
        }
      });
  }

  reorder(projectId: string, items: ReorderTaskItem[]): void {
    // Optimistic update
    const newOrder = new Map(items.map((i) => [i.taskId, i.backlogOrder]));
    this.tasks.update((prev) =>
      [...prev]
        .map((t) => (newOrder.has(t.id) ? { ...t, backlogOrder: newOrder.get(t.id)! } : t))
        .sort((a, b) => a.backlogOrder - b.backlogOrder),
    );

    this.taskService
      .reorderTasks(projectId, { items })
      .pipe(catchError(() => of(null)))
      .subscribe();
  }

  setFilter(partial: Partial<TaskQueryDto>): void {
    this.filter.update((prev) => ({ ...prev, ...partial }));
  }

  setGroupBy(value: string): void {
    this.groupBy.set(value);
  }

  setOrderBy(value: string): void {
    this.orderBy.set(value);
  }

  toggleSelect(taskId: string): void {
    this.selectedTaskIds.update((prev) => {
      const next = new Set(prev);
      next.has(taskId) ? next.delete(taskId) : next.add(taskId);
      return next;
    });
  }

  selectAll(): void {
    this.selectedTaskIds.set(new Set(this.tasks().map((t) => t.id)));
  }

  clearSelection(): void {
    this.selectedTaskIds.set(new Set());
  }

  loadLabels(projectId: string): void {
    this.labelStore.loadLabels(projectId);
  }

  // ─── Sub-items tree methods ─────────────────────────────────────────────

  /**
   * Load the sub-items tree for a given task.
   * Updates subItemsTree, subItemsTotalCount, subItemsDoneCount signals.
   */
  loadSubItemsTree(projectId: string, taskId: string): void {
    this.subItemsLoading.set(true);

    this.taskService
      .getSubItemsTree(projectId, taskId)
      .pipe(
        catchError(() => {
          this.subItemsTree.set([]);
          this.subItemsTotalCount.set(0);
          this.subItemsDoneCount.set(0);
          return of(null);
        }),
        finalize(() => this.subItemsLoading.set(false)),
      )
      .subscribe((res) => {
        if (res) {
          this.subItemsTree.set(res.items);
          this.subItemsTotalCount.set(res.totalCount);
          this.subItemsDoneCount.set(res.doneCount);
        }
      });
  }

  // ─── Activity pagination methods ────────────────────────────────────────

  /**
   * Load activity entries for a given task with filter and pagination.
   * Replaces the current activity entries (used for initial load or filter change).
   */
  loadActivity(projectId: string, taskId: string, filter: ActivityFilterType, page = 1, limit = 20): void {
    if (filter === 'comments') {
      this.activityFilter.set(filter);
      this.loadComments(projectId, taskId);
      return;
    }

    this.activityLoading.set(true);
    this.activityFilter.set(filter);
    this.activityPage.set(page);
    this._activityLimit = limit;

    this.taskService
      .getActivityFiltered(projectId, taskId, filter, page, limit)
      .pipe(
        catchError(() => {
          this.activityEntries.set([]);
          this.activityHasMore.set(false);
          return of(null);
        }),
        finalize(() => this.activityLoading.set(false)),
      )
      .subscribe((res) => {
        if (res) {
          this.activityEntries.set(res.data);
          this.activityHasMore.set(res.hasMore);
          this.activityPage.set(res.page);
        }
      });
  }

  /**
   * Load the next page of activity entries and append to existing list.
   * Used for infinite scroll / "load more" functionality.
   */
  private _activityLimit = 20;

  loadMoreActivity(projectId: string, taskId: string): void {
    if (this.activityFilter() === 'comments') {
      this.activityHasMore.set(false);
      return;
    }
    if (!this.activityHasMore() || this.activityLoading()) return;

    const nextPage = this.activityPage() + 1;
    this.activityLoading.set(true);

    this.taskService
      .getActivityFiltered(projectId, taskId, this.activityFilter(), nextPage, this._activityLimit)
      .pipe(
        catchError(() => {
          this.activityHasMore.set(false);
          return of(null);
        }),
        finalize(() => this.activityLoading.set(false)),
      )
      .subscribe((res) => {
        if (res) {
          this.activityEntries.update((prev) => [...prev, ...res.data]);
          this.activityHasMore.set(res.hasMore);
          this.activityPage.set(res.page);
        }
      });
  }

  loadComments(projectId: string, taskId: string): void {
    this.activityLoading.set(true);
    this.taskService.getComments(projectId, taskId)
      .pipe(
        catchError(() => {
          this.comments.set([]);
          return of([]);
        }),
        finalize(() => this.activityLoading.set(false))
      )
      .subscribe((comments) => {
        this.comments.set(comments);
        this.activityHasMore.set(false);
      });
  }

  createComment(projectId: string, taskId: string, content: string, parentId?: string | null): Promise<void> {
    return new Promise((resolve) => {
      this.taskService.createComment(projectId, taskId, { content, parentId })
        .subscribe((newComment) => {
          if (newComment) {
            this.comments.update((prev) => {
              if (newComment.parentId) {
                return prev.map((p) => {
                  if (p.id === newComment.parentId) {
                    return { ...p, replies: [...(p.replies || []), newComment] };
                  }
                  return p;
                });
              } else {
                return [...prev, newComment];
              }
            });
          }
          resolve();
        });
    });
  }

  updateComment(projectId: string, taskId: string, commentId: string, content: string): Promise<void> {
    return new Promise((resolve) => {
      this.taskService.updateComment(projectId, taskId, commentId, { content })
        .subscribe((updated) => {
          if (updated) {
            this.comments.update((prev) => {
              if (updated.parentId) {
                return prev.map((p: TaskComment) => {
                  if (p.id === updated.parentId) {
                    return {
                      ...p,
                      replies: (p.replies || []).map((r: TaskComment) => (r.id === commentId ? updated : r)),
                    };
                  }
                  return p;
                });
              } else {
                return prev.map((c: TaskComment) => (c.id === commentId ? { ...c, ...updated } : c));
              }
            });
          }
          resolve();
        });
    });
  }

  deleteComment(projectId: string, taskId: string, commentId: string): Promise<void> {
    return new Promise((resolve) => {
      this.taskService.deleteComment(projectId, taskId, commentId)
        .subscribe(() => {
          this.comments.update((prev) => {
            return prev.map((c: TaskComment) => {
              if (c.id === commentId) {
                return {
                  ...c,
                  content: null,
                  deletedAt: new Date().toISOString(),
                  authorName: null,
                  authorAvatar: null,
                };
              }
              if (c.replies?.some((r: TaskComment) => r.id === commentId)) {
                return { ...c, replies: (c.replies || []).filter((r: TaskComment) => r.id !== commentId) };
              }
              return c;
            }).filter((c: TaskComment) => {
              if (c.deletedAt && (!c.replies || c.replies.length === 0)) {
                return false;
              }
              return true;
            });
          });
          resolve();
        });
    });
  }

  addReaction(projectId: string, taskId: string, commentId: string, emoji: string, userId: string): Promise<void> {
    return new Promise((resolve) => {
      this.taskService.addReaction(projectId, taskId, commentId, emoji)
        .subscribe(() => {
          this.comments.update((prev) => {
            const updateReactions = (reactions: any[] = []) => {
              const match = reactions.find((r: any) => r.emoji === emoji);
              if (match) {
                if (!match.userIds.includes(userId)) {
                  match.userIds.push(userId);
                  match.count = match.userIds.length;
                }
                return [...reactions];
              } else {
                return [...reactions, { emoji, count: 1, userIds: [userId] }];
              }
            };

            return prev.map((c: TaskComment) => {
              if (c.id === commentId) {
                return { ...c, reactions: updateReactions(c.reactions) };
              }
              if (c.replies?.some((r: TaskComment) => r.id === commentId)) {
                return {
                  ...c,
                  replies: c.replies.map((r: TaskComment) =>
                    r.id === commentId ? { ...r, reactions: updateReactions(r.reactions) } : r
                  ),
                };
              }
              return c;
            });
          });
          resolve();
        });
    });
  }

  removeReaction(projectId: string, taskId: string, commentId: string, emoji: string, userId: string): Promise<void> {
    return new Promise((resolve) => {
      this.taskService.removeReaction(projectId, taskId, commentId, emoji)
        .subscribe(() => {
          this.comments.update((prev) => {
            const updateReactions = (reactions: any[] = []) => {
              return reactions.map((r: any) => {
                if (r.emoji === emoji) {
                  const userIds = r.userIds.filter((id: string) => id !== userId);
                  return { emoji, count: userIds.length, userIds };
                }
                return r;
              }).filter((r: any) => r.count > 0);
            };

            return prev.map((c: TaskComment) => {
              if (c.id === commentId) {
                return { ...c, reactions: updateReactions(c.reactions) };
              }
              if (c.replies?.some((r: TaskComment) => r.id === commentId)) {
                return {
                  ...c,
                  replies: c.replies.map((r: TaskComment) =>
                    r.id === commentId ? { ...r, reactions: updateReactions(r.reactions) } : r
                  ),
                };
              }
              return c;
            });
          });
          resolve();
        });
    });
  }
}
