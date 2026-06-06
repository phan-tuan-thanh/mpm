import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { TooltipModule } from 'primeng/tooltip';
import type { TaskListItem, TaskType, TaskPriority } from '@mpm/shared-types';

const PRIORITY_CONFIG = {
  urgent: { icon: 'pi pi-angle-double-up', color: '#EF4444', label: 'Urgent' },
  high: { icon: 'pi pi-angle-up', color: '#F97316', label: 'High' },
  medium: { icon: 'pi pi-minus', color: '#EAB308', label: 'Medium' },
  low: { icon: 'pi pi-angle-down', color: '#3B82F6', label: 'Low' },
  none: { icon: 'pi pi-circle', color: '#D1D5DB', label: 'None' }
} as Record<TaskPriority, { icon: string; color: string; label: string }>;

const TYPE_CONFIG = {
  epic: { icon: 'pi pi-bolt', color: '#8B5CF6' },
  story: { icon: 'pi pi-book', color: '#3B82F6' },
  task: { icon: 'pi pi-check-circle', color: '#10B981' },
  subtask: { icon: 'pi pi-minus-circle', color: '#6B7280' }
} as Record<TaskType, { icon: string; color: string }>;

const AVATAR_PALETTE = [
  ['#EDE9FE', '#5B21B6'], ['#DBEAFE', '#1E40AF'], ['#D1FAE5', '#065F46'],
  ['#FEF3C7', '#92400E'], ['#FCE7F3', '#9D174D'], ['#FFE4E6', '#9F1239']
];

@Component({
  selector: 'app-task-row',
  standalone: true,
  imports: [
    CommonModule, FormsModule, DragDropModule,
    ButtonModule, CheckboxModule, TooltipModule
  ],
  styles: [`
    :host { display: flex; align-items: center; width: 100%; }
  `],
  template: `
    <div class="flex items-center justify-center flex-shrink-0" style="width:40px" (click)="$event.stopPropagation()">
      <p-checkbox [binary]="true" [ngModel]="isSelected" (ngModelChange)="selectionToggle.emit(task.id)" />
    </div>
    @if (depth === 1) {
      <span class="flex-shrink-0" style="width:20px; padding-left:4px"><span class="block w-3 h-px bg-gray-200"></span></span>
    } @else {
      <i cdkDragHandle class="show-on-hover opacity-0 pi pi-bars text-[10px] text-gray-300 hover:text-gray-500 cursor-grab flex-shrink-0 mr-1" style="width:12px" (click)="$event.stopPropagation()"></i>
    }
    @if (childCount > 0) {
      <button class="flex items-center justify-center flex-shrink-0 w-4 h-4 rounded hover:bg-gray-200 mr-1" (click)="$event.stopPropagation(); toggleExpand.emit(task.id)">
        <i class="pi text-[9px] text-gray-500" [class.pi-chevron-right]="!isExpanded" [class.pi-chevron-down]="isExpanded"></i>
      </button>
    } @else { <span class="flex-shrink-0 mr-1" style="width:16px"></span> }
    <span class="w-3.5 h-3.5 rounded-full flex-shrink-0 border-2 mr-2" [style.border-color]="task.state?.color ?? '#9CA3AF'" [style.background]="isFilledState(task.state?.group ?? '') ? (task.state?.color ?? '#9CA3AF') : 'transparent'" [pTooltip]="task.state?.name"></span>
    <span class="text-xs font-mono text-gray-400 flex-shrink-0 mr-2" style="width:58px">{{ task.taskId }}</span>
    <i class="flex-shrink-0 text-xs mr-2" [class]="typeIcon(task.type)" [style.color]="typeColor(task.type)" [pTooltip]="task.type"></i>
    <span class="flex-1 text-sm text-gray-800 truncate">{{ task.title }}</span>
    @if (childCount > 0) {
      <span class="show-on-hover opacity-0 flex items-center gap-0.5 text-xs text-gray-400 flex-shrink-0 mr-2" [pTooltip]="childCount + ' sub-items'">
        <i class="pi pi-sitemap text-[10px]"></i>{{ childCount }}
      </span>
    }
    @for (label of (task.labels ?? []).slice(0, 2); track label.id) {
      <span class="show-on-hover opacity-0 text-xs px-1.5 py-px rounded-full font-medium flex-shrink-0 mr-1 max-w-[72px] truncate" [style.background]="label.color + '22'" [style.color]="label.color">{{ label.name }}</span>
    }
    @if (task.estimateValue != null) {
      <span class="show-on-hover opacity-0 flex items-center gap-0.5 text-xs text-gray-400 flex-shrink-0 mr-2" pTooltip="Estimate"><i class="pi pi-hourglass text-[10px]"></i>{{ task.estimateValue }}</span>
    }
    @if (task.dueDate) {
      <span class="flex items-center gap-0.5 text-xs flex-shrink-0 mr-2" [class.text-red-500]="isOverdue(task.dueDate)" [class.text-gray-400]="!isOverdue(task.dueDate)" pTooltip="Due date"><i class="pi pi-calendar text-[10px]"></i>{{ formatDate(task.dueDate) }}</span>
    }
    @if (task.priority !== 'none') {
      <i class="show-on-hover opacity-0 flex-shrink-0 text-xs mr-2" [class]="priorityIcon(task.priority)" [style.color]="priorityColor(task.priority)" [pTooltip]="'Priority: ' + task.priority"></i>
    }
    @if (task.assignees?.length) {
      <div class="show-on-hover opacity-0 flex -space-x-1.5 flex-shrink-0 mr-2">
        @for (a of task.assignees.slice(0, 3); track a.userId) {
          <div class="w-5 h-5 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold" [style.background]="avatarBg(a.displayName)" [style.color]="avatarFg(a.displayName)" [pTooltip]="a.displayName">{{ a.displayName[0].toUpperCase() }}</div>
        }
        @if (task.assignees.length > 3) {
          <div class="w-5 h-5 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-[10px] text-gray-500">+{{ task.assignees.length - 3 }}</div>
        }
      </div>
    }
    <button pButton icon="pi pi-ellipsis-h" size="small" text severity="secondary" class="show-on-hover opacity-0 flex-shrink-0 mr-2 !w-6 !h-6 !p-0" (click)="$event.stopPropagation(); taskMenuClick.emit(task)"></button>
  `
})
export class TaskRowComponent {
  @Input({ required: true }) task!: TaskListItem;
  @Input() depth = 0;
  @Input() childCount = 0;
  @Input() isSelected = false;
  @Input() isExpanded = false;

  @Output() selectionToggle = new EventEmitter<string>();
  @Output() toggleExpand = new EventEmitter<string>();
  @Output() taskMenuClick = new EventEmitter<TaskListItem>();

  protected isFilledState(group: string): boolean {
    return group === 'started' || group === 'completed';
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
}
