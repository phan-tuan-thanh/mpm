import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MultiSelectModule } from 'primeng/multiselect';
import { FormsModule } from '@angular/forms';
import { MODULE_LIFECYCLE_STATUSES, type ModuleLifecycleStatus } from '@mpm/shared-types';
import { STATUS_CONFIG } from './module-status-badge.component';

@Component({
  standalone: true,
  selector: 'app-module-status-filter',
  imports: [CommonModule, MultiSelectModule, FormsModule],
  template: `
    <p-multiselect
      [options]="statusOptions"
      [(ngModel)]="selectedStatuses"
      (ngModelChange)="onSelectionChange($event)"
      optionLabel="label"
      optionValue="value"
      placeholder="Lọc theo trạng thái"
      [showClear]="true"
      [style]="{ minWidth: '200px' }"
    >
      <ng-template #item let-item>
        <span class="flex items-center gap-2">
          <i [class]="item.icon + ' text-xs'" [style.color]="item.color"></i>
          {{ item.label }}
        </span>
      </ng-template>
    </p-multiselect>
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

  onSelectionChange(statuses: ModuleLifecycleStatus[]): void {
    this.filterChanged.emit(statuses ?? []);
  }
}
