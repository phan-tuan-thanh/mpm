import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  signal,
  computed,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DragDropModule, CdkDragDrop } from '@angular/cdk/drag-drop';
import { CheckboxModule } from 'primeng/checkbox';
import { TooltipModule } from 'primeng/tooltip';
import { SkeletonModule } from 'primeng/skeleton';
import { PopoverModule, Popover } from 'primeng/popover';
import type { TaskListItem, ReorderTaskItem, ProjectState, DisplayProperties } from '@mpm/shared-types';
import { DEFAULT_DISPLAY_PROPS } from '@mpm/shared-types';
import { StateDotComponent } from '../../../../shared/components/state-dot/state-dot.component';
import { IconDisplayComponent } from '../../../../shared/components/icon-display/icon-display.component';
import { ProjectStore } from '../../../../projects/state/project.store';
import { CustomTranslationService } from '../../../../shared/services/custom-translation.service';
import { LayoutService } from '../../../../layout/services/layout.service';
import { PriorityConfigService } from '../../../services/priority-config.service';
import { TaskTypeConfigService } from '../../../../shared/services/task-type-config.service';
import { selectRootTasks } from '../task-list/task-list.helpers';

const STATE_GROUP_ORDER = ['backlog', 'unstarted', 'started', 'completed', 'cancelled'];

const AVATAR_PALETTE = [
  ['#EDE9FE', '#5B21B6'], ['#DBEAFE', '#1E40AF'], ['#D1FAE5', '#065F46'],
  ['#FEF3C7', '#92400E'], ['#FCE7F3', '#9D174D'], ['#FFE4E6', '#9F1239'],
];

interface TableGroup {
  state: ProjectState;
  tasks: TaskListItem[];
}

interface ColumnDef {
  key: string;
  propKey: keyof DisplayProperties;
  icon: string;
  label: string;
}

const ALL_COLUMNS: ColumnDef[] = [
  { key: 'state',     propKey: 'showState',     icon: 'pi pi-check-circle',   label: 'State' },
  { key: 'priority',  propKey: 'showPriority',  icon: 'pi pi-flag',           label: 'Priority' },
  { key: 'assignees', propKey: 'showAssignee',  icon: 'pi pi-user',           label: 'Assignees' },
  { key: 'labels',    propKey: 'showLabels',    icon: 'pi pi-tag',            label: 'Labels' },
  { key: 'startDate', propKey: 'showStartDate', icon: 'pi pi-calendar',       label: 'Start date' },
  { key: 'dueDate',   propKey: 'showDueDate',   icon: 'pi pi-calendar-times', label: 'Due date' },
  { key: 'estimate',  propKey: 'showEstimate',  icon: 'pi pi-hourglass',      label: 'Estimate' },
  { key: 'createdAt', propKey: 'showCreatedAt', icon: 'pi pi-calendar-plus',  label: 'Created on' },
  { key: 'updatedAt', propKey: 'showUpdatedAt', icon: 'pi pi-refresh',        label: 'Updated on' },
];

