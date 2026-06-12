import { TaskListItem } from '@mpm/shared-types';

/**
 * Chọn các task render làm root trong List view.
 * Root = không có parent, HOẶC parent không nằm trong danh sách hiện tại
 * (vd: sub-item match filter nhưng parent không match — "orphan" phải render
 * phẳng thay vì biến mất).
 */
export function selectRootTasks(tasks: TaskListItem[]): TaskListItem[] {
  const ids = new Set(tasks.map((t) => t.id));
  return tasks.filter((t) => !t.parentId || !ids.has(t.parentId));
}
