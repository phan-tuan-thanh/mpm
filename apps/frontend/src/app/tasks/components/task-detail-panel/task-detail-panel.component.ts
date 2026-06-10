import {
  Component,
  OnInit,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  inject,
  signal,
  computed,
  effect,
  untracked,
  Input,
  Output,
  EventEmitter,
  Injector,
} from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DrawerModule } from 'primeng/drawer';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';

import { TaskStore } from '../../state/task.store';
import { ProjectStore } from '../../../projects/state/project.store';
import { ModuleStore } from '../../state/module.store';
import { AuthStore } from '../../../auth/state/auth.store';
import { TaskService } from '../../services/task.service';
import { AttachmentService } from '../../services/attachment.service';
import { LinkService } from '../../services/link.service';
import { RelationService } from '../../services/relation.service';
import { LayoutService } from '../../../layout/services/layout.service';
import { TaskDetailStateService } from './services/task-detail-state.service';
import type {
  Task,
  TaskActivity,
  TaskAttachment,
  TaskLink,
  TiptapDoc,
  CreateSubItemDto,
  ActivityFilterType,
} from '@mpm/shared-types';
import { Subject, takeUntil, combineLatest, distinctUntilChanged, filter } from 'rxjs';

import { TaskHeaderComponent } from './components/task-header/task-header.component';
import { TaskTitleInlineComponent } from './components/task-title-inline/task-title-inline.component';
import { SubItemsSectionComponent } from './components/sub-items-section/sub-items-section.component';
import { ActivityPanelComponent } from './components/activity-panel/activity-panel.component';
import { PropertiesSidebarComponent } from './components/properties-sidebar/properties-sidebar.component';
import { TaskAttachmentsComponent } from './components/task-attachments.component';
import { TaskLinksComponent } from './components/task-links.component';
import { RichTextEditorComponent } from '../../../shared/components/rich-text-editor/rich-text-editor.component';

