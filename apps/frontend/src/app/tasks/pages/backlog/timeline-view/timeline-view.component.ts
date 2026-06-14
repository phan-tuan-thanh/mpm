import {
  Component, Input, Output, EventEmitter, signal, computed, inject,
  ElementRef, ViewChild, AfterViewInit, OnDestroy, ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DragDropModule, CdkDragDrop } from '@angular/cdk/drag-drop';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TooltipModule } from 'primeng/tooltip';
import { SkeletonModule } from 'primeng/skeleton';
import type { TaskListItem, ReorderTaskItem, ProjectState } from '@mpm/shared-types';
import { ProjectStore } from '../../../../projects/state/project.store';
import { CustomTranslationService } from '../../../../shared/services/custom-translation.service';
import { LayoutService } from '../../../../layout/services/layout.service';
import {
  TimelineScale,
  COL_WIDTH,
  buildTimelineHeader,
  getBarStyle,
  getDefaultViewStart,
  getDefaultColCount,
  getTodayOffset,
} from './timeline-utils';

const STATE_GROUP_ORDER = ['backlog', 'unstarted', 'started', 'completed', 'cancelled'];

interface TaskGroup {
  state: ProjectState;
  tasks: TaskListItem[];
  collapsed: boolean;
}

@Component({
  standalone: true,
  selector: 'app-timeline-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    DragDropModule,
    SelectButtonModule,
    TooltipModule,
    SkeletonModule,
  ],
  styles: [`
    :host { display: flex; flex-direction: column; height: 100%; overflow: hidden; }

    .timeline-grid {
      display: flex;
      flex: 1;
      overflow: hidden;
      min-height: 0;
    }

    .left-panel {
      width: 320px;
      flex-shrink: 0;
      overflow-y: auto;
      overflow-x: hidden;
      border-right: 1px solid var(--p-surface-200);
      scrollbar-width: none;
    }
    .left-panel::-webkit-scrollbar { display: none; }

    .right-panel {
      flex: 1;
      overflow: auto;
      position: relative;
    }

    .col-cell {
      flex-shrink: 0;
      box-sizing: border-box;
    }

    .row-height { height: 36px; }
    .group-header-height { height: 36px; }

    ::ng-deep .cdk-drag-preview {
      box-sizing: border-box;
      border-radius: 6px;
      box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1);
      background: var(--p-surface-overlay, #ffffff) !important;
      border: 1px solid var(--p-surface-border, #e2e8f0) !important;
      opacity: 0.95;
    }

    ::ng-deep .cdk-drag-placeholder {
      position: absolute !important;
      opacity: 0 !important;
      pointer-events: none !important;
      width: 100% !important;
      height: 36px !important;
    }

    ::ng-deep .cdk-drop-list-dragging .cdk-drag {
      transition: none !important;
    }

    ::ng-deep .cdk-drag-animating {
      transition: transform 150ms cubic-bezier(0,0,0.2,1);
    }
  `],
  template: `
    <!-- Top bar -->
    <div class="flex items-center gap-3 px-4 py-2 border-b border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-950 flex-shrink-0" style="height:44px">
      <span class="text-xs text-surface-500 dark:text-surface-400 font-medium">
        {{ allRootTasks().length }} {{ t().workItems }}
      </span>
      <div class="flex-1"></div>
      <p-selectbutton
        [options]="scaleOptions"
        [(ngModel)]="scale"
        (ngModelChange)="onScaleChange($event)"
        optionLabel="label"
        optionValue="value"
        [style]="{'font-size': '12px'}" />
      <button
        class="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 text-surface-600 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
        (click)="scrollToToday()">
        {{ t().today }}
      </button>
    </div>

    @if (isLoading) {
      <div class="p-4 space-y-2 flex-1">
        @for (i of [1,2,3,4,5]; track i) {
          <p-skeleton height="36px" borderRadius="4px" />
        }
      </div>
    } @else {
      <div class="timeline-grid">
        <!-- LEFT PANEL -->
        <div class="left-panel" #leftPanel>
          <!-- Left header -->
          <div
            class="flex items-center border-b border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-900 sticky top-0 z-10 flex-shrink-0"
            [style.height.px]="headerHeight()">
            <div class="flex-1 px-3 text-xs font-semibold text-surface-600 dark:text-surface-400 flex items-end pb-2">
              {{ t().workItems }}
            </div>
            <div class="w-20 px-2 text-xs font-semibold text-surface-500 dark:text-surface-500 flex items-end pb-2 flex-shrink-0">
              {{ t().duration }}
            </div>
          </div>

          <!-- Groups with tasks -->
          @for (group of taskGroups(); track group.state.id) {
            <!-- Group header -->
            <div
              class="flex items-center gap-2 px-3 border-b border-surface-100 dark:border-surface-800 bg-surface-50/80 dark:bg-surface-900/80 cursor-pointer hover:bg-surface-100 dark:hover:bg-surface-800 select-none sticky z-[5] group-header-height"
              [style.top.px]="headerHeight()"
              (click)="toggleGroup(group.state.id)">
              <i class="pi text-xs transition-transform duration-150"
                 [class.pi-chevron-down]="!group.collapsed"
                 [class.pi-chevron-right]="group.collapsed"
                 [style.color]="getStateColor(group.state)"></i>
              <span
                class="w-2.5 h-2.5 rounded-full flex-shrink-0"
                [style.background-color]="getStateColor(group.state)"></span>
              <span class="text-xs font-semibold text-surface-700 dark:text-surface-200 truncate flex-1">
                {{ group.state.name }}
              </span>
              <span class="text-xs text-surface-500 bg-surface-200 dark:bg-surface-700 rounded px-1.5 font-medium min-w-[1.25rem] text-center leading-5 flex-shrink-0">
                {{ group.tasks.length }}
              </span>
            </div>

            @if (!group.collapsed) {
              <div
                cdkDropList
                [cdkDropListSortingDisabled]="true"
                [id]="'tl-grp-' + group.state.id"
                (cdkDropListDropped)="onDrop($event, group)">

                @for (task of group.tasks; track task.id) {
                  <!-- Ghost placeholder (outside cdkDrag, before it) -->
                  @if (draggedId === task.id) {
                    <div class="flex items-center border-b border-surface-50 dark:border-surface-800 opacity-70 pointer-events-none bg-gray-50/50 dark:bg-surface-800/20 row-height select-none">
                      <div class="px-3 text-xs text-surface-600 dark:text-surface-300 truncate flex-1 flex items-center gap-1.5">
                        <span class="text-surface-400 dark:text-surface-600 font-mono text-[10px] flex-shrink-0">{{ task.taskId }}</span>
                        <span class="truncate">{{ task.title }}</span>
                      </div>
                    </div>
                  }

                  <div
                    cdkDrag
                    (cdkDragStarted)="onDragStart(task.id)"
                    (cdkDragEnded)="onDragEnd()"
                    class="flex items-center border-b border-surface-50 dark:border-surface-800 relative cursor-grab active:cursor-grabbing row-height hover:bg-surface-50 dark:hover:bg-surface-800"
                    (mouseenter)="hoveredId = task.id"
                    (mouseleave)="hoveredId === task.id ? hoveredId = null : null">

                    <!-- Line indicator -->
                    @if (draggedId && hoveredId === task.id && draggedId !== task.id) {
                      <div class="h-0.5 bg-indigo-600 dark:bg-indigo-500 absolute top-0 left-0 right-0 z-20 rounded-full"></div>
                    }

                    <div
                      class="flex items-center gap-1.5 px-3 flex-1 min-w-0 h-full"
                      (click)="taskClick.emit(task)"
                      (pointerdown)="$event.stopPropagation()">
                      <span class="text-surface-400 dark:text-surface-600 font-mono text-[10px] flex-shrink-0">{{ task.taskId }}</span>
                      <span class="text-xs text-surface-700 dark:text-surface-200 truncate flex-1">{{ task.title }}</span>
                    </div>
                    <div class="w-20 px-2 text-xs text-surface-500 dark:text-surface-400 flex items-center flex-shrink-0">
                      {{ getDuration(task) }}
                    </div>

                    <!-- Drag preview -->
                    <div *cdkDragPreview
                         class="flex items-center bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 shadow-xl rounded-lg px-3 gap-2 pointer-events-none select-none row-height"
                         style="min-width: 200px; max-width: 320px; box-sizing: border-box;">
                      <span class="text-[10px] font-mono text-surface-400 flex-shrink-0">{{ task.taskId }}</span>
                      <span class="text-xs text-surface-800 dark:text-surface-100 font-medium truncate flex-1">{{ task.title }}</span>
                    </div>
                    <div *cdkDragPlaceholder></div>
                  </div>
                }

                <!-- End drop zone -->
                <div
                  class="relative border-b border-surface-50 dark:border-surface-800"
                  style="height: 8px;"
                  (mouseenter)="hoveredId = 'end-' + group.state.id"
                  (mouseleave)="hoveredId === 'end-' + group.state.id ? hoveredId = null : null">
                  @if (draggedId && hoveredId === 'end-' + group.state.id) {
                    <div class="h-0.5 bg-indigo-600 dark:bg-indigo-500 absolute top-0 left-0 right-0 z-20 rounded-full"></div>
                  }
                </div>
              </div>
            }
          }

          <!-- No date group -->
          @if (noDateTasks().length > 0) {
            <div
              class="flex items-center gap-2 px-3 border-b border-surface-100 dark:border-surface-800 bg-surface-50/80 dark:bg-surface-900/80 cursor-pointer hover:bg-surface-100 dark:hover:bg-surface-800 select-none group-header-height"
              (click)="toggleGroup('__nodate__')">
              <i class="pi text-xs transition-transform duration-150"
                 [class.pi-chevron-down]="!collapsedGroups().has('__nodate__')"
                 [class.pi-chevron-right]="collapsedGroups().has('__nodate__')"></i>
              <span class="w-2.5 h-2.5 rounded-full flex-shrink-0 bg-surface-400 dark:bg-surface-600"></span>
              <span class="text-xs font-semibold text-surface-700 dark:text-surface-200 flex-1">
                {{ t().noDate }}
              </span>
              <span class="text-xs text-surface-500 bg-surface-200 dark:bg-surface-700 rounded px-1.5 font-medium min-w-[1.25rem] text-center leading-5 flex-shrink-0">
                {{ noDateTasks().length }}
              </span>
            </div>

            @if (!collapsedGroups().has('__nodate__')) {
              @for (task of noDateTasks(); track task.id) {
                <div
                  class="flex items-center border-b border-surface-50 dark:border-surface-800 row-height hover:bg-surface-50 dark:hover:bg-surface-800 cursor-pointer"
                  (click)="taskClick.emit(task)">
                  <div class="flex items-center gap-1.5 px-3 flex-1 min-w-0">
                    <span class="text-surface-400 dark:text-surface-600 font-mono text-[10px] flex-shrink-0">{{ task.taskId }}</span>
                    <span class="text-xs text-surface-700 dark:text-surface-200 truncate flex-1">{{ task.title }}</span>
                  </div>
                  <div class="w-20 px-2 text-xs text-surface-400 dark:text-surface-500 flex items-center flex-shrink-0">—</div>
                </div>
              }
            }
          }
        </div>

        <!-- RIGHT PANEL -->
        <div class="right-panel" #rightPanel>
          <!-- Total width container -->
          <div [style.width.px]="totalWidth()">

            <!-- Right header -->
            <div
              class="sticky top-0 z-10 bg-surface-50 dark:bg-surface-900 border-b border-surface-200 dark:border-surface-800"
              [style.height.px]="headerHeight()">

              <!-- Row 1: month spans -->
              <div class="flex" style="height:20px">
                @for (span of header().spans; track $index) {
                  <div
                    class="col-cell flex items-center px-2 text-[10px] font-semibold text-surface-600 dark:text-surface-400 border-r border-surface-100 dark:border-surface-800 overflow-hidden whitespace-nowrap"
                    [style.width.px]="span.colCount * colW()">
                    {{ span.label }}
                  </div>
                }
              </div>

              <!-- Row 2: week spans (only for 'week' scale) -->
              @if (scale === 'week' && header().weekSpans.length > 0) {
                <div class="flex" style="height:20px">
                  @for (ws of header().weekSpans; track $index) {
                    <div
                      class="col-cell flex items-center px-2 text-[10px] text-surface-500 dark:text-surface-500 border-r border-surface-100 dark:border-surface-800 overflow-hidden whitespace-nowrap"
                      [style.width.px]="ws.colCount * colW()">
                      {{ ws.label }}
                    </div>
                  }
                </div>
              }

              <!-- Row 3: day columns -->
              <div class="flex" [style.height.px]="scale === 'week' ? 16 : 20">
                @for (col of header().columns; track $index) {
                  <div
                    class="col-cell flex items-center justify-center text-[10px] border-r overflow-hidden whitespace-nowrap transition-colors"
                    [style.width.px]="colW()"
                    [class.font-bold]="col.isToday"
                    [class.text-primary]="col.isToday"
                    [class.bg-primary]="col.isToday"
                    [class.text-primary-contrast]="col.isToday"
                    [class.border-primary]="col.isToday"
                    [class.text-surface-500]="!col.isToday"
                    [class.dark:text-surface-400]="!col.isToday"
                    [class.border-surface-100]="!col.isToday"
                    [class.dark:border-surface-800]="!col.isToday">
                    {{ col.label }}
                  </div>
                }
              </div>
            </div>

            <!-- Today vertical line -->
            <div
              class="absolute top-0 bottom-0 z-[1] pointer-events-none"
              [style.left.px]="todayOffset()"
              style="width: 1px; background: var(--p-primary-color); opacity: 0.4;">
            </div>

            <!-- Groups rows (right side) -->
            @for (group of taskGroups(); track group.state.id) {
              <!-- Group header row (empty, just height placeholder) -->
              <div
                class="flex border-b border-surface-100 dark:border-surface-800 bg-surface-50/50 dark:bg-surface-900/50 group-header-height">
                @for (col of header().columns; track $index) {
                  <div
                    class="col-cell border-r border-surface-50 dark:border-surface-800/50"
                    [style.width.px]="colW()">
                  </div>
                }
              </div>

              @if (!group.collapsed) {
                @for (task of group.tasks; track task.id) {
                  <!-- Ghost placeholder row (right side) -->
                  @if (draggedId === task.id) {
                    <div class="flex border-b border-surface-50 dark:border-surface-800 opacity-70 pointer-events-none bg-gray-50/50 dark:bg-surface-800/20 row-height">
                      @for (col of header().columns; track $index) {
                        <div class="col-cell border-r border-surface-50 dark:border-surface-800/50" [style.width.px]="colW()"></div>
                      }
                    </div>
                  }

                  <!-- Task row (right side with bar) -->
                  <div
                    class="flex border-b border-surface-50 dark:border-surface-800 relative row-height hover:bg-surface-50/50 dark:hover:bg-surface-800/30"
                    (click)="taskClick.emit(task)">
                    @for (col of header().columns; track $index) {
                      <div
                        class="col-cell border-r border-surface-50 dark:border-surface-800/50 transition-colors"
                        [class.bg-primary]="col.isToday"
                        [class.opacity-5]="col.isToday"
                        [style.width.px]="colW()">
                      </div>
                    }

                    <!-- Bar -->
                    @if (getBar(task); as bar) {
                      <div
                        class="absolute top-1/2 -translate-y-1/2 rounded"
                        style="height: 20px; z-index: 2; opacity: 0.85; cursor: pointer;"
                        [style.left]="bar.left"
                        [style.width]="bar.width"
                        [style.background-color]="getStateColor(group.state)">
                      </div>
                    }
                  </div>
                }

                <!-- End drop zone row (right side) -->
                <div
                  class="flex border-b border-surface-50 dark:border-surface-800"
                  style="height: 8px;">
                  @for (col of header().columns; track $index) {
                    <div class="col-cell border-r border-surface-50 dark:border-surface-800/50" [style.width.px]="colW()"></div>
                  }
                </div>
              }
            }

            <!-- No date group rows (right side, no bars) -->
            @if (noDateTasks().length > 0) {
              <div class="flex border-b border-surface-100 dark:border-surface-800 bg-surface-50/50 dark:bg-surface-900/50 group-header-height">
                @for (col of header().columns; track $index) {
                  <div class="col-cell border-r border-surface-50 dark:border-surface-800/50" [style.width.px]="colW()"></div>
                }
              </div>

              @if (!collapsedGroups().has('__nodate__')) {
                @for (task of noDateTasks(); track task.id) {
                  <div class="flex border-b border-surface-50 dark:border-surface-800 row-height hover:bg-surface-50/50 dark:hover:bg-surface-800/30">
                    @for (col of header().columns; track $index) {
                      <div
                        class="col-cell border-r border-surface-50 dark:border-surface-800/50"
                        [class.bg-primary]="col.isToday"
                        [class.opacity-5]="col.isToday"
                        [style.width.px]="colW()">
                      </div>
                    }
                  </div>
                }
              }
            }

          </div>
        </div>
      </div>
    }
  `,
})
export class TimelineViewComponent implements AfterViewInit, OnDestroy {
  private readonly projectStore = inject(ProjectStore);
  private readonly customTrans = inject(CustomTranslationService);
  protected readonly layoutService = inject(LayoutService);

