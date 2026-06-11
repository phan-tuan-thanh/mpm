import { Component, Input, Output, EventEmitter, inject, ViewChild, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PopoverModule, Popover } from 'primeng/popover';
import { TooltipModule } from 'primeng/tooltip';

import { ProjectStore } from '../../../../projects/state/project.store';
import { SprintService } from '../../../../projects/sprints/services/sprint.service';
import { LabelStore } from '../../../state/label.store';
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
    <!-- Row 1: Title + Search + View toggle + Add task -->
    <div class="flex items-center gap-3 px-4 pt-3 pb-2 bg-white dark:bg-surface-900 flex-shrink-0">
      <h1 class="text-lg font-semibold text-gray-900 dark:text-surface-0 shrink-0">Work Items</h1>

      <!-- Search -->
      <div class="relative flex-1 max-w-sm">
        <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pi pi-search"></span>
        <input
          pInputText
          class="pl-8 w-full text-sm"
          placeholder="Tìm kiếm... (/)"
          [ngModel]="searchText"
          (ngModelChange)="onSearchChange($event)"
        />
      </div>

      <div class="flex-1"></div>

      <!-- View mode toggle: List / Board -->
      <div class="flex items-center border border-gray-200 dark:border-surface-700 rounded overflow-hidden shrink-0">
        <button
          class="flex items-center justify-center w-8 h-7 transition-colors"
          [class.bg-indigo-600]="viewMode === 'list'"
          [class.text-white]="viewMode === 'list'"
          [class.text-gray-500]="viewMode !== 'list'"
          pTooltip="List view"
          (click)="viewModeChange.emit('list')">
          <i class="pi pi-list text-xs"></i>
        </button>
        <button
          class="flex items-center justify-center w-8 h-7 transition-colors border-l border-gray-200 dark:border-surface-700"
          [class.bg-indigo-600]="viewMode === 'board'"
          [class.text-white]="viewMode === 'board'"
          [class.text-gray-500]="viewMode !== 'board'"
          pTooltip="Board view"
          (click)="viewModeChange.emit('board')">
          <i class="pi pi-th-large text-xs"></i>
        </button>
      </div>

      <!-- New task -->
      <button pButton label="Thêm task" icon="pi pi-plus" size="small" class="shrink-0"
        (click)="newTaskClick.emit()"></button>
    </div>

    <!-- Row 2: Filters + Display -->
    <div class="flex items-center gap-2 px-4 pb-2 pt-1 border-b border-gray-200 dark:border-surface-700 bg-white dark:bg-surface-900 flex-shrink-0 flex-wrap">

      <!-- Type filter -->
      <button
        type="button"
        (click)="typePop.toggle($event)"
        class="flex items-center gap-1.5 px-2.5 py-1 text-xs border rounded-md cursor-pointer select-none transition-all"
        [class]="selectedTypes.length
          ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 font-semibold'
          : 'border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 text-gray-600 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800'"
      >
        <i class="pi pi-tag text-[10px]"></i>
        <span>{{ getTypeLabel() }}</span>
        @if (selectedTypes.length) {
          <i class="pi pi-times text-[9px] opacity-70 hover:opacity-100 ml-0.5" (click)="selectedTypes = []; emitFilter(); $event.stopPropagation()"></i>
        } @else {
          <i class="pi pi-chevron-down text-[9px] opacity-50"></i>
        }
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
        class="flex items-center gap-1.5 px-2.5 py-1 text-xs border rounded-md cursor-pointer select-none transition-all"
        [class]="selectedPriorities.length
          ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 font-semibold'
          : 'border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 text-gray-600 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800'"
      >
        <i class="pi pi-flag text-[10px]"></i>
        <span>{{ getPriorityLabel() }}</span>
        @if (selectedPriorities.length) {
          <i class="pi pi-times text-[9px] opacity-70 hover:opacity-100 ml-0.5" (click)="selectedPriorities = []; emitFilter(); $event.stopPropagation()"></i>
        } @else {
          <i class="pi pi-chevron-down text-[9px] opacity-50"></i>
        }
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
        class="flex items-center gap-1.5 px-2.5 py-1 text-xs border rounded-md cursor-pointer select-none transition-all"
        [class]="selectedStateIds.length
          ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 font-semibold'
          : 'border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 text-gray-600 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800'"
      >
        <i class="pi pi-circle text-[10px]"></i>
        <span>{{ getStateLabel() }}</span>
        @if (selectedStateIds.length) {
          <i class="pi pi-times text-[9px] opacity-70 hover:opacity-100 ml-0.5" (click)="selectedStateIds = []; emitFilter(); $event.stopPropagation()"></i>
        } @else {
          <i class="pi pi-chevron-down text-[9px] opacity-50"></i>
        }
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
        class="flex items-center gap-1.5 px-2.5 py-1 text-xs border rounded-md cursor-pointer select-none transition-all"
        [class]="selectedSprintId
          ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 font-semibold'
          : 'border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 text-gray-600 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800'"
      >
        <i class="pi pi-bolt text-[10px]"></i>
        <span>{{ getSprintLabel() }}</span>
        @if (selectedSprintId) {
          <i class="pi pi-times text-[9px] opacity-70 hover:opacity-100 ml-0.5" (click)="selectedSprintId = null; emitFilter(); $event.stopPropagation()"></i>
        } @else {
          <i class="pi pi-chevron-down text-[9px] opacity-50"></i>
        }
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

      <!-- Label filter -->
      <button
        type="button"
        (click)="labelPop.toggle($event)"
        class="flex items-center gap-1.5 px-2.5 py-1 text-xs border rounded-md cursor-pointer select-none transition-all"
        [class]="selectedLabelIds.length
          ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 font-semibold'
          : 'border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 text-gray-600 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800'"
      >
        <i class="pi pi-tags text-[10px]"></i>
        <span>{{ getLabelFilterLabel() }}</span>
        @if (selectedLabelIds.length) {
          <i class="pi pi-times text-[9px] opacity-70 hover:opacity-100 ml-0.5" (click)="selectedLabelIds = []; emitFilter(); $event.stopPropagation()"></i>
        } @else {
          <i class="pi pi-chevron-down text-[9px] opacity-50"></i>
        }
      </button>
      <p-popover #labelPop appendTo="body" styleClass="!p-0">
        <div class="w-52">
          <!-- Search inside popover -->
          <div class="px-2 pt-2 pb-1">
            <div class="relative">
              <i class="pi pi-search absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]"></i>
              <input
                class="w-full pl-6 pr-2 py-1 text-xs border border-surface-200 dark:border-surface-700 rounded bg-surface-50 dark:bg-surface-800 text-gray-700 dark:text-surface-200 outline-none focus:border-indigo-400"
                placeholder="Tìm label..."
                [ngModel]="labelSearch"
                (ngModelChange)="labelSearch = $event"
              />
            </div>
          </div>
          <div class="pop-list max-h-52 overflow-y-auto">
            @if (filteredLabelOptions().length === 0) {
              <div class="px-3 py-4 text-xs text-center text-gray-400 dark:text-surface-500">Không tìm thấy label</div>
            }
            @for (label of filteredLabelOptions(); track label.id) {
              <div
                (click)="toggleLabel(label.id)"
                class="pop-item justify-between"
                [class.selected]="selectedLabelIds.includes(label.id)"
              >
                <span class="flex items-center gap-2 min-w-0">
                  <span class="w-2.5 h-2.5 rounded-full shrink-0 ring-1 ring-black/10"
                    [style.background]="label.color"></span>
                  <span class="truncate">{{ label.name }}</span>
                </span>
                @if (selectedLabelIds.includes(label.id)) {
                  <i class="pi pi-check text-xs shrink-0"></i>
                }
              </div>
            }
          </div>
        </div>
      </p-popover>

      <!-- Separator -->
      <div class="w-px h-4 bg-gray-200 dark:bg-surface-700 mx-1"></div>

      <!-- Clear filters -->
      @if (hasActiveFilters()) {
        <button pButton icon="pi pi-filter-slash" severity="secondary" size="small" text
          pTooltip="Xóa bộ lọc" (click)="clearFilters()"></button>
      }

      <!-- Display Properties -->
      <button pButton label="Hiển thị" icon="pi pi-sliders-h" severity="secondary" size="small" text
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
    </div>
  `,
})
export class BacklogToolbarComponent {
  private readonly projectStore = inject(ProjectStore);
  private readonly sprintService = inject(SprintService);
  protected readonly labelStore = inject(LabelStore);

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
  @Output() displayPropsChange = new EventEmitter<Partial<DisplayProperties>>();
  @Output() viewModeChange = new EventEmitter<'list' | 'board'>();

  @ViewChild('displayPopover') private readonly displayPopover!: Popover;

  protected searchText = '';
  protected selectedTypes: TaskType[] = [];
  protected selectedPriorities: TaskPriority[] = [];
  protected selectedStateIds: string[] = [];
  protected selectedSprintId: string | null = null;
  protected selectedLabelIds: string[] = [];
  protected labelSearch = '';
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  protected readonly filteredLabelOptions = () => {
    const q = this.labelSearch.trim().toLowerCase();
    return this.labelStore.labels().filter(l =>
      !q || l.name.toLowerCase().includes(q)
    );
  };

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

  protected toggleLabel(id: string): void {
    this.selectedLabelIds = this.selectedLabelIds.includes(id)
      ? this.selectedLabelIds.filter((v) => v !== id)
      : [...this.selectedLabelIds, id];
    this.emitFilter();
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

  getLabelFilterLabel(): string {
    if (!this.selectedLabelIds.length) return 'Label';
    if (this.selectedLabelIds.length === 1) {
      return this.labelStore.labels().find(l => l.id === this.selectedLabelIds[0])?.name ?? 'Label';
    }
    return `Label (${this.selectedLabelIds.length})`;
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
      labelIds: this.selectedLabelIds.length ? this.selectedLabelIds : undefined,
    });
  }

  protected hasActiveFilters(): boolean {
    return !!(this.searchText || this.selectedTypes.length || this.selectedPriorities.length || this.selectedStateIds.length || this.selectedSprintId || this.selectedLabelIds.length);
  }

  protected clearFilters(): void {
    this.searchText = '';
    this.selectedTypes = [];
    this.selectedPriorities = [];
    this.selectedStateIds = [];
    this.selectedSprintId = null;
    this.selectedLabelIds = [];
    this.emitFilter();
  }
}
