import { Component, Input, Output, EventEmitter, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DragDropModule, CdkDragDrop } from '@angular/cdk/drag-drop';
import { BoardCardComponent } from './board-card.component';
import { StateDotComponent } from '../../../../shared/components/state-dot/state-dot.component';
import type { TaskListItem, ProjectState, DisplayProperties } from '@mpm/shared-types';
import { ProjectStore } from '../../../../projects/state/project.store';
import { CustomTranslationService } from '../../../../shared/services/custom-translation.service';

@Component({
  standalone: true,
  selector: 'app-board-column',
  imports: [CommonModule, DragDropModule, BoardCardComponent, StateDotComponent],
  styles: [`
    ::ng-deep .cdk-drop-list-dragging .cdk-drag {
      transition: none !important;
    }
  `],
  template: `
    <div class="flex flex-col h-full flex-shrink-0 bg-gray-100 dark:bg-surface-800 rounded-xl p-3"
         [style.width.px]="displayProps.kanbanColumnWidth || 288"
         [style.min-width.px]="displayProps.kanbanColumnWidth || 288">
      <!-- Column header -->
      <div class="flex items-center gap-2 px-1 py-1 mb-3 flex-shrink-0">
        <app-state-dot [state]="state" [size]="12" />
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
        [cdkDropListSortingDisabled]="true"
        (cdkDropListDropped)="onDrop($event)"
        class="flex flex-col gap-2 flex-1 overflow-y-auto rounded-lg transition-colors"
        (cdkDropListEntered)="isDragOver = true"
        (cdkDropListExited)="isDragOver = false; hoveredTaskId = null"
        style="min-height: 80px;">

        @for (task of tasks; track task.id) {
          <!-- Ghost at original position: stays in source column while dragging.
               Must be OUTSIDE cdkDrag so CDK doesn't move it to destination. -->
          @if (draggedTaskId === task.id) {
            <div class="opacity-25 pointer-events-none rounded-lg">
              <app-board-card [task]="task" [displayProps]="displayProps" />
            </div>
          }

          <div cdkDrag [cdkDragData]="task"
               class="cursor-grab active:cursor-grabbing relative"
               (cdkDragStarted)="draggedTaskId = task.id"
               (cdkDragEnded)="onDragEnd()"
               (mouseenter)="hoveredTaskId = task.id"
               (mouseleave)="hoveredTaskId === task.id ? hoveredTaskId = null : null">

            <!-- Line Indicator: same-column drag OR cross-column drag (isDragOver) -->
            @if ((draggedTaskId || isDragOver) && hoveredTaskId === task.id) {
              <div class="h-0.5 bg-indigo-600 dark:bg-indigo-500 w-full absolute top-0 left-0 right-0 z-20"></div>
            }

            <app-board-card
              [task]="task"
              [displayProps]="displayProps"
              [class.pointer-events-none]="!!(draggedTaskId || isDragOver)"
              (cardClick)="cardClick.emit($event)"
            />
            <!-- Compact drag preview follows cursor -->
            <div *cdkDragPreview
                 class="flex items-center gap-2 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 shadow-xl rounded-lg px-3 pointer-events-none select-none"
                 style="min-width:200px;max-width:280px;height:40px;">
              <span class="text-[10px] font-mono text-gray-400 flex-shrink-0">{{ task.taskId }}</span>
              <span class="text-sm text-gray-800 dark:text-surface-100 font-medium truncate">{{ task.title }}</span>
            </div>
            <!-- Empty placeholder: CDK anchor in destination, no visual -->
            <div *cdkDragPlaceholder></div>
          </div>
        }

        <!-- End drop zone: shows line indicator when dragging below all cards -->
        @if (tasks.length > 0) {
          <div class="relative flex-shrink-0" style="min-height: 24px;"
               (mouseenter)="hoveredTaskId = 'end'"
               (mouseleave)="hoveredTaskId === 'end' ? hoveredTaskId = null : null">
            @if ((draggedTaskId || isDragOver) && hoveredTaskId === 'end') {
              <div class="h-0.5 bg-indigo-600 dark:bg-indigo-500 w-full absolute top-0 left-0 right-0 rounded-full"></div>
            }
          </div>
        }

        @if (tasks.length === 0) {
          <div class="relative flex flex-col items-center justify-center py-8 text-gray-400 dark:text-surface-500 text-xs gap-2">
            @if (isDragOver) {
              <div class="h-0.5 bg-indigo-600 dark:bg-indigo-500 w-full absolute top-0 left-0 right-0 rounded-full"></div>
            }
            <i class="pi pi-inbox text-xl opacity-50"></i>
            <span>{{ t().noTasks }}</span>
          </div>
        }
      </div>
    </div>
  `,
})
export class BoardColumnComponent {
  private readonly projectStore = inject(ProjectStore);
  private readonly customTrans = inject(CustomTranslationService);

  readonly t = computed(() => {
    const isEn = this.projectStore.projectLanguage() === 'en';
    const ct = this.customTrans;
    return {
      noTasks: ct.t('board.noTasks', isEn ? 'No tasks' : 'Không có task'),
    };
  });

  @Input({ required: true }) state!: ProjectState;
  @Input() tasks: TaskListItem[] = [];
  @Input() connectedTo: string[] = [];
  @Input() displayProps!: DisplayProperties;

  @Output() cardClick = new EventEmitter<TaskListItem>();
  @Output() cardDropped = new EventEmitter<{ event: CdkDragDrop<TaskListItem[]>; stateId: string; hoveredTaskId: string | null }>();

  protected isDragOver = false;
  protected draggedTaskId: string | null = null;
  protected hoveredTaskId: string | null = null;

  protected onDragEnd(): void {
    setTimeout(() => {
      this.draggedTaskId = null;
      this.hoveredTaskId = null;
    }, 100);
  }

  protected onDrop(event: CdkDragDrop<TaskListItem[]>): void {
    const hoveredId = this.hoveredTaskId;
    this.isDragOver = false;
    this.draggedTaskId = null;
    this.hoveredTaskId = null;
    this.cardDropped.emit({ event, stateId: this.state.id, hoveredTaskId: hoveredId });
  }
}
