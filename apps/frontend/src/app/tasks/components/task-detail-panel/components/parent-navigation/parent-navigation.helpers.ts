import type { TaskType, TaskListItem } from '@mpm/shared-types';

/**
 * Thứ tự phân cấp task: Epic → Story → Task → Bug
 * Một task chỉ có thể là con của task type phía trên nó trong chuỗi.
 */
export const HIERARCHY_ORDER: TaskType[] = ['epic', 'story', 'task', 'bug'];

/**
 * Type icon mapping — consistent với task-row component
 */
export const TYPE_CONFIG: Record<TaskType, { icon: string; color: string }> = {
  epic: { icon: 'pi pi-bolt', color: '#8B5CF6' },
  story: { icon: 'pi pi-book', color: '#3B82F6' },
  task: { icon: 'pi pi-check-circle', color: '#10B981' },
  bug: { icon: 'pi pi-ticket', color: '#EF4444' },
};

/**
 * Trả về danh sách task types hợp lệ làm parent cho `childType`.
 *
 * Quy tắc: parent phải ở cấp cao hơn child trong hierarchy.
 * - epic → [] (không có parent hợp lệ)
 * - story → ['epic']
 * - task → ['epic', 'story']
 * - bug → ['epic', 'story', 'task']
 */
export function getValidParentTypes(childType: TaskType): TaskType[] {
  const childIndex = HIERARCHY_ORDER.indexOf(childType);
  if (childIndex <= 0) return [];
  return HIERARCHY_ORDER.slice(0, childIndex);
}

/**
 * Lọc danh sách task chỉ giữ lại những task có type hợp lệ làm parent.
 * Cũng loại bỏ task hiện tại (không thể là parent của chính mình).
 */
export function filterValidParents(
  tasks: TaskListItem[],
  childType: TaskType,
  currentTaskId?: string,
): TaskListItem[] {
  const validTypes = getValidParentTypes(childType);
  return tasks.filter(
    (t) => validTypes.includes(t.type) && t.id !== currentTaskId,
  );
}
