import { Component, Input, Output, EventEmitter, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TooltipModule } from 'primeng/tooltip';
import type { TaskListItem, DisplayProperties } from '@mpm/shared-types';

const PRIORITY_ICON: Record<string, string> = {
  urgent: '🔴',
  high: '🟠',
  medium: '🟡',
  low: '🔵',
  none: '⚪',
};

@Component({
  standalone: true,
  selector: 'app-board-card',
  imports: [CommonModule, TooltipModule],
  template: `
    <div
      class="bg-white dark:bg-surface-800 border border-gray-200 dark:border-surface-700 rounded-lg p-3 cursor-pointer select-none transition-all duration-150 ease-in-out"
      [class.ring-2]="isHighlighted()"
      [class.ring-indigo-400]="isHighlighted()"
      [class.scale-[1.01]]="isHighlighted()"
      [class.shadow-md]="isHighlighted()"
      [class.opacity-40]="isDimmed()"
      (click)="cardClick.emit(task)"
      (mouseenter)="onMouseEnter()"
      (mouseleave)="onMouseLeave()">

      <!-- identifier -->
      <div class="text-[10px] font-mono text-gray-400 mb-1">{{ task.taskId }}</div>

      <!-- title -->
      <div class="text-sm text-gray-800 dark:text-surface-100 font-medium line-clamp-2 mb-2 leading-snug">
        {{ task.title }}
      </div>

      <!-- meta row 1: priority + labels -->
      @if ((displayProps.showPriority && task.priority !== 'none') || (displayProps.showLabels && task.labels.length)) {
        <div class="flex items-center gap-1 flex-wrap mb-1">
          @if (displayProps.showPriority && task.priority !== 'none') {
            <span class="text-xs" [pTooltip]="task.priority">{{ priorityIcon }}</span>
          }
          @if (displayProps.showLabels) {
            @for (label of visibleLabels; track label.id) {
              @if (displayProps.labelMode === 'badge') {
                <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium text-white"
                      [style.background-color]="label.color">
                  {{ label.name }}
                </span>
              } @else {
                <span class="w-2 h-2 rounded-full flex-shrink-0" [style.background-color]="label.color"
                      [pTooltip]="label.name"></span>
              }
            }
          }
        </div>
      }

      <!-- meta row 2: assignee + due date -->
      @if ((displayProps.showAssignee && task.assignees.length) || (displayProps.showDueDate && task.dueDate)) {
        <div class="flex items-center gap-2 mt-1">
          @if (displayProps.showAssignee && task.assignees.length) {
            <div class="flex items-center gap-0.5">
              @for (assignee of task.assignees.slice(0, 2); track assignee.userId) {
                @if (assignee.avatarUrl) {
                  <img [src]="assignee.avatarUrl" [alt]="assignee.displayName" class="w-4 h-4 rounded-full border border-white dark:border-surface-800" [pTooltip]="assignee.displayName" />
                } @else {
                  <span class="w-4 h-4 rounded-full bg-indigo-500 text-white text-[8px] flex items-center justify-center border border-white dark:border-surface-800" [pTooltip]="assignee.displayName">
                    {{ assignee.displayName.charAt(0).toUpperCase() }}
                  </span>
                }
              }
            </div>
          }
          @if (displayProps.showDueDate && task.dueDate) {
            <span class="text-[10px] text-gray-400 flex items-center gap-0.5">
              <i class="pi pi-calendar" style="font-size: 9px"></i>
              {{ formatDate(task.dueDate) }}
            </span>
          }
          <div class="flex-1"></div>
          @if (displayProps.showSubItemCount && task.subItemCount > 0) {
            <span class="text-[10px] text-gray-400 flex items-center gap-0.5">
              <i class="pi pi-sitemap" style="font-size: 9px"></i>
              {{ task.subItemCount }}
            </span>
          }
        </div>
      }

      <!-- parent ref -->
      @if (displayProps.showParent && task.parent) {
        <div class="mt-1.5 pt-1.5 border-t border-gray-100 dark:border-surface-700 flex items-center gap-1 text-[10px] text-gray-400 truncate">
          <i class="pi pi-arrow-up" style="font-size: 9px"></i>
          <span class="truncate">{{ task.parent.taskId }} · {{ task.parent.title }}</span>
        </div>
      }
    </div>
  `,
})
export class BoardCardComponent {
  @Input({ required: true }) task!: TaskListItem;
  @Input() displayProps!: DisplayProperties;
  @Input() hoveredGroupId: string | null = null;
  @Output() cardClick = new EventEmitter<TaskListItem>();
  @Output() groupHover = new EventEmitter<string | null>();

  protected get priorityIcon(): string {
    return PRIORITY_ICON[this.task.priority] ?? '⚪';
  }

  protected get visibleLabels() {
    return this.task.labels.slice(0, this.displayProps.maxLabels ?? 2);
  }

  protected isHighlighted(): boolean {
    if (!this.hoveredGroupId) return false;
    return this.task.id === this.hoveredGroupId || this.task.parentId === this.hoveredGroupId;
  }

  protected isDimmed(): boolean {
    if (!this.hoveredGroupId) return false;
    return !this.isHighlighted();
  }

  protected onMouseEnter(): void {
    const groupId = this.task.parentId ?? this.task.id;
    this.groupHover.emit(groupId);
  }

  protected onMouseLeave(): void {
    this.groupHover.emit(null);
  }

  protected formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
  }
}
