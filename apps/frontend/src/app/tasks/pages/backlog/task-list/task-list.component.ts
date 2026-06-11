import { Component, Input, Output, EventEmitter, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DragDropModule, CdkDragDrop } from '@angular/cdk/drag-drop';
import { CheckboxModule } from 'primeng/checkbox';
import { TooltipModule } from 'primeng/tooltip';
import { SkeletonModule } from 'primeng/skeleton';
import type { TaskListItem, ReorderTaskItem, ProjectState, DisplayProperties } from '@mpm/shared-types';
import { DEFAULT_DISPLAY_PROPS } from '@mpm/shared-types';
import { TaskRowComponent } from './task-row.component';

const STATE_GROUP_ORDER = ['backlog', 'unstarted', 'started', 'completed', 'cancelled'];
interface TaskNode { task: TaskListItem; children: TaskListItem[] }
interface FlatRow { task: TaskListItem; depth: number; childCount: number; }
interface FlatGroup { state: ProjectState; rootTasks: TaskNode[]; flatRows: FlatRow[]; }

function flattenTask(
  task: TaskListItem,
  depth: number,
  maxDepth: number,
  childMap: Map<string, TaskListItem[]>,
  expanded: Set<string>,
  rows: FlatRow[],
): void {
  const kids = childMap.get(task.id) ?? [];
  rows.push({ task, depth, childCount: kids.length });
  if (depth < maxDepth && expanded.has(task.id) && kids.length > 0) {
    for (const child of kids) {
      flattenTask(child, depth + 1, maxDepth, childMap, expanded, rows);
    }
  }
}

