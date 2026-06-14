import { Component, Input, Output, EventEmitter, inject, ViewChild, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PopoverModule, Popover } from 'primeng/popover';
import { TooltipModule } from 'primeng/tooltip';

import { ProjectStore } from '../../../../projects/state/project.store';
import { SprintService } from '../../../../projects/sprints/services/sprint.service';
import { buildSprintSections } from './sprint-filter.helpers';
import { LabelStore } from '../../../state/label.store';
import { DisplayPropertiesPanelComponent } from './display-properties-panel.component';
import type { TaskQueryDto, TaskType, TaskPriority, DisplayProperties } from '@mpm/shared-types';
import { DEFAULT_DISPLAY_PROPS } from '@mpm/shared-types';
import { StateDotComponent } from '../../../../shared/components/state-dot/state-dot.component';
import { IconDisplayComponent } from '../../../../shared/components/icon-display/icon-display.component';
import { PriorityConfigService } from '../../../services/priority-config.service';
import { TaskTypeConfigService } from '../../../../shared/services/task-type-config.service';
import { LayoutService } from '../../../../layout/services/layout.service';
import { CustomTranslationService } from '../../../../shared/services/custom-translation.service';

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
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    InputTextModule,
    PopoverModule,
    TooltipModule,
    DisplayPropertiesPanelComponent,
    StateDotComponent,
    IconDisplayComponent,
  ],
  styles: [`
    :host ::ng-deep .p-popover-content {
      padding: 0 !important;
    }
  `],
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
          [placeholder]="t().searchPlaceholder"
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
          [pTooltip]="t().listView"
          (click)="viewModeChange.emit('list')">
          <i class="pi pi-list text-xs"></i>
        </button>
        <button
          class="flex items-center justify-center w-8 h-7 transition-colors border-l border-gray-200 dark:border-surface-700"
          [class.bg-indigo-600]="viewMode === 'board'"
          [class.text-white]="viewMode === 'board'"
          [class.text-gray-500]="viewMode !== 'board'"
          [pTooltip]="t().boardView"
          (click)="viewModeChange.emit('board')">
          <i class="pi pi-th-large text-xs"></i>
        </button>
      </div>

      <!-- New task -->
      <button pButton [label]="t().newTask" icon="pi pi-plus" size="small" class="shrink-0"
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
          @for (opt of typeOptions(); track opt.value) {
            <div
              (click)="toggleType(opt.value)"
              class="pop-item justify-between"
              [class.selected]="selectedTypes.includes(opt.value)"
            >
              <span class="flex items-center gap-2">
                <app-icon-display [icon]="opt.icon" [style.color]="opt.color" class="text-xs" />
                {{ opt.label }}
              </span>
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
          @for (opt of priorityOptions(); track opt.value) {
            <div
              (click)="togglePriority(opt.value)"
              class="pop-item justify-between"
              [class.selected]="selectedPriorities.includes(opt.value)"
            >
              <span class="flex items-center gap-2">
                <app-icon-display [icon]="opt.icon" [style.color]="layoutService.isDarkMode() ? opt.colorDark : opt.colorLight" class="text-xs"></app-icon-display>
                {{ opt.name }}
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
              <span class="flex items-center gap-2 truncate">
                <app-state-dot [state]="state" [size]="10" />
                <span class="truncate">{{ state.name }}</span>
              </span>
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
      <p-popover #sprintPop appendTo="body" styleClass="!p-0" (onHide)="sprintSearch = ''; showAllCompletedSprints = false">
        <div class="w-64">
          <div class="p-2 border-b border-surface-100 dark:border-surface-700">
            <input pInputText type="text" [placeholder]="t().searchSprintPlaceholder"
              class="w-full !text-xs !py-1"
              [(ngModel)]="sprintSearch" />
          </div>
          <div class="pop-list max-h-72 overflow-y-auto">
            <div
              (click)="selectedSprintId = 'none'; emitFilter(); sprintPop.hide()"
              class="pop-item"
              [class.selected]="selectedSprintId === 'none'"
            >
              {{ t().noSprint }}
            </div>
            @if (sprintSections().open.length) {
              <div class="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-surface-500">{{ t().sprintOpen }}</div>
              @for (opt of sprintSections().open; track opt.value) {
                @let sprint = getSprintById(opt.value);
                <div
                  (click)="selectedSprintId = opt.value; emitFilter(); sprintPop.hide()"
                  class="pop-item justify-between"
                  [class.selected]="selectedSprintId === opt.value"
                >
                  <span class="flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full flex-shrink-0"
                      [style.background]="sprint?.status === 'active' ? '#22c55e' : '#facc15'"></span>
                    <span>{{ opt.label }}</span>
                  </span>
                  @if (selectedSprintId === opt.value) {
                    <i class="pi pi-check text-xs"></i>
                  }
                </div>
              }
            }
            @if (sprintSections().completed.length) {
              <div class="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-surface-500">{{ t().sprintCompleted }}</div>
              @for (opt of sprintSections().completed; track opt.value) {
                @let sprint = getSprintById(opt.value);
                <div
                  (click)="selectedSprintId = opt.value; emitFilter(); sprintPop.hide()"
                  class="pop-item justify-between"
                  [class.selected]="selectedSprintId === opt.value"
                >
                  <span class="flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full flex-shrink-0 bg-gray-400"></span>
                    <span>{{ opt.label }}</span>
                  </span>
                  @if (selectedSprintId === opt.value) {
                    <i class="pi pi-check text-xs"></i>
                  }
                </div>
              }
              @if (sprintSections().hiddenCompletedCount > 0) {
                <div class="pop-item text-primary font-semibold" (click)="showAllCompletedSprints = true; $event.stopPropagation()">
                  {{ t().showMore }} ({{ sprintSections().hiddenCompletedCount }})
                </div>
              }
            }
          </div>
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
        <div class="w-60">
          <!-- Search inside popover -->
          <div class="px-2 pt-2 pb-1">
            <div class="relative">
              <i class="pi pi-search absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]"></i>
              <input
                class="w-full pl-6 pr-2 py-1 text-xs border border-surface-200 dark:border-surface-700 rounded bg-surface-50 dark:bg-surface-800 text-gray-700 dark:text-surface-200 outline-none focus:border-indigo-400"
                [placeholder]="t().searchLabelPlaceholder"
                [ngModel]="labelSearch"
                (ngModelChange)="labelSearch = $event"
              />
            </div>
          </div>
          <div class="pop-list max-h-52 overflow-y-auto">
            @if (filteredLabelOptions().length === 0) {
              <div class="px-3 py-4 text-xs text-center text-gray-400 dark:text-surface-500">{{ t().noLabelFound }}</div>
            }
            @for (label of filteredLabelOptions(); track label.id) {
              <div
                (click)="toggleLabel(label.id)"
                class="pop-item justify-between"
                [class.selected]="selectedLabelIds.includes(label.id)"
              >
                <div class="flex items-center gap-2 min-w-0">
                  @if (isScoped(label.name)) {
                    <span class="inline-flex items-center text-[10px] rounded-full overflow-hidden border border-gray-200 dark:border-surface-700 font-medium bg-white dark:bg-surface-800">
                      <span class="px-1.5 py-px text-white" 
                            [style.background]="getScopeColor(label.name, layoutService.isDarkMode(), (layoutService.isDarkMode() ? label.colorDark : label.colorLight))" 
                            [style.color]="layoutService.getTextColor(getScopeColor(label.name, layoutService.isDarkMode(), (layoutService.isDarkMode() ? label.colorDark : label.colorLight)))">{{ getScope(label.name) }}</span>
                      <span class="px-1.5 py-px" 
                            [style.background]="(layoutService.isDarkMode() ? label.colorDark : label.colorLight) + '18'" 
                            [style.color]="layoutService.isDarkMode() ? label.colorDark : label.colorLight">{{ getValue(label.name) }}</span>
                    </span>
                  } @else {
                    <span class="text-[10px] px-1.5 py-px rounded-full font-medium" 
                          [style.background]="(layoutService.isDarkMode() ? label.colorDark : label.colorLight) + '22'" 
                          [style.color]="layoutService.isDarkMode() ? label.colorDark : label.colorLight">
                      {{ label.name }}
                    </span>
                  }
                </div>
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
          [pTooltip]="t().clearFilters" (click)="clearFilters()"></button>
      }

      <!-- Display Properties -->
      <button pButton [label]="projectStore.projectLanguage() === 'en' ? 'Display' : 'Hiển thị'" icon="pi pi-sliders-h" severity="secondary" size="small" text
        (click)="displayPopover.toggle($event)" aria-label="Display Properties"></button>
      <p-popover #displayPopover styleClass="w-[600px] max-w-full" contentStyleClass="!p-0">
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
  protected readonly projectStore = inject(ProjectStore);
  private readonly customTrans = inject(CustomTranslationService);
  private readonly sprintService = inject(SprintService);
  protected readonly labelStore = inject(LabelStore);
  private readonly priorityConfigService = inject(PriorityConfigService);
  private readonly typeConfigSvc = inject(TaskTypeConfigService);
  protected readonly layoutService = inject(LayoutService);

  constructor() {
    // Load sprints và priorities khi project sẵn sàng / thay đổi
    effect(() => {
      const project = this.projectStore.currentProject();
      if (project) {
        this.sprintService.loadProjectSprints(project.id);
        this.priorityConfigService.loadPriorities(project.id);
      }
    });
  }

  protected sprintSearch = '';
  protected showAllCompletedSprints = false;

  protected readonly sprintSections = () =>
    buildSprintSections(
      this.sprintService.openSprints(),
      this.sprintService.completedSprints(),
      this.sprintSearch,
      this.showAllCompletedSprints,
      this.selectedSprintId,
    );

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

  readonly t = computed(() => {
    const isEn = this.projectStore.projectLanguage() === 'en';
    const ct = this.customTrans;
    return {
      searchPlaceholder:      ct.t('toolbar.search',         isEn ? 'Search... (/)'      : 'Tìm kiếm... (/)'),
      listView:               ct.t('toolbar.listView',       isEn ? 'List view'           : 'Giao diện danh sách'),
      boardView:              ct.t('toolbar.boardView',      isEn ? 'Board view'          : 'Giao diện bảng'),
      newTask:                ct.t('toolbar.newTask',        isEn ? 'Add task'            : 'Thêm task'),
      searchSprintPlaceholder:ct.t('toolbar.searchSprint',   isEn ? 'Search sprint...'    : 'Tìm sprint...'),
      noSprint:               ct.t('toolbar.noSprint',       isEn ? 'No sprint'           : 'Chưa có sprint'),
      sprintOpen:             ct.t('toolbar.sprintOpen',     isEn ? 'Active'              : 'Đang mở'),
      sprintCompleted:        ct.t('toolbar.sprintCompleted',isEn ? 'Completed'           : 'Đã hoàn thành'),
      showMore:               ct.t('toolbar.showMore',       isEn ? 'Show more'           : 'Xem thêm'),
      searchLabelPlaceholder: ct.t('toolbar.searchLabel',    isEn ? 'Search labels...'    : 'Tìm label...'),
      noLabelFound:           ct.t('toolbar.noLabelFound',   isEn ? 'No labels found'     : 'Không tìm thấy label'),
      clearFilters:           ct.t('toolbar.clearFilters',   isEn ? 'Clear filters'       : 'Xóa bộ lọc'),
    };
  });

  getTypeLabel(): string {
    const defaultLabel = this.customTrans.t('toolbar.filterType', this.projectStore.projectLanguage() === 'en' ? 'Type' : 'Loại');
    if (!this.selectedTypes.length) return defaultLabel;
    if (this.selectedTypes.length === 1) {
      return this.typeOptions().find((o) => o.value === this.selectedTypes[0])?.label ?? defaultLabel;
    }
    return `${defaultLabel} (${this.selectedTypes.length})`;
  }

  protected readonly projectId = computed(() => this.projectStore.currentProject()?.id ?? '');

  protected readonly priorityOptions = computed(() =>
    this.priorityConfigService.getOptions(this.projectId())
  );

  getPriorityLabel(): string {
    const defaultLabel = this.customTrans.t('toolbar.filterPriority', this.projectStore.projectLanguage() === 'en' ? 'Priority' : 'Độ ưu tiên');
    if (!this.selectedPriorities.length) return defaultLabel;
    if (this.selectedPriorities.length === 1) {
      return this.priorityOptions().find((o) => o.value === this.selectedPriorities[0])?.name ?? defaultLabel;
    }
    return `${defaultLabel} (${this.selectedPriorities.length})`;
  }

  getStateLabel(): string {
    const defaultLabel = this.customTrans.t('toolbar.filterState', this.projectStore.projectLanguage() === 'en' ? 'State' : 'Trạng thái');
    if (!this.selectedStateIds.length) return defaultLabel;
    if (this.selectedStateIds.length === 1) {
      return this.stateOptions().find((s) => s.id === this.selectedStateIds[0])?.name ?? defaultLabel;
    }
    return `${defaultLabel} (${this.selectedStateIds.length})`;
  }

  protected getSprintById(id: string) {
    return this.sprintService.projectSprints().find((s) => s.id === id);
  }

  protected isScoped(name: string): boolean { return name.includes('::'); }
  protected getScope(name: string): string { return name.split('::')[0].trim(); }
  protected getValue(name: string): string { return name.split('::').slice(1).join('::').trim(); }

  protected getScopeColor(name: string, isDark: boolean, fallbackColor: string): string {
    if (!this.isScoped(name)) return fallbackColor;
    const scope = this.getScope(name).toLowerCase();
    const match = this.labelStore.labels().find(l => l.name.includes('::') && l.name.split('::')[0].trim().toLowerCase() === scope);
    return match ? (isDark ? match.colorDark : match.colorLight) : fallbackColor;
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
    const isEn = this.projectStore.projectLanguage() === 'en';
    const defaultLabel = isEn ? 'Label' : 'Nhãn';
    if (!this.selectedLabelIds.length) return defaultLabel;
    if (this.selectedLabelIds.length === 1) {
      return this.labelStore.labels().find(l => l.id === this.selectedLabelIds[0])?.name ?? defaultLabel;
    }
    return `${defaultLabel} (${this.selectedLabelIds.length})`;
  }

  getSprintLabel(): string {
    const isEn = this.projectStore.projectLanguage() === 'en';
    if (!this.selectedSprintId) return 'Sprint';
    if (this.selectedSprintId === 'none') return isEn ? 'No sprint' : 'Chưa có sprint';
    const sprint = this.sprintService
      .projectSprints()
      .find((s) => s.id === this.selectedSprintId);
    return sprint?.name ?? 'Sprint';
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

  readonly typeOptions = computed(() => {
    const cfg = this.projectStore.currentProject()?.taskTypeConfig;
    return [
      { label: 'Epic',  value: 'epic'  as TaskType, icon: this.typeConfigSvc.getIcon('epic',  cfg), color: this.typeConfigSvc.getColor('epic',  cfg) },
      { label: 'Story', value: 'story' as TaskType, icon: this.typeConfigSvc.getIcon('story', cfg), color: this.typeConfigSvc.getColor('story', cfg) },
      { label: 'Task',  value: 'task'  as TaskType, icon: this.typeConfigSvc.getIcon('task',  cfg), color: this.typeConfigSvc.getColor('task',  cfg) },
      { label: 'Bug',   value: 'bug'   as TaskType, icon: this.typeConfigSvc.getIcon('bug',   cfg), color: this.typeConfigSvc.getColor('bug',   cfg) },
    ];
  });

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
