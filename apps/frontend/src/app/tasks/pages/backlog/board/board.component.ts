import { Component, Input, Output, EventEmitter, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { BoardColumnComponent } from './board-column.component';
import { TaskStore } from '../../../state/task.store';
import type { TaskListItem, ProjectState, DisplayProperties } from '@mpm/shared-types';

const STATE_GROUP_ORDER = ['backlog', 'unstarted', 'started', 'completed', 'cancelled'];

@Component({
  standalone: true,
  selector: 'app-board',
  imports: [CommonModule, BoardColumnComponent],
  template: `
    <div class="flex gap-4 h-full overflow-x-auto px-4 py-4">
      @for (col of columns(); track col.state.id) {
        <app-board-column
          [state]="col.state"
          [tasks]="col.tasks"
          [connectedTo]="columnIds()"
          [displayProps]="displayProps"
          [hoveredGroupId]="hoveredGroupId()"
          (cardClick)="taskClick.emit($event)"
          (groupHover)="hoveredGroupId.set($event)"
          (cardDropped)="onCardDropped($event)"
        />
      }
    </div>
  `,
})
export class BoardComponent {
  private readonly taskStore = inject(TaskStore);

  private _tasks = signal<TaskListItem[]>([]);
  private _states = signal<ProjectState[]>([]);

  @Input() set tasks(v: TaskListItem[]) { this._tasks.set(v); }
  @Input() set states(v: ProjectState[]) { this._states.set(v); }
  @Input() displayProps!: DisplayProperties;
  @Input() projectId = '';

  @Output() taskClick = new EventEmitter<TaskListItem>();

  protected hoveredGroupId = signal<string | null>(null);

  protected readonly columns = computed(() => {
    const tasks = this._tasks();
    const states = this._states();

    const byState = new Map<string, TaskListItem[]>();
    for (const t of tasks) {
      if (!byState.has(t.stateId)) byState.set(t.stateId, []);
      byState.get(t.stateId)!.push(t);
    }

    return [...states]
      .sort((a, b) => {
        const ga = STATE_GROUP_ORDER.indexOf(a.group);
        const gb = STATE_GROUP_ORDER.indexOf(b.group);
        return ga !== gb ? ga - gb : a.order - b.order;
      })
      .map(state => ({
        state,
        tasks: (byState.get(state.id) ?? []).sort((a, b) => a.backlogOrder - b.backlogOrder),
      }));
  });

  protected readonly columnIds = computed(() =>
    this.columns().map(c => 'col-' + c.state.id)
  );

  protected onCardDropped({ event, stateId }: { event: CdkDragDrop<TaskListItem[]>; stateId: string }): void {
    const task: TaskListItem = event.item.data;

    if (event.previousContainer === event.container) {
      // Reorder within same column — just visual, backlogOrder stays
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      // Move to different column — optimistic update + API call
      transferArrayItem(event.previousContainer.data, event.container.data, event.previousIndex, event.currentIndex);

      const destTasks = event.container.data;
      const prevTask = destTasks[event.currentIndex - 1];
      const nextTask = destTasks[event.currentIndex + 1];
      const prevOrder = prevTask ? prevTask.backlogOrder : (nextTask ? nextTask.backlogOrder - 2000 : 0);
      const nextOrder = nextTask ? nextTask.backlogOrder : (prevTask ? prevTask.backlogOrder + 2000 : 2000);
      const newOrder = (prevOrder + nextOrder) / 2;

      this.taskStore.moveToState(this.projectId, task.id, stateId, newOrder);
    }
  }
}
