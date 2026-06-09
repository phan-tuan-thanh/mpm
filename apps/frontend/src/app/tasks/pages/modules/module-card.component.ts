import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import type { ProjectModule } from '@mpm/shared-types';
import { ModuleStatusBadgeComponent } from './module-status-badge.component';

@Component({
  standalone: true,
  selector: 'app-module-card',
  imports: [CommonModule, ButtonModule, TooltipModule, DatePipe, ModuleStatusBadgeComponent],
  template: `
    <div
      class="border border-gray-200 dark:border-surface-700 rounded-lg p-4 bg-white dark:bg-surface-800 hover:shadow-md transition-shadow cursor-pointer"
      (click)="edit.emit(module)"
    >
      <!-- Header: icon + name -->
      <div class="flex items-start justify-between mb-3">
        <div class="flex items-center gap-2 min-w-0">
          <i
            class="pi text-lg flex-shrink-0"
            [ngClass]="module.scope === 'workspace' ? 'pi-globe text-indigo-500' : 'pi-folder text-teal-500'"
            [pTooltip]="module.scope === 'workspace' ? 'Workspace Module' : 'Project Module'"
          ></i>
          <h3 class="font-semibold text-gray-800 dark:text-surface-100 truncate">{{ module.name }}</h3>
        </div>
        <button
          pButton
          icon="pi pi-ellipsis-v"
          [rounded]="true"
          [text]="true"
          severity="secondary"
          size="small"
          (click)="$event.stopPropagation(); menuClick.emit(module)"
          aria-label="Module actions"
        ></button>
      </div>

      <!-- Status badge -->
      <div class="mb-3">
        <app-module-status-badge [status]="module.status" />
      </div>

      <!-- Progress bar -->
      <div class="mb-3">
        <div class="flex items-center justify-between text-xs text-gray-500 dark:text-surface-400 mb-1">
          <span>Tiến độ</span>
          <span>{{ module.progress }}%</span>
        </div>
        <div class="w-full h-2 bg-gray-100 dark:bg-surface-700 rounded-full overflow-hidden">
          <div
            class="h-full rounded-full transition-all duration-300 bg-blue-500"
            [style.width.%]="module.progress"
          ></div>
        </div>
      </div>

      <!-- Task count -->
      <div class="flex items-center gap-1 text-sm text-gray-600 dark:text-surface-300 mb-2">
        <i class="pi pi-check-square text-xs"></i>
        <span>{{ module.completedCount }}/{{ module.taskCount }} tasks</span>
      </div>

      <!-- Dates -->
      @if (module.startDate || module.endDate) {
        <div class="flex items-center gap-1 text-xs text-gray-500 dark:text-surface-400">
          <i class="pi pi-calendar text-xs"></i>
          @if (module.startDate) {
            <span>{{ module.startDate | date:'dd/MM/yyyy' }}</span>
          }
          @if (module.startDate && module.endDate) {
            <span>→</span>
          }
          @if (module.endDate) {
            <span>{{ module.endDate | date:'dd/MM/yyyy' }}</span>
          }
        </div>
      }
    </div>
  `,
})
export class ModuleCardComponent {
  @Input({ required: true }) module!: ProjectModule;
  @Output() edit = new EventEmitter<ProjectModule>();
  @Output() menuClick = new EventEmitter<ProjectModule>();
}
