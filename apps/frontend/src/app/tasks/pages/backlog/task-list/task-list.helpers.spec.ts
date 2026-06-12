import { selectRootTasks } from './task-list.helpers';
import { TaskListItem } from '@mpm/shared-types';

const task = (over: Partial<TaskListItem>): TaskListItem =>
  ({ id: 'id', parentId: null, ...over }) as TaskListItem;

describe('selectRootTasks', () => {
  it('task không có parentId là root', () => {
    const t = task({ id: 'a' });
    expect(selectRootTasks([t])).toEqual([t]);
  });

  it('child có parent trong danh sách KHÔNG là root (render nested)', () => {
    const parent = task({ id: 'p' });
    const child = task({ id: 'c', parentId: 'p' });
    expect(selectRootTasks([parent, child])).toEqual([parent]);
  });

  it('orphan (parent vắng mặt trong kết quả filter) là root', () => {
    const orphan = task({ id: 'c', parentId: 'p-not-in-list' });
    expect(selectRootTasks([orphan])).toEqual([orphan]);
  });

  it('hỗn hợp: root + orphan giữ nguyên thứ tự, nested bị loại', () => {
    const root = task({ id: 'r' });
    const nested = task({ id: 'n', parentId: 'r' });
    const orphan = task({ id: 'o', parentId: 'ghost' });
    expect(selectRootTasks([root, nested, orphan]).map((t) => t.id)).toEqual(['r', 'o']);
  });
});
