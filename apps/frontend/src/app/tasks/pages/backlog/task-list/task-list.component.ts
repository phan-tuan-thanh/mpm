import { Component, Input, Output, EventEmitter, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DragDropModule, CdkDragDrop } from '@angular/cdk/drag-drop';
import { CheckboxModule } from 'primeng/checkbox';
import { TooltipModule } from 'primeng/tooltip';
import { SkeletonModule } from 'primeng/skeleton';
import type { TaskListItem, ReorderTaskItem, ProjectState } from '@mpm/shared-types';
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
  styles: [`:host { display: block; } .row-hover:hover { background: #f9fafb; } .row-hover:hover ::ng-deep .show-on-hover { opacity: 1 !important; }`],
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
          <div class="sticky top-0 z-10 flex items-center bg-white dark:bg-surface-900 border-b border-gray-100 dark:border-surface-800 select-none" style="height:36px">
            <div class="flex items-center justify-center flex-shrink-0" style="width:40px" (click)="$event.stopPropagation()">
              <p-checkbox [binary]="true" [ngModel]="isGroupAllSelected(group.rootTasks)" (ngModelChange)="toggleGroupSelect(group.rootTasks, $event)" />
            </div>
            <div class="flex items-center gap-2 flex-1 cursor-pointer hover:bg-gray-50 rounded px-2 h-full" (click)="toggleGroup(group.state.id)">
              <i class="pi text-gray-400 text-[10px] w-3 flex-shrink-0" [class.pi-chevron-right]="collapsedGroups().has(group.state.id)" [class.pi-chevron-down]="!collapsedGroups().has(group.state.id)"></i>
              <span class="w-3.5 h-3.5 rounded-full flex-shrink-0 border-2" [style.border-color]="group.state.color" [style.background]="isFilledState(group.state.group) ? group.state.color : 'transparent'"></span>
              <span class="text-sm font-semibold text-gray-700 dark:text-surface-100">{{ group.state.name }}</span>
              <span class="text-xs text-gray-500 bg-gray-100 rounded px-1.5 font-medium min-w-[1.25rem] text-center leading-5">{{ group.rootTasks.length }}</span>
            </div>
            <button class="show-on-hover opacity-0 flex items-center justify-center w-7 h-7 mr-2 rounded hover:bg-gray-100 text-gray-400 hover:text-indigo-600" pTooltip="Thêm task vào nhóm này" (click)="newTaskInState.emit(group.state.id)">
              <i class="pi pi-plus text-xs"></i>
            </button>
          </div>
          @if (!collapsedGroups().has(group.state.id)) {
            <div cdkDropList [cdkDropListDisabled]="orderBy !== 'rank'" [id]="'grp-' + group.state.id" (cdkDropListDropped)="onDrop($event, group.rootTasks, group.state.id)" [style.min-height]="group.rootTasks.length === 0 ? '48px' : null">
              @if (group.rootTasks.length === 0) {
                <div class="h-12 flex items-center px-10 text-xs text-gray-300 border-b border-dashed border-gray-100 select-none">Kéo task vào đây</div>
              }
              @for (node of group.rootTasks; track node.task.id) {
                <div cdkDrag class="row-hover flex items-center border-b border-gray-50 cursor-pointer" style="height:38px" [class.bg-indigo-50]="selectedIds.has(node.task.id)" (click)="taskClick.emit(node.task)">
                  <app-task-row [task]="node.task" [depth]="0" [childCount]="node.children.length" [isSelected]="selectedIds.has(node.task.id)" [isExpanded]="expandedTasks().has(node.task.id)" (selectionToggle)="selectionToggle.emit($event)" (toggleExpand)="toggleExpand($event)" (taskMenuClick)="taskMenuClick.emit($event)" />
                </div>
                @if (expandedTasks().has(node.task.id)) {
                  @for (child of node.children; track child.id) {
                    <div class="row-hover flex items-center border-b border-gray-50 cursor-pointer" style="height:38px" [class.bg-indigo-50]="selectedIds.has(child.id)" (click)="taskClick.emit(child)">
                      <app-task-row [task]="child" [depth]="1" [childCount]="0" [isSelected]="selectedIds.has(child.id)" (selectionToggle)="selectionToggle.emit($event)" (taskMenuClick)="taskMenuClick.emit($event)" />
                    </div>
                  }
                }
              }
            </div>
            <div class="flex items-center border-b border-gray-50" style="height:32px; padding-left:40px">
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
  @Input() isLoading = false; @Input() orderBy = 'rank'; @Input() selectedIds = new Set<string>();
  @Output() taskClick = new EventEmitter<TaskListItem>(); @Output() taskMenuClick = new EventEmitter<TaskListItem>();
  @Output() selectionToggle = new EventEmitter<string>(); @Output() reorder = new EventEmitter<ReorderTaskItem[]>();
  @Output() newTaskInState = new EventEmitter<string | undefined>(); @Output() moveTask = new EventEmitter<{ taskId: string; stateId: string; backlogOrder: number }>();
  protected readonly collapsedGroups = signal(new Set<string>());
  protected readonly expandedTasks = signal(new Set<string>());

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
  protected toggleGroupSelect(nodes: TaskNode[], checked: boolean): void {
    for (const n of nodes) { if (checked !== this.selectedIds.has(n.task.id)) this.selectionToggle.emit(n.task.id); }
  }
  protected toggleGroup(id: string): void { this.collapsedGroups.update((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; }); }
  protected toggleExpand(id: string): void { this.expandedTasks.update((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; }); }

  protected onDrop(event: CdkDragDrop<unknown>, destNodes: TaskNode[], destStateId: string): void {
    if (event.previousContainer === event.container) {
      if (event.previousIndex === event.currentIndex) return;
      const list = destNodes.map((n) => n.task);
      const moved = list.splice(event.previousIndex, 1)[0];
      list.splice(event.currentIndex, 0, moved);
      const prev = list[event.currentIndex - 1]?.backlogOrder ?? 0;
      const next = list[event.currentIndex + 1]?.backlogOrder ?? prev + 2000;
      this.reorder.emit([{ taskId: moved.id, backlogOrder: (prev + next) / 2 }]);
    } else {
      const srcStateId = event.previousContainer.id.replace('grp-', '');
      const srcGroup = this.sortedGroups().find((g) => g.state.id === srcStateId);
      const movedTask = srcGroup?.rootTasks[event.previousIndex]?.task;
      if (!movedTask) return;
      const prev = destNodes[event.currentIndex - 1]?.task.backlogOrder ?? 0;
      const next = destNodes[event.currentIndex]?.task.backlogOrder ?? prev + 2000;
      this.moveTask.emit({ taskId: movedTask.id, stateId: destStateId, backlogOrder: (prev + next) / 2 });
    }
  }
}