@Component({
  standalone: true,
  selector: 'app-task-list',
  imports: [
    CommonModule, FormsModule, DragDropModule,
    CheckboxModule, TooltipModule, SkeletonModule, TaskRowComponent,
  ],
  styles: [`
    :host { display: block; }
    .row-hover:hover ::ng-deep .show-on-hover { opacity: 1 !important; }
    ::ng-deep .show-on-hover {
      transition: opacity 120ms ease-in-out !important;
    }

    ::ng-deep .cdk-drag-preview {
      box-sizing: border-box;
      border-radius: 8px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
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

    ::ng-deep .drag-placeholder-ghost {
      background: var(--surface-hover, #f8fafc) !important;
    }
    ::ng-deep .drag-placeholder-ghost div {
      background: var(--surface-hover, #f8fafc) !important;
    }

    ::ng-deep .cdk-drop-list-dragging .cdk-drag {
      transition: none !important;
    }

    ::ng-deep .cdk-drag-animating {
      transition: transform 150ms cubic-bezier(0, 0, 0.2, 1);
    }
  `],
  template: `
    @if (isLoading) {
      <div class="p-4 space-y-2">
        @for (i of [1,2,3,4,5]; track i) { <p-skeleton height="2.25rem" borderRadius="4px" /> }
      </div>
    } @else if (_states().length === 0) {
      <div class="flex flex-col items-center justify-center h-64 text-gray-400 dark:text-surface-500">
        <i class="pi pi-inbox text-5xl mb-4 text-gray-200 dark:text-surface-700"></i>
        <p class="text-sm font-medium text-gray-500 dark:text-surface-400">Danh sách trống</p>
      </div>
    } @else {
      <div cdkDropListGroup>
      @for (group of flatGroups(); track group.state.id) {
        <div>
          <!-- Group header -->
          <div class="row-hover sticky top-0 z-10 flex items-center bg-gray-50 dark:bg-surface-950 hover:bg-gray-100 dark:hover:bg-surface-800 border-b border-gray-100 dark:border-surface-800 select-none" style="height:36px">
            <div class="flex items-center justify-center flex-shrink-0" style="width:40px" (click)="$event.stopPropagation()">
              <p-checkbox
                [class.show-on-hover]="!isGroupAnySelected(group.rootTasks)"
                [class.opacity-0]="!isGroupAnySelected(group.rootTasks)"
                [binary]="true"
                [ngModel]="isGroupAllSelected(group.rootTasks)"
                (ngModelChange)="toggleGroupSelect(group.rootTasks, $event)" />
            </div>
            <div class="flex items-center gap-2 flex-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-surface-900 rounded px-2 h-full"
                 (click)="toggleGroup(group.state.id)"
                 (mouseenter)="onHeaderMouseEnter(group)"
                 (mouseleave)="onHeaderMouseLeave(group)">
              <span class="w-3.5 h-3.5 rounded-full flex-shrink-0 border-2" [style.border-color]="group.state.color" [style.background]="isFilledState(group.state.group) ? group.state.color : 'transparent'"></span>
              <span class="text-sm font-semibold text-gray-700 dark:text-surface-100">{{ group.state.name }}</span>
              <span class="text-xs text-gray-500 bg-gray-200 dark:bg-surface-800 rounded px-1.5 font-medium min-w-[1.25rem] text-center leading-5">{{ group.rootTasks.length }}</span>
            </div>
            <button class="show-on-hover opacity-0 flex items-center justify-center w-7 h-7 mr-2 rounded hover:bg-gray-200 dark:hover:bg-surface-800 text-gray-400 hover:text-indigo-600" pTooltip="Thêm task vào nhóm này" (click)="newTaskInState.emit(group.state.id)">
              <i class="pi pi-plus text-xs"></i>
            </button>
          </div>

          @if (!collapsedGroups().has(group.state.id)) {
            <div cdkDropList
                 [cdkDropListDisabled]="orderBy !== 'rank'"
                 [cdkDropListSortingDisabled]="true"
                 [id]="'grp-' + group.state.id"
                 (cdkDropListDropped)="onDrop($event, group.rootTasks, group.state.id)"
                 (mouseenter)="onEmptyListMouseEnter(group.state.id, group.rootTasks.length === 0)"
                 (mouseleave)="onEmptyListMouseLeave(group.state.id, group.rootTasks.length === 0)"
                 [style.min-height]="group.rootTasks.length === 0 ? '8px' : null">

              @for (row of group.flatRows; track row.task.id) {

                @if (row.depth === 0) {
                  <!-- Root task: ghost placeholder + cdkDrag -->
                  @if (draggedTaskId === row.task.id) {
                    <div class="drag-placeholder-ghost flex items-center border-b border-gray-50 dark:border-surface-800 opacity-40 w-full select-none pointer-events-none" style="height:38px">
                      <app-task-row [task]="row.task" [depth]="0" [childCount]="row.childCount" [isSelected]="selectedIds.has(row.task.id)" [isExpanded]="expandedTasks().has(row.task.id)" [displayProps]="displayProps" />
                    </div>
                  }

                  <div cdkDrag
                       (cdkDragStarted)="onDragStart(row.task.id)"
                       (cdkDragEnded)="onDragEnd()"
                       class="flex flex-col border-b border-gray-50 dark:border-surface-800 relative"
                       [ngClass]="selectedIds.has(row.task.id) ? 'bg-indigo-50 dark:bg-indigo-950/30' : ''">

                    @if (draggedTaskId && hoveredTaskId === row.task.id && draggedTaskId !== row.task.id) {
                      <div class="h-0.5 bg-indigo-600 dark:bg-indigo-500 w-full absolute top-0 left-0 right-0 z-20"></div>
                    }

                    <div class="row-hover flex items-center cursor-grab active:cursor-grabbing hover:bg-gray-50 dark:hover:bg-surface-800"
                         style="height:38px"
                         (click)="taskClick.emit(row.task)"
                         (mouseenter)="hoveredTaskId = row.task.id; hoveredStateId = group.state.id"
                         (mouseleave)="hoveredTaskId === row.task.id ? hoveredTaskId = null : null">
                      <app-task-row [task]="row.task" [depth]="0" [childCount]="row.childCount" [isSelected]="selectedIds.has(row.task.id)" [isExpanded]="expandedTasks().has(row.task.id)" [displayProps]="displayProps" (selectionToggle)="selectionToggle.emit($event)" (toggleExpand)="toggleExpand($event)" (taskMenuClick)="taskMenuClick.emit($event)" />
                    </div>

                    <div *cdkDragPreview class="flex items-center bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 shadow-xl rounded-lg px-3 gap-2 pointer-events-none select-none" style="min-width: 300px; max-width: 450px; height: 38px; box-sizing: border-box;">
                      <span class="text-xs font-mono text-gray-400 flex-shrink-0">{{ row.task.taskId }}</span>
                      <span class="text-sm text-gray-800 dark:text-surface-100 font-medium truncate flex-1">{{ row.task.title }}</span>
                    </div>
                    <div *cdkDragPlaceholder></div>
                  </div>

                } @else {
                  <!-- Child task (depth > 0): không draggable -->
                  <div class="row-hover flex items-center border-b border-gray-50 dark:border-surface-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-surface-800 bg-gray-50/10 dark:bg-surface-900/10"
                       style="height:38px"
                       [ngClass]="selectedIds.has(row.task.id) ? 'bg-indigo-50 dark:bg-indigo-950/30' : ''"
                       (click)="taskClick.emit(row.task)">
                    <app-task-row [task]="row.task" [depth]="row.depth" [childCount]="row.childCount" [isSelected]="selectedIds.has(row.task.id)" [isExpanded]="expandedTasks().has(row.task.id)" [displayProps]="displayProps" (selectionToggle)="selectionToggle.emit($event)" (toggleExpand)="toggleExpand($event)" (taskMenuClick)="taskMenuClick.emit($event)" />
                  </div>
                }

              }

              <!-- New work item footer -->
              <div class="flex items-center border-b border-gray-50 dark:border-surface-800 relative"
                   style="height:32px; padding-left:40px"
                   (mouseenter)="hoveredTaskId = 'end-' + group.state.id; hoveredStateId = group.state.id"
                   (mouseleave)="hoveredTaskId === 'end-' + group.state.id ? hoveredTaskId = null : null">
                @if (draggedTaskId && hoveredTaskId === 'end-' + group.state.id) {
                  <div class="h-0.5 bg-indigo-600 dark:bg-indigo-500 w-full absolute top-0 left-0 right-0 z-20"></div>
                }
                <button class="flex items-center gap-1.5 text-xs text-gray-400 hover:text-indigo-600 transition-colors" (click)="newTaskInState.emit(group.state.id)"><i class="pi pi-plus text-[10px]"></i> New work item</button>
              </div>
            </div>
          }
        </div>
      }
      </div>
    }
  `,
})
export class TaskListComponent {
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
  @Output() taskMenuClick = new EventEmitter<TaskListItem>();
  @Output() selectionToggle = new EventEmitter<string>();
  @Output() reorder = new EventEmitter<ReorderTaskItem[]>();
  @Output() newTaskInState = new EventEmitter<string | undefined>();
  @Output() moveTask = new EventEmitter<{ taskId: string; stateId: string; backlogOrder: number }>();

