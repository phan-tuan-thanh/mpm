import {
  Component, Input, Output, EventEmitter, inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DragDropModule, CdkDragDrop } from '@angular/cdk/drag-drop';

import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { SkeletonModule } from 'primeng/skeleton';

import type { TaskListItem, TaskType, TaskPriority, ReorderTaskItem } from '@mpm/shared-types';

const PRIORITY_ICON: Record<TaskPriority, string> = {
  urgent: '🔴', high: '🟠', medium: '🟡', low: '🔵', none: '⚪',
};

const TYPE_ICON: Record<TaskType, string> = {
  epic: '⚡', story: '📖', task: '✅', subtask: '↳',
};

@Component({
  standalone: true,
  selector: 'app-task-list',
  imports: [
    CommonModule, FormsModule, DragDropModule,
    ButtonModule, CheckboxModule, TagModule, TooltipModule, SkeletonModule,
  ],
  template: `
    @if (isLoading) {
      <div class="p-4 space-y-2">
        @for (i of [1,2,3,4,5]; track i) {
          <p-skeleton height="2.5rem" />
        }
      </div>
    } @else if (tasks.length === 0) {
      <div class="flex flex-col items-center justify-center h-64 text-gray-400">
        <span class="text-4xl mb-3">📋</span>
        <p class="text-base font-medium">Backlog trống</p>
        <p class="text-sm mt-1">Nhấn "Thêm task" để bắt đầu</p>
      </div>
    } @else {
      <div
        cdkDropList
        [cdkDropListDisabled]="orderBy !== 'rank'"
        (cdkDropListDropped)="onDrop($event)"
        class="divide-y divide-gray-100 dark:divide-surface-800"
      >
        @for (task of tasks; track task.id) {
          <div
            cdkDrag
            class="group flex items-center gap-2 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-surface-800 transition-colors cursor-default select-none"
            [class.bg-indigo-50]="selectedIds.has(task.id)"
            [class.dark:bg-indigo-950]="selectedIds.has(task.id)"
            [style.paddingLeft.px]="16 + (getLevel(task) * 24)"
            (click)="taskClick.emit(task)"
          >
            <!-- Drag handle -->
            <span
              cdkDragHandle
              class="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 flex-shrink-0"
              [class.pointer-events-none]="orderBy !== 'rank'"
              [class.!opacity-0]="orderBy !== 'rank'"
              [pTooltip]="orderBy !== 'rank' ? 'Chuyển sang Manual Rank để sắp xếp' : ''"
              (click)="$event.stopPropagation()"
            >⠿</span>

            <!-- Checkbox -->
            <p-checkbox
              [binary]="true"
              [ngModel]="selectedIds.has(task.id)"
              (ngModelChange)="selectionToggle.emit(task.id)"
              styleClass="flex-shrink-0"
              (click)="$event.stopPropagation()"
            />

            <!-- Type icon -->
            <span class="text-sm flex-shrink-0" [pTooltip]="task.type">{{ typeIcon(task.type) }}</span>

            <!-- Task ID -->
            <span class="text-xs text-gray-400 font-mono flex-shrink-0 min-w-[4rem]">{{ task.taskId }}</span>

            <!-- Title -->
            <span class="flex-1 text-sm font-medium text-gray-800 dark:text-surface-100 truncate">{{ task.title }}</span>

            <!-- State badge -->
            @if (task.state) {
              <span
                class="text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0"
                [style.background]="task.state.color + '22'"
                [style.color]="task.state.color"
              >{{ task.state.name }}</span>
            }

            <!-- Priority -->
            <span class="flex-shrink-0 text-sm" [pTooltip]="task.priority">{{ priorityIcon(task.priority) }}</span>

            <!-- Assignee avatars (max 3 + +N) -->
            @if (task.assignees?.length) {
              <div class="flex -space-x-1 flex-shrink-0">
                @for (a of task.assignees.slice(0, 3); track a.userId) {
                  <div class="w-5 h-5 rounded-full bg-indigo-200 dark:bg-indigo-700 border border-white dark:border-surface-900 flex items-center justify-center text-xs font-semibold text-indigo-700 dark:text-indigo-200"
                    [pTooltip]="a.displayName">
                    {{ a.displayName[0].toUpperCase() }}
                  </div>
                }
                @if (task.assignees.length > 3) {
                  <div class="w-5 h-5 rounded-full bg-gray-200 border border-white flex items-center justify-center text-xs text-gray-500">
                    +{{ task.assignees.length - 3 }}
                  </div>
                }
              </div>
            }

            <!-- Due date -->
            @if (task.dueDate) {
              <span
                class="text-xs flex-shrink-0"
                [class.text-red-500]="isOverdue(task.dueDate)"
                [class.font-medium]="isOverdue(task.dueDate)"
                [class.text-gray-400]="!isOverdue(task.dueDate)"
              >{{ formatDate(task.dueDate) }}</span>
            }

            <!-- Counts -->
            @if (task['subItemCount'] > 0) {
              <span class="text-xs text-gray-400 flex-shrink-0" pTooltip="Sub-items">↳{{ task['subItemCount'] }}</span>
            }
            @if (task['attachmentCount'] > 0) {
              <span class="text-xs text-gray-400 flex-shrink-0" pTooltip="Attachments">📎{{ task['attachmentCount'] }}</span>
            }

            <!-- Action menu -->
            <button
              pButton icon="pi pi-ellipsis-v" size="small" text severity="secondary"
              class="opacity-0 group-hover:opacity-100 flex-shrink-0"
              (click)="$event.stopPropagation(); taskMenuClick.emit(task)"
            ></button>
          </div>
        }
      </div>
    }
  `,
})
export class TaskListComponent {
  @Input() tasks: TaskListItem[] = [];
  @Input() isLoading = false;
  @Input() orderBy = 'rank';
  @Input() selectedIds = new Set<string>();

  @Output() taskClick = new EventEmitter<TaskListItem>();
  @Output() taskMenuClick = new EventEmitter<TaskListItem>();
  @Output() selectionToggle = new EventEmitter<string>();
  @Output() reorder = new EventEmitter<ReorderTaskItem[]>();

  protected typeIcon(type: TaskType): string { return TYPE_ICON[type] ?? '✅'; }
  protected priorityIcon(p: TaskPriority): string { return PRIORITY_ICON[p] ?? '⚪'; }

  protected getLevel(task: TaskListItem): number {
    return task.parentId ? 1 : 0;
  }

  protected isOverdue(dueDate: string | null): boolean {
    return !!dueDate && new Date(dueDate) < new Date();
  }

  protected formatDate(date: string): string {
    return new Date(date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  }

  protected onDrop(event: CdkDragDrop<TaskListItem[]>): void {
    if (event.previousIndex === event.currentIndex) return;

    const list = [...this.tasks];
    const moved = list.splice(event.previousIndex, 1)[0];
    list.splice(event.currentIndex, 0, moved);

    const prevOrder = list[event.currentIndex - 1]?.backlogOrder ?? 0;
    const nextOrder = list[event.currentIndex + 1]?.backlogOrder ?? prevOrder + 2000;
    const newOrder = (prevOrder + nextOrder) / 2;

    this.reorder.emit([{ taskId: moved.id, backlogOrder: newOrder }]);
  }
}
