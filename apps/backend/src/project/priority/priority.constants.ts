import { ProjectPriority } from '../entities/project-priority.entity';

export const DEFAULT_PRIORITIES: Partial<ProjectPriority>[] = [
  { name: 'Urgent', value: 'urgent', colorLight: '#EF4444', colorDark: '#FCA5A5', icon: 'pi pi-flag', order: 1, isSystem: false },
  { name: 'High',   value: 'high',   colorLight: '#F97316', colorDark: '#FDBA74', icon: 'pi pi-flag', order: 2, isSystem: false },
  { name: 'Medium', value: 'medium', colorLight: '#EAB308', colorDark: '#FDE047', icon: 'pi pi-flag', order: 3, isSystem: false },
  { name: 'Low',    value: 'low',    colorLight: '#3B82F6', colorDark: '#93C5FD', icon: 'pi pi-flag', order: 4, isSystem: false },
  { name: 'None',   value: 'none',   colorLight: '#9CA3AF', colorDark: '#6B7280', icon: 'pi pi-flag', order: 5, isSystem: true  },
];