  protected readonly collapsedGroups = signal(new Set<string>());
  protected readonly expandedTasks = signal(new Set<string>());

  protected draggedTaskId: string | null = null;
  protected hoveredTaskId: string | null = null;
  protected hoveredStateId: string | null = null;

  protected readonly childrenByParent = computed(() => {
    const map = new Map<string, TaskListItem[]>();
    for (const t of this._tasks()) {
      if (t.parentId) {
        if (!map.has(t.parentId)) map.set(t.parentId, []);
        map.get(t.parentId)!.push(t);
      }
    }
    return map;
  });

  private readonly sortedGroups = computed(() => {
    const children = this.childrenByParent();
    const rootTasks = this._tasks().filter((t) => !t.parentId);
    const byState = new Map<string, TaskNode[]>();
    for (const t of rootTasks) {
      if (!byState.has(t.stateId)) byState.set(t.stateId, []);
      byState.get(t.stateId)!.push({ task: t, children: children.get(t.id) ?? [] });
    }
    return [...this._states()]
      .sort((a, b) => {
        const ga = STATE_GROUP_ORDER.indexOf(a.group);
        const gb = STATE_GROUP_ORDER.indexOf(b.group);
        return ga !== gb ? ga - gb : a.order - b.order;
      })
      .map((state) => ({ state, rootTasks: byState.get(state.id) ?? [] }));
  });

