import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PopoverModule } from 'primeng/popover';
import { MODULE_LIFECYCLE_STATUSES, type ModuleLifecycleStatus } from '@mpm/shared-types';
import { STATUS_CONFIG } from './module-status-badge.component';

@Component({
  standalone: true,
  selector: 'app-module-status-filter',
  imports: [CommonModule, PopoverModule],
  template: `
    <button
      type="button"
      (click)="statusPop.toggle($event)"
      class="flex items-center justify-between gap-2 px-3 py-1.5 text-sm border border-surface-200 dark:border-surface-700 rounded-md bg-white dark:bg-surface-900 text-gray-800 dark:text-surface-100 font-semibold cursor-pointer hover:bg-surface-50 dark:hover:bg-surface-800 transition-all select-none"
    >
      <span class="truncate">{{ getLabel() }}</span>
      <div class="flex items-center gap-1">
        @if (selectedStatuses.length) {
          <i class="pi pi-times text-[10px] opacity-60 hover:opacity-100" (click)="clear(); $event.stopPropagation()"></i>
        }
        <i class="pi pi-chevron-down text-[10px] opacity-60 flex-shrink-0"></i>
      </div>
    </button>
    <p-popover #statusPop appendTo="body" styleClass="!p-0">
      <div class="pop-list w-52">
        @for (opt of statusOptions; track opt.value) {
          <div
            (click)="toggle(opt.value)"
            class="pop-item justify-between"
            [class.selected]="isSelected(opt.value)"
          >
            <span class="flex items-center gap-2">
              <i [class]="opt.icon + ' text-xs'" [style.color]="opt.color"></i>
              {{ opt.label }}
            </span>
            @if (isSelected(opt.value)) {
              <i class="pi pi-check text-xs"></i>
            }
          </div>
        }
      </div>
    </p-popover>
  `,
})
export class ModuleStatusFilterComponent {
  @Input() selectedStatuses: ModuleLifecycleStatus[] = [];
  @Output() filterChanged = new EventEmitter<ModuleLifecycleStatus[]>();

  readonly statusOptions = MODULE_LIFECYCLE_STATUSES.map((s) => ({
    value: s,
    label: STATUS_CONFIG[s].label,
    icon: STATUS_CONFIG[s].icon,
    color: STATUS_CONFIG[s].color,
  }));

  getLabel(): string {
    if (!this.selectedStatuses.length) return 'Lọc theo trạng thái';
    if (this.selectedStatuses.length === 1) {
      return STATUS_CONFIG[this.selectedStatuses[0]].label;
    }
    return `Trạng thái (${this.selectedStatuses.length})`;
  }

  isSelected(status: ModuleLifecycleStatus): boolean {
    return this.selectedStatuses.includes(status);
  }

  toggle(status: ModuleLifecycleStatus): void {
    const next = this.isSelected(status)
      ? this.selectedStatuses.filter((s) => s !== status)
      : [...this.selectedStatuses, status];
    this.filterChanged.emit(next);
  }

  clear(): void {
    this.filterChanged.emit([]);
  }
}
