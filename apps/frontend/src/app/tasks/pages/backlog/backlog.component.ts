import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DragDropModule, CdkDragDrop } from '@angular/cdk/drag-drop';

import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { CheckboxModule } from 'primeng/checkbox';
import { SkeletonModule } from 'primeng/skeleton';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';

import { TaskStore } from '../../state/task.store';
import { ProjectStore } from '../../../projects/state/project.store';
import type { TaskListItem, TaskType, TaskPriority } from '@mpm/shared-types';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';

const PRIORITY_ICON: Record<TaskPriority, string> = {
  urgent: '🔴', high: '🟠', medium: '🟡', low: '🔵', none: '⚪',
};

const TYPE_ICON: Record<TaskType, string> = {
  epic: '⚡', story: '📖', task: '✅', subtask: '↳',
};

@Component({
  standalone: true,
  selector: 'app-backlog',
  imports: [
    CommonModule, FormsModule, DragDropModule,
    ButtonModule, InputTextModule, SelectModule, TagModule,
    TooltipModule, CheckboxModule, SkeletonModule,
    ConfirmDialogModule,
  ],
  providers: [ConfirmationService, MessageService],
  template: `
    <div class="flex flex-col h-full" (keydown.slash)="focusSearch($event)">
      <!-- Toolbar -->
      <div class="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-surface-700 bg-white dark:bg-surface-900 flex-shrink-0">
        <h1 class="text-lg font-semibold text-gray-900 dark:text-surface-0 mr-2">Backlog</h1>

        <!-- Search -->
        <div class="relative flex-1 max-w-xs">
          <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <input
            #searchInput
            pInputText
            class="pl-8 w-full text-sm"
            placeholder="Tìm kiếm... (/)"
            [(ngModel)]="searchText"
            (ngModelChange)="onSearchChange($event)"
          />
        </div>

        <!-- Group by -->
        <p-select
          [options]="groupByOptions"
          [(ngModel)]="selectedGroupBy"
          optionLabel="label"
          optionValue="value"
          placeholder="Group by"
          styleClass="text-sm"
          (ngModelChange)="onGroupByChange($event)"
        />

        <!-- Order by -->
        <p-select
          [options]="orderByOptions"
          [(ngModel)]="selectedOrderBy"
          optionLabel="label"
          optionValue="value"
          placeholder="Order by"
          styleClass="text-sm"
          (ngModelChange)="onOrderByChange($event)"
        />

        <div class="flex-1"></div>

        <!-- Bulk actions when items selected -->
        @if (taskStore.hasSelection()) {
          <div class="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-950/30 px-3 py-1.5 rounded-lg text-sm">
            <span class="font-medium text-indigo-700 dark:text-indigo-300">{{ taskStore.selectionCount() }} đã chọn</span>
            <button pButton icon="pi pi-trash" severity="danger" size="small" text (click)="onBulkDelete()"></button>
            <button pButton icon="pi pi-times" severity="secondary" size="small" text (click)="taskStore.clearSelection()"></button>
          </div>
        }

        <!-- New task button -->
        <button pButton label="Thêm task" icon="pi pi-plus" size="small" (click)="showQuickCreate.set(true)"></button>
      </div>

      <!-- Task list -->
      <div class="flex-1 overflow-y-auto">
        @if (taskStore.isLoading()) {
          <div class="p-4 space-y-2">
            @for (i of [1,2,3,4,5]; track i) {
              <p-skeleton height="2.5rem" />
            }
          </div>
        } @else if (taskStore.tasks().length === 0) {
          <div class="flex flex-col items-center justify-center h-64 text-gray-400">
            <span class="text-4xl mb-3">📋</span>
            <p class="text-base font-medium">Backlog trống</p>
            <p class="text-sm mt-1">Nhấn "Thêm task" để bắt đầu</p>
          </div>
        } @else {
          <div
            cdkDropList
            [cdkDropListDisabled]="selectedOrderBy !== 'rank'"
            (cdkDropListDropped)="onDrop($event)"
            class="divide-y divide-gray-100 dark:divide-surface-800"
          >
            @for (task of taskStore.tasks(); track task.id) {
              <div
                cdkDrag
                class="group flex items-center gap-2 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-surface-800 transition-colors cursor-default"
                [class.bg-indigo-50]="taskStore.selectedTaskIds().has(task.id)"
                [style.paddingLeft.px]="16 + (getLevel(task) * 24)"
                (click)="openDetail(task)"
              >
                <!-- Drag handle -->
                <span
                  cdkDragHandle
                  class="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 flex-shrink-0"
                  [class.!opacity-0]="selectedOrderBy !== 'rank'"
                  [pTooltip]="selectedOrderBy !== 'rank' ? 'Chuyển sang Manual Rank để sắp xếp' : ''"
                >⠿</span>

                <!-- Checkbox -->
                <p-checkbox
                  [binary]="true"
                  [ngModel]="taskStore.selectedTaskIds().has(task.id)"
                  (ngModelChange)="taskStore.toggleSelect(task.id)"
                  styleClass="flex-shrink-0"
                  (click)="$event.stopPropagation()"
                />

                <!-- Type icon -->
                <span class="text-sm flex-shrink-0" [pTooltip]="task.type">{{ typeIcon(task.type) }}</span>

                <!-- Task ID -->
                <span class="text-xs text-gray-400 font-mono flex-shrink-0 min-w-[4rem]">{{ task.taskId }}</span>

                <!-- Title -->
                <span class="flex-1 text-sm font-medium text-gray-800 dark:text-surface-100 truncate">{{ task.title }}</span>

                <!-- State badge -->
                @if (task.state) {
                  <span
                    class="text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0"
                    [style.background]="task.state.color + '22'"
                    [style.color]="task.state.color"
                  >{{ task.state.name }}</span>
                }

                <!-- Priority -->
                <span class="flex-shrink-0" [pTooltip]="task.priority">{{ priorityIcon(task.priority) }}</span>

                <!-- Due date -->
                @if (task.dueDate) {
                  <span
                    class="text-xs flex-shrink-0"
                    [class.text-red-500]="isOverdue(task.dueDate)"
                    [class.text-gray-400]="!isOverdue(task.dueDate)"
                  >{{ formatDate(task.dueDate) }}</span>
                }

                <!-- Sub-item count -->
                @if (task['subItemCount'] > 0) {
                  <span class="text-xs text-gray-400 flex-shrink-0">↳{{ task['subItemCount'] }}</span>
                }

                <!-- Attachment count -->
                @if (task['attachmentCount'] > 0) {
                  <span class="text-xs text-gray-400 flex-shrink-0">📎{{ task['attachmentCount'] }}</span>
                }
              </div>
            }
          </div>
        }

        <!-- Quick create bar -->
        @if (showQuickCreate()) {
          <div class="flex items-center gap-2 px-4 py-2 border-t border-gray-200 dark:border-surface-700 bg-white dark:bg-surface-900">
            <input
              pInputText
              class="flex-1 text-sm"
              placeholder="Nhập title task và nhấn Enter..."
              [(ngModel)]="quickCreateTitle"
              (keydown.enter)="onQuickCreate()"
              (keydown.escape)="showQuickCreate.set(false)"
              #quickCreateInput
              autofocus
            />
            <button pButton label="Thêm" size="small" (click)="onQuickCreate()" [disabled]="!quickCreateTitle.trim()"></button>
            <button pButton label="Hủy" severity="secondary" size="small" text (click)="showQuickCreate.set(false)"></button>
          </div>
        }
      </div>
    </div>

    <p-confirmDialog />
  `,
})
export class BacklogComponent implements OnInit, OnDestroy {
  readonly taskStore = inject(TaskStore);
  readonly projectStore = inject(ProjectStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly confirmService = inject(ConfirmationService);
  private readonly destroy$ = new Subject<void>();

  protected searchText = '';
  protected quickCreateTitle = '';
  protected selectedGroupBy = 'none';
  protected selectedOrderBy = 'rank';
  protected showQuickCreate = signal(false);

  private projectId = '';
  private searchSubject = new Subject<string>();

  readonly groupByOptions = [
    { label: 'Không nhóm', value: 'none' },
    { label: 'Theo State', value: 'state' },
    { label: 'Theo Priority', value: 'priority' },
    { label: 'Theo Label', value: 'label' },
    { label: 'Theo Assignee', value: 'assignee' },
  ];

  readonly orderByOptions = [
    { label: 'Manual Rank', value: 'rank' },
    { label: 'Ngày tạo', value: 'created_at' },
    { label: 'Cập nhật', value: 'updated_at' },
    { label: 'Ngày bắt đầu', value: 'start_date' },
    { label: 'Ngày hết hạn', value: 'due_date' },
    { label: 'Priority', value: 'priority' },
  ];

  ngOnInit(): void {
    this.route.parent?.params
      .pipe(takeUntil(this.destroy$))
      .subscribe((params) => {
        const project = this.projectStore.currentProject();
        this.projectId = project?.id ?? '';
        if (this.projectId) {
          this.taskStore.loadBacklog(this.projectId);
          this.taskStore.loadLabels(this.projectId);
        }
      });

    // Sync URL query params
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      if (params['taskId']) {
        // Task detail panel will handle opening
      }
    });

