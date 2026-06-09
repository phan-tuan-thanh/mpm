import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SelectModule } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import type { ModuleLifecycleStatus } from '@mpm/shared-types';
import { ModuleStatusBadgeComponent, STATUS_CONFIG } from './module-status-badge.component';

@Component({
  standalone: true,
  selector: 'app-module-transition-selector',
  imports: [CommonModule, SelectModule, FormsModule, ModuleStatusBadgeComponent],
  template: `
    @if (isTerminal) {
      <app-module-status-badge [status]="currentStatus" />
    } @else {
      <p-select
        [options]="transitionOptions"
        optionLabel="label"
        optionValue="value"
        [placeholder]="'Chuyển trạng thái...'"
        [ngModel]="null"
        (ngModelChange)="onSelect($event)"
        [style]="{ minWidth: '180px' }"
      >
        <ng-template #selectedItem let-item>
          <span class="flex items-center gap-1">
            <i [class]="item.icon + ' text-xs'" [style.color]="item.color"></i>
            {{ item.label }}
          </span>
        </ng-template>
        <ng-template #item let-item>
          <span class="flex items-center gap-2">
            <i [class]="item.icon + ' text-xs'" [style.color]="item.color"></i>
            {{ item.label }}
          </span>
        </ng-template>
      </p-select>
    }
  `,
})
export class ModuleTransitionSelectorComponent {
  @Input({ required: true }) currentStatus!: ModuleLifecycleStatus;
  @Input({ required: true }) allowedTransitions!: ModuleLifecycleStatus[];
  @Output() transitionRequested = new EventEmitter<ModuleLifecycleStatus>();

  get isTerminal(): boolean {
    return this.allowedTransitions.length === 0;
  }

  get transitionOptions() {
    return this.allowedTransitions.map((s) => ({
      value: s,
      label: STATUS_CONFIG[s].label,
      icon: STATUS_CONFIG[s].icon,
      color: STATUS_CONFIG[s].color,
    }));
  }

  onSelect(status: ModuleLifecycleStatus | null): void {
    if (status) {
      this.transitionRequested.emit(status);
    }
  }
}