@Component({
  standalone: true,
  selector: 'app-task-detail-panel',
  imports: [
    CommonModule,
    FormsModule,
    DrawerModule,
    DialogModule,
    ButtonModule,
    ToastModule,
    TooltipModule,
    TaskHeaderComponent,
    TaskTitleInlineComponent,
    SubItemsSectionComponent,
    ActivityPanelComponent,
    PropertiesSidebarComponent,
    TaskAttachmentsComponent,
    TaskLinksComponent,
    RichTextEditorComponent,
  ],
  providers: [MessageService, TaskDetailStateService],
  template: `
    <!-- Always rendered — avoids abrupt @if teardown that calls disableModality()→detectChanges() during ngOnDestroy -->
    <p-dialog
      [visible]="isVisible() && viewMode === 'popup'"
      (visibleChange)="onDialogVisibleChange($event)"
      [transitionOptions]="'0ms'"
      [modal]="true"
      [closable]="false"
      [showHeader]="false"
      styleClass="qc-dialog"
      [style]="{ width: '750px', height: '90vh', padding: '0' }"
      [contentStyle]="{ padding: '0', borderRadius: '14px', overflow: 'hidden' }"
      [dismissableMask]="true"
      (onHide)="onDialogHide()"
    >
      @if (viewMode === 'popup') {
        <ng-container *ngTemplateOutlet="detailTpl"></ng-container>
      }
    </p-dialog>

    <p-drawer
      [visible]="isVisible() && viewMode === 'right-pane'"
      (visibleChange)="onDrawerVisibleChange($event)"
      position="right"
      [modal]="false"
      [style]="{ width: '680px', padding: '0' }"
      [dismissible]="true"
      [showCloseIcon]="false"
      (onHide)="onDrawerClose()"
    >
      @if (viewMode === 'right-pane') {
        <ng-container *ngTemplateOutlet="detailTpl"></ng-container>
      }
    </p-drawer>

    @if (viewMode === 'full-page' && isVisible()) {
      <div class="absolute inset-0 z-10 bg-white dark:bg-surface-900 overflow-hidden flex flex-col border border-gray-100 dark:border-surface-700 rounded-xl shadow-sm">
        <ng-container *ngTemplateOutlet="detailTpl"></ng-container>
      </div>
    }

    <ng-template #detailTpl>
      <div class="flex flex-col h-full w-full overflow-hidden bg-white dark:bg-surface-900 text-gray-800 dark:text-surface-100">
        <!-- ══ Header Bar ══ -->
        <div class="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-surface-700 bg-gray-50 dark:bg-surface-800 flex-shrink-0">
          <div class="flex items-center gap-3 flex-1 min-w-0">
            @if (task()) {
              <app-task-header
                [task]="task"
                [saveStatus]="saveStatusSignal"
              />
            }
          </div>

          <!-- Header Controls -->
          <div class="flex items-center gap-2 flex-shrink-0">
            <!-- Sidebar Toggle (Req 8.4, 8.6: Only visible in full-page mode) -->
            @if (viewMode === 'full-page') {
              <button pButton icon="pi pi-bars" class="p-button-rounded p-button-text p-button-sm"
                [severity]="stateService.sidebarExpanded() ? 'primary' : 'secondary'"
                pTooltip="Bật/Tắt thuộc tính sidebar"
                aria-label="Toggle sidebar"
                (click)="toggleSidebar()"></button>
              <div class="w-px h-4 bg-gray-200 dark:bg-surface-600 mx-1"></div>
            }

            <!-- View Mode Controls -->
            <button pButton icon="pi pi-align-right" class="p-button-rounded p-button-text p-button-sm"
              [severity]="viewMode === 'right-pane' ? 'primary' : 'secondary'"
              pTooltip="Slide-in Drawer" (click)="viewModeChange.emit('right-pane')"></button>
            <button pButton icon="pi pi-clone" class="p-button-rounded p-button-text p-button-sm"
              [severity]="viewMode === 'popup' ? 'primary' : 'secondary'"
              pTooltip="Dialog Popup" (click)="viewModeChange.emit('popup')"></button>
            <button pButton icon="pi pi-desktop" class="p-button-rounded p-button-text p-button-sm"
              [severity]="viewMode === 'full-page' ? 'primary' : 'secondary'"
              pTooltip="Full Page" (click)="viewModeChange.emit('full-page')"></button>

            <div class="w-px h-4 bg-gray-200 dark:bg-surface-600 mx-1"></div>

            <!-- Close -->
            <button pButton [icon]="viewMode === 'full-page' ? 'pi pi-arrow-left' : 'pi pi-times'"
              class="p-button-rounded p-button-text p-button-sm" severity="secondary"
              [pTooltip]="viewMode === 'full-page' ? 'Quay lại danh sách' : 'Đóng'"
              (click)="onClose()"></button>
          </div>
        </div>

        <!-- ══ Body ══ -->
        @if (task()) {
          <!-- ─── Single Column Layout (Drawer / Popup) — Req 8.2, 8.3 ─── -->
          @if (viewMode !== 'full-page') {
            <!-- Single scrollable column — title + all content + activity in one scroll -->
            <div class="flex-1 overflow-y-auto min-h-0">
              <!-- Title -->
              <div class="px-4 py-3 border-b border-gray-100 dark:border-surface-700">
                <app-task-title-inline
                  [title]="task()!.title"
                  [viewMode]="viewMode === 'right-pane' ? 'drawer' : 'popup'"
                  (titleSaved)="onTitleSaved($event)"
                />
              </div>

              <!-- Description -->
              <div class="px-4 pt-4 pb-3 border-b border-gray-100 dark:border-surface-700">
                <label class="text-xs font-semibold text-gray-400 dark:text-surface-500 uppercase tracking-wide mb-2 block">Mô tả</label>
                @if (showRte()) {
                  <app-rich-text-editor
                    [ngModel]="task()?.description"
                    (ngModelChange)="onDescriptionChange($event)"
                    placeholder="Thêm mô tả..."
                    (blurEditor)="saveDescription()"
                  />
                } @else {
                  <div class="min-h-[4rem] rounded-lg border border-gray-200 dark:border-surface-700 bg-gray-50 dark:bg-surface-800"></div>
                }
              </div>

              <!-- Attachments & Links -->
              <div class="px-4 py-3 border-b border-gray-100 dark:border-surface-700 flex flex-col gap-3">
                <app-task-attachments
                  [projectId]="projectId()"
                  [taskId]="task()!.id"
                  [attachments]="task()!.attachments ?? []"
                  (upload)="onFileUpload($event)"
                  (delete)="deleteAttachment($event)"
                  (deleteGroup)="deleteAttachmentGroup($event)"
                  (batchUpdate)="onBatchUpdateAttachments($event)"
                />
                <app-task-links
                  [links]="task()!.links ?? []"
                  (add)="addLink($event)"
                  (delete)="deleteLink($event)"
                />
              </div>

              <!-- Sub-Items -->
              <div class="px-4 py-3 border-b border-gray-100 dark:border-surface-700">
                <app-sub-items-section
                  [items]="stateService.subItemsTree()"
                  [totalCount]="stateService.subItemsTotalCount()"
                  [doneCount]="stateService.subItemsDoneCount()"
                  [members]="memberOptions()"
                  [projectId]="projectId()"
                  [taskId]="task()!.id"
                  (createSubItem)="onCreateSubItem($event)"
                  (subItemClicked)="openChildTask($event)"
                />
              </div>

              <!-- Activity + Properties tab (compact, no internal scroll — parent div scrolls) -->
              <div class="px-4 pt-3 pb-6">
                <app-activity-panel
                  [entries]="stateService.activityEntries()"
                  [loading]="stateService.activityLoading()"
                  [hasMore]="stateService.activityHasMore()"
                  [activeFilter]="activeActivityTab()"
                  [viewMode]="viewMode === 'right-pane' ? 'drawer' : 'popup'"
                  [showPropertiesTab]="true"
                  [compact]="true"
                  (filterChanged)="onActivityFilterChanged($event)"
                  (loadMore)="onActivityLoadMore()"
                >
                  <div activityPanelProperties>
                    <app-properties-sidebar
                      [task]="task()"
                      [states]="stateOptions()"
                      [members]="memberOptions()"
                      [labels]="labelOptions()"
                      [modules]="moduleOptions()"
                      [availableParentTasks]="taskStore.tasks()"
                      [collapseState]="stateService.sectionCollapseState()"
                      (propertyChanged)="onPropertyChanged($event)"
                      (parentChanged)="onParentChanged($event)"
                      (parentClicked)="openChildTask($event)"
                      (sectionToggled)="onSectionToggled($event)"
                    />
                  </div>
                </app-activity-panel>
              </div>
            </div>
          } @else {
            <!-- ─── Two Column Layout (Full Page) — Req 8.1 ─── -->
            <div class="flex-1 flex overflow-hidden">
              <!-- Left Column: Main Content (fills remaining width) -->
              <div class="flex-1 overflow-y-auto px-8 py-6 flex flex-col gap-6 min-w-0">
                <!-- Title -->
                <app-task-title-inline
                  [title]="task()!.title"
                  viewMode="full-page"
                  (titleSaved)="onTitleSaved($event)"
                />

                <!-- Description — showRte deferred via setTimeout so Tiptap init doesn't block the mode-switch CD cycle -->
                <div>
                  <label class="text-xs font-semibold text-gray-400 dark:text-surface-500 uppercase tracking-wide mb-2 block">Mô tả</label>
                  @if (showRte()) {
                    <app-rich-text-editor
                      [ngModel]="task()?.description"
                      (ngModelChange)="onDescriptionChange($event)"
                      placeholder="Thêm mô tả..."
                      (blurEditor)="saveDescription()"
                    ></app-rich-text-editor>
                  } @else {
                    <div class="min-h-[5rem] rounded-lg border border-gray-200 dark:border-surface-700 bg-gray-50 dark:bg-surface-800"></div>
                  }
                </div>

                <!-- Attachments & Links -->
                <div class="border-t border-gray-100 dark:border-surface-800 pt-4 flex flex-col gap-4">
                  <app-task-attachments
                    [projectId]="projectId()"
                    [taskId]="task()!.id"
                    [attachments]="task()!.attachments ?? []"
                    (upload)="onFileUpload($event)"
                    (delete)="deleteAttachment($event)"
                    (deleteGroup)="deleteAttachmentGroup($event)"
                    (batchUpdate)="onBatchUpdateAttachments($event)"
                  />
                  <app-task-links
                    [links]="task()!.links ?? []"
                    (add)="addLink($event)"
                    (delete)="deleteLink($event)"
                  />
                </div>

                <!-- Sub-Items Section -->
                <div class="border-t border-gray-100 dark:border-surface-800 pt-6">
                  <app-sub-items-section
                    [items]="stateService.subItemsTree()"
                    [totalCount]="stateService.subItemsTotalCount()"
                    [doneCount]="stateService.subItemsDoneCount()"
                    [members]="memberOptions()"
                    [projectId]="projectId()"
                    [taskId]="task()!.id"
                    (createSubItem)="onCreateSubItem($event)"
                    (subItemClicked)="openChildTask($event)"
                  />
                </div>

                <!-- Activity Panel (no Properties tab in full-page mode) -->
                <div class="border-t border-gray-100 dark:border-surface-800 pt-6">
                  <app-activity-panel
                    [entries]="stateService.activityEntries()"
                    [loading]="stateService.activityLoading()"
                    [hasMore]="stateService.activityHasMore()"
                    [activeFilter]="activeActivityTab()"
                    viewMode="full-page"
                    [showPropertiesTab]="false"
                    [compact]="false"
                    (filterChanged)="onActivityFilterChanged($event)"
                    (loadMore)="onActivityLoadMore()"
                  />
                </div>
              </div>

              <!-- Right Column: Properties Sidebar (Req 8.1, 8.4, 8.5) -->
              <div
                class="border-l border-gray-100 dark:border-surface-700 bg-gray-50/30 dark:bg-surface-900/30 flex-shrink-0 relative overflow-hidden"
                [style.width]="stateService.sidebarExpanded() ? sidebarWidth() + 'px' : '0px'"
                [style.opacity]="stateService.sidebarExpanded() ? '1' : '0'"
                [style.transition]="isResizing() ? 'opacity 200ms' : 'opacity 200ms, width 200ms ease-in-out'"
              >
                <!-- Drag-resize handle on the left edge -->
                @if (stateService.sidebarExpanded()) {
                  <div
                    class="absolute left-0 top-0 bottom-0 w-1 z-10 cursor-col-resize select-none hover:bg-indigo-400/50 active:bg-indigo-500/60 transition-colors"
                    (mousedown)="onResizeStart($event)"
                  ></div>
                }
                <!-- Scrollable content -->
                <div class="h-full overflow-y-auto">
                  <div class="p-5 w-full box-border" [style.min-width]="sidebarWidth() + 'px'">
                    <app-properties-sidebar
                      [task]="task()"
                      [states]="stateOptions()"
                      [members]="memberOptions()"
                      [labels]="labelOptions()"
                      [modules]="moduleOptions()"
                      [availableParentTasks]="taskStore.tasks()"
                      [collapseState]="stateService.sectionCollapseState()"
                      (propertyChanged)="onPropertyChanged($event)"
                      (parentChanged)="onParentChanged($event)"
                      (parentClicked)="openChildTask($event)"
                      (sectionToggled)="onSectionToggled($event)"
                    />
                  </div>
                </div>
              </div>
            </div>
          }
        }
      </div>
    </ng-template>
    <p-toast />
  `,
})
export class TaskDetailPanelComponent implements OnInit, OnChanges, OnDestroy {
  // ─── Injected Services ──────────────────────────────────────────────────
  readonly taskStore = inject(TaskStore);
  readonly projectStore = inject(ProjectStore);
  readonly moduleStore = inject(ModuleStore);
  readonly stateService = inject(TaskDetailStateService);
  private readonly authStore = inject(AuthStore);
  private readonly attachmentService = inject(AttachmentService);
  private readonly taskService = inject(TaskService);
  private readonly linkService = inject(LinkService);
  private readonly relationService = inject(RelationService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);
  protected readonly layoutService = inject(LayoutService);
  private readonly destroy$ = new Subject<void>();
  private readonly injector = inject(Injector);

