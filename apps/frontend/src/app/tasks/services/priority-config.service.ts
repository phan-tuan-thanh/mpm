import { Injectable, computed, signal } from '@angular/core';

export interface PriorityOption {
  value: string;
  label: string;
  icon: string;
  color: string;
}

export const DEFAULT_PRIORITY_OPTIONS: PriorityOption[] = [
  { value: 'urgent', label: 'Urgent', icon: 'pi pi-flag', color: '#EF4444' },
  { value: 'high',   label: 'High',   icon: 'pi pi-flag', color: '#F97316' },
  { value: 'medium', label: 'Medium', icon: 'pi pi-flag', color: '#EAB308' },
  { value: 'low',    label: 'Low',    icon: 'pi pi-flag', color: '#3B82F6' },
  { value: 'none',   label: 'None',   icon: 'pi pi-flag', color: '#9CA3AF' },
];

const STORAGE_KEY_PREFIX = 'priority-config:';

@Injectable({ providedIn: 'root' })
export class PriorityConfigService {
  private readonly _configs = signal<Record<string, PriorityOption[]>>({});

  getOptions(projectId: string): PriorityOption[] {
    const cached = this._configs()[projectId];
    if (cached) return cached;

    try {
      const raw = localStorage.getItem(STORAGE_KEY_PREFIX + projectId);
      if (raw) {
        const parsed: PriorityOption[] = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) {
          this._configs.update(c => ({ ...c, [projectId]: parsed }));
          return parsed;
        }
      }
    } catch { /* ignore */ }

    return DEFAULT_PRIORITY_OPTIONS;
  }

  optionsSignal(projectId: string) {
    return computed(() => {
      this._configs(); // track reactivity
      return this.getOptions(projectId);
    });
  }

  saveOptions(projectId: string, options: PriorityOption[]): void {
    try {
      localStorage.setItem(STORAGE_KEY_PREFIX + projectId, JSON.stringify(options));
    } catch { /* ignore */ }
    this._configs.update(c => ({ ...c, [projectId]: [...options] }));
  }

  resetOptions(projectId: string): void {
    try {
      localStorage.removeItem(STORAGE_KEY_PREFIX + projectId);
    } catch { /* ignore */ }
    this._configs.update(c => {
      const next = { ...c };
      delete next[projectId];
      return next;
    });
  }

  getConfig(projectId: string, value: string): PriorityOption {
    return this.getOptions(projectId).find(p => p.value === value)
      ?? DEFAULT_PRIORITY_OPTIONS.find(p => p.value === value)
      ?? DEFAULT_PRIORITY_OPTIONS[4];
  }
}