@Component({
  standalone: true,
  selector: 'app-table-view',
  imports: [
    CommonModule, FormsModule, DragDropModule,
    CheckboxModule, TooltipModule, SkeletonModule,
    PopoverModule, StateDotComponent, IconDisplayComponent,
  ],
  styles: [`
    :host { display: block; }

    .table-wrap {
      overflow-x: auto;
    }

    .sticky-col {
      position: sticky;
      left: 0;
      z-index: 2;
      background: inherit;
    }

    ::ng-deep .cdk-drag-preview {
      box-sizing: border-box;
      border-radius: 8px;
      box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1);
      background: var(--surface-overlay, #ffffff) !important;
      border: 1px solid var(--surface-border, #e2e8f0) !important;
      opacity: 0.95;
    }

    ::ng-deep .cdk-drag-placeholder {
      position: absolute !important;
      opacity: 0 !important;
      pointer-events: none !important;
      width: 100% !important;
      height: 38px !important;
    }

    ::ng-deep .cdk-drop-list-dragging .cdk-drag {
      transition: none !important;
    }

    ::ng-deep .cdk-drag-animating {
      transition: transform 150ms cubic-bezier(0, 0, 0.2, 1);
    }

    .row-hover:hover .show-on-hover { opacity: 1 !important; }
    .show-on-hover { transition: opacity 120ms ease-in-out !important; }

    .pop-list { display: flex; flex-direction: column; min-width: 160px; }
    .pop-item {
      display: flex; align-items: center; gap: 8px;
      padding: 6px 10px; border-radius: 6px; cursor: pointer;
      font-size: 13px; transition: background 120ms;
    }
    .pop-item:hover { background: var(--p-content-hover-background); }
    .pop-item.danger { color: #ef4444; }
    .pop-item.danger:hover { background: #fee2e2; }
  `],
  template: `
    @if (isLoading) {
      <div class="p-4 space-y-2">
        @for (i of [1,2,3,4,5]; track i) { <p-skeleton height="2.25rem" borderRadius="4px" /> }
      </div>
    } @else if (tableGroups().length === 0) {
      <div class="flex flex-col items-center justify-center h-64 text-gray-400 dark:text-surface-500">
        <i class="pi pi-inbox text-5xl mb-4 text-gray-200 dark:text-surface-700"></i>
        <p class="text-sm font-medium text-gray-500 dark:text-surface-400">{{ t().emptyState }}</p>
      </div>
    } @else {
      <div class="table-wrap">
        <div cdkDropListGroup>
          <!-- Column header row -->
          <div class="flex items-center bg-gray-50 dark:bg-surface-950 border-b border-gray-200 dark:border-surface-700 select-none" style="min-width: fit-content">
            <!-- Sticky left header: checkbox + taskId + title -->
            <div class="sticky-col flex items-center bg-gray-50 dark:bg-surface-950 border-r border-gray-200 dark:border-surface-700"
                 style="min-width: 460px; height: 36px;">
              <div class="flex-shrink-0 flex items-center justify-center" style="width:40px">
                <p-checkbox [binary]="true" [ngModel]="isAllSelected()" (ngModelChange)="toggleAllSelect($event)" />
              </div>
              <span class="text-xs font-mono text-gray-400 dark:text-surface-500 flex-shrink-0" style="width:58px">ID</span>
              <span class="flex-1 text-xs font-semibold text-gray-500 dark:text-surface-400 px-2">{{ t().workItems }}</span>
            </div>
            <!-- Scrollable column headers -->
            @for (col of visibleColumns(); track col.key) {
              <div class="flex items-center gap-1.5 px-3 text-xs font-semibold text-gray-500 dark:text-surface-400 flex-shrink-0"
                   style="min-width: 120px; height: 36px;">
                <i [class]="col.icon + ' text-[10px]'"></i>
                <span>{{ col.label }}</span>
              </div>
            }
          </div>

          @for (group of tableGroups(); track group.state.id) {
            <!-- Group header -->
            <div class="sticky top-0 z-10 flex items-center bg-gray-50 dark:bg-surface-950 hover:bg-gray-100 dark:hover:bg-surface-800 border-b border-gray-100 dark:border-surface-800 select-none"
                 style="height:36px; min-width: fit-content">
              <div class="sticky-col flex items-center bg-gray-50 dark:bg-surface-950" style="min-width:460px; height:36px;">
                <div class="flex items-center justify-center flex-shrink-0" style="width:40px">
                  <p-checkbox
                    [binary]="true"
                    [class.opacity-0]="!isGroupAnySelected(group.tasks)"
                    [class.show-on-hover]="!isGroupAnySelected(group.tasks)"
                    [ngModel]="isGroupAllSelected(group.tasks)"
                    (ngModelChange)="toggleGroupSelect(group.tasks, $event)" />
                </div>
                <div class="flex items-center gap-2 flex-1 cursor-pointer rounded px-2 h-full hover:bg-gray-100 dark:hover:bg-surface-900"
                     (click)="toggleGroup(group.state.id)">
                  <app-state-dot [state]="group.state" />
                  <span class="text-sm font-semibold text-gray-700 dark:text-surface-100">{{ group.state.name }}</span>
                  <span class="text-xs text-gray-500 bg-gray-200 dark:bg-surface-800 rounded px-1.5 font-medium min-w-[1.25rem] text-center leading-5">{{ group.tasks.length }}</span>
                </div>
              </div>
            </div>

            @if (!collapsedGroups().has(group.state.id)) {
              <div cdkDropList
                   [cdkDropListDisabled]="orderBy !== 'rank'"
                   [cdkDropListSortingDisabled]="true"
                   [id]="'tbl-grp-' + group.state.id"
                   (cdkDropListDropped)="onDrop($event, group.tasks, group.state.id)"
                   (mouseenter)="onEmptyListMouseEnter(group.state.id, group.tasks.length === 0)"
                   (mouseleave)="onEmptyListMouseLeave(group.state.id, group.tasks.length === 0)"
                   [style.min-height]="group.tasks.length === 0 ? '8px' : null">

                @for (task of group.tasks; track task.id) {
                  <!-- Ghost placeholder (outside cdkDrag, before it) -->
                  @if (draggedTaskId === task.id) {
                    <div class="flex items-center border-b border-gray-50 dark:border-surface-800 opacity-40 pointer-events-none bg-gray-50/50 dark:bg-surface-800/20 w-full select-none"
                         style="height:38px; min-width: fit-content">
                      <div class="sticky-col flex items-center bg-gray-50/50 dark:bg-surface-800/20" style="min-width:460px;">
                        <div style="width:40px"></div>
                        <span class="text-xs font-mono text-gray-400 dark:text-surface-500 flex-shrink-0 mr-2" style="width:58px">{{ task.taskId }}</span>
                        <span class="flex-1 text-sm text-gray-800 dark:text-surface-100 truncate px-2">{{ task.title }}</span>
                      </div>
                    </div>
                  }

                  <div cdkDrag
                       (cdkDragStarted)="onDragStart(task.id)"
                       (cdkDragEnded)="onDragEnd()"
                       (mouseenter)="hoveredTaskId = task.id; hoveredStateId = group.state.id"
                       (mouseleave)="hoveredTaskId === task.id ? hoveredTaskId = null : null"
                       class="row-hover flex items-center border-b border-gray-50 dark:border-surface-800 relative cursor-grab active:cursor-grabbing"
                       [class.bg-indigo-50]="selectedIds.has(task.id)"
                       [class.dark:bg-indigo-950/30]="selectedIds.has(task.id)"
                       style="height:38px; min-width: fit-content"
                       (click)="taskClick.emit(task)">

                    <!-- Drop line indicator (inside cdkDrag, absolute top-0) -->
                    @if (draggedTaskId && hoveredTaskId === task.id && draggedTaskId !== task.id) {
                      <div class="h-0.5 bg-indigo-600 dark:bg-indigo-500 absolute top-0 left-0 right-0 z-20 rounded-full"></div>
                    }

                    <!-- Sticky left: checkbox + taskId + title + menu btn -->
                    <div class="sticky-col flex items-center hover:bg-gray-50 dark:hover:bg-surface-800 h-full"
                         [class.bg-indigo-50]="selectedIds.has(task.id)"
                         [class.dark:bg-indigo-950/30]="selectedIds.has(task.id)"
                         style="min-width:460px; border-right: 1px solid var(--surface-border, #e5e7eb);">
                      <div class="flex items-center justify-center flex-shrink-0" style="width:40px"
                           (click)="$event.stopPropagation()">
                        <p-checkbox
                          [class.show-on-hover]="!selectedIds.has(task.id)"
                          [class.opacity-0]="!selectedIds.has(task.id)"
                          [binary]="true"
                          [ngModel]="selectedIds.has(task.id)"
                          (ngModelChange)="selectionToggle.emit(task.id)" />
                      </div>
                      <span class="text-xs font-mono text-gray-400 dark:text-surface-500 flex-shrink-0 mr-2" style="width:58px">{{ task.taskId }}</span>
                      <span class="flex-1 text-sm text-gray-800 dark:text-surface-100 truncate">{{ task.title }}</span>
                      <button class="show-on-hover opacity-0 flex-shrink-0 flex items-center justify-center w-6 h-6 mr-2 rounded hover:bg-gray-200 dark:hover:bg-surface-700 text-gray-400"
                              (click)="$event.stopPropagation(); openCtxMenu($event, task)"
                              (pointerdown)="$event.stopPropagation()">
                        <i class="pi pi-ellipsis-h text-xs"></i>
                      </button>
                    </div>

                    <!-- Scrollable data columns -->
                    @for (col of visibleColumns(); track col.key) {
                      <div class="flex items-center px-3 flex-shrink-0 text-xs text-gray-600 dark:text-surface-300"
                           style="min-width:120px; height:38px"
                           (click)="$event.stopPropagation()">
                        @switch (col.key) {
                          @case ('state') {
                            @if (task.state) {
                              <app-state-dot [state]="task.state" [size]="12" />
                              <span class="ml-1.5 truncate">{{ task.state.name }}</span>
                            }
                          }
                          @case ('priority') {
                            @if (task.priority && task.priority !== 'none') {
                              <app-icon-display
                                [icon]="priorityIcon(task.priority)"
                                [size]="14"
                                [style.color]="priorityColor(task.priority)"
                                class="flex-shrink-0 mr-1" />
                              <span class="truncate capitalize">{{ task.priority }}</span>
                            }
                          }
                          @case ('assignees') {
                            @if (task.assignees?.length) {
                              <div class="flex -space-x-1.5">
                                @for (a of task.assignees.slice(0, 3); track a.userId) {
                                  <div class="w-5 h-5 rounded-full border-2 border-white dark:border-surface-900 flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                                       [style.background]="avatarBg(a.displayName)"
                                       [style.color]="avatarFg(a.displayName)"
                                       [pTooltip]="a.displayName">
                                    {{ a.displayName[0].toUpperCase() }}
                                  </div>
                                }
                                @if (task.assignees.length > 3) {
                                  <div class="w-5 h-5 rounded-full bg-gray-100 dark:bg-surface-800 border-2 border-white dark:border-surface-900 flex items-center justify-center text-[10px] text-gray-500 dark:text-surface-400 flex-shrink-0">
                                    +{{ task.assignees.length - 3 }}
                                  </div>
                                }
                              </div>
                            }
                          }
                          @case ('labels') {
                            @if (task.labels?.length) {
                              <div class="flex items-center gap-1 flex-wrap">
                                @for (label of task.labels.slice(0, 2); track label.id) {
                                  <span class="text-[10px] px-1.5 py-0.5 rounded-full font-medium border border-gray-300 dark:border-surface-600 truncate max-w-[80px]"
                                        [style.background]="(layoutService.isDarkMode() ? label.colorDark : label.colorLight) + '22'"
                                        [style.color]="layoutService.isDarkMode() ? label.colorDark : label.colorLight"
                                        [pTooltip]="label.name">
                                    {{ label.name }}
                                  </span>
                                }
                                @if (task.labels.length > 2) {
                                  <span class="text-[10px] text-gray-500 dark:text-surface-400">+{{ task.labels.length - 2 }}</span>
                                }
                              </div>
                            }
                          }
                          @case ('startDate') {
                            @if (task.startDate) {
                              <span class="truncate">{{ formatDate(task.startDate) }}</span>
                            }
                          }
                          @case ('dueDate') {
                            @if (task.dueDate) {
                              <span class="truncate" [class.text-red-500]="isOverdue(task.dueDate)" [class.dark:text-red-400]="isOverdue(task.dueDate)">
                                {{ formatDate(task.dueDate) }}
                              </span>
                            }
                          }
                          @case ('estimate') {
                            @if (task.estimateValue != null) {
                              <span>{{ task.estimateValue }}</span>
                            }
                          }
                          @case ('createdAt') {
                            <span class="truncate">{{ formatDate(task.createdAt.toString()) }}</span>
                          }
                          @case ('updatedAt') {
                            <span class="truncate">{{ formatDate(task.updatedAt.toString()) }}</span>
                          }
                        }
                      </div>
                    }

                    <!-- DnD Preview -->
                    <div *cdkDragPreview class="flex items-center bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 shadow-xl rounded-lg px-3 gap-2 pointer-events-none select-none" style="min-width:300px; max-width:450px; height:38px; box-sizing:border-box;">
                      <span class="text-xs font-mono text-gray-400 flex-shrink-0">{{ task.taskId }}</span>
                      <span class="text-sm text-gray-800 dark:text-surface-100 font-medium truncate flex-1">{{ task.title }}</span>
                    </div>
                    <div *cdkDragPlaceholder></div>
                  </div>
                }

                <!-- End drop zone -->
                <div class="flex items-center border-b border-gray-50 dark:border-surface-800 relative"
                     style="height:32px; min-width:fit-content"
                     (mouseenter)="hoveredTaskId = 'end-' + group.state.id; hoveredStateId = group.state.id"
                     (mouseleave)="hoveredTaskId === 'end-' + group.state.id ? hoveredTaskId = null : null">
                  @if (draggedTaskId && hoveredTaskId === 'end-' + group.state.id) {
                    <div class="h-0.5 bg-indigo-600 dark:bg-indigo-500 absolute top-0 left-0 right-0 z-20 rounded-full"></div>
                  }
                </div>
              </div>
            }
          }
        </div>
      </div>
    }

    <!-- Context menu popover -->
    <p-popover #ctxPop>
      <div class="pop-list">
        <div class="pop-item" (click)="onCtxEdit()">
          <i class="pi pi-external-link text-xs"></i>
          <span>{{ t().edit }}</span>
        </div>
        <div class="pop-item" (click)="onCtxCopyId()">
          <i class="pi pi-copy text-xs"></i>
          <span>{{ t().copyId }}</span>
        </div>
        <div class="pop-item danger" (click)="onCtxDelete()">
          <i class="pi pi-trash text-xs"></i>
          <span>{{ t().delete }}</span>
        </div>
      </div>
    </p-popover>
  `,
})
export class TableViewComponent {
  @ViewChild('ctxPop') ctxPop!: Popover;

