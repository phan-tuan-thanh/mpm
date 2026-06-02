import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

import { TaskStore } from '../../state/task.store';
import { ProjectStore } from '../../../projects/state/project.store';
import { LayoutService } from '../../../layout/services/layout.service';
import { BacklogToolbarComponent, BacklogFilter } from './backlog-toolbar/backlog-toolbar.component';
import { TaskListComponent } from './task-list/task-list.component';
import { QuickCreateComponent } from './quick-create/quick-create.component';
import type { TaskListItem, CreateTaskDto, ReorderTaskItem } from '@mpm/shared-types';
import { Subject, takeUntil } from 'rxjs';

@Component({
  standalone: true,
  selector: 'app-backlog',
  imports: [
    CommonModule,
    ButtonModule, ConfirmDialogModule, ToastModule,
    BacklogToolbarComponent, TaskListComponent, QuickCreateComponent,
  ],
  providers: [ConfirmationService, MessageService],
  template: `
    <div class="flex flex-col h-full bg-white dark:bg-surface-900">
      <!-- Toolbar -->
      <app-backlog-toolbar
        [selectedGroupBy]="selectedGroupBy"
        [selectedOrderBy]="selectedOrderBy"
        (filterChange)="onFilterChange($event)"
        (groupByChange)="onGroupByChange($event)"
        (orderByChange)="onOrderByChange($event)"
        (newTaskClick)="showQuickCreate.set(true)"
        (labelManagerClick)="openLabelManager()"
      />

      <!-- Bulk actions bar -->
      @if (taskStore.hasSelection()) {
        <div class="flex items-center gap-3 px-4 py-2 bg-indigo-50 dark:bg-indigo-950/30 border-b border-indigo-100 dark:border-indigo-900 text-sm">
          <span class="font-medium text-indigo-700 dark:text-indigo-300">
            {{ taskStore.selectionCount() }} task đã chọn
          </span>
          <button pButton label="Xóa" icon="pi pi-trash" severity="danger" size="small"
            (click)="onBulkDelete()"></button>
          <button pButton label="Bỏ chọn" severity="secondary" size="small" text
            (click)="taskStore.clearSelection()"></button>
        </div>
      }

      <!-- Task list -->
      <div class="flex-1 overflow-y-auto">
        <app-task-list
          [tasks]="taskStore.tasks()"
          [isLoading]="taskStore.isLoading()"
          [orderBy]="selectedOrderBy"
          [selectedIds]="taskStore.selectedTaskIds()"
          (taskClick)="openDetail($event)"
          (selectionToggle)="taskStore.toggleSelect($event)"
          (reorder)="onReorder($event)"
        />
      </div>

      <!-- Quick create bar -->
      @if (showQuickCreate()) {
        <app-quick-create
          [visible]="showQuickCreate()"
          (create)="onQuickCreate($event)"
          (cancel)="showQuickCreate.set(false)"
        />
      }
    </div>

    <p-confirmDialog />
    <p-toast />
  `,
})
export class BacklogComponent implements OnInit, OnDestroy {
  readonly taskStore = inject(TaskStore);
  private readonly projectStore = inject(ProjectStore);
  private readonly layoutService = inject(LayoutService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly confirmService = inject(ConfirmationService);
  private readonly destroy$ = new Subject<void>();

  protected selectedGroupBy = 'none';
  protected selectedOrderBy = 'rank';
  protected showQuickCreate = signal(false);
  private projectId = '';

  ngOnInit(): void {
    this.layoutService.fullBleed.set(true);

    this.route.parent?.params.pipe(takeUntil(this.destroy$)).subscribe(() => {
      const project = this.projectStore.currentProject();
      this.projectId = project?.id ?? '';
      if (this.projectId) {
        this.taskStore.loadBacklog(this.projectId);
        this.taskStore.loadLabels(this.projectId);
      }
    });

    // Load immediately if project already available
    const project = this.projectStore.currentProject();
    if (project?.id) {
      this.projectId = project.id;
      this.taskStore.loadBacklog(this.projectId);
      this.taskStore.loadLabels(this.projectId);
    }
  }

  ngOnDestroy(): void {
    this.layoutService.fullBleed.set(false);
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected onFilterChange(filter: BacklogFilter): void {
    this.taskStore.setFilter(filter as any);
    this.taskStore.loadBacklog(this.projectId);
  }

  protected onGroupByChange(value: string): void {
    this.selectedGroupBy = value;
    this.taskStore.setGroupBy(value);
    this.taskStore.loadBacklog(this.projectId);
  }

  protected onOrderByChange(value: string): void {
    this.selectedOrderBy = value;
    this.taskStore.setOrderBy(value);
    this.taskStore.loadBacklog(this.projectId);
  }

  protected openDetail(task: TaskListItem): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { taskId: task.taskId },
      queryParamsHandling: 'merge',
    });
  }

  protected onReorder(items: ReorderTaskItem[]): void {
    this.taskStore.reorder(this.projectId, items);
  }

  protected async onQuickCreate(dto: CreateTaskDto): Promise<void> {
    if (!this.projectId) return;
    await this.taskStore.createTask(this.projectId, dto);
    this.showQuickCreate.set(false);
    this.taskStore.loadBacklog(this.projectId);
  }

  protected onBulkDelete(): void {
    this.confirmService.confirm({
      message: `Xóa ${this.taskStore.selectionCount()} task đã chọn?`,
      header: 'Xác nhận xóa',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Xóa',
      rejectLabel: 'Hủy',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.taskStore.bulkDelete(this.projectId);
        this.taskStore.loadBacklog(this.projectId);
      },
    });
  }

  protected openLabelManager(): void {
    // Label manager dialog opened via a separate component if needed
  }
}
