import { TaskListComponent } from './task-list.component';
import { TaskListItem, ProjectState } from '@mpm/shared-types';

/**
 * Verify pipeline render của List view: task match filter nhưng parent vắng mặt
 * (orphan) phải xuất hiện trong flatGroups của đúng nhóm state.
 */
function task(over: Partial<TaskListItem>): TaskListItem {
  return {
    id: 'id',
    parentId: null,
    stateId: 's-done',
    backlogOrder: 0,
    subItemCount: 0,
    ...over,
  } as TaskListItem;
}

function state(over: Partial<ProjectState>): ProjectState {
  return {
    id: 's-done',
    name: 'Done',
    color: '#10B981',
    group: 'completed',
    isDefault: false,
    order: 0,
    ...over,
  } as ProjectState;
}

describe('TaskListComponent — orphan rendering pipeline', () => {
  it('orphan tasks xuất hiện trong flatRows của nhóm state tương ứng', () => {
    const cmp = new TaskListComponent();
    cmp.states = [state({})];
    cmp.tasks = [
      task({ id: 'o1', parentId: 'ghost-epic' }),
      task({ id: 'o2', parentId: 'ghost-epic' }),
    ];

    const groups = (cmp as unknown as { flatGroups: () => Array<{ state: ProjectState; flatRows: Array<{ task: TaskListItem }> }> }).flatGroups();
    const done = groups.find((g) => g.state.id === 's-done');
    expect(done?.flatRows.map((r) => r.task.id)).toEqual(['o1', 'o2']);
  });
});
