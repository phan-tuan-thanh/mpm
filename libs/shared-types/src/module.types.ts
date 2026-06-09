export type ModuleLifecycleStatus =
  | 'planning'
  | 'active'
  | 'maintenance'
  | 'suspended'
  | 'deprecated'
  | 'retired'
  | 'cancelled';

export const MODULE_LIFECYCLE_STATUSES = [
  'planning',
  'active',
  'maintenance',
  'suspended',
  'deprecated',
  'retired',
  'cancelled',
] as const satisfies readonly ModuleLifecycleStatus[];

export const TERMINAL_STATUSES = ['retired', 'cancelled'] as const satisfies readonly ModuleLifecycleStatus[];

export const LIFECYCLE_TRANSITIONS: Record<ModuleLifecycleStatus, readonly ModuleLifecycleStatus[]> = {
  planning:    ['active', 'cancelled'],
  active:      ['maintenance', 'suspended', 'deprecated'],
  maintenance: ['active', 'suspended', 'deprecated'],
  suspended:   ['active', 'deprecated', 'retired'],
  deprecated:  ['retired'],
  retired:     [],
  cancelled:   [],
} as const;
