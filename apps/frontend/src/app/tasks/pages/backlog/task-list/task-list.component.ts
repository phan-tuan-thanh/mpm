import {
  Component, Input, Output, EventEmitter, signal, computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DragDropModule, CdkDragDrop } from '@angular/cdk/drag-drop';

import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { TooltipModule } from 'primeng/tooltip';
import { SkeletonModule } from 'primeng/skeleton';

import type { TaskListItem, TaskType, TaskPriority, ReorderTaskItem } from '@mpm/shared-types';
import type { ProjectState } from '@mpm/shared-types';

const PRIORITY_CONFIG: Record<TaskPriority, { icon: string; color: string; label: string }> = {
  urgent: { icon: 'pi pi-angle-double-up', color: '#EF4444', label: 'Urgent' },
  high:   { icon: 'pi pi-angle-up',        color: '#F97316', label: 'High' },
  medium: { icon: 'pi pi-minus',           color: '#EAB308', label: 'Medium' },
  low:    { icon: 'pi pi-angle-down',      color: '#3B82F6', label: 'Low' },
  none:   { icon: 'pi pi-circle',          color: '#D1D5DB', label: 'None' },
};

const TYPE_CONFIG: Record<TaskType, { icon: string; color: string }> = {
  epic:    { icon: 'pi pi-bolt',         color: '#8B5CF6' },
  story:   { icon: 'pi pi-book',         color: '#3B82F6' },
  task:    { icon: 'pi pi-check-circle', color: '#10B981' },
  subtask: { icon: 'pi pi-minus-circle', color: '#6B7280' },
};

const STATE_GROUP_ORDER = ['backlog', 'unstarted', 'started', 'completed', 'cancelled'];

const AVATAR_PALETTE = [
  ['#EDE9FE', '#5B21B6'], ['#DBEAFE', '#1E40AF'], ['#D1FAE5', '#065F46'],
  ['#FEF3C7', '#92400E'], ['#FCE7F3', '#9D174D'], ['#FFE4E6', '#9F1239'],
];

interface TaskNode { task: TaskListItem; children: TaskListItem[] }

