import { StateGroup } from '@mpm/shared-types';

export const DEFAULT_STATES = [
  { name: 'Backlog',     colorLight: '#6B7280', colorDark: '#9CA3AF', group: StateGroup.BACKLOG,    isDefault: false, order: 0 },
  { name: 'Todo',        colorLight: '#3B82F6', colorDark: '#60A5FA', group: StateGroup.UNSTARTED,  isDefault: true,  order: 1 },
  { name: 'In Progress', colorLight: '#F59E0B', colorDark: '#FBBF24', group: StateGroup.STARTED,    isDefault: false, order: 2 },
  { name: 'In Review',   colorLight: '#8B5CF6', colorDark: '#A78BFA', group: StateGroup.STARTED,    isDefault: false, order: 3 },
  { name: 'Done',        colorLight: '#10B981', colorDark: '#34D399', group: StateGroup.COMPLETED,  isDefault: false, order: 4 },
  { name: 'Cancelled',   colorLight: '#EF4444', colorDark: '#F87171', group: StateGroup.CANCELLED,  isDefault: false, order: 5 },
];