  @ViewChild('leftPanel') leftPanel!: ElementRef<HTMLDivElement>;
  @ViewChild('rightPanel') rightPanel!: ElementRef<HTMLDivElement>;

  // ─── Inputs ──────────────────────────────────────────────────────────────
  private readonly _tasks = signal<TaskListItem[]>([]);
  private readonly _states = signal<ProjectState[]>([]);

  @Input() set tasks(v: TaskListItem[]) { this._tasks.set(v); }
  @Input() set states(v: ProjectState[]) { this._states.set(v); }
  @Input() isLoading = false;

  // ─── Outputs ─────────────────────────────────────────────────────────────
  @Output() taskClick = new EventEmitter<TaskListItem>();
  @Output() reorder = new EventEmitter<ReorderTaskItem[]>();
  @Output() moveTask = new EventEmitter<{ taskId: string; stateId: string; backlogOrder: number }>();

  // ─── Scale / view state ──────────────────────────────────────────────────
  protected scale: TimelineScale = 'week';
  protected readonly today = new Date();
  protected readonly viewStart = signal<Date>(getDefaultViewStart('week', this.today));
  protected readonly colCount = signal<number>(getDefaultColCount('week'));

  protected readonly scaleOptions = [
    { label: 'Week', value: 'week' },
    { label: 'Month', value: 'month' },
    { label: 'Quarter', value: 'quarter' },
  ];

