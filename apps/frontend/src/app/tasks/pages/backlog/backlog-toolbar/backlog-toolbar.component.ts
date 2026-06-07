import { Component, Input, Output, EventEmitter, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { MultiSelectModule } from 'primeng/multiselect';
import { PopoverModule, Popover } from 'primeng/popover';
import { TooltipModule } from 'primeng/tooltip';

import { ProjectStore } from '../../../../projects/state/project.store';
import { DisplayPropertiesPanelComponent } from './display-properties-panel.component';
import type { TaskQueryDto, TaskType, TaskPriority, DisplayProperties } from '@mpm/shared-types';
import { DEFAULT_DISPLAY_PROPS } from '@mpm/shared-types';

export interface BacklogFilter {
  search?: string;
  types?: TaskType[];
  stateIds?: string[];
  priorities?: TaskPriority[];
  assigneeIds?: string[];
  labelIds?: string[];
}

@Component({
  standalone: true,
  selector: 'app-backlog-toolbar',
  imports: [CommonModule, FormsModule, ButtonModule, InputTextModule, SelectModule, MultiSelectModule, PopoverModule, TooltipModule, DisplayPropertiesPanelComponent],
  template: `
    <div class="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-surface-700 bg-white dark:bg-surface-900 flex-shrink-0 flex-wrap">
      <h1 class="text-lg font-semibold text-gray-900 dark:text-surface-0 mr-2">Backlog</h1>

      <!-- Search -->
      <div class="relative flex-1 max-w-xs">
        <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
        <input
          pInputText
          class="pl-8 w-full text-sm"
          placeholder="Tìm kiếm... (/)"
          [ngModel]="searchText"
          (ngModelChange)="onSearchChange($event)"
        />
      </div>

      <!-- Type filter -->
      <p-multiselect
        [options]="typeOptions"
        [(ngModel)]="selectedTypes"
        optionLabel="label"
        optionValue="value"
        placeholder="Type"
        styleClass="text-sm"
        (ngModelChange)="emitFilter()"
      />

      <!-- Priority filter -->
      <p-multiselect
        [options]="priorityOptions"
        [(ngModel)]="selectedPriorities"
        optionLabel="label"
        optionValue="value"
        placeholder="Priority"
        styleClass="text-sm"
        (ngModelChange)="emitFilter()"
      />

      <!-- State filter -->
      <p-multiselect
        [options]="stateOptions()"
        [(ngModel)]="selectedStateIds"
        optionLabel="name"
        optionValue="id"
        placeholder="State"
        styleClass="text-sm"
        (ngModelChange)="emitFilter()"
      />

      <!-- Group by -->
      <p-select
        [options]="groupByOptions"
        [(ngModel)]="selectedGroupBy"
        optionLabel="label"
        optionValue="value"
        placeholder="Group by"
        styleClass="text-sm"
        (ngModelChange)="groupByChange.emit($event)"
      />

      <!-- Order by -->
      <p-select
        [options]="orderByOptions"
        [(ngModel)]="selectedOrderBy"
        optionLabel="label"
        optionValue="value"
        placeholder="Order by"
        styleClass="text-sm"
        (ngModelChange)="orderByChange.emit($event)"
      />

      <!-- Clear filters -->
      @if (hasActiveFilters()) {
        <button pButton icon="pi pi-filter-slash" severity="secondary" size="small" text
          pTooltip="Xóa bộ lọc" (click)="clearFilters()"></button>
      }

      <!-- Display Properties -->
      <button pButton label="Display" icon="pi pi-sliders-h" severity="secondary" size="small" text
        (click)="displayPopover.toggle($event)" aria-label="Display Properties"></button>
      <p-popover #displayPopover>
        <app-display-properties-panel
          [displayProps]="displayProps"
          [selectedGroupBy]="selectedGroupBy"
          [selectedOrderBy]="selectedOrderBy"
          (displayPropsChange)="displayPropsChange.emit($event)"
          (groupByChange)="groupByChange.emit($event)"
          (orderByChange)="orderByChange.emit($event)"
        />
      </p-popover>

      <div class="flex-1"></div>

      <!-- View mode toggle: List / Board -->
      <div class="flex items-center border border-gray-200 dark:border-surface-700 rounded overflow-hidden">
        <button
          class="flex items-center justify-center w-8 h-7 transition-colors"
          [class.bg-indigo-600]="viewMode === 'list'"
          [class.text-white]="viewMode === 'list'"
          [class.text-gray-500]="viewMode !== 'list'"
          [class.hover:bg-gray-100]="viewMode !== 'list'"
          pTooltip="List view"
          (click)="viewModeChange.emit('list')">
          <i class="pi pi-list text-xs"></i>
        </button>
        <button
          class="flex items-center justify-center w-8 h-7 transition-colors border-l border-gray-200 dark:border-surface-700"
          [class.bg-indigo-600]="viewMode === 'board'"
          [class.text-white]="viewMode === 'board'"
          [class.text-gray-500]="viewMode !== 'board'"
          [class.hover:bg-gray-100]="viewMode !== 'board'"
          pTooltip="Board view"
          (click)="viewModeChange.emit('board')">
          <i class="pi pi-th-large text-xs"></i>
        </button>
      </div>

      <!-- Label manager (SM/PO only) -->
      <button pButton label="Quản lý Labels" icon="pi pi-tags" severity="secondary" size="small" text
        (click)="labelManagerClick.emit()"></button>

      <!-- New task -->
      <button pButton label="Thêm task" icon="pi pi-plus" size="small"
        (click)="newTaskClick.emit()"></button>
    </div>
  `,
})
export class BacklogToolbarComponent {
  private readonly projectStore = inject(ProjectStore);

  @Input() displayProps: DisplayProperties = DEFAULT_DISPLAY_PROPS;
  @Input() selectedGroupBy = 'none';
  @Input() selectedOrderBy = 'rank';
  @Input() viewMode: 'list' | 'board' = 'list';
  @Output() filterChange = new EventEmitter<BacklogFilter>();
  @Output() groupByChange = new EventEmitter<string>();
  @Output() orderByChange = new EventEmitter<string>();
  @Output() newTaskClick = new EventEmitter<void>();
  @Output() labelManagerClick = new EventEmitter<void>();
  @Output() displayPropsChange = new EventEmitter<Partial<DisplayProperties>>();
  @Output() viewModeChange = new EventEmitter<'list' | 'board'>();

  @ViewChild('displayPopover') private readonly displayPopover!: Popover;

  protected searchText = '';
  protected selectedTypes: TaskType[] = [];
  protected selectedPriorities: TaskPriority[] = [];
  protected selectedStateIds: string[] = [];
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  protected readonly stateOptions = () => {
    const grouped = this.projectStore.currentProjectStates();
    if (!grouped) return [];
    return Object.values(grouped).flat();
  };

  readonly typeOptions = [
    { label: '⚡ Epic', value: 'epic' },
    { label: '📖 Story', value: 'story' },
    { label: '✅ Task', value: 'task' },
    { label: '↳ Subtask', value: 'subtask' },
  ];

  readonly priorityOptions = [
    { label: '🔴 Urgent', value: 'urgent' },
    { label: '🟠 High', value: 'high' },
    { label: '🟡 Medium', value: 'medium' },
    { label: '🔵 Low', value: 'low' },
    { label: '⚪ None', value: 'none' },
  ];

  readonly groupByOptions = [
    { label: 'Không nhóm', value: 'none' },
    { label: 'Theo State', value: 'state' },
    { label: 'Theo Priority', value: 'priority' },
    { label: 'Theo Label', value: 'label' },
    { label: 'Theo Assignee', value: 'assignee' },
  ];

  readonly orderByOptions = [
    { label: 'Manual Rank', value: 'rank' },
    { label: 'Ngày tạo', value: 'created_at' },
    { label: 'Cập nhật', value: 'updated_at' },
    { label: 'Ngày bắt đầu', value: 'start_date' },
    { label: 'Hết hạn', value: 'due_date' },
    { label: 'Priority', value: 'priority' },
  ];

  protected onSearchChange(value: string): void {
    this.searchText = value;
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.emitFilter(), 300);
  }

  protected emitFilter(): void {
    this.filterChange.emit({
      search: this.searchText || undefined,
      types: this.selectedTypes.length ? this.selectedTypes : undefined,
      priorities: this.selectedPriorities.length ? this.selectedPriorities : undefined,
      stateIds: this.selectedStateIds.length ? this.selectedStateIds : undefined,
    });
  }

  protected hasActiveFilters(): boolean {
    return !!(this.searchText || this.selectedTypes.length || this.selectedPriorities.length || this.selectedStateIds.length);
  }

  protected clearFilters(): void {
    this.searchText = '';
    this.selectedTypes = [];
    this.selectedPriorities = [];
    this.selectedStateIds = [];
    this.emitFilter();
  }
}
