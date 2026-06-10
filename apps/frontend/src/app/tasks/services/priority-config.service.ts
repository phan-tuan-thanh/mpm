import { Injectable, inject, signal, computed } from '@angular/core';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { ProjectPriority } from '@mpm/shared-types';
import { PriorityService } from '../../projects/services/priority.service';

export const DEFAULT_PRIORITY_OPTIONS: ProjectPriority[] = [
  { id: '', projectId: '', name: 'Urgent', value: 'urgent', colorLight: '#EF4444', colorDark: '#FCA5A5', icon: 'pi pi-flag', order: 1, isSystem: false, createdAt: new Date(), updatedAt: new Date() },
  { id: '', projectId: '', name: 'High',   value: 'high',   colorLight: '#F97316', colorDark: '#FDBA74', icon: 'pi pi-flag', order: 2, isSystem: false, createdAt: new Date(), updatedAt: new Date() },
  { id: '', projectId: '', name: 'Medium', value: 'medium', colorLight: '#EAB308', colorDark: '#FDE047', icon: 'pi pi-flag', order: 3, isSystem: false, createdAt: new Date(), updatedAt: new Date() },
  { id: '', projectId: '', name: 'Low',    value: 'low',    colorLight: '#3B82F6', colorDark: '#93C5FD', icon: 'pi pi-flag', order: 4, isSystem: false, createdAt: new Date(), updatedAt: new Date() },
  { id: '', projectId: '', name: 'None',   value: 'none',   colorLight: '#9CA3AF', colorDark: '#6B7280', icon: 'pi pi-flag', order: 5, isSystem: true,  createdAt: new Date(), updatedAt: new Date() },
];

@Injectable({ providedIn: 'root' })
export class PriorityConfigService {
  private readonly priorityService = inject(PriorityService);
  private readonly _priorities = signal<Record<string, ProjectPriority[]>>({});

  loadPriorities(projectId: string): void {
    this.priorityService.getPriorities(projectId).pipe(
      catchError(() => of({ data: DEFAULT_PRIORITY_OPTIONS })),
    ).subscribe(res => {
      this._priorities.update(m => ({ ...m, [projectId]: res.data }));
    });
  }

  getOptions(projectId: string): ProjectPriority[] {
    return this._priorities()[projectId] ?? DEFAULT_PRIORITY_OPTIONS;
  }

  optionsSignal(projectId: string) {
    return computed(() => this._priorities()[projectId] ?? DEFAULT_PRIORITY_OPTIONS);
  }

  getConfig(projectId: string, value: string): ProjectPriority {
    const opts = this.getOptions(projectId);
    return (
      opts.find(p => p.value === value) ??
      DEFAULT_PRIORITY_OPTIONS.find(p => p.value === value) ??
      DEFAULT_PRIORITY_OPTIONS[4]
    );
  }
}