  // ─── Inputs / Outputs ──────────────────────────────────────────────────
  @Input() viewMode: 'right-pane' | 'full-page' | 'popup' = 'right-pane';
  @Output() viewModeChange = new EventEmitter<'right-pane' | 'full-page' | 'popup'>();

  // ─── Component State ────────────────────────────────────────────────────
  readonly task = this.taskStore.currentTask;
  readonly isVisible = signal(false);
  /** Delayed true so Tiptap init happens in a separate macrotask from the mode-switch CD cycle */
  protected readonly showRte = signal(false);
  private _showRteTimer?: ReturnType<typeof setTimeout>;
  protected readonly currentUserId = computed(() => this.authStore.currentUser()?.id ?? '');
  private isDestroying = false;

  /** Signal accessor for save status — passed to TaskHeaderComponent */
  readonly saveStatusSignal = computed(() => this.taskStore.saveStatus());

  /** Active tab in the activity panel — separate from the API filter so 'properties' tab works */
  protected readonly activeActivityTab = signal<ActivityFilterType | 'properties'>('all');

  /** Width of the properties sidebar in pixels; persisted to localStorage */
  protected readonly sidebarWidth = signal(this.loadSidebarWidth());
  /** True while the user is dragging the resize handle — suppresses width CSS transition */
  protected readonly isResizing = signal(false);

