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
import { CheckboxModule } from 'primeng/checkbox';

import { TaskStore } from '../../state/task.store';
import { ProjectStore } from '../../../projects/state/project.store';
import { LayoutService } from '../../../layout/services/layout.service';
import { AttachmentService } from '../../services/attachment.service';
import { LinkService } from '../../services/link.service';
import { TaskService } from '../../services/task.service';
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
import { Subject, takeUntil, filter, distinctUntilChanged, firstValueFrom } from 'rxjs';
import { toObservable } from '@angular/core/rxjs-interop';
import { CustomTranslationService } from '../../../shared/services/custom-translation.service';

@Component({
  standalone: true,
  selector: 'app-backlog',
  imports: [
    CommonModule, FormsModule,
    ButtonModule, ConfirmDialogModule, ToastModule, DialogModule, PopoverModule, CheckboxModule,
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
            {{ taskStore.selectionCount() }} {{ t().selectedTasks }}
          </span>
          <button pButton [label]="t().close" icon="pi pi-check-circle" severity="success" size="small" [fluid]="false"
            (click)="onBulkClose()"></button>
          <button pButton [label]="t().addToSprint" icon="pi pi-flag" size="small" [fluid]="false"
            [outlined]="true" (click)="openAddToSprint()"></button>
          <button pButton [label]="t().delete" icon="pi pi-trash" severity="danger" size="small" [fluid]="false"
            (click)="onBulkDelete()"></button>
          <button pButton [label]="t().deselect" severity="secondary" size="small" text [fluid]="false"
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
            (cardMoveRequested)="onMoveTask($event)"
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
      [header]="t().addToSprint"
      [modal]="true"
      [style]="{ width: '420px' }"
      [closable]="true"
    >
      <div class="space-y-3 py-1">
        <p class="text-sm text-gray-700 dark:text-surface-200">
          {{ t().addSelectedTasksHeader }} <strong class="text-gray-900 dark:text-surface-0">{{ taskStore.selectionCount() }} {{ t().selectedTasks }}</strong>
        </p>

        @if (availableSprints().length === 0 && !sprintsLoading()) {
          <div class="flex items-center gap-2 p-3 rounded-lg bg-gray-50 dark:bg-surface-800 text-sm text-gray-500 dark:text-surface-400">
            <i class="pi pi-info-circle"></i>
            {{ t().noSprintPlanningOrActive }}
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
                    ({{ sprint.status === 'active' ? t().active : t().planned }})
                  </span>
                </div>
              }
            </div>
          </p-popover>
        }
      </div>

      <ng-template pTemplate="footer">
        <div class="flex justify-end gap-2">
          <button pButton type="button" [label]="t().cancel" severity="secondary" size="small"
            [fluid]="false" [outlined]="true" (click)="showSprintDialog.set(false)"></button>
          <button pButton type="button" [label]="t().addToSprint" icon="pi pi-flag" size="small"
            [fluid]="false" [disabled]="!targetSprintId || addingToSprint()"
            [loading]="addingToSprint()" (click)="doAddToSprint()"></button>
        </div>
      </ng-template>
    </p-dialog>

    <!-- Close warning confirmation dialog -->
    <p-dialog
      [visible]="showCloseConfirm()"
      (visibleChange)="onCloseConfirmVisibleChange($event)"
      [modal]="true"
      [header]="t().closeWarningHeader"
      [style]="{ width: '450px' }"
      [closable]="true"
    >
      <div class="flex flex-col gap-4">
        <div class="text-sm text-gray-600 dark:text-surface-300">
          {{ t().closeWarningMsg }}
        </div>
        
        <div class="max-h-48 overflow-y-auto border border-gray-200 dark:border-surface-700 rounded p-2 bg-gray-50 dark:bg-surface-800 flex flex-col gap-1">
          @for (child of incompleteSubTasks(); track child.id) {
            <div class="text-xs flex items-center gap-1.5 py-0.5 text-gray-700 dark:text-surface-200" [style.padding-left.px]="child.depth * 16">
              <i class="pi pi-sitemap text-gray-400"></i>
              <span class="font-semibold text-gray-500">{{ child.taskId }}:</span>
              <span class="truncate">{{ child.title }}</span>
            </div>
          }
        </div>

        <div class="flex items-center gap-2 mt-2">
          <p-checkbox [binary]="true" [ngModel]="autoCloseChildren()" (ngModelChange)="autoCloseChildren.set($event)" id="autoCloseChildrenBacklog" />
          <label for="autoCloseChildrenBacklog" class="text-sm font-medium text-gray-700 dark:text-surface-300 cursor-pointer">
            {{ t().autoCloseSubtasksLabel }}
          </label>
        </div>
      </div>

      <ng-template #footer>
        <div class="flex justify-end gap-2 mt-4">
          <button pButton [label]="t().cancelBtn" severity="secondary" (click)="cancelMove()"></button>
          <button pButton [label]="t().confirmBtn" severity="primary" (click)="confirmBulkClose()"></button>
        </div>
      </ng-template>
    </p-dialog>
  `,
})
export class BacklogComponent implements OnInit, OnDestroy {
  @ViewChild('labelManager') private readonly labelManager!: LabelManagerComponent;

  readonly taskStore = inject(TaskStore);
  protected readonly projectStore = inject(ProjectStore);
  private readonly customTrans = inject(CustomTranslationService);
  private readonly sprintService = inject(SprintService);
  private readonly layoutService = inject(LayoutService);
  private readonly attachmentService = inject(AttachmentService);
  private readonly linkService = inject(LinkService);
  private readonly taskService = inject(TaskService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly confirmService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);
  private readonly destroy$ = new Subject<void>();

  protected readonly showCloseConfirm = signal(false);
  protected readonly autoCloseChildren = signal(false);
  protected readonly bulkTargetStateId = signal<string | null>(null);
  protected readonly incompleteSubTasks = signal<Array<{ id: string; taskId: string; title: string; depth: number }>>([]);

  protected selectedGroupBy = 'state';
  protected selectedOrderBy = 'rank';
  protected showQuickCreate = signal(false);
  protected quickCreateStateId = signal<string | undefined>(undefined);
  protected currentDraftTask = signal<Task | null>(null);
  protected projectId = '';
  protected workspaceId = '';
  protected currentTaskId = signal<string | null>(null);
  protected viewMode = signal<'list' | 'board' | 'table' | 'timeline'>('list');

  protected readonly displayProps = signal<DisplayProperties>(DEFAULT_DISPLAY_PROPS);

  // Add-to-sprint dialog state
  protected showSprintDialog = signal(false);
  protected sprintsLoading = signal(false);
  protected addingToSprint = signal(false);
  protected availableSprints = signal<Sprint[]>([]);
  protected targetSprintId: string | null = null;

  readonly t = computed(() => {
    const isEn = this.projectStore.projectLanguage() === 'en';
    const ct = this.customTrans;
    return {
      selectedTasks:           ct.t('backlog.selectedTasks',          isEn ? 'tasks selected'                          : 'task đã chọn'),
      deselect:                ct.t('backlog.deselect',               isEn ? 'Deselect'                                : 'Bỏ chọn'),
      addToSprint:             ct.t('backlog.addToSprint',            isEn ? 'Add to Sprint'                           : 'Thêm vào Sprint'),
      delete:                  ct.t('backlog.delete',                 isEn ? 'Delete'                                  : 'Xóa'),
      cancel:                  ct.t('backlog.cancel',                 isEn ? 'Cancel'                                  : 'Hủy'),
      addSelectedTasksHeader:  ct.t('backlog.addSelectedTasksHeader', isEn ? 'Add selected tasks to sprint:'           : 'Thêm các task đã chọn vào sprint:'),
      noSprintPlanningOrActive:ct.t('backlog.noSprintPlanningOrActive',isEn ? 'No sprint in planning/active status. Create one first.' : 'Chưa có sprint nào ở trạng thái planning/active. Tạo sprint trước.'),
      planned:                 ct.t('backlog.sprintPlanned',          isEn ? 'Planned'                                 : 'Lên kế hoạch'),
      active:                  ct.t('backlog.sprintActive',           isEn ? 'Active'                                  : 'Đang chạy'),
      selectSprintPlaceholder: ct.t('backlog.selectSprintPlaceholder',isEn ? 'Select sprint...'                        : 'Chọn sprint...'),
      confirmDeleteHeader:     ct.t('backlog.confirmDeleteHeader',    isEn ? 'Confirm Delete'                          : 'Xác nhận xóa'),
      confirmDeleteMessage:    (count: number) => isEn ? `Delete ${count} selected tasks?` : `Xóa ${count} task đã chọn?`,
      success:                 ct.t('backlog.success',                isEn ? 'Success'                                 : 'Thành công'),
      error:                   ct.t('backlog.error',                  isEn ? 'Error'                                   : 'Lỗi'),
      taskCreated:             ct.t('backlog.taskCreated',            isEn ? 'Created new task'                        : 'Đã tạo task mới'),
      draftError:              ct.t('backlog.draftError',             isEn ? 'Could not initialize draft task'         : 'Không thể khởi tạo task nháp'),
      addedToSprintSuccess:    (count: number, sprintName: string) => isEn ? `Added ${count} tasks to sprint "${sprintName}"` : `Đã thêm ${count} task vào sprint "${sprintName}"`,
      addedToSprintError:      ct.t('backlog.addedToSprintError',     isEn ? 'Could not add tasks to sprint'           : 'Không thể thêm task vào sprint'),
      closeWarningHeader:      ct.t('backlog.closeWarningHeader',     isEn ? 'Close Task Warning'                      : 'Cảnh báo đóng task'),
      closeWarningMsg:         ct.t('backlog.closeWarningMsg',        isEn ? 'Selected task(s) have incomplete sub-tasks. Closing will leave them incomplete unless auto-closed.' : 'Task được chọn có các sub-task chưa hoàn thành. Việc đóng các task này sẽ để lại các sub-task ở trạng thái chưa hoàn thành trừ khi bạn tự động đóng.'),
      autoCloseSubtasksLabel:  ct.t('backlog.autoCloseSubtasksLabel', isEn ? 'Auto-close incomplete sub-tasks'         : 'Tự động đóng các task con chưa hoàn thành'),
      confirmBtn:              ct.t('backlog.confirmBtn',             isEn ? 'Confirm'                                 : 'Đồng ý'),
      cancelBtn:               ct.t('backlog.cancelBtn',             isEn ? 'Cancel'                                  : 'Hủy'),
    };
  });

  getTargetSprintLabel(): string {
    const found = this.availableSprints().find((s) => s.id === this.targetSprintId);
    return found ? found.name : this.t().selectSprintPlaceholder;
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

  protected onViewModeChange(mode: 'list' | 'board' | 'table' | 'timeline'): void {
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
    const isEn = this.projectStore.projectLanguage() === 'en';
    const draft = await this.taskStore.createTask(this.projectId, {
      title: isEn ? 'Draft task' : 'Task nháp',
      isDraft: true,
      stateId,
    });
    if (draft) {
      this.currentDraftTask.set(draft);
      this.showQuickCreate.set(true);
    } else {
      this.messageService.add({ severity: 'error', summary: this.t().error, detail: this.t().draftError });
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

  protected pendingMoveEvent: { taskId: string; stateId: string; backlogOrder: number } | null = null;

  protected async onMoveTask(event: { taskId: string; stateId: string; backlogOrder: number }): Promise<void> {
    const state = this.flatStates().find((s) => s.id === event.stateId);
    const isClosing = state?.group === 'completed';

    if (isClosing) {
      try {
        const res = await firstValueFrom(this.taskService.getSubItemsTree(this.projectId, event.taskId));
        const incomplete = res ? this.getIncompleteDescendants(res.items) : [];
        if (incomplete.length > 0) {
          this.pendingMoveEvent = event;
          this.incompleteSubTasks.set(incomplete);
          this.autoCloseChildren.set(false); // Default unchecked
          this.showCloseConfirm.set(true);
          return;
        }
      } catch {
        // Revert to direct move
      }
    }

    this.taskStore.moveToState(this.projectId, event.taskId, event.stateId, event.backlogOrder);
  }

  protected async onBulkClose(): Promise<void> {
    const selectedIds = Array.from(this.taskStore.selectedTaskIds());
    if (selectedIds.length === 0) return;

    // Find the first completed state in project
    const completedState = this.flatStates().find((s) => s.group === 'completed');
    if (!completedState) {
      this.messageService.add({ severity: 'error', summary: this.t().error, detail: 'Không tìm thấy trạng thái Completed trong dự án' });
      return;
    }

    const stateId = completedState.id;
    this.bulkTargetStateId.set(stateId);
    this.autoCloseChildren.set(false); // Unchecked by default

    // Fetch incomplete sub-tasks for all selected tasks
    const incompleteList: Array<{ id: string; taskId: string; title: string; depth: number }> = [];

    const fetchPromises = selectedIds.map(async (taskId) => {
      try {
        const res = await firstValueFrom(this.taskService.getSubItemsTree(this.projectId, taskId));
        if (res && res.items.length > 0) {
          incompleteList.push(...this.getIncompleteDescendants(res.items));
        }
      } catch (err) {
        // Ignore errors for individual tree loads
      }
    });

    await Promise.all(fetchPromises);

    if (incompleteList.length > 0) {
      this.incompleteSubTasks.set(incompleteList);
      this.showCloseConfirm.set(true);
    } else {
      // Direct close
      this.executeBulkCloseDirectly(stateId);
    }
  }

  private getIncompleteDescendants(nodes: any[], depth = 1): Array<{ id: string; taskId: string; title: string; depth: number }> {
    const result: Array<{ id: string; taskId: string; title: string; depth: number }> = [];
    for (const node of nodes) {
      const isCompleted = node.state?.group === 'completed';
      if (!isCompleted) {
        result.push({
          id: node.id,
          taskId: node.taskId,
          title: node.title,
          depth
        });
      }
      if (node.children && node.children.length > 0) {
        result.push(...this.getIncompleteDescendants(node.children, depth + 1));
      }
    }
    return result;
  }

  protected async confirmBulkClose(): Promise<void> {
    const bulkStateId = this.bulkTargetStateId();
    if (bulkStateId) {
      // Bulk close flow
      const selectedIds = Array.from(this.taskStore.selectedTaskIds());
      const updatePromises = selectedIds.map(id =>
        firstValueFrom(this.taskService.updateTask(this.projectId, id, { stateId: bulkStateId }))
      );

      if (this.autoCloseChildren()) {
        const completedState = this.flatStates().find((s) => s.group === 'completed');
        const completedStateId = completedState ? completedState.id : bulkStateId;
        const incompleteChildren = this.incompleteSubTasks();
        for (const child of incompleteChildren) {
          updatePromises.push(
            firstValueFrom(this.taskService.updateTask(this.projectId, child.id, { stateId: completedStateId }))
          );
        }
      }

      await Promise.allSettled(updatePromises);
      this.taskStore.clearSelection();
      this.reloadBacklog();
      this.bulkTargetStateId.set(null);
    } else if (this.pendingMoveEvent) {
      // Single move/close flow
      const event = this.pendingMoveEvent;
      this.taskStore.moveToState(this.projectId, event.taskId, event.stateId, event.backlogOrder);

      if (this.autoCloseChildren()) {
        const completedState = this.flatStates().find((s) => s.group === 'completed');
        const completedStateId = completedState ? completedState.id : event.stateId;
        const incompleteChildren = this.incompleteSubTasks();
        const updatePromises = incompleteChildren.map(child =>
          firstValueFrom(this.taskService.updateTask(this.projectId, child.id, { stateId: completedStateId }))
        );
        await Promise.allSettled(updatePromises);
      }

      this.pendingMoveEvent = null;
      this.reloadBacklog();
    }

    this.showCloseConfirm.set(false);
    this.incompleteSubTasks.set([]);
  }

  protected cancelMove(): void {
    this.showCloseConfirm.set(false);
    this.bulkTargetStateId.set(null);
    this.pendingMoveEvent = null;
    this.incompleteSubTasks.set([]);
    // Force a visual reset to discard any optimistic transfer mutations on the board
    this.taskStore.tasks.set([...this.taskStore.tasks()]);
  }

  protected onCloseConfirmVisibleChange(visible: boolean): void {
    if (!visible) {
      this.cancelMove();
    }
  }

  private async executeBulkCloseDirectly(stateId: string): Promise<void> {
    const selectedIds = Array.from(this.taskStore.selectedTaskIds());
    const updatePromises = selectedIds.map(id =>
      firstValueFrom(this.taskService.updateTask(this.projectId, id, { stateId }))
    );
    await Promise.allSettled(updatePromises);
    this.taskStore.clearSelection();
    this.reloadBacklog();
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

    this.messageService.add({ severity: 'success', summary: this.t().success, detail: this.t().taskCreated });

    if (event.createMore) {
      // Nếu chọn "Tạo tiếp", ta tự động khởi tạo ngay một task nháp mới tiếp theo
      const isEn = this.projectStore.projectLanguage() === 'en';
      const nextDraft = await this.taskStore.createTask(this.projectId, {
        title: isEn ? 'Draft task' : 'Task nháp',
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
      message: this.t().confirmDeleteMessage(this.taskStore.selectionCount()),
      header: this.t().confirmDeleteHeader,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.t().delete,
      rejectLabel: this.t().cancel,
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
            summary: this.t().success,
            detail: this.t().addedToSprintSuccess(taskIds.length, sprintName),
            life: 3000,
          });
        },
        error: (err) => {
          this.addingToSprint.set(false);
          this.messageService.add({
            severity: 'error',
            summary: this.t().error,
            detail: err?.error?.message ?? this.t().addedToSprintError,
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
