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
    <div class="flex gap-3 h-full overflow-x-auto px-4 pt-5 pb-4">
      @for (col of columns(); track col.state.id) {
        <app-board-column
          [state]="col.state"
          [tasks]="col.tasks"
          [connectedTo]="columnIds()"
          [displayProps]="displayProps"
          (cardClick)="taskClick.emit($event)"
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

  protected onCardDropped({ event, stateId, hoveredTaskId }: { event: CdkDragDrop<TaskListItem[]>; stateId: string; hoveredTaskId: string | null }): void {
    const task: TaskListItem = event.item.data;

    // Calculate drop index from hoveredTaskId (line indicator position) instead of event.currentIndex
    // which may be unreliable when cdkDropListSortingDisabled is true.
    const destTasks = event.container.data.filter(t => t.id !== task.id);
    const insertBeforeIdx = hoveredTaskId ? destTasks.findIndex(t => t.id === hoveredTaskId) : -1;
    const dropIdx = insertBeforeIdx >= 0 ? insertBeforeIdx : destTasks.length;

    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, dropIdx);
    } else {
      transferArrayItem(event.previousContainer.data, event.container.data, event.previousIndex, dropIdx);

      const prevTask = destTasks[dropIdx - 1];
      const nextTask = destTasks[dropIdx];
      const prevOrder = prevTask ? prevTask.backlogOrder : (nextTask ? nextTask.backlogOrder - 2000 : 0);
      const nextOrder = nextTask ? nextTask.backlogOrder : (prevTask ? prevTask.backlogOrder + 2000 : 2000);
      const newOrder = (prevOrder + nextOrder) / 2;

      this.taskStore.moveToState(this.projectId, task.id, stateId, newOrder);
    }
  }
}
