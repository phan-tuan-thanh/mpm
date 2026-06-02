import { Injectable, inject, signal, computed } from '@angular/core';
import { catchError, finalize } from 'rxjs/operators';
import { of } from 'rxjs';
import { TaskService } from '../services/task.service';
import { LabelService } from '../services/label.service';
import type {
  Task,
  TaskListItem,
  TaskActivity,
  Label,
  TaskQueryDto,
  CreateTaskDto,
  UpdateTaskDto,
  ReorderTaskItem,
} from '@mpm/shared-types';

@Injectable({ providedIn: 'root' })
export class TaskStore {
  private readonly taskService = inject(TaskService);
  private readonly labelService = inject(LabelService);

  // ─── Signals ────────────────────────────────────────────────────────────
  readonly tasks = signal<TaskListItem[]>([]);
  readonly currentTask = signal<Task | null>(null);
  readonly activity = signal<TaskActivity[]>([]);
  readonly labels = signal<Array<Label & { taskCount: number }>>([]);
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

  // ─── Computed ────────────────────────────────────────────────────────────
  readonly hasSelection = computed(() => this.selectedTaskIds().size > 0);
  readonly selectionCount = computed(() => this.selectedTaskIds().size);

  // ─── Methods ─────────────────────────────────────────────────────────────

  loadBacklog(projectId: string, query?: TaskQueryDto): void {
    this.isLoading.set(true);
    this.error.set(null);

    const q: TaskQueryDto = {
      ...this.filter(),
      ...query,
      groupBy: this.groupBy() as TaskQueryDto['groupBy'],
      orderBy: this.orderBy() as TaskQueryDto['orderBy'],
      page: this.page(),
    };

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

  loadTask(projectId: string, taskId: string): void {
    this.taskService
      .getTask(projectId, taskId)
      .pipe(catchError(() => of(null)))
      .subscribe((task) => {
        if (task) this.currentTask.set(task);
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
          if (task) {
            this.tasks.update((prev) => [task as unknown as TaskListItem, ...prev]);
          }
          resolve(task);
        });
    });
  }

  updateTask(projectId: string, taskId: string, dto: UpdateTaskDto): void {
    this.saveStatus.set('saving');
    this.taskService
      .updateTask(projectId, dto.title !== undefined ? taskId : taskId, dto)
      .pipe(
        catchError(() => {
          this.saveStatus.set('error');
          return of(null);
        }),
      )
      .subscribe((updated) => {
        if (updated) {
          this.saveStatus.set('saved');
          this.currentTask.set(updated);
          this.tasks.update((prev) =>
            prev.map((t) => (t.id === taskId ? ({ ...t, ...updated } as TaskListItem) : t)),
          );
          setTimeout(() => this.saveStatus.set('idle'), 2000);
        }
      });
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
    this.labelService
      .getLabels(projectId)
      .pipe(catchError(() => of([])))
      .subscribe((data) => this.labels.set(data));
  }
}