@Component({
  standalone: true,
  selector: 'app-task-list',
  imports: [
    CommonModule, FormsModule, DragDropModule,
    ButtonModule, CheckboxModule, TooltipModule, SkeletonModule,
  ],
  styles: [`:host { display: block; }
    .row-hover:hover { background: #f9fafb; }
    .row-hover:hover .show-on-hover { opacity: 1 !important; }`],
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
      <!-- cdkDropListGroup kết nối tất cả drop lists với nhau -->
      <div cdkDropListGroup>
      @for (group of sortedGroups(); track group.state.id) {
        <div>
          <!-- ══ Group header ══ -->
          <div class="sticky top-0 z-10 flex items-center bg-white dark:bg-surface-900 border-b border-gray-100 dark:border-surface-800 select-none" style="height:36px">
            <div class="flex items-center justify-center flex-shrink-0" style="width:40px" (click)="$event.stopPropagation()">
              <p-checkbox [binary]="true"
                [ngModel]="isGroupAllSelected(group.rootTasks)"
                (ngModelChange)="toggleGroupSelect(group.rootTasks, $event)" />
            </div>
            <div class="flex items-center gap-2 flex-1 cursor-pointer hover:bg-gray-50 rounded px-2 h-full"
                 (click)="toggleGroup(group.state.id)">
              <i class="pi text-gray-400 text-[10px] w-3 flex-shrink-0"
                 [class.pi-chevron-right]="collapsedGroups().has(group.state.id)"
                 [class.pi-chevron-down]="!collapsedGroups().has(group.state.id)"></i>
              <span class="w-3.5 h-3.5 rounded-full flex-shrink-0 border-2"
                    [style.border-color]="group.state.color"
                    [style.background]="isFilledState(group.state.group) ? group.state.color : 'transparent'"></span>
              <span class="text-sm font-semibold text-gray-700 dark:text-surface-100">{{ group.state.name }}</span>
              <span class="text-xs text-gray-500 bg-gray-100 rounded px-1.5 font-medium min-w-[1.25rem] text-center leading-5">
                {{ group.rootTasks.length }}
              </span>
            </div>
            <button class="show-on-hover opacity-0 flex items-center justify-center w-7 h-7 mr-2 rounded hover:bg-gray-100 text-gray-400 hover:text-indigo-600"
                    pTooltip="Thêm task vào nhóm này"
                    (click)="newTaskInState.emit(group.state.id)">
              <i class="pi pi-plus text-xs"></i>
            </button>
          </div>

          <!-- ══ Task rows ══ -->
          @if (!collapsedGroups().has(group.state.id)) {
            <!--
              FIX drag-drop: cdkDropList chỉ bao gồm root rows (có cdkDrag).
              Child rows được render bên trong container nhưng KHÔNG có cdkDrag
              → CDK không đếm chúng vào indices.
            -->
            <div cdkDropList
                 [cdkDropListDisabled]="orderBy !== 'rank'"
                 [id]="'grp-' + group.state.id"
                 (cdkDropListDropped)="onDrop($event, group.rootTasks, group.state.id)">

              @for (node of group.rootTasks; track node.task.id) {

                <!-- ── Root row: WITH cdkDrag ── -->
                <div cdkDrag
                     class="row-hover flex items-center border-b border-gray-50 cursor-pointer"
                     style="height:38px"
                     [class.bg-indigo-50]="selectedIds.has(node.task.id)"
                     (click)="taskClick.emit(node.task)">
                  <ng-container *ngTemplateOutlet="rowContent; context: { $implicit: node.task, depth: 0, childCount: node.children.length }"></ng-container>
                </div>

                <!-- ── Child rows: WITHOUT cdkDrag (không được đếm bởi CDK) ── -->
                @if (expandedTasks().has(node.task.id)) {
                  @for (child of node.children; track child.id) {
                    <div class="row-hover flex items-center border-b border-gray-50 cursor-pointer"
                         style="height:38px"
                         [class.bg-indigo-50]="selectedIds.has(child.id)"
                         (click)="taskClick.emit(child)">
                      <ng-container *ngTemplateOutlet="rowContent; context: { $implicit: child, depth: 1, childCount: 0 }"></ng-container>
                    </div>
                  }
                }
              }
            </div>

            <div class="flex items-center border-b border-gray-50" style="height:32px; padding-left:40px">
              <button class="flex items-center gap-1.5 text-xs text-gray-400 hover:text-indigo-600 transition-colors"
                      (click)="newTaskInState.emit(group.state.id)">
                <i class="pi pi-plus text-[10px]"></i> New work item
              </button>
            </div>
          }
        </div>
      }
      </div><!-- /cdkDropListGroup -->
    }

    <!-- ══ Shared row content template (no cdkDrag here!) ══ -->
    <ng-template #rowContent let-task let-depth="depth" let-childCount="childCount">

      <!-- ① Checkbox — always visible -->
      <div class="flex items-center justify-center flex-shrink-0" style="width:40px" (click)="$event.stopPropagation()">
        <p-checkbox [binary]="true"
          [ngModel]="selectedIds.has(task.id)"
          (ngModelChange)="selectionToggle.emit(task.id)" />
      </div>

      <!-- ② Child indent / drag handle -->
      @if (depth === 1) {
        <span class="flex-shrink-0" style="width:20px; padding-left:4px">
          <span class="block w-3 h-px bg-gray-200"></span>
        </span>
      } @else {
        <i cdkDragHandle
           class="show-on-hover opacity-0 pi pi-bars text-[10px] text-gray-300 hover:text-gray-500 cursor-grab flex-shrink-0 mr-1"
           style="width:12px"
           (click)="$event.stopPropagation()"></i>
      }

      <!-- ③ Expand toggle -->
      @if (childCount > 0) {
        <button class="flex items-center justify-center flex-shrink-0 w-4 h-4 rounded hover:bg-gray-200 mr-1"
                (click)="$event.stopPropagation(); toggleExpand(task.id)">
          <i class="pi text-[9px] text-gray-500"
             [class.pi-chevron-right]="!expandedTasks().has(task.id)"
             [class.pi-chevron-down]="expandedTasks().has(task.id)"></i>
        </button>
      } @else {
        <span class="flex-shrink-0 mr-1" style="width:16px"></span>
      }

      <!-- ④ State circle -->
      <span class="w-3.5 h-3.5 rounded-full flex-shrink-0 border-2 mr-2"
            [style.border-color]="task.state?.color ?? '#9CA3AF'"
            [style.background]="isFilledState(task.state?.group ?? '') ? (task.state?.color ?? '#9CA3AF') : 'transparent'"
            [pTooltip]="task.state?.name"></span>

      <!-- ⑤ Task ID -->
      <span class="text-xs font-mono text-gray-400 flex-shrink-0 mr-2" style="width:58px">{{ task.taskId }}</span>

      <!-- ⑥ Type icon -->
      <i class="flex-shrink-0 text-xs mr-2"
         [class]="typeIcon(task.type)" [style.color]="typeColor(task.type)"
         [pTooltip]="task.type"></i>

      <!-- ⑦ Title -->
      <span class="flex-1 text-sm text-gray-800 truncate">{{ task.title }}</span>

      <!-- ══ Right metadata (on hover) ══ -->
      @if (childCount > 0) {
        <span class="show-on-hover opacity-0 flex items-center gap-0.5 text-xs text-gray-400 flex-shrink-0 mr-2"
              [pTooltip]="childCount + ' sub-items'">
          <i class="pi pi-sitemap text-[10px]"></i>{{ childCount }}
        </span>
      }
      @for (label of (task.labels ?? []).slice(0, 2); track label.id) {
        <span class="show-on-hover opacity-0 text-xs px-1.5 py-px rounded-full font-medium flex-shrink-0 mr-1 max-w-[72px] truncate"
              [style.background]="label.color + '22'" [style.color]="label.color">{{ label.name }}</span>
      }
      @if (task.estimateValue != null) {
        <span class="show-on-hover opacity-0 flex items-center gap-0.5 text-xs text-gray-400 flex-shrink-0 mr-2" pTooltip="Estimate">
          <i class="pi pi-hourglass text-[10px]"></i>{{ task.estimateValue }}
        </span>
      }
      @if (task.dueDate) {
        <span class="flex items-center gap-0.5 text-xs flex-shrink-0 mr-2"
              [class.text-red-500]="isOverdue(task.dueDate)"
              [class.text-gray-400]="!isOverdue(task.dueDate)"
              pTooltip="Due date">
          <i class="pi pi-calendar text-[10px]"></i>{{ formatDate(task.dueDate) }}
        </span>
      }
      @if (task.priority !== 'none') {
        <i class="show-on-hover opacity-0 flex-shrink-0 text-xs mr-2"
           [class]="priorityIcon(task.priority)"
           [style.color]="priorityColor(task.priority)"
           [pTooltip]="'Priority: ' + task.priority"></i>
      }
      @if (task.assignees?.length) {
        <div class="show-on-hover opacity-0 flex -space-x-1.5 flex-shrink-0 mr-2">
          @for (a of task.assignees.slice(0, 3); track a.userId) {
            <div class="w-5 h-5 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold"
                 [style.background]="avatarBg(a.displayName)" [style.color]="avatarFg(a.displayName)"
                 [pTooltip]="a.displayName">{{ a.displayName[0].toUpperCase() }}</div>
          }
          @if (task.assignees.length > 3) {
            <div class="w-5 h-5 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-[10px] text-gray-500">
              +{{ task.assignees.length - 3 }}
            </div>
          }
        </div>
      }
      <button pButton icon="pi pi-ellipsis-h" size="small" text severity="secondary"
              class="show-on-hover opacity-0 flex-shrink-0 mr-2 !w-6 !h-6 !p-0"
              (click)="$event.stopPropagation(); taskMenuClick.emit(task)"></button>
    </ng-template>
  `,
})
export class TaskListComponent {
  // ── FIX bug 1: dùng signal nội bộ để computed() reactive với @Input changes ──
  protected readonly _tasks = signal<TaskListItem[]>([]);
  protected readonly _states = signal<ProjectState[]>([]);

  @Input() set tasks(v: TaskListItem[]) { this._tasks.set(v); }
  @Input() set states(v: ProjectState[]) { this._states.set(v); }

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

  protected isFilledState(group: string): boolean {
    return group === 'started' || group === 'completed';
  }

  protected isGroupAllSelected(nodes: TaskNode[]): boolean {
    return nodes.length > 0 && nodes.every((n) => this.selectedIds.has(n.task.id));
  }

  protected toggleGroupSelect(nodes: TaskNode[], checked: boolean): void {
    for (const n of nodes) {
      const selected = this.selectedIds.has(n.task.id);
      if (checked !== selected) this.selectionToggle.emit(n.task.id);
    }
  }

  protected toggleGroup(id: string): void {
    this.collapsedGroups.update((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  protected toggleExpand(id: string): void {
    this.expandedTasks.update((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  protected typeIcon(t: TaskType): string { return TYPE_CONFIG[t]?.icon ?? 'pi pi-circle'; }
  protected typeColor(t: TaskType): string { return TYPE_CONFIG[t]?.color ?? '#9CA3AF'; }
  protected priorityIcon(p: TaskPriority): string { return PRIORITY_CONFIG[p]?.icon ?? 'pi pi-circle'; }
  protected priorityColor(p: TaskPriority): string { return PRIORITY_CONFIG[p]?.color ?? '#D1D5DB'; }

  protected isOverdue(d: string | null): boolean { return !!d && new Date(d) < new Date(); }
  protected formatDate(d: string): string {
    return new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  }
  protected avatarBg(n: string): string { return AVATAR_PALETTE[n.charCodeAt(0) % AVATAR_PALETTE.length][0]; }
  protected avatarFg(n: string): string { return AVATAR_PALETTE[n.charCodeAt(0) % AVATAR_PALETTE.length][1]; }

  protected onDrop(event: CdkDragDrop<unknown>, destNodes: TaskNode[], destStateId: string): void {
    const isSameList = event.previousContainer === event.container;

    if (isSameList) {
      // ── Same group: chỉ reorder ──
      if (event.previousIndex === event.currentIndex) return;
      const list = destNodes.map((n) => n.task);
      const moved = list.splice(event.previousIndex, 1)[0];
      list.splice(event.currentIndex, 0, moved);
      const prev = list[event.currentIndex - 1]?.backlogOrder ?? 0;
      const next = list[event.currentIndex + 1]?.backlogOrder ?? prev + 2000;
      this.reorder.emit([{ taskId: moved.id, backlogOrder: (prev + next) / 2 }]);
    } else {
      // ── Cross-group: đổi state + reorder ──
      const srcStateId = event.previousContainer.id.replace('grp-', '');
      const srcGroup = this.sortedGroups().find((g) => g.state.id === srcStateId);
      if (!srcGroup) return;

      const movedTask = srcGroup.rootTasks[event.previousIndex]?.task;
      if (!movedTask) return;

      const prev = destNodes[event.currentIndex - 1]?.task.backlogOrder ?? 0;
      const next = destNodes[event.currentIndex]?.task.backlogOrder ?? prev + 2000;
      const backlogOrder = (prev + next) / 2;

      this.moveTask.emit({ taskId: movedTask.id, stateId: destStateId, backlogOrder });
    }
  }
}