  // ─── Computed options for child components ─────────────────────────────
  protected readonly projectId = computed(() => this.projectStore.currentProject()?.id ?? '');

  protected readonly stateOptions = computed(() => {
    const states = this.projectStore.currentProjectStates();
    return states ? Object.values(states).flat() : [];
  });

  protected readonly memberOptions = computed(() => this.projectStore.members());
  protected readonly labelOptions = computed(() => this.taskStore.labels());
  protected readonly moduleOptions = computed(() => this.moduleStore.modules());

  // ─── Constructor Effects ────────────────────────────────────────────────
  constructor() {
    // Effect: chỉ trigger khi task ID hoặc projectId thay đổi — KHÔNG phải
    // khi task object được cập nhật (save property, etc.).
    // Dùng untracked() để toàn bộ side-effects bên trong không tạo dependency mới.
    let lastLoadedTaskId: string | undefined;
    effect(() => {
      const taskId = this.task()?.id;
      const projectId = this.projectId();
      if (taskId && projectId && taskId !== lastLoadedTaskId) {
        lastLoadedTaskId = taskId;
        untracked(() => {
          this.stateService.loadSubItemsTree(projectId, taskId);
          const limit = this.viewMode === 'full-page' ? 20 : 15;
          this.stateService.loadActivity(projectId, taskId, 'all', 1, limit);
        });
      }
    });

    // Show RTE when panel becomes visible; hide when it closes
    effect(() => {
      const visible = this.isVisible();
      untracked(() => {
        clearTimeout(this._showRteTimer);
        if (visible) {
          this._showRteTimer = setTimeout(() => this.showRte.set(true));
        } else {
          this.showRte.set(false);
        }
      });
    });
  }