  protected readonly layoutService = inject(LayoutService);
  private readonly projectStore = inject(ProjectStore);
  private readonly customTrans = inject(CustomTranslationService);
  private readonly priorityConfigSvc = inject(PriorityConfigService);
  private readonly typeConfigSvc = inject(TaskTypeConfigService);

  readonly t = computed(() => {
    const isEn = this.projectStore.projectLanguage() === 'en';
    const ct = this.customTrans;
    return {
      workItems: ct.t('tableView.workItems', isEn ? 'Work items' : 'Công việc'),
      edit:      ct.t('tableView.edit',      isEn ? 'Open detail' : 'Mở chi tiết'),
      copyId:    ct.t('tableView.copyId',    isEn ? 'Copy ID'     : 'Sao chép ID'),
      delete:    ct.t('tableView.delete',    isEn ? 'Delete'      : 'Xóa'),
      emptyState: ct.t('backlog.emptyState', isEn ? 'Empty list'  : 'Danh sách trống'),
    };
  });

  // Signals for internal state
  protected readonly _tasks = signal<TaskListItem[]>([]);
  protected readonly _states = signal<ProjectState[]>([]);
  private readonly _displayProps = signal<DisplayProperties>(DEFAULT_DISPLAY_PROPS);

  @Input() set tasks(v: TaskListItem[]) { this._tasks.set(v); }
  @Input() set states(v: ProjectState[]) { this._states.set(v); }
  @Input() set displayProps(v: DisplayProperties) { this._displayProps.set(v); }
  get displayProps(): DisplayProperties { return this._displayProps(); }

