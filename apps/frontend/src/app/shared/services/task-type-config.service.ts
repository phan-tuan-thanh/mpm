import { Injectable } from '@angular/core';

export const TASK_TYPE_DEFAULTS: Record<string, { icon: string; color: string }> = {
  epic:    { icon: 'pi pi-bolt',         color: '#8B5CF6' },
  story:   { icon: 'pi pi-book',         color: '#3B82F6' },
  task:    { icon: 'pi pi-check-circle', color: '#10B981' },
  bug:     { icon: 'pi pi-ticket',        color: '#EF4444' },
};

@Injectable({ providedIn: 'root' })
export class TaskTypeConfigService {
  getIcon(type: string, override?: Record<string, { icon: string; color: string }> | null): string {
    return override?.[type]?.icon ?? TASK_TYPE_DEFAULTS[type]?.icon ?? 'pi pi-circle';
  }

  getColor(type: string, override?: Record<string, { icon: string; color: string }> | null): string {
    return override?.[type]?.color ?? TASK_TYPE_DEFAULTS[type]?.color ?? '#9CA3AF';
  }

  merge(override: Record<string, { icon: string; color: string }> | null | undefined): Record<string, { icon: string; color: string }> {
    return { ...TASK_TYPE_DEFAULTS, ...override };
  }
}