  // ─── Lifecycle ──────────────────────────────────────────────────────────

  ngOnInit(): void {
    // Wait for projectId to be available before reacting to queryParams.
    // On direct URL load, projectId may be empty until the project store hydrates.
    // combineLatest ensures we only fire once both are ready.
    const projectId$ = toObservable(this.projectId, { injector: this.injector }).pipe(
      filter((id): id is string => !!id),
      distinctUntilChanged(),
    );

    const queryParams$ = this.route.queryParams.pipe(
      distinctUntilChanged((a, b) => a['taskId'] === b['taskId']),
    );

    combineLatest([queryParams$, projectId$]).pipe(
      takeUntil(this.destroy$),
      distinctUntilChanged(([pA, projA], [pB, projB]) => pA['taskId'] === pB['taskId'] && projA === projB),
    ).subscribe(([params, projectId]) => {
      const taskId = params['taskId'];
      this._pendingDescription = undefined; // reset on any task navigation
      if (taskId) {
        this.isVisible.set(true);
        this.taskStore.loadTask(projectId, taskId);
        if (!this.projectStore.members().length) this.projectStore.loadMembers(projectId);
        if (!this.moduleStore.modules().length) this.moduleStore.loadModules(projectId);
        if (!this.taskStore.labels().length) this.taskStore.loadLabels(projectId);
      } else {
        this.isVisible.set(false);
      }
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['viewMode']) return;
    // Template branches change on viewMode switch — reset and re-defer RTE init
    // to avoid blocking the mode-switch CD cycle regardless of which mode we switch to
    clearTimeout(this._showRteTimer);
    this.showRte.set(false);
    if (this.isVisible()) {
      this._showRteTimer = setTimeout(() => this.showRte.set(true));
    }
  }

  ngOnDestroy(): void {
    this.isDestroying = true;
    clearTimeout(this._showRteTimer);
    this.isVisible.set(false);
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ─── Header Actions ─────────────────────────────────────────────────────

  /** Toggle sidebar and persist state (Req 8.4, 8.7) */
  protected toggleSidebar(): void {
    this.stateService.toggleSidebar();
  }

  // ─── Sidebar Resize ─────────────────────────────────────────────────────

  private loadSidebarWidth(): number {
    try {
      const saved = localStorage.getItem('task-detail-sidebar-width');
      if (saved) return Math.max(240, Math.min(640, parseInt(saved, 10)));
    } catch { /* ignore */ }
    return 360;
  }

  private saveSidebarWidth(w: number): void {
    try { localStorage.setItem('task-detail-sidebar-width', String(w)); } catch { /* ignore */ }
  }

  protected onResizeStart(e: MouseEvent): void {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = this.sidebarWidth();
    this.isResizing.set(true);

    const onMove = (ev: MouseEvent) => {
      const newWidth = Math.max(240, Math.min(640, startWidth + (startX - ev.clientX)));
      this.sidebarWidth.set(newWidth);
    };

    const onUp = () => {
      this.isResizing.set(false);
      this.saveSidebarWidth(this.sidebarWidth());
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  protected onDialogVisibleChange(visible: boolean): void {
    if (!visible && this.viewMode === 'popup' && !this.isDestroying) {
      this.isVisible.set(false);
      this.onClose();
    }
  }

  protected onDrawerVisibleChange(visible: boolean): void {
    if (!visible && this.viewMode === 'right-pane' && !this.isDestroying) {
      this.isVisible.set(false);
      this.onClose();
    }
  }

  protected onDialogHide(): void {
    if (this.isDestroying) return;
    if (this.viewMode !== 'popup') return;
    this.onClose();
  }

  protected onDrawerClose(): void {
    if (this.isDestroying) return;
    if (this.viewMode !== 'right-pane') return;
    this.onClose();
  }

  protected onClose(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { taskId: null },
      queryParamsHandling: 'merge',
    });
  }

  // ─── Title ──────────────────────────────────────────────────────────────

  protected onTitleSaved(newTitle: string): void {
    const t = this.task();
    if (t) {
      this.taskStore.updateTask(this.projectId(), t.id, { title: newTitle });
    }
  }

  // ─── Description ────────────────────────────────────────────────────────

  private _pendingDescription: TiptapDoc | null | undefined = undefined;

  protected onDescriptionChange(val: TiptapDoc | null): void {
    this._pendingDescription = val;
  }

  protected saveDescription(): void {
    if (this._pendingDescription === undefined) return;
    const t = this.task();
    if (t) {
      this.taskStore.updateTask(this.projectId(), t.id, { description: this._pendingDescription });
      this._pendingDescription = undefined;
    }
  }

  // ─── Properties Sidebar Events ──────────────────────────────────────────

  protected onPropertyChanged(event: { field: string; value: unknown }): void {
    const t = this.task();
    if (t) {
      this.taskStore.updateTask(this.projectId(), t.id, { [event.field]: event.value } as any);
    }
  }

  protected onParentChanged(parentId: string | null): void {
    const t = this.task();
    if (t) {
      this.taskStore.updateTask(this.projectId(), t.id, { parentId } as any);
    }
  }

  protected onSectionToggled(event: { key: string; expanded: boolean }): void {
    this.stateService.toggleSection(event.key);
  }

  // ─── Sub-Items Events ───────────────────────────────────────────────────

  protected onCreateSubItem(dto: CreateSubItemDto): void {
    const t = this.task();
    if (!t) return;
    const projectId = this.projectId();

    this.taskStore
      .createTask(projectId, {
        title: dto.title,
        parentId: dto.parentId,
        type: t.type === 'epic' ? 'story' : t.type === 'story' ? 'task' : 'subtask',
        assigneeIds: dto.assigneeIds,
        priority: dto.priority,
        dueDate: dto.dueDate,
      } as any)
      .then(() => {
        // Reload sub-items tree after creation
        this.stateService.loadSubItemsTree(projectId, t.id);
      });
  }

  protected openChildTask(taskId: string): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { taskId },
      queryParamsHandling: 'merge',
    });
  }

  // ─── Activity Events ────────────────────────────────────────────────────

  protected onActivityFilterChanged(filter: ActivityFilterType | 'properties'): void {
    this.activeActivityTab.set(filter);
    if (filter === 'properties') return;
    const t = this.task();
    if (t) {
      this.stateService.setActivityFilter(filter as ActivityFilterType, this.projectId(), t.id);
    }
  }

  protected onActivityLoadMore(): void {
    const t = this.task();
    if (t) {
      this.stateService.loadMoreActivity(this.projectId(), t.id);
    }
  }

  // ─── Attachment & Link Events ───────────────────────────────────────────

  protected onFileUpload(event: { files: FileList; title: string }): void {
    const t = this.task();
    if (!t) return;
    const title = event.title || undefined;
    Array.from(event.files).forEach(file => {
      this.attachmentService.upload(this.projectId(), t.id, file, title).subscribe({
        next: (attachment) => this.taskStore.addAttachment(attachment),
        error: (err) =>
          this.messageService.add({
            severity: 'error',
            summary: err.error?.message ?? 'Upload thất bại',
          }),
      });
    });
  }

  protected addLink(event: { url: string; title?: string }): void {
    const t = this.task();
    if (!t) return;
    this.linkService.addLink(this.projectId(), t.id, event).subscribe({
      next: () => this.taskStore.loadTask(this.projectId(), t.taskId),
      error: (err) =>
        this.messageService.add({
          severity: 'error',
          summary: err.error?.message ?? 'Lỗi',
        }),
    });
  }

  protected deleteAttachment(att: TaskAttachment): void {
    const t = this.task();
    if (t) {
      this.attachmentService
        .delete(this.projectId(), t.id, att.id)
        .subscribe(() => this.taskStore.removeAttachment(att.id));
    }
  }

  protected deleteAttachmentGroup(atts: TaskAttachment[]): void {
    const t = this.task();
    if (!t) return;
    atts.forEach(att => {
      this.attachmentService
        .delete(this.projectId(), t.id, att.id)
        .subscribe(() => this.taskStore.removeAttachment(att.id));
    });
  }

  protected onBatchUpdateAttachments(items: Array<{ id: string; title?: string | null; sortOrder?: number }>): void {
    const t = this.task();
    if (!t || !items.length) return;
    this.taskStore.batchUpdateAttachments(items);
    this.attachmentService
      .batchUpdate(this.projectId(), t.id, items)
      .subscribe({ error: () => this.taskStore.loadTask(this.projectId(), t.taskId) });
  }

  protected deleteLink(link: TaskLink): void {
    const t = this.task();
    if (t) {
      this.linkService
        .deleteLink(this.projectId(), t.id, link.id)
        .subscribe(() => this.taskStore.loadTask(this.projectId(), t.taskId));
    }
  }
}
