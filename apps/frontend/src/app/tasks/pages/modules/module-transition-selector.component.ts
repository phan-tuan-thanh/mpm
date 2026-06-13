import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PopoverModule } from 'primeng/popover';
import { FormsModule } from '@angular/forms';
import type { ModuleLifecycleStatus } from '@mpm/shared-types';
import { ModuleStatusBadgeComponent, STATUS_CONFIG, STATUS_CONFIG_EN } from './module-status-badge.component';
import { ProjectStore } from '../../../projects/state/project.store';

@Component({
  standalone: true,
  selector: 'app-module-transition-selector',
  imports: [CommonModule, PopoverModule, FormsModule, ModuleStatusBadgeComponent],
  template: `
    @if (isTerminal) {
      <app-module-status-badge [status]="currentStatus" />
    } @else {
      <button
        type="button"
        (click)="transitionPop.toggle($event)"
        class="flex items-center justify-between gap-2 px-3 py-1.5 text-xs font-semibold border border-surface-200 dark:border-surface-700 rounded-md bg-white dark:bg-surface-800 text-gray-800 dark:text-surface-100 cursor-pointer hover:bg-surface-50 dark:hover:bg-surface-700 transition-all select-none h-[34px] min-w-[180px]"
      >
        <span class="truncate">{{ tText }}</span>
        <i class="pi pi-chevron-down text-[10px] opacity-60 flex-shrink-0"></i>
      </button>
      <p-popover #transitionPop appendTo="body" styleClass="!p-0">
        <div class="pop-list w-48">
          @for (item of transitionOptions; track item.value) {
            <div
              (click)="onSelect(item.value); transitionPop.hide()"
              class="pop-item flex items-center gap-2"
            >
              <i [class]="item.icon + ' text-xs'" [style.color]="item.color"></i>
              <span>{{ item.label }}</span>
            </div>
          }
        </div>
      </p-popover>
    }
  `,
})
export class ModuleTransitionSelectorComponent {
  @Input({ required: true }) currentStatus!: ModuleLifecycleStatus;
  @Input({ required: true }) allowedTransitions!: ModuleLifecycleStatus[];
  @Output() transitionRequested = new EventEmitter<ModuleLifecycleStatus>();

  private readonly projectStore = inject(ProjectStore);

  get tText(): string {
    return this.projectStore.projectLanguage() === 'en' ? 'Transition status...' : 'Chuyển trạng thái...';
  }

  get isTerminal(): boolean {
    return this.allowedTransitions.length === 0;
  }

  get transitionOptions() {
    const isEn = this.projectStore.projectLanguage() === 'en';
    return this.allowedTransitions.map((s) => ({
      value: s,
      label: isEn ? STATUS_CONFIG_EN[s] : STATUS_CONFIG[s].label,
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
