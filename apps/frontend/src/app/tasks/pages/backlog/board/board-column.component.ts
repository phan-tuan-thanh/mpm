import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DragDropModule, CdkDragDrop } from '@angular/cdk/drag-drop';
import { BoardCardComponent } from './board-card.component';
import type { TaskListItem, ProjectState, DisplayProperties } from '@mpm/shared-types';

@Component({
  standalone: true,
  selector: 'app-board-column',
  imports: [CommonModule, DragDropModule, BoardCardComponent],
  template: `
    <div class="flex flex-col h-full min-w-[260px] max-w-[320px] w-72 flex-shrink-0 bg-gray-100 dark:bg-surface-800 rounded-xl p-3">
      <!-- Column header -->
      <div class="flex items-center gap-2 px-1 py-1 mb-3 flex-shrink-0">
        <span class="w-3 h-3 rounded-full flex-shrink-0 border-2"
              [style.border-color]="state.color"
              [style.background]="isFilledGroup ? state.color : 'transparent'">
        </span>
        <span class="text-sm font-semibold text-gray-700 dark:text-surface-100 flex-1 truncate">
          {{ state.name }}
        </span>
        <span class="text-xs text-gray-500 bg-gray-200 dark:bg-surface-700 rounded-full px-1.5 font-medium min-w-[1.25rem] text-center leading-5">
          {{ tasks.length }}
        </span>
      </div>

      <!-- Drop list -->
      <div
        cdkDropList
        [id]="'col-' + state.id"
        [cdkDropListData]="tasks"
        [cdkDropListConnectedTo]="connectedTo"
        (cdkDropListDropped)="onDrop($event)"
        class="flex flex-col gap-2 flex-1 overflow-y-auto rounded-lg transition-colors"
        [class.bg-indigo-100]="isDragOver"
        [class.dark:bg-indigo-950]="isDragOver"
        (cdkDropListEntered)="isDragOver = true"
        (cdkDropListExited)="isDragOver = false"
        style="min-height: 80px;">

        @for (task of tasks; track task.id) {
          <div cdkDrag [cdkDragData]="task" class="cursor-grab active:cursor-grabbing">
            <app-board-card
              [task]="task"
              [displayProps]="displayProps"
              (cardClick)="cardClick.emit($event)"
            />
            <!-- Custom drag preview -->
            <div *cdkDragPreview class="bg-white dark:bg-surface-800 border border-indigo-300 rounded-lg p-3 shadow-xl w-64 pointer-events-none">
              <div class="text-[10px] font-mono text-gray-400 mb-1">{{ task.taskId }}</div>
              <div class="text-sm text-gray-800 dark:text-surface-100 font-medium line-clamp-2">{{ task.title }}</div>
            </div>
            <div *cdkDragPlaceholder class="h-20 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 border-2 border-dashed border-indigo-300 dark:border-indigo-700"></div>
          </div>
        }

        @if (tasks.length === 0) {
          <div class="flex flex-col items-center justify-center py-8 text-gray-400 dark:text-surface-500 text-xs gap-2">
            <i class="pi pi-inbox text-xl opacity-50"></i>
            <span>Không có task</span>
          </div>
        }
      </div>
    </div>
  `,
})
export class BoardColumnComponent {
  @Input({ required: true }) state!: ProjectState;
  @Input() tasks: TaskListItem[] = [];
  @Input() connectedTo: string[] = [];
  @Input() displayProps!: DisplayProperties;

  @Output() cardClick = new EventEmitter<TaskListItem>();
  @Output() cardDropped = new EventEmitter<{ event: CdkDragDrop<TaskListItem[]>; stateId: string }>();

  protected isDragOver = false;

  protected get isFilledGroup(): boolean {
    return this.state.group === 'started' || this.state.group === 'completed';
  }

  protected onDrop(event: CdkDragDrop<TaskListItem[]>): void {
    this.isDragOver = false;
    this.cardDropped.emit({ event, stateId: this.state.id });
  }
}