  // ─── DnD state ───────────────────────────────────────────────────────────
  protected draggedId: string | null = null;
  protected hoveredId: string | null = null;

  // ─── Collapsed groups ────────────────────────────────────────────────────
  protected readonly collapsedGroups = signal(new Set<string>());

  // ─── Localization ────────────────────────────────────────────────────────
  readonly t = computed(() => {
    const isEn = this.projectStore.projectLanguage() === 'en';
    const ct = this.customTrans;
    return {
      workItems: ct.t('timelineView.workItems', isEn ? 'Work items' : 'Công việc'),
      duration:  ct.t('timelineView.duration',  isEn ? 'Duration'   : 'Thời lượng'),
      today:     ct.t('timelineView.today',     isEn ? 'Today'      : 'Hôm nay'),
      noDate:    ct.t('timelineView.noDate',    isEn ? 'No date'    : 'Không có ngày'),
    };
  });

  // ─── Computed ────────────────────────────────────────────────────────────
  protected readonly colW = computed(() => COL_WIDTH[this.scale]);

  protected readonly totalWidth = computed(() => this.colCount() * this.colW());

  protected readonly headerHeight = computed(() => this.scale === 'week' ? 56 : 40);

  protected readonly header = computed(() =>
    buildTimelineHeader(this.viewStart(), this.colCount(), this.scale, this.today)
  );

