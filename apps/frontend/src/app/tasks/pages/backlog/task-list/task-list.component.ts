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

@Component({
  standalone: true,
  selector: 'app-task-list',
  imports: [
    CommonModule, FormsModule, DragDropModule,
    CheckboxModule, TooltipModule, SkeletonModule, TaskRowComponent,
  ],
  styles: [`
    :host { display: block; }
    .row-hover:hover { background: var(--surface-hover, #f9fafb); }
    .row-hover:hover ::ng-deep .show-on-hover { opacity: 1 !important; }
    ::ng-deep .show-on-hover {
      transition: opacity 120ms ease-in-out !important;
    }

    /* CDK drag and drop custom styling */
    ::ng-deep .cdk-drag-preview {
      box-sizing: border-box;
      border-radius: 8px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
      background: var(--surface-overlay, #ffffff) !important;
      border: 1px solid var(--surface-border, #e2e8f0) !important;
      opacity: 0.95;
    }

    ::ng-deep .cdk-drag-placeholder {
      display: none !important;
    }

    ::ng-deep .drag-placeholder-ghost {
      background: var(--surface-hover, #f8fafc) !important;
    }
    ::ng-deep .drag-placeholder-ghost div {
      background: var(--surface-hover, #f8fafc) !important;
    }

    ::ng-deep .cdk-drop-list-dragging .cdk-drag {
      transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
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
      <div class="flex flex-col items-center justify-center h-64 text-gray-400">
        <i class="pi pi-inbox text-5xl mb-4 text-gray-200"></i>
        <p class="text-sm font-medium text-gray-500">Backlog trống</p>
      </div>
    } @else {
      <div cdkDropListGroup>
      @for (group of sortedGroups(); track group.state.id) {
        <div>
          <div class="row-hover sticky top-0 z-10 flex items-center bg-gray-50 dark:bg-surface-950 border-b border-gray-100 dark:border-surface-800 select-none" style="height:36px">
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
              @for (node of group.rootTasks; track node.task.id) {
                @if (draggedTaskId === node.task.id) {
                  <!-- Static Ghost Row (kept at original position) -->
                  <div class="drag-placeholder-ghost flex flex-col border-b border-gray-50 dark:border-surface-800 opacity-40 w-full select-none pointer-events-none">
                    <!-- Ghost dòng cha -->
                    <div class="flex items-center bg-surface-hover" style="height:38px">
                      <app-task-row [task]="node.task" [depth]="0" [childCount]="node.children.length" [isSelected]="selectedIds.has(node.task.id)" [isExpanded]="expandedTasks().has(node.task.id)" [displayProps]="displayProps" />
                    </div>
                    <!-- Ghost các dòng con -->
                    @if (expandedTasks().has(node.task.id)) {
                      <div class="flex flex-col bg-gray-50/10 dark:bg-surface-900/10">
                        @for (child of node.children; track child.id) {
                          <div class="flex items-center border-t border-gray-50 dark:border-surface-800 bg-surface-hover" style="height:38px">
                            <app-task-row [task]="child" [depth]="1" [childCount]="0" [isSelected]="selectedIds.has(child.id)" [displayProps]="displayProps" />
                          </div>
                        }
                      </div>
                    }
                  </div>
                }

                <div cdkDrag 
                     (cdkDragStarted)="onDragStart(node.task.id)"
                     (cdkDragEnded)="onDragEnd()"
                     class="flex flex-col border-b border-gray-50 dark:border-surface-800 relative" 
                     [class.bg-indigo-50]="selectedIds.has(node.task.id)">
                  
                  <!-- Drop Line Indicator -->
                  @if (draggedTaskId && hoveredTaskId === node.task.id && draggedTaskId !== node.task.id) {
                    <div class="h-0.5 bg-indigo-600 dark:bg-indigo-500 w-full absolute top-0 left-0 right-0 z-20"></div>
                  }

                  <!-- Dòng cha -->
                  <div class="row-hover flex items-center cursor-grab active:cursor-grabbing" 
                       style="height:38px" 
                       (click)="taskClick.emit(node.task)"
                       (mouseenter)="hoveredTaskId = node.task.id; hoveredStateId = group.state.id"
                       (mouseleave)="hoveredTaskId === node.task.id ? hoveredTaskId = null : null">
                    <app-task-row [task]="node.task" [depth]="0" [childCount]="node.children.length" [isSelected]="selectedIds.has(node.task.id)" [isExpanded]="expandedTasks().has(node.task.id)" [displayProps]="displayProps" (selectionToggle)="selectionToggle.emit($event)" (toggleExpand)="toggleExpand($event)" (taskMenuClick)="taskMenuClick.emit($event)" />
                  </div>
                  
                  <!-- Dòng con -->
                  @if (expandedTasks().has(node.task.id)) {
                    <div class="flex flex-col bg-gray-50/10 dark:bg-surface-900/10">
                      @for (child of node.children; track child.id) {
                        <div class="row-hover flex items-center border-t border-gray-50 dark:border-surface-800 cursor-pointer" 
                             style="height:38px" 
                             [class.bg-indigo-50]="selectedIds.has(child.id)" 
                             (click)="taskClick.emit(child)"
                             (mouseenter)="hoveredTaskId = node.task.id; hoveredStateId = group.state.id"
                             (mouseleave)="hoveredTaskId === node.task.id ? hoveredTaskId = null : null">
                          <app-task-row [task]="child" [depth]="1" [childCount]="0" [isSelected]="selectedIds.has(child.id)" [displayProps]="displayProps" (selectionToggle)="selectionToggle.emit($event)" (taskMenuClick)="taskMenuClick.emit($event)" />
                        </div>
                      }
                    </div>
                  }

                  <!-- Custom drag preview (chỉ hiển thị dòng cha) -->
                  <div *cdkDragPreview class="flex items-center bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 shadow-xl rounded-lg px-3 gap-2 pointer-events-none select-none" style="min-width: 300px; max-width: 450px; height: 38px; box-sizing: border-box;">
                    <span class="text-xs font-mono text-gray-400 flex-shrink-0">{{ node.task.taskId }}</span>
                    <span class="text-sm text-gray-800 dark:text-surface-100 font-medium truncate flex-1">{{ node.task.title }}</span>
                  </div>

                  <!-- Custom drop placeholder (hidden) -->
                  <div *cdkDragPlaceholder class="hidden"></div>
                </div>
              }
            </div>
            <div class="flex items-center border-b border-gray-50 relative" 
                 style="height:32px; padding-left:40px"
                 (mouseenter)="hoveredTaskId = 'end-' + group.state.id; hoveredStateId = group.state.id"
                 (mouseleave)="hoveredTaskId === 'end-' + group.state.id ? hoveredTaskId = null : null">
              @if (draggedTaskId && hoveredTaskId === 'end-' + group.state.id) {
                <div class="h-0.5 bg-indigo-600 dark:bg-indigo-500 w-full absolute top-0 left-0 right-0 z-20"></div>
              }
              <button class="flex items-center gap-1.5 text-xs text-gray-400 hover:text-indigo-600 transition-colors" (click)="newTaskInState.emit(group.state.id)"><i class="pi pi-plus text-[10px]"></i> New work item</button>
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
  @Input() set tasks(v: TaskListItem[]) { this._tasks.set(v); }
  @Input() set states(v: ProjectState[]) { this._states.set(v); }

  @Input() isLoading = false;
  @Input() orderBy = 'rank';
  @Input() selectedIds = new Set<string>();
  @Input() displayProps: DisplayProperties = DEFAULT_DISPLAY_PROPS;

  @Output() taskClick = new EventEmitter<TaskListItem>();
  @Output() taskMenuClick = new EventEmitter<TaskListItem>();
  @Output() selectionToggle = new EventEmitter<string>();
  @Output() reorder = new EventEmitter<ReorderTaskItem[]>();
  @Output() newTaskInState = new EventEmitter<string | undefined>();
  @Output() moveTask = new EventEmitter<{ taskId: string; stateId: string; backlogOrder: number }>();

  protected readonly collapsedGroups = signal(new Set<string>());
  protected readonly expandedTasks = signal(new Set<string>());

  // Drag and Drop state variables
  protected draggedTaskId: string | null = null;
  protected hoveredTaskId: string | null = null;
  protected hoveredStateId: string | null = null;

  protected onDragStart(taskId: string): void {
    this.draggedTaskId = taskId;
  }

  protected onDragEnd(): void {
    setTimeout(() => {
      this.draggedTaskId = null;
      this.hoveredTaskId = null;
      this.hoveredStateId = null;
    }, 100);
  }

  protected onHeaderMouseEnter(group: any): void {
    if (!this.draggedTaskId) return;
    this.hoveredStateId = group.state.id;
    if (group.rootTasks.length > 0) {
      this.hoveredTaskId = group.rootTasks[0].task.id;
    } else {
      this.hoveredTaskId = 'end-' + group.state.id;
    }
  }

  protected onHeaderMouseLeave(group: any): void {
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

  protected readonly sortedGroups = computed(() => {
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

    // Reset drag/hover states immediately
    this.draggedTaskId = null;
    this.hoveredTaskId = null;
    this.hoveredStateId = null;

    // Find the task node that was moved
    const allRootTasks = this._tasks().filter((t) => !t.parentId);
    const movedTask = allRootTasks.find((t) => t.id === movedTaskId);
    if (!movedTask) return;

    if (movedTask.stateId === targetStateId && targetTaskId === movedTaskId) {
      return; // Dropped on itself, do nothing
    }

    // Get all root tasks in the destination state (excluding the moved one if it was already there)
    const destTasks = allRootTasks
      .filter((t) => t.stateId === targetStateId && t.id !== movedTaskId)
      .sort((a, b) => a.backlogOrder - b.backlogOrder);

    let newOrder = 0;
    const isTargetInDest = targetTaskId && destTasks.some((t) => t.id === targetTaskId);

    if (isTargetInDest && !targetTaskId.startsWith('end-') && targetTaskId !== movedTaskId) {
      // Find the index of the target task in the destination list
      const targetIdx = destTasks.findIndex((t) => t.id === targetTaskId);
      if (targetIdx !== -1) {
        const nextTask = destTasks[targetIdx];
        const prevTask = destTasks[targetIdx - 1];
        const nextOrder = nextTask.backlogOrder;
        const prevOrder = prevTask ? prevTask.backlogOrder : nextOrder - 2000;
        newOrder = (prevOrder + nextOrder) / 2;
      } else {
        // Fallback: place at the end
        const lastTask = destTasks[destTasks.length - 1];
        newOrder = lastTask ? lastTask.backlogOrder + 1000 : 1000;
      }
    } else {
      // Target is end of list or empty list
      const lastTask = destTasks[destTasks.length - 1];
      newOrder = lastTask ? lastTask.backlogOrder + 1000 : 1000;
    }

    if (movedTask.stateId === targetStateId) {
      // Reorder within the same state
      this.reorder.emit([{ taskId: movedTaskId, backlogOrder: newOrder }]);
    } else {
      // Move to a different state
      this.moveTask.emit({ taskId: movedTaskId, stateId: targetStateId, backlogOrder: newOrder });
    }
  }
}
