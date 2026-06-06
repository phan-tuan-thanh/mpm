import { Injectable, signal } from '@angular/core';
import type { ToolbarMode } from '../components/rich-text-editor/rte-features';

const STORAGE_KEY = 'mpm_editor_toolbar_mode';

@Injectable({ providedIn: 'root' })
export class EditorPreferenceService {
  private readonly _mode = signal<ToolbarMode>(this.load());

  readonly toolbarMode = this._mode.asReadonly();

  set(mode: ToolbarMode): void {
    this._mode.set(mode);
    localStorage.setItem(STORAGE_KEY, mode);
  }

  private load(): ToolbarMode {
    const saved = localStorage.getItem(STORAGE_KEY) as ToolbarMode | null;
    return saved ?? 'bubble';
  }
}