  protected readonly todayOffset = computed(() =>
    getTodayOffset(this.viewStart(), this.scale, this.today)
  );

  protected readonly allRootTasks = computed(() =>
    this._tasks().filter(t => !t.parentId)
  );

  protected readonly noDateTasks = computed(() =>
    this.allRootTasks().filter(t => !t.startDate && !t.dueDate)
  );

  protected readonly taskGroups = computed((): TaskGroup[] => {
    const root = this.allRootTasks().filter(t => t.startDate || t.dueDate);
    const collapsed = this.collapsedGroups();

    const byState = new Map<string, TaskListItem[]>();
    for (const task of root) {
      if (!byState.has(task.stateId)) byState.set(task.stateId, []);
      byState.get(task.stateId)!.push(task);
    }

    return [...this._states()]
      .sort((a, b) => {
        const ga = STATE_GROUP_ORDER.indexOf(a.group);
        const gb = STATE_GROUP_ORDER.indexOf(b.group);
        return ga !== gb ? ga - gb : a.order - b.order;
      })
      .filter(state => (byState.get(state.id)?.length ?? 0) > 0)
      .map(state => ({
        state,
        tasks: (byState.get(state.id) ?? []).sort((a, b) => a.backlogOrder - b.backlogOrder),
        collapsed: collapsed.has(state.id),
      }));
  });