    // Debounced search
    this.searchSubject.pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((q) => {
        this.taskStore.setFilter({ search: q || undefined });
        this.taskStore.loadBacklog(this.projectId);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected typeIcon(type: TaskType): string { return TYPE_ICON[type] ?? '✅'; }
  protected priorityIcon(priority: TaskPriority): string { return PRIORITY_ICON[priority] ?? '⚪'; }
  protected getLevel(task: TaskListItem): number { return task.parentId ? 1 : 0; }

  protected isOverdue(dueDate: string | null): boolean {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  }

  protected formatDate(date: string): string {
    return new Date(date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  }

  protected onSearchChange(value: string): void {
    this.searchSubject.next(value);
  }

  protected onGroupByChange(value: string): void {
    this.taskStore.setGroupBy(value);
    this.taskStore.loadBacklog(this.projectId);
  }

  protected onOrderByChange(value: string): void {
    this.taskStore.setOrderBy(value);
    this.taskStore.loadBacklog(this.projectId);
  }

  protected focusSearch(event: KeyboardEvent): void {
    const target = event.target as HTMLElement;
    if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
      event.preventDefault();
      document.querySelector<HTMLInputElement>('input[placeholder*="Tìm kiếm"]')?.focus();
    }
  }

  protected openDetail(task: TaskListItem): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { taskId: task.taskId },
      queryParamsHandling: 'merge',
    });
  }

  protected onDrop(event: CdkDragDrop<TaskListItem[]>): void {
    if (event.previousIndex === event.currentIndex) return;

    const tasks = [...this.taskStore.tasks()];
    const moved = tasks.splice(event.previousIndex, 1)[0];
    tasks.splice(event.currentIndex, 0, moved);

    // Midpoint calculation
    const prevOrder = tasks[event.currentIndex - 1]?.backlogOrder ?? 0;
    const nextOrder = tasks[event.currentIndex + 1]?.backlogOrder ?? prevOrder + 2000;
    const newOrder = (prevOrder + nextOrder) / 2;

    this.taskStore.reorder(this.projectId, [{ taskId: moved.id, backlogOrder: newOrder }]);
  }

  protected async onQuickCreate(): Promise<void> {
    const title = this.quickCreateTitle.trim();
    if (!title || !this.projectId) return;

    await this.taskStore.createTask(this.projectId, { title });
    this.quickCreateTitle = '';
    this.showQuickCreate.set(false);
  }

  protected onBulkDelete(): void {
    this.confirmService.confirm({
      message: `Xóa ${this.taskStore.selectionCount()} task đã chọn?`,
      header: 'Xác nhận xóa',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Xóa',
      rejectLabel: 'Hủy',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.taskStore.bulkDelete(this.projectId),
    });
  }
}