  protected readonly flatGroups = computed((): FlatGroup[] => {
    const childMap = this.childrenByParent();
    const expanded = this.expandedTasks();
    const maxDepth = this._displayProps().maxSubItemDepth ?? 3;

    return this.sortedGroups().map(group => {
      const flatRows: FlatRow[] = [];
      for (const node of group.rootTasks) {
        flattenTask(node.task, 0, maxDepth, childMap, expanded, flatRows);
      }
      return { state: group.state, rootTasks: group.rootTasks, flatRows };
    });
  });

  protected onDragStart(taskId: string): void { this.draggedTaskId = taskId; }

  protected onDragEnd(): void {
    setTimeout(() => {
      this.draggedTaskId = null;
      this.hoveredTaskId = null;
      this.hoveredStateId = null;
    }, 100);
  }

  protected onHeaderMouseEnter(group: FlatGroup): void {
    if (!this.draggedTaskId) return;
    this.hoveredStateId = group.state.id;
    if (group.rootTasks.length > 0) {
      this.hoveredTaskId = group.rootTasks[0].task.id;
    } else {
      this.hoveredTaskId = 'end-' + group.state.id;
    }
  }

  protected onHeaderMouseLeave(group: FlatGroup): void {
    if (this.hoveredStateId === group.state.id) {
      this.hoveredStateId = null;
      this.hoveredTaskId = null;
    }
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

  protected isFilledState(group: string): boolean { return group === 'started' || group === 'completed'; }
  protected isGroupAllSelected(nodes: TaskNode[]): boolean { return nodes.length > 0 && nodes.every((n) => this.selectedIds.has(n.task.id)); }
  protected isGroupAnySelected(nodes: TaskNode[]): boolean { return nodes.length > 0 && nodes.some((n) => this.selectedIds.has(n.task.id) || n.children.some((c) => this.selectedIds.has(c.id))); }
  protected toggleGroupSelect(nodes: TaskNode[], checked: boolean): void {
    for (const n of nodes) { if (checked !== this.selectedIds.has(n.task.id)) this.selectionToggle.emit(n.task.id); }
  }

  protected toggleGroup(id: string): void { this.collapsedGroups.update((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; }); }
  protected toggleExpand(id: string): void { this.expandedTasks.update((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; }); }

  protected onDrop(event: CdkDragDrop<unknown>, destNodes: TaskNode[], destStateId: string): void {
    const movedTaskId = this.draggedTaskId;
    if (!movedTaskId) return;

    const targetTaskId = this.hoveredTaskId;
    const targetStateId = this.hoveredStateId || destStateId;

    this.draggedTaskId = null;
    this.hoveredTaskId = null;
    this.hoveredStateId = null;

    const allRootTasks = this._tasks().filter((t) => !t.parentId);
    const movedTask = allRootTasks.find((t) => t.id === movedTaskId);
    if (!movedTask) return;

    if (movedTask.stateId === targetStateId && targetTaskId === movedTaskId) return;

    const destTasks = allRootTasks
      .filter((t) => t.stateId === targetStateId && t.id !== movedTaskId)
      .sort((a, b) => a.backlogOrder - b.backlogOrder);

    let newOrder = 0;
    const isTargetInDest = targetTaskId && destTasks.some((t) => t.id === targetTaskId);

    if (isTargetInDest && !targetTaskId.startsWith('end-') && targetTaskId !== movedTaskId) {
      const targetIdx = destTasks.findIndex((t) => t.id === targetTaskId);
      if (targetIdx !== -1) {
        const nextTask = destTasks[targetIdx];
        const prevTask = destTasks[targetIdx - 1];
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

    if (movedTask.stateId === targetStateId) {
      this.reorder.emit([{ taskId: movedTaskId, backlogOrder: newOrder }]);
    } else {
      this.moveTask.emit({ taskId: movedTaskId, stateId: targetStateId, backlogOrder: newOrder });
    }
  }
}