  // ─── Lifecycle ───────────────────────────────────────────────────────────
  private _scrollListeners: (() => void)[] = [];

  ngAfterViewInit(): void {
    const left = this.leftPanel.nativeElement;
    const right = this.rightPanel.nativeElement;

    let syncingRight = false;
    let syncingLeft = false;

    const onRightScroll = () => {
      if (syncingRight) return;
      syncingLeft = true;
      left.scrollTop = right.scrollTop;
      syncingLeft = false;
    };

    const onLeftScroll = () => {
      if (syncingLeft) return;
      syncingRight = true;
      right.scrollTop = left.scrollTop;
      syncingRight = false;
    };

    right.addEventListener('scroll', onRightScroll);
    left.addEventListener('scroll', onLeftScroll);

    this._scrollListeners = [
      () => right.removeEventListener('scroll', onRightScroll),
      () => left.removeEventListener('scroll', onLeftScroll),
    ];

    setTimeout(() => this.scrollToToday(), 50);
  }

  ngOnDestroy(): void {
    for (const cleanup of this._scrollListeners) cleanup();
  }

  // ─── Methods ─────────────────────────────────────────────────────────────
  protected getStateColor(state: ProjectState): string {
    return this.layoutService.isDarkMode() ? state.colorDark : state.colorLight;
  }

