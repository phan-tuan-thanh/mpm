import { StateGroup } from '@mpm/shared-types';

/**
 * Thứ tự hiển thị các nhóm state trong UI
 */
export const GROUP_ORDER: StateGroup[] = [
  StateGroup.BACKLOG,
  StateGroup.UNSTARTED,
  StateGroup.STARTED,
  StateGroup.COMPLETED,
  StateGroup.CANCELLED,
];

/**
 * Lấy tên hiển thị tiếng Việt cho state group
 */
export function getGroupName(group: StateGroup): string {
  switch (group) {
    case StateGroup.BACKLOG:
      return 'Backlog';
    case StateGroup.UNSTARTED:
      return 'Chưa bắt đầu';
    case StateGroup.STARTED:
      return 'Đang thực hiện';
    case StateGroup.COMPLETED:
      return 'Đã hoàn thành';
    case StateGroup.CANCELLED:
      return 'Đã hủy';
    default:
      return group;
  }
}

/**
 * Lấy Tailwind CSS class màu nền cho indicator của state group
 */
export function getGroupColor(group: StateGroup): string {
  switch (group) {
    case StateGroup.BACKLOG:
      return 'bg-gray-400';
    case StateGroup.UNSTARTED:
      return 'bg-amber-400';
    case StateGroup.STARTED:
      return 'bg-blue-500';
    case StateGroup.COMPLETED:
      return 'bg-green-500';
    case StateGroup.CANCELLED:
      return 'bg-red-400';
    default:
      return 'bg-gray-300';
  }
}

/**
 * Lấy màu hex mặc định khi tạo state mới trong một group
 */
export function getDefaultColor(group: StateGroup): string {
  switch (group) {
    case StateGroup.BACKLOG:
      return '#9ca3af';
    case StateGroup.UNSTARTED:
      return '#fbbf24';
    case StateGroup.STARTED:
      return '#3b82f6';
    case StateGroup.COMPLETED:
      return '#22c55e';
    case StateGroup.CANCELLED:
      return '#f87171';
    default:
      return '#6b7280';
  }
}

/**
 * Lấy màu hex tối mặc định khi tạo state mới trong một group
 */
export function getDefaultDarkColor(group: StateGroup): string {
  switch (group) {
    case StateGroup.BACKLOG:
      return '#6b7280';
    case StateGroup.UNSTARTED:
      return '#f59e0b';
    case StateGroup.STARTED:
      return '#2563eb';
    case StateGroup.COMPLETED:
      return '#16a34a';
    case StateGroup.CANCELLED:
      return '#dc2626';
    default:
      return '#4b5563';
  }
}
