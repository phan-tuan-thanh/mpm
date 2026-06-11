import { Component, Input, Output, EventEmitter, inject, ViewChild, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PopoverModule, Popover } from 'primeng/popover';
import { TooltipModule } from 'primeng/tooltip';

import { ProjectStore } from '../../../../projects/state/project.store';
import { SprintService } from '../../../../projects/sprints/services/sprint.service';
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
  sprintId?: string;
}

@Component({
  standalone: true,
  selector: 'app-backlog-toolbar',
  imports: [CommonModule, FormsModule, ButtonModule, InputTextModule, PopoverModule, TooltipModule, DisplayPropertiesPanelComponent],
  template: `
    <div class="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-surface-700 bg-white dark:bg-surface-900 flex-shrink-0 flex-wrap">
      <h1 class="text-lg font-semibold text-gray-900 dark:text-surface-0 mr-2">Work Items</h1>

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
      <button
        type="button"
        (click)="typePop.toggle($event)"
        class="flex items-center justify-between gap-2 px-3 py-1.5 text-sm border border-surface-200 dark:border-surface-700 rounded-md bg-white dark:bg-surface-900 text-gray-800 dark:text-surface-100 font-semibold cursor-pointer hover:bg-surface-50 dark:hover:bg-surface-800 transition-all select-none"
      >
        <span class="truncate">{{ getTypeLabel() }}</span>
        <div class="flex items-center gap-1">
          @if (selectedTypes.length) {
            <i class="pi pi-times text-[10px] opacity-60 hover:opacity-100" (click)="selectedTypes = []; emitFilter(); $event.stopPropagation()"></i>
          }
          <i class="pi pi-chevron-down text-[10px] opacity-60 flex-shrink-0"></i>
        </div>
      </button>
      <p-popover #typePop appendTo="body" styleClass="!p-0">
        <div class="pop-list w-44">
          @for (opt of typeOptions; track opt.value) {
            <div
              (click)="toggleType(opt.value)"
              class="pop-item justify-between"
              [class.selected]="selectedTypes.includes(opt.value)"
            >
              <span>{{ opt.label }}</span>
              @if (selectedTypes.includes(opt.value)) {
                <i class="pi pi-check text-xs"></i>
              }
            </div>
          }
        </div>
      </p-popover>

      <!-- Priority filter -->
      <button
        type="button"
        (click)="priorityPop.toggle($event)"
        class="flex items-center justify-between gap-2 px-3 py-1.5 text-sm border border-surface-200 dark:border-surface-700 rounded-md bg-white dark:bg-surface-900 text-gray-800 dark:text-surface-100 font-semibold cursor-pointer hover:bg-surface-50 dark:hover:bg-surface-800 transition-all select-none"
      >
        <span class="truncate">{{ getPriorityLabel() }}</span>
        <div class="flex items-center gap-1">
          @if (selectedPriorities.length) {
            <i class="pi pi-times text-[10px] opacity-60 hover:opacity-100" (click)="selectedPriorities = []; emitFilter(); $event.stopPropagation()"></i>
          }
          <i class="pi pi-chevron-down text-[10px] opacity-60 flex-shrink-0"></i>
        </div>
      </button>
      <p-popover #priorityPop appendTo="body" styleClass="!p-0">
        <div class="pop-list w-44">
          @for (opt of priorityOptions; track opt.value) {
            <div
              (click)="togglePriority(opt.value)"
              class="pop-item justify-between"
              [class.selected]="selectedPriorities.includes(opt.value)"
            >
              <span class="flex items-center gap-2">
                <i class="pi pi-flag text-xs" [style.color]="opt.color"></i>
                {{ opt.label }}
              </span>
              @if (selectedPriorities.includes(opt.value)) {
                <i class="pi pi-check text-xs"></i>
              }
            </div>
          }
        </div>
      </p-popover>

      <!-- State filter -->
      <button
        type="button"
        (click)="statePop.toggle($event)"
        class="flex items-center justify-between gap-2 px-3 py-1.5 text-sm border border-surface-200 dark:border-surface-700 rounded-md bg-white dark:bg-surface-900 text-gray-800 dark:text-surface-100 font-semibold cursor-pointer hover:bg-surface-50 dark:hover:bg-surface-800 transition-all select-none"
      >
        <span class="truncate">{{ getStateLabel() }}</span>
        <div class="flex items-center gap-1">
          @if (selectedStateIds.length) {
            <i class="pi pi-times text-[10px] opacity-60 hover:opacity-100" (click)="selectedStateIds = []; emitFilter(); $event.stopPropagation()"></i>
          }
          <i class="pi pi-chevron-down text-[10px] opacity-60 flex-shrink-0"></i>
        </div>
      </button>
      <p-popover #statePop appendTo="body" styleClass="!p-0">
        <div class="pop-list w-48 max-h-60 overflow-y-auto">
          @for (state of stateOptions(); track state.id) {
            <div
              (click)="toggleState(state.id)"
              class="pop-item justify-between"
              [class.selected]="selectedStateIds.includes(state.id)"
            >
              <span class="truncate">{{ state.name }}</span>
              @if (selectedStateIds.includes(state.id)) {
                <i class="pi pi-check text-xs"></i>
              }
            </div>
          }
        </div>
      </p-popover>

      <!-- Sprint filter -->
      <button
        type="button"
        (click)="sprintPop.toggle($event)"
        class="flex items-center justify-between gap-2 px-3 py-1.5 text-sm border border-surface-200 dark:border-surface-700 rounded-md bg-white dark:bg-surface-900 text-gray-800 dark:text-surface-100 font-semibold cursor-pointer hover:bg-surface-50 dark:hover:bg-surface-800 transition-all select-none"
      >
        <span class="truncate">{{ getSprintLabel() }}</span>
        <div class="flex items-center gap-1">
          @if (selectedSprintId) {
            <i class="pi pi-times text-[10px] opacity-60 hover:opacity-100" (click)="selectedSprintId = null; emitFilter(); $event.stopPropagation()"></i>
          }
          <i class="pi pi-chevron-down text-[10px] opacity-60 flex-shrink-0"></i>
        </div>
      </button>
      <p-popover #sprintPop appendTo="body" styleClass="!p-0">
        <div class="pop-list w-48 max-h-60 overflow-y-auto">
          @for (opt of sprintOptions(); track opt.value) {
            <div
              (click)="selectedSprintId = opt.value; emitFilter(); sprintPop.hide()"
              class="pop-item"
              [class.selected]="selectedSprintId === opt.value"
            >
              {{ opt.label }}
            </div>
          }
        </div>
      </p-popover>

      <!-- Group by -->
      <button
        type="button"
        (click)="groupByPop.toggle($event)"
        class="flex items-center justify-between gap-2 px-3 py-1.5 text-sm border border-surface-200 dark:border-surface-700 rounded-md bg-white dark:bg-surface-900 text-gray-800 dark:text-surface-100 font-semibold cursor-pointer hover:bg-surface-50 dark:hover:bg-surface-800 transition-all select-none"
      >
        <span class="truncate">Group: {{ getGroupByLabel() }}</span>
        <i class="pi pi-chevron-down text-[10px] opacity-60 flex-shrink-0"></i>
      </button>
      <p-popover #groupByPop appendTo="body" styleClass="!p-0">
        <div class="pop-list w-40">
          @for (opt of groupByOptions; track opt.value) {
            <div
              (click)="selectedGroupBy = opt.value; groupByChange.emit(opt.value); groupByPop.hide()"
              class="pop-item"
              [class.selected]="selectedGroupBy === opt.value"
            >
              {{ opt.label }}
            </div>
          }
        </div>
      </p-popover>

      <!-- Order by -->
      <button
        type="button"
        (click)="orderByPop.toggle($event)"
        class="flex items-center justify-between gap-2 px-3 py-1.5 text-sm border border-surface-200 dark:border-surface-700 rounded-md bg-white dark:bg-surface-900 text-gray-800 dark:text-surface-100 font-semibold cursor-pointer hover:bg-surface-50 dark:hover:bg-surface-800 transition-all select-none"
      >
        <span class="truncate">Order: {{ getOrderByLabel() }}</span>
        <i class="pi pi-chevron-down text-[10px] opacity-60 flex-shrink-0"></i>
      </button>
      <p-popover #orderByPop appendTo="body" styleClass="!p-0">
        <div class="pop-list w-40">
          @for (opt of orderByOptions; track opt.value) {
            <div
              (click)="selectedOrderBy = opt.value; orderByChange.emit(opt.value); orderByPop.hide()"
              class="pop-item"
              [class.selected]="selectedOrderBy === opt.value"
            >
              {{ opt.label }}
            </div>
          }
        </div>
      </p-popover>

      <!-- Clear filters -->
      @if (hasActiveFilters()) {
        <button pButton icon="pi pi-filter-slash" severity="secondary" size="small" text
          pTooltip="Xóa bộ lọc" (click)="clearFilters()"></button>
      }

      <!-- Display Properties -->
      <button pButton label="Display" icon="pi pi-sliders-h" severity="secondary" size="small" text
        (click)="displayPopover.toggle($event)" aria-label="Display Properties"></button>
      <p-popover #displayPopover styleClass="!p-0">
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
  private readonly sprintService = inject(SprintService);

  constructor() {
    // Load sprints khi project sẵn sàng / thay đổi (cache chung trong SprintService)
    effect(() => {
      const project = this.projectStore.currentProject();
      if (project) this.sprintService.loadProjectSprints(project.id);
    });
  }

  protected readonly sprintOptions = () => [
    { label: 'Chưa có sprint', value: 'none' },
    ...this.sprintService.openSprints().map((s) => ({
      label: s.status === 'active' ? `${s.name} (đang chạy)` : s.name,
      value: s.id,
    })),
  ];

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
  protected selectedSprintId: string | null = null;
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  getTypeLabel(): string {
    if (!this.selectedTypes.length) return 'Type';
    if (this.selectedTypes.length === 1) {
      return this.typeOptions.find((o) => o.value === this.selectedTypes[0])?.label ?? 'Type';
    }
    return `Type (${this.selectedTypes.length})`;
  }

  getPriorityLabel(): string {
    if (!this.selectedPriorities.length) return 'Priority';
    if (this.selectedPriorities.length === 1) {
      return this.priorityOptions.find((o) => o.value === this.selectedPriorities[0])?.label ?? 'Priority';
    }
    return `Priority (${this.selectedPriorities.length})`;
  }

  getStateLabel(): string {
    if (!this.selectedStateIds.length) return 'State';
    if (this.selectedStateIds.length === 1) {
      return this.stateOptions().find((s) => s.id === this.selectedStateIds[0])?.name ?? 'State';
    }
    return `State (${this.selectedStateIds.length})`;
  }

  protected toggleType(value: TaskType): void {
    this.selectedTypes = this.selectedTypes.includes(value)
      ? this.selectedTypes.filter((v) => v !== value)
      : [...this.selectedTypes, value];
    this.emitFilter();
  }

  protected togglePriority(value: TaskPriority): void {
    this.selectedPriorities = this.selectedPriorities.includes(value)
      ? this.selectedPriorities.filter((v) => v !== value)
      : [...this.selectedPriorities, value];
    this.emitFilter();
  }

  protected toggleState(id: string): void {
    this.selectedStateIds = this.selectedStateIds.includes(id)
      ? this.selectedStateIds.filter((v) => v !== id)
      : [...this.selectedStateIds, id];
    this.emitFilter();
  }

  getSprintLabel(): string {
    const found = this.sprintOptions().find((o) => o.value === this.selectedSprintId);
    return found ? found.label : 'Sprint';
  }

  getGroupByLabel(): string {
    const found = this.groupByOptions.find((o) => o.value === this.selectedGroupBy);
    return found ? found.label : 'Group by';
  }

  getOrderByLabel(): string {
    const found = this.orderByOptions.find((o) => o.value === this.selectedOrderBy);
    return found ? found.label : 'Order by';
  }

  protected readonly stateOptions = () => {
    const grouped = this.projectStore.currentProjectStates();
    if (!grouped) return [];
    return Object.values(grouped).flat();
  };

  readonly typeOptions: { label: string; value: TaskType }[] = [
    { label: '⚡ Epic', value: 'epic' },
    { label: '📖 Story', value: 'story' },
    { label: '✅ Task', value: 'task' },
    { label: '↳ Subtask', value: 'subtask' },
  ];

  readonly priorityOptions: { label: string; value: TaskPriority; color: string }[] = [
    { label: 'Urgent', value: 'urgent', color: '#EF4444' },
    { label: 'High',   value: 'high',   color: '#F97316' },
    { label: 'Medium', value: 'medium', color: '#EAB308' },
    { label: 'Low',    value: 'low',    color: '#3B82F6' },
    { label: 'None',   value: 'none',   color: '#9CA3AF' },
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
      sprintId: this.selectedSprintId ?? undefined,
    });
  }

  protected hasActiveFilters(): boolean {
    return !!(this.searchText || this.selectedTypes.length || this.selectedPriorities.length || this.selectedStateIds.length || this.selectedSprintId);
  }

  protected clearFilters(): void {
    this.searchText = '';
    this.selectedTypes = [];
    this.selectedPriorities = [];
    this.selectedStateIds = [];
    this.selectedSprintId = null;
    this.emitFilter();
  }
}