  @Input() isLoading = false;
  @Input() orderBy = 'rank';
  @Input() selectedIds = new Set<string>();

  @Output() taskClick = new EventEmitter<TaskListItem>();
  @Output() selectionToggle = new EventEmitter<string>();
  @Output() reorder = new EventEmitter<ReorderTaskItem[]>();
  @Output() moveTask = new EventEmitter<{ taskId: string; stateId: string; backlogOrder: number }>();
  @Output() deleteTask = new EventEmitter<string>();

  // DnD state
  protected draggedTaskId: string | null = null;
  protected hoveredTaskId: string | null = null;
  protected hoveredStateId: string | null = null;

  // Collapse state
  protected readonly collapsedGroups = signal(new Set<string>());

  // Context menu
  private ctxTask: TaskListItem | null = null;

  protected readonly visibleColumns = computed((): ColumnDef[] => {
    const dp = this._displayProps();
    return ALL_COLUMNS.filter(col => !!dp[col.propKey]);
  });

  protected readonly tableGroups = computed((): TableGroup[] => {
    const rootTasks = selectRootTasks(this._tasks());
    const byState = new Map<string, TaskListItem[]>();
    for (const task of rootTasks) {
      if (!byState.has(task.stateId)) byState.set(task.stateId, []);
      byState.get(task.stateId)!.push(task);
    }

    return [...this._states()]
      .sort((a, b) => {
        const ga = STATE_GROUP_ORDER.indexOf(a.group);
        const gb = STATE_GROUP_ORDER.indexOf(b.group);
        return ga !== gb ? ga - gb : a.order - b.order;
      })
      .map(state => ({
        state,
        tasks: (byState.get(state.id) ?? []).sort((a, b) => a.backlogOrder - b.backlogOrder),
      }))
      .filter(g => g.tasks.length > 0 || !this.collapsedGroups().has(g.state.id));
  });