  protected getBar(task: TaskListItem): { left: string; width: string } | null {
    return getBarStyle(task, this.viewStart(), this.scale);
  }

  protected getDuration(task: TaskListItem): string {
    if (!task.startDate || !task.dueDate) return '—';
    const start = new Date(task.startDate);
    const end = new Date(task.dueDate);
    const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
    return `${days}d`;
  }

  protected toggleGroup(id: string): void {
    this.collapsedGroups.update(s => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  protected onScaleChange(s: TimelineScale): void {
    this.scale = s;
    this.viewStart.set(getDefaultViewStart(s, this.today));
    this.colCount.set(getDefaultColCount(s));
    setTimeout(() => this.scrollToToday(), 50);
  }

  protected scrollToToday(): void {
    const offset = getTodayOffset(this.viewStart(), this.scale, this.today);
    if (this.rightPanel?.nativeElement) {
      this.rightPanel.nativeElement.scrollLeft = Math.max(0, offset - 300);
    }
  }

  // ─── DnD ─────────────────────────────────────────────────────────────────
  protected onDragStart(id: string): void {
    this.draggedId = id;
  }

  protected onDragEnd(): void {
    setTimeout(() => {
      this.draggedId = null;
      this.hoveredId = null;
    }, 100);
  }

  protected onDrop(event: CdkDragDrop<TaskListItem[]>, group: TaskGroup): void {
    const dragId = this.draggedId;
    const hoverId = this.hoveredId;
    this.draggedId = null;
    this.hoveredId = null;

    if (!dragId || !hoverId || dragId === hoverId) return;

    const allRoot = this.allRootTasks();
    const movedTask = allRoot.find(t => t.id === dragId);
    if (!movedTask) return;

    const destTasks = group.tasks.filter(t => t.id !== dragId);
    const isEndZone = hoverId === 'end-' + group.state.id;

    let newOrder = 0;

    if (!isEndZone) {
      const targetIdx = destTasks.findIndex(t => t.id === hoverId);
      if (targetIdx !== -1) {
        const prevTask = destTasks[targetIdx - 1];
        const nextTask = destTasks[targetIdx];
        const nextOrder = nextTask.backlogOrder;
        const prevOrder = prevTask ? prevTask.backlogOrder : nextOrder - 2000;
        newOrder = (prevOrder + nextOrder) / 2;
      } else {
        const lastTask = destTasks[destTasks.length - 1];
        newOrder = lastTask ? lastTask.backlogOrder + 1000 : 1000;
      }
    } else {
      const lastTask = destTasks[destTasks.length - 1];
      newOrder = lastTask ? lastTask.backlogOrder + 1000 : 1000;
    }

    if (movedTask.stateId === group.state.id) {
      this.reorder.emit([{ taskId: dragId, backlogOrder: newOrder }]);
    } else {
      this.moveTask.emit({ taskId: dragId, stateId: group.state.id, backlogOrder: newOrder });
    }
  }
}
