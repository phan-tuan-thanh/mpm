import { Component, OnInit, OnDestroy, inject, signal, computed, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { PopoverModule } from 'primeng/popover';

import { TaskStore } from '../../state/task.store';
import { ProjectStore } from '../../../projects/state/project.store';
import { LayoutService } from '../../../layout/services/layout.service';
import { AttachmentService } from '../../services/attachment.service';
import { LinkService } from '../../services/link.service';
import { BacklogToolbarComponent, BacklogFilter } from './backlog-toolbar/backlog-toolbar.component';
import { TaskListComponent } from './task-list/task-list.component';
import { BoardComponent } from './board/board.component';
import { QuickCreateComponent } from './quick-create/quick-create.component';
import { TaskDetailPanelComponent } from '../../components/task-detail-panel/task-detail-panel.component';
import { LabelManagerComponent } from '../../components/label-manager/label-manager.component';
import { SprintService } from '../../../projects/sprints/services/sprint.service';
import type { Sprint } from '../../../projects/sprints/models/sprint.models';
import type { TaskListItem, CreateTaskDto, ReorderTaskItem, DisplayProperties, Task } from '@mpm/shared-types';
import { DEFAULT_DISPLAY_PROPS } from '@mpm/shared-types';
import { Subject, takeUntil, filter, distinctUntilChanged } from 'rxjs';
import { toObservable } from '@angular/core/rxjs-interop';

@Component({
  standalone: true,
  selector: 'app-backlog',
  imports: [
    CommonModule, FormsModule,
    ButtonModule, ConfirmDialogModule, ToastModule, DialogModule, PopoverModule,
    BacklogToolbarComponent, TaskListComponent, BoardComponent, QuickCreateComponent,
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
        [viewMode]="viewMode()"
        (filterChange)="onFilterChange($event)"
        (groupByChange)="onGroupByChange($event)"
        (orderByChange)="onOrderByChange($event)"
        (displayPropsChange)="updateDisplayProps($event)"
        (newTaskClick)="openQuickCreate()"
        (viewModeChange)="onViewModeChange($event)"
      />

      <!-- Bulk actions bar -->
      @if (taskStore.hasSelection()) {
        <div class="flex items-center gap-3 px-4 py-2 bg-indigo-50 dark:bg-indigo-950/30 border-b border-indigo-100 dark:border-indigo-900 text-sm">
          <span class="font-medium text-indigo-700 dark:text-indigo-300">
            {{ taskStore.selectionCount() }} task đã chọn
          </span>
          <button pButton label="Thêm vào Sprint" icon="pi pi-flag" size="small" [fluid]="false"
            [outlined]="true" (click)="openAddToSprint()"></button>
          <button pButton label="Xóa" icon="pi pi-trash" severity="danger" size="small" [fluid]="false"
            (click)="onBulkDelete()"></button>
          <button pButton label="Bỏ chọn" severity="secondary" size="small" text [fluid]="false"
            (click)="taskStore.clearSelection()"></button>
        </div>
      }

      <!-- Task list / Board (relative container for full-page overlay) -->
      <div class="flex-1 overflow-hidden relative">
        @if (showQuickCreate() && displayProps().taskCreationViewMode === 'full-page') {
          <div class="absolute inset-0 z-10">
            <app-quick-create
              class="h-full w-full block"
              [visible]="showQuickCreate()"
              [stateId]="quickCreateStateId()"
              [viewMode]="'full-page'"
              [draftTask]="currentDraftTask() || undefined"
              (create)="onQuickCreate($event)"
              (cancel)="closeQuickCreate()"
              (viewModeChange)="onCreationViewModeChange($event)"
            />
          </div>
        } @else if (viewMode() === 'board') {
          <app-board
            [tasks]="taskStore.tasks()"
            [states]="flatStates()"
            [displayProps]="displayProps()"
            [projectId]="projectId"
            (taskClick)="openDetail($event)"
          />
        } @else if (!(currentTaskId() && displayProps().taskDetailViewMode === 'full-page')) {
          <div class="h-full overflow-y-auto">
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
              (toggleExpand)="onToggleExpand($event)"
            />
          </div>
        }

        <!-- Single always-present task detail panel — mode changes via input, never destroyed -->
        <app-task-detail-panel
          [viewMode]="displayProps().taskDetailViewMode || 'right-pane'"
          (viewModeChange)="onDetailViewModeChange($event)"
        />
      </div>

      <!-- Quick create bar -->
      @if (showQuickCreate() && displayProps().taskCreationViewMode !== 'full-page') {
        <app-quick-create
          [visible]="showQuickCreate()"
          [stateId]="quickCreateStateId()"
          [viewMode]="displayProps().taskCreationViewMode || 'popup'"
          [draftTask]="currentDraftTask() || undefined"
          (create)="onQuickCreate($event)"
          (cancel)="closeQuickCreate()"
          (viewModeChange)="onCreationViewModeChange($event)"
        />
      }
    </div>

    <p-confirmDialog />
    <p-toast />
    <app-label-manager #labelManager [projectId]="projectId" [workspaceId]="workspaceId" />

    <!-- Add to Sprint Dialog -->
    <p-dialog
      [(visible)]="showSprintDialog"
      header="Thêm vào Sprint"
      [modal]="true"
      [style]="{ width: '420px' }"
      [closable]="true"
    >
      <div class="space-y-3 py-1">
        <p class="text-sm text-gray-700 dark:text-surface-200">
          Thêm <strong class="text-gray-900 dark:text-surface-0">{{ taskStore.selectionCount() }} task</strong> đã chọn vào sprint:
        </p>

        @if (availableSprints().length === 0 && !sprintsLoading()) {
          <div class="flex items-center gap-2 p-3 rounded-lg bg-gray-50 dark:bg-surface-800 text-sm text-gray-500 dark:text-surface-400">
            <i class="pi pi-info-circle"></i>
            Chưa có sprint nào ở trạng thái planning/active. Tạo sprint trước.
          </div>
        } @else {
          <button
            type="button"
            (click)="targetSprintPop.toggle($event)"
            class="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm border border-surface-200 dark:border-surface-700 rounded-lg bg-white dark:bg-surface-900 text-gray-800 dark:text-surface-100 font-semibold cursor-pointer hover:bg-surface-50 dark:hover:bg-surface-800 transition-all select-none h-[38px]"
          >
            <span class="truncate">{{ getTargetSprintLabel() }}</span>
            <i class="pi pi-chevron-down text-xs opacity-60 flex-shrink-0"></i>
          </button>
          <p-popover #targetSprintPop appendTo="body" styleClass="!p-0">
            <div class="pop-list w-64 max-h-60 overflow-y-auto">
              @for (sprint of availableSprints(); track sprint.id) {
                <div
                  (click)="targetSprintId = sprint.id; targetSprintPop.hide()"
                  class="pop-item flex items-center gap-2"
                  [class.selected]="targetSprintId === sprint.id"
                >
                  <span class="w-2 h-2 rounded-full"
                    [class]="sprint.status === 'active' ? 'bg-green-500' : 'bg-yellow-400'"></span>
                  <span class="text-sm font-semibold">{{ sprint.name }}</span>
                  <span class="text-xs text-gray-400 dark:text-surface-500">
                    ({{ sprint.status === 'active' ? 'Đang chạy' : 'Lên kế hoạch' }})
                  </span>
                </div>
              }
            </div>
          </p-popover>
        }
      </div>

      <ng-template pTemplate="footer">
        <div class="flex justify-end gap-2">
          <button pButton type="button" label="Hủy" severity="secondary" size="small"
            [fluid]="false" [outlined]="true" (click)="showSprintDialog.set(false)"></button>
          <button pButton type="button" label="Thêm vào Sprint" icon="pi pi-flag" size="small"
            [fluid]="false" [disabled]="!targetSprintId || addingToSprint()"
            [loading]="addingToSprint()" (click)="doAddToSprint()"></button>
        </div>
      </ng-template>
    </p-dialog>
  `,
})
export class BacklogComponent implements OnInit, OnDestroy {
  @ViewChild('labelManager') private readonly labelManager!: LabelManagerComponent;

  readonly taskStore = inject(TaskStore);
  private readonly projectStore = inject(ProjectStore);
  private readonly sprintService = inject(SprintService);
  private readonly layoutService = inject(LayoutService);
  private readonly attachmentService = inject(AttachmentService);
  private readonly linkService = inject(LinkService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly confirmService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);
  private readonly destroy$ = new Subject<void>();

  protected selectedGroupBy = 'state';
  protected selectedOrderBy = 'rank';
  protected showQuickCreate = signal(false);
  protected quickCreateStateId = signal<string | undefined>(undefined);
  protected currentDraftTask = signal<Task | null>(null);
  protected projectId = '';
  protected workspaceId = '';
  protected currentTaskId = signal<string | null>(null);
  protected viewMode = signal<'list' | 'board'>('list');

  protected readonly displayProps = signal<DisplayProperties>(DEFAULT_DISPLAY_PROPS);

  // Add-to-sprint dialog state
  protected showSprintDialog = signal(false);
  protected sprintsLoading = signal(false);
  protected addingToSprint = signal(false);
  protected availableSprints = signal<Sprint[]>([]);
  protected targetSprintId: string | null = null;

  getTargetSprintLabel(): string {
    const found = this.availableSprints().find((s) => s.id === this.targetSprintId);
    return found ? found.name : 'Chọn sprint...';
  }

  // Phải khai báo ở class field để toObservable() chạy trong injection context
  private readonly currentProject$ = toObservable(this.projectStore.currentProject);

  protected readonly flatStates = computed(() => {
    const grouped = this.projectStore.currentProjectStates();
    if (!grouped) return [];
    return Object.values(grouped).flat();
  });

  ngOnInit(): void {
    this.layoutService.fullBleed.set(true);

    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      this.currentTaskId.set(params['taskId'] || null);
      const view = params['view'];
      if (view === 'board' || view === 'list') {
        this.viewMode.set(view);
      }

      const moduleIdsParam = params['moduleIds'];
      let changed = false;
      if (moduleIdsParam) {
        const ids = moduleIdsParam.split(',');
        const currentIds = this.taskStore.filter().moduleIds;
        if (!currentIds || JSON.stringify(currentIds) !== JSON.stringify(ids)) {
          this.taskStore.setFilter({ moduleIds: ids });
          changed = true;
        }
      } else {
        if (this.taskStore.filter().moduleIds) {
          this.taskStore.setFilter({ moduleIds: undefined });
          changed = true;
        }
      }

      if (changed && this.projectId) {
        this.reloadBacklog();
      }
    });

    // Load lại khi project thay đổi (kể cả khi quay lại project cũ).
    // distinctUntilChanged chỉ chặn nếu cùng project liên tiếp (không đổi ID).
    this.currentProject$.pipe(
      takeUntil(this.destroy$),
      filter(project => !!project),
      distinctUntilChanged((a, b) => a!.id === b!.id),
    ).subscribe(project => {
      this.projectId = project!.id;
      this.workspaceId = project!.workspaceId ?? '';
      this.loadDisplayPropsFromStorage();
      this.reloadBacklog();
      this.taskStore.loadLabels(this.projectId);
    });
  }

  ngOnDestroy(): void {
    this.layoutService.fullBleed.set(false);
    // Nếu vẫn còn task nháp chưa lưu thì dọn dẹp
    const draft = this.currentDraftTask();
    if (draft && this.projectId) {
      this.taskStore.deleteTask(this.projectId, draft.id);
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected onViewModeChange(mode: 'list' | 'board'): void {
    this.viewMode.set(mode);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { view: mode },
      queryParamsHandling: 'merge',
    });
    this.reloadBacklog();
  }

  protected reloadBacklog(): void {
    if (!this.projectId) return;
    if (this.viewMode() === 'list') {
      // Không ép parentId — store tự quyết: có filter → mọi cấp (orphan render
      // phẳng ở task-list), không filter → chỉ root (parentId=null).
      this.taskStore.loadBacklog(this.projectId);
    } else {
      this.taskStore.loadBacklog(this.projectId, { parentId: undefined, limit: 1000 });
    }
  }

  protected async openQuickCreate(stateId?: string): Promise<void> {
    this.quickCreateStateId.set(stateId);
    // Tạo task nháp trước trên server để có ID quản lý attachments và sub-items
    const draft = await this.taskStore.createTask(this.projectId, {
      title: 'Task nháp',
      isDraft: true,
      stateId,
    });
    if (draft) {
      this.currentDraftTask.set(draft);
      this.showQuickCreate.set(true);
    } else {
      this.messageService.add({ severity: 'error', summary: 'Lỗi', detail: 'Không thể khởi tạo task nháp' });
    }
  }

  protected closeQuickCreate(): void {
    const draft = this.currentDraftTask();
    if (draft) {
      this.taskStore.deleteTask(this.projectId, draft.id);
      this.currentDraftTask.set(null);
    }
    this.showQuickCreate.set(false);
    this.quickCreateStateId.set(undefined);
  }

  protected onFilterChange(filter: BacklogFilter): void {
    const isCleared = !filter.search && !filter.types?.length && !filter.priorities?.length && !filter.stateIds?.length && !filter.sprintId && !filter.labelIds?.length;
    if (isCleared) {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { moduleIds: null },
        queryParamsHandling: 'merge',
      });
    }
    this.taskStore.setFilter(filter as any);
    this.reloadBacklog();
  }

  protected onGroupByChange(value: string): void {
    this.selectedGroupBy = value;
    this.taskStore.setGroupBy(value);
    this.reloadBacklog();
  }

  protected onOrderByChange(value: string): void {
    this.selectedOrderBy = value;
    this.taskStore.setOrderBy(value);
    this.reloadBacklog();
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

  protected onToggleExpand(taskId: string): void {
    this.taskStore.loadChildren(this.projectId, taskId);
  }

  protected async onQuickCreate(event: {
    dto: CreateTaskDto;
    files: File[];
    links: { url: string; title?: string }[];
    createMore: boolean;
  }): Promise<void> {
    if (!this.projectId) return;
    const draft = this.currentDraftTask();
    if (!draft) return;

    // Lưu chính thức bằng cách cập nhật các trường và set isDraft = false
    this.taskStore.updateTask(this.projectId, draft.id, {
      ...event.dto,
      isDraft: false,
    });

    this.messageService.add({ severity: 'success', summary: 'Thành công', detail: 'Đã tạo task mới' });

    if (event.createMore) {
      // Nếu chọn "Tạo tiếp", ta tự động khởi tạo ngay một task nháp mới tiếp theo
      const nextDraft = await this.taskStore.createTask(this.projectId, {
        title: 'Task nháp',
        isDraft: true,
        stateId: this.quickCreateStateId(),
      });
      this.currentDraftTask.set(nextDraft);
    } else {
      this.currentDraftTask.set(null);
      this.showQuickCreate.set(false);
      this.quickCreateStateId.set(undefined);
    }

    this.reloadBacklog();
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
        this.reloadBacklog();
      },
    });
  }

  protected openLabelManager(): void {
    this.labelManager.open();
  }

  protected openAddToSprint(): void {
    this.targetSprintId = null;
    this.showSprintDialog.set(true);
    this.sprintsLoading.set(true);
    // Sprint planning + active đều nhận task được
    this.sprintService.getSprints(this.projectId, { limit: 50 }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        this.availableSprints.set(res.data.filter((s) => s.status !== 'completed'));
        this.sprintsLoading.set(false);
      },
      error: () => {
        this.availableSprints.set([]);
        this.sprintsLoading.set(false);
      },
    });
  }

  protected doAddToSprint(): void {
    if (!this.targetSprintId) return;
    const taskIds = Array.from(this.taskStore.selectedTaskIds());
    const sprintName = this.availableSprints().find((s) => s.id === this.targetSprintId)?.name ?? '';

    this.addingToSprint.set(true);
    this.sprintService
      .addTasks(this.projectId, this.targetSprintId, taskIds)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.addingToSprint.set(false);
          this.showSprintDialog.set(false);
          this.taskStore.clearSelection();
          this.messageService.add({
            severity: 'success',
            summary: 'Thành công',
            detail: `Đã thêm ${taskIds.length} task vào sprint "${sprintName}"`,
            life: 3000,
          });
        },
        error: (err) => {
          this.addingToSprint.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Lỗi',
            detail: err?.error?.message ?? 'Không thể thêm task vào sprint',
            life: 5000,
          });
        },
      });
  }

  protected onCreationViewModeChange(mode: 'right-pane' | 'full-page' | 'popup'): void {
    this.updateDisplayProps({ taskCreationViewMode: mode });
  }

  protected onDetailViewModeChange(mode: 'right-pane' | 'full-page' | 'popup'): void {
    this.updateDisplayProps({ taskDetailViewMode: mode });
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
