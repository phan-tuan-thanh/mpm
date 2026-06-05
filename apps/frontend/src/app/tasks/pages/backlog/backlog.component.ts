import { Component, OnInit, OnDestroy, inject, signal, computed, ViewChild } from '@angular/core';
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
import { TaskDetailPanelComponent } from '../../components/task-detail-panel/task-detail-panel.component';
import { LabelManagerComponent } from '../../components/label-manager/label-manager.component';
import type { TaskListItem, CreateTaskDto, ReorderTaskItem, DisplayProperties } from '@mpm/shared-types';
import { DEFAULT_DISPLAY_PROPS } from '@mpm/shared-types';
import { Subject, takeUntil } from 'rxjs';

@Component({
  standalone: true,
  selector: 'app-backlog',
  imports: [
    CommonModule,
    ButtonModule, ConfirmDialogModule, ToastModule,
    BacklogToolbarComponent, TaskListComponent, QuickCreateComponent,
    TaskDetailPanelComponent, LabelManagerComponent,
  ],
  providers: [ConfirmationService, MessageService],
  template: `
    <div class="flex flex-col h-full bg-white dark:bg-surface-900">
      <!-- Toolbar -->
      <app-backlog-toolbar
        [displayProps]="displayProps()"
        [selectedGroupBy]="selectedGroupBy"
        [selectedOrderBy]="selectedOrderBy"
        (filterChange)="onFilterChange($event)"
        (groupByChange)="onGroupByChange($event)"
        (orderByChange)="onOrderByChange($event)"
        (displayPropsChange)="updateDisplayProps($event)"
        (newTaskClick)="openQuickCreate()"
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
          [states]="flatStates()"
          [isLoading]="taskStore.isLoading()"
          [orderBy]="selectedOrderBy"
          [selectedIds]="taskStore.selectedTaskIds()"
          [displayProps]="displayProps()"
          (taskClick)="openDetail($event)"
          (selectionToggle)="taskStore.toggleSelect($event)"
          (reorder)="onReorder($event)"
          (moveTask)="onMoveTask($event)"
          (newTaskInState)="openQuickCreate($event)"
        />
      </div>

      <!-- Quick create bar -->
      @if (showQuickCreate()) {
        <app-quick-create
          [visible]="showQuickCreate()"
          [stateId]="quickCreateStateId()"
          (create)="onQuickCreate($event)"
          (cancel)="closeQuickCreate()"
        />
      }
    </div>

    <p-confirmDialog />
    <p-toast />
    <app-task-detail-panel />
    <app-label-manager #labelManager [projectId]="projectId" [workspaceId]="workspaceId" />
  `,
})
export class BacklogComponent implements OnInit, OnDestroy {
  @ViewChild('labelManager') private readonly labelManager!: LabelManagerComponent;

  readonly taskStore = inject(TaskStore);
  private readonly projectStore = inject(ProjectStore);
  private readonly layoutService = inject(LayoutService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly confirmService = inject(ConfirmationService);
  private readonly destroy$ = new Subject<void>();

  protected selectedGroupBy = 'state';
  protected selectedOrderBy = 'rank';
  protected showQuickCreate = signal(false);
  protected quickCreateStateId = signal<string | undefined>(undefined);
  protected projectId = '';
  protected workspaceId = '';

  protected readonly displayProps = signal<DisplayProperties>(DEFAULT_DISPLAY_PROPS);

  protected readonly flatStates = computed(() => {
    const grouped = this.projectStore.currentProjectStates();
    if (!grouped) return [];
    return Object.values(grouped).flat();
  });

  ngOnInit(): void {
    this.layoutService.fullBleed.set(true);

    this.route.parent?.params.pipe(takeUntil(this.destroy$)).subscribe(() => {
      const project = this.projectStore.currentProject();
      this.projectId = project?.id ?? '';
      this.workspaceId = project?.workspaceId ?? '';
      if (this.projectId) {
        this.loadDisplayPropsFromStorage();
        this.taskStore.loadBacklog(this.projectId);
        this.taskStore.loadLabels(this.projectId);
      }
    });

    const project = this.projectStore.currentProject();
    if (project?.id) {
      this.projectId = project.id;
      this.workspaceId = project?.workspaceId ?? '';
      this.loadDisplayPropsFromStorage();
      this.taskStore.loadBacklog(this.projectId);
      this.taskStore.loadLabels(this.projectId);
    }
  }

  ngOnDestroy(): void {
    this.layoutService.fullBleed.set(false);
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected openQuickCreate(stateId?: string): void {
    this.quickCreateStateId.set(stateId);
    this.showQuickCreate.set(true);
  }

  protected closeQuickCreate(): void {
    this.showQuickCreate.set(false);
    this.quickCreateStateId.set(undefined);
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

  protected onMoveTask(event: { taskId: string; stateId: string; backlogOrder: number }): void {
    this.taskStore.moveToState(this.projectId, event.taskId, event.stateId, event.backlogOrder);
  }

  protected async onQuickCreate(dto: CreateTaskDto): Promise<void> {
    if (!this.projectId) return;
    await this.taskStore.createTask(this.projectId, dto);
    this.closeQuickCreate();
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
    this.labelManager.open();
  }

  protected updateDisplayProps(patch: Partial<DisplayProperties>): void {
    this.displayProps.update(prev => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(`display-props-${this.projectId}`, JSON.stringify(next));
      } catch {
        // localStorage full or unavailable — ignore silently
      }
      return next;
    });
  }

  private loadDisplayPropsFromStorage(): void {
    if (!this.projectId) return;
    try {
      const raw = localStorage.getItem(`display-props-${this.projectId}`);
      if (raw) {
        const parsed = JSON.parse(raw) as DisplayProperties;
        this.displayProps.set({ ...DEFAULT_DISPLAY_PROPS, ...parsed });
      } else {
        this.displayProps.set(DEFAULT_DISPLAY_PROPS);
      }
    } catch (e) {
      console.warn('[Backlog] Failed to parse display-props from localStorage, using defaults', e);
      this.displayProps.set(DEFAULT_DISPLAY_PROPS);
    }
  }
}