  protected toggleGroup(id: string): void {
    this.collapsedGroups.update(s => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  protected isAllSelected(): boolean {
    const all = this._tasks().filter(t => !t.parentId);
    return all.length > 0 && all.every(t => this.selectedIds.has(t.id));
  }

  protected toggleAllSelect(checked: boolean): void {
    for (const t of this._tasks().filter(task => !task.parentId)) {
      if (checked !== this.selectedIds.has(t.id)) {
        this.selectionToggle.emit(t.id);
      }
    }
  }

  protected isGroupAllSelected(tasks: TaskListItem[]): boolean {
    return tasks.length > 0 && tasks.every(t => this.selectedIds.has(t.id));
  }

  protected isGroupAnySelected(tasks: TaskListItem[]): boolean {
    return tasks.length > 0 && tasks.some(t => this.selectedIds.has(t.id));
  }

  protected toggleGroupSelect(tasks: TaskListItem[], checked: boolean): void {
    for (const t of tasks) {
      if (checked !== this.selectedIds.has(t.id)) {
        this.selectionToggle.emit(t.id);
      }
    }
  }

  // DnD handlers
  protected onDragStart(taskId: string): void { this.draggedTaskId = taskId; }

  protected onDragEnd(): void {
    setTimeout(() => {
      this.draggedTaskId = null;
      this.hoveredTaskId = null;
      this.hoveredStateId = null;
    }, 100);
  }

  protected onEmptyListMouseEnter(stateId: string, isEmpty: boolean): void {
    if (!this.draggedTaskId || !isEmpty) return;
    this.hoveredTaskId = 'end-' + stateId;
    this.hoveredStateId = stateId;
  }

  protected onEmptyListMouseLeave(stateId: string, isEmpty: boolean): void {
    if (!isEmpty) return;
    if (this.hoveredTaskId === 'end-' + stateId) {
      this.hoveredTaskId = null;
      this.hoveredStateId = null;
    }
  }

  protected onDrop(event: CdkDragDrop<unknown>, destTasks: TaskListItem[], destStateId: string): void {
    const movedTaskId = this.draggedTaskId;
    if (!movedTaskId) return;

    const targetTaskId = this.hoveredTaskId;
    const targetStateId = this.hoveredStateId || destStateId;

    this.draggedTaskId = null;
    this.hoveredTaskId = null;
    this.hoveredStateId = null;

    const allRootTasks = this._tasks().filter(t => !t.parentId);
    const movedTask = allRootTasks.find(t => t.id === movedTaskId);
    if (!movedTask) return;

    if (movedTask.stateId === targetStateId && targetTaskId === movedTaskId) return;

    const destFiltered = allRootTasks
      .filter(t => t.stateId === targetStateId && t.id !== movedTaskId)
      .sort((a, b) => a.backlogOrder - b.backlogOrder);

    let newOrder = 0;
    const isTargetInDest = targetTaskId && destFiltered.some(t => t.id === targetTaskId);

    if (isTargetInDest && !targetTaskId!.startsWith('end-') && targetTaskId !== movedTaskId) {
      const targetIdx = destFiltered.findIndex(t => t.id === targetTaskId);
      if (targetIdx !== -1) {
        const nextTask = destFiltered[targetIdx];
        const prevTask = destFiltered[targetIdx - 1];
        const nextOrder = nextTask.backlogOrder;
        const prevOrder = prevTask ? prevTask.backlogOrder : nextOrder - 2000;
        newOrder = (prevOrder + nextOrder) / 2;
      } else {
        const lastTask = destFiltered[destFiltered.length - 1];
        newOrder = lastTask ? lastTask.backlogOrder + 1000 : 1000;
      }
    } else {
      const lastTask = destFiltered[destFiltered.length - 1];
      newOrder = lastTask ? lastTask.backlogOrder + 1000 : 1000;
    }

    if (movedTask.stateId === targetStateId) {
      this.reorder.emit([{ taskId: movedTaskId, backlogOrder: newOrder }]);
    } else {
      this.moveTask.emit({ taskId: movedTaskId, stateId: targetStateId, backlogOrder: newOrder });
    }
  }

  // Context menu
  protected openCtxMenu(event: Event, task: TaskListItem): void {
    this.ctxTask = task;
    this.ctxPop.toggle(event);
  }

  protected onCtxEdit(): void {
    if (this.ctxTask) {
      this.taskClick.emit(this.ctxTask);
      this.ctxPop.hide();
    }
  }

  protected onCtxCopyId(): void {
    if (this.ctxTask) {
      navigator.clipboard.writeText(this.ctxTask.taskId).catch(() => {});
      this.ctxPop.hide();
    }
  }

  protected onCtxDelete(): void {
    if (this.ctxTask) {
      this.deleteTask.emit(this.ctxTask.id);
      this.ctxPop.hide();
    }
  }

  // Display helpers
  protected priorityIcon(p: string): string {
    return this.priorityConfigSvc.getConfig(this.projectStore.currentProject()?.id ?? '', p).icon;
  }

  protected priorityColor(p: string): string {
    return this.layoutService.isDarkMode()
      ? this.priorityConfigSvc.getConfig(this.projectStore.currentProject()?.id ?? '', p).colorDark
      : this.priorityConfigSvc.getConfig(this.projectStore.currentProject()?.id ?? '', p).colorLight;
  }

  protected formatDate(d: string): string {
    return new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  protected isOverdue(d: string | null | undefined): boolean {
    return !!d && new Date(d) < new Date();
  }

  protected avatarBg(n: string): string { return AVATAR_PALETTE[n.charCodeAt(0) % AVATAR_PALETTE.length][0]; }
  protected avatarFg(n: string): string { return AVATAR_PALETTE[n.charCodeAt(0) % AVATAR_PALETTE.length][1]; }
}
