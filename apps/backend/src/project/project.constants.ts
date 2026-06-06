import { StateGroup } from '@mpm/shared-types';

export const DEFAULT_STATES = [
  { name: 'Backlog',     color: '#6B7280', group: StateGroup.BACKLOG,    isDefault: false, order: 0 },
  { name: 'Todo',        color: '#3B82F6', group: StateGroup.UNSTARTED,  isDefault: true,  order: 1 },
  { name: 'In Progress', color: '#F59E0B', group: StateGroup.STARTED,    isDefault: false, order: 2 },
  { name: 'In Review',   color: '#8B5CF6', group: StateGroup.STARTED,    isDefault: false, order: 3 },
  { name: 'Done',        color: '#10B981', group: StateGroup.COMPLETED,  isDefault: false, order: 4 },
  { name: 'Cancelled',   color: '#EF4444', group: StateGroup.CANCELLED,  isDefault: false, order: 5 },
];
