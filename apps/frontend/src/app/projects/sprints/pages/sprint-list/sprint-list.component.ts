import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
  OnDestroy,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { toObservable } from '@angular/core/rxjs-interop';
import { MessageService } from 'primeng/api';
import { ProjectStore } from '../../../state/project.store';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PopoverModule } from 'primeng/popover';
import { SkeletonModule } from 'primeng/skeleton';
import { DialogModule } from 'primeng/dialog';
import { RichTextEditorComponent } from '../../../../shared/components/rich-text-editor/rich-text-editor.component';
import { SprintService } from '../../services/sprint.service';
import { Sprint, SprintStatus, CreateSprintDto } from '../../models/sprint.models';

@Component({
  standalone: true,
  selector: 'app-sprint-list',
  imports: [
    CommonModule,
    FormsModule,
    DatePipe,
    ButtonModule,
    InputTextModule,
    PopoverModule,
    SkeletonModule,
    DialogModule,
    RichTextEditorComponent,
  ],
  template: `
    <div class="flex flex-col h-full bg-white dark:bg-surface-900">

      <!-- Toolbar -->
      <div class="flex items-center gap-3 px-6 py-3 border-b border-gray-200 dark:border-surface-700 flex-shrink-0">
        <h1 class="text-base font-semibold text-gray-900 dark:text-surface-0">{{ t().title }}</h1>

        <!-- Search -->
        <div class="relative">
          <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-surface-500 text-sm pointer-events-none"></i>
          <input
            pInputText
            type="text"
            [placeholder]="t().searchPlaceholder"
            [(ngModel)]="searchValue"
            (ngModelChange)="onSearchChange($event)"
            class="pl-8 pr-3 py-1.5 text-sm w-48 border border-gray-300 dark:border-surface-600 rounded-md bg-white dark:bg-surface-800 text-gray-900 dark:text-surface-0 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
          />
        </div>

        <!-- Status filter -->
        <button
          type="button"
          (click)="statusPop.toggle($event)"
          class="flex items-center justify-between gap-2 px-3 py-1.5 text-xs font-semibold border border-surface-200 dark:border-surface-700 rounded-md bg-white dark:bg-surface-800 text-gray-800 dark:text-surface-100 cursor-pointer hover:bg-surface-50 dark:hover:bg-surface-700 transition-all select-none h-[34px] min-w-[140px]"
        >
          <span class="truncate">{{ getStatusLabel() }}</span>
          <i class="pi pi-chevron-down text-[10px] opacity-60 flex-shrink-0"></i>
        </button>
        <p-popover #statusPop appendTo="body" styleClass="!p-0">
          <div class="pop-list w-48">
            <div
              (click)="selectedStatus = null; statusPop.hide(); loadSprints()"
              class="pop-item font-medium text-gray-500"
              [class.selected]="selectedStatus === null"
            >
              {{ t().allStatus }}
            </div>
            @for (opt of statusOptions(); track opt.value) {
              <div
                (click)="selectedStatus = opt.value; statusPop.hide(); loadSprints()"
                class="pop-item"
                [class.selected]="selectedStatus === opt.value"
              >
                {{ opt.label }}
              </div>
            }
          </div>
        </p-popover>

        <!-- Selected count + bulk action -->
        @if (selectedIds().length > 0) {
          <span class="text-sm text-gray-500 dark:text-surface-400">
            {{ t().selectedPrefix }} <strong class="text-gray-900 dark:text-surface-0">{{ selectedIds().length }}</strong> {{ t().selectedSuffix }}
          </span>
          <button
            pButton
            type="button"
            [label]="t().deleteSelected"
            icon="pi pi-trash"
            severity="danger"
            size="small"
            [fluid]="false"
            [outlined]="true"
            (click)="confirmBulkDelete()"
          ></button>
        }

        <div class="flex-1"></div>

        <button
          pButton
          type="button"
          [label]="t().createSprint"
          icon="pi pi-plus"
          size="small"
          [fluid]="false"
          (click)="showCreateDialog.set(true)"
        ></button>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto px-6 py-4">

        @if (loading()) {
          <div class="space-y-2">
            @for (i of [1,2,3,4,5]; track i) {
              <p-skeleton height="4.5rem" borderRadius="8px" />
            }
          </div>

        } @else if (sprints().length === 0) {
          <div class="flex flex-col items-center justify-center h-64 gap-3 text-center">
            @if (hasFilter()) {
              <i class="pi pi-filter-slash text-4xl text-gray-300 dark:text-surface-600"></i>
              <p class="text-gray-500 dark:text-surface-400 text-sm">{{ t().noSprintFoundFilter }}</p>
              <button
                pButton
                type="button"
                [label]="t().clearFilters"
                severity="secondary"
                size="small"
                [fluid]="false"
                [outlined]="true"
                (click)="clearFilters()"
              ></button>
            } @else {
              <i class="pi pi-flag text-4xl text-gray-300 dark:text-surface-600"></i>
              <p class="text-gray-500 dark:text-surface-400 text-sm">{{ t().noSprintFound }}</p>
              <button
                pButton
                type="button"
                [label]="t().createSprint"
                icon="pi pi-plus"
                size="small"
                [fluid]="false"
                (click)="showCreateDialog.set(true)"
              ></button>
            }
          </div>

        } @else {
          <!-- Sprint card list -->
          <div class="space-y-2">
            @for (sprint of sprints(); track sprint.id) {
              <div class="flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-100 dark:border-surface-800 bg-white dark:bg-surface-900 hover:bg-gray-50 dark:hover:bg-surface-800 transition-colors">

                <!-- Checkbox -->
                <input
                  type="checkbox"
                  [checked]="selectedIds().includes(sprint.id)"
                  (change)="toggleSelect(sprint.id)"
                  class="rounded accent-indigo-600 dark:accent-indigo-400 w-4 h-4 flex-shrink-0"
                />

                <!-- Status dot -->
                <span class="w-2 h-2 rounded-full flex-shrink-0"
                  [class]="sprint.status === 'active' ? 'bg-green-500' : sprint.status === 'planning' ? 'bg-yellow-400' : 'bg-gray-300 dark:bg-surface-600'"
                ></span>

                <!-- Main info -->
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="text-sm font-semibold text-gray-900 dark:text-surface-0 truncate">{{ sprint.name }}</span>
                    <span [class]="statusBadgeClass(sprint.status)" class="px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0">
                      {{ statusLabel(sprint.status) }}
                    </span>
                    @if (sprint.initialStoryPoints != null) {
                      <span class="text-xs text-gray-400 dark:text-surface-500 flex-shrink-0">{{ sprint.initialStoryPoints }} {{ t().spUnit }}</span>
                    }
                  </div>
                  @if (sprint.goal) {
                    <p class="text-xs text-gray-500 dark:text-surface-400 mt-0.5 truncate">{{ stripHtml(sprint.goal) }}</p>
                  }
                  @if (sprint.startDate || sprint.endDate) {
                    <p class="text-xs text-gray-400 dark:text-surface-500 mt-0.5">
                      <i class="pi pi-calendar mr-1"></i>
                      {{ sprint.startDate ? (sprint.startDate | date:'dd/MM/yyyy') : '?' }}
                      →
                      {{ sprint.endDate ? (sprint.endDate | date:'dd/MM/yyyy') : '?' }}
                    </p>
                  }
                </div>

                <!-- Actions -->
                <div class="flex items-center gap-1 flex-shrink-0">
                  @if (sprint.status === 'planning') {
                    <button
                      pButton
                      type="button"
                      [label]="t().start"
                      icon="pi pi-play"
                      size="small"
                      [fluid]="false"
                      [outlined]="true"
                      severity="success"
                      (click)="confirmStart(sprint)"
                      (pointerdown)="$event.stopPropagation()"
                    ></button>
                  }
                  @if (sprint.status === 'active') {
                    <button
                      pButton
                      type="button"
                      [label]="t().complete"
                      icon="pi pi-check"
                      size="small"
                      [fluid]="false"
                      [outlined]="true"
                      severity="info"
                      (click)="openCompleteDialog(sprint)"
                      (pointerdown)="$event.stopPropagation()"
                    ></button>
                  }
                  <button
                    pButton
                    type="button"
                    icon="pi pi-trash"
                    severity="danger"
                    size="small"
                    [fluid]="false"
                    [text]="true"
                    (click)="confirmDelete(sprint)"
                    (pointerdown)="$event.stopPropagation()"
                  ></button>
                </div>
              </div>
            }
          </div>

          <!-- Pagination -->
          @if (total() > 20) {
            <div class="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 dark:border-surface-800">
              <span class="text-xs text-gray-400 dark:text-surface-500">{{ total() }} {{ t().selectedSuffix }}</span>
              <div class="flex items-center gap-1">
                <button
                  pButton
                  type="button"
                  icon="pi pi-chevron-left"
                  size="small"
                  [fluid]="false"
                  [text]="true"
                  [disabled]="currentPage === 1"
                  (click)="goToPage(currentPage - 1)"
                ></button>
                <span class="text-sm text-gray-600 dark:text-surface-300 px-2">{{ currentPage }} / {{ totalPages() }}</span>
                <button
                  pButton
                  type="button"
                  icon="pi pi-chevron-right"
                  size="small"
                  [fluid]="false"
                  [text]="true"
                  [disabled]="currentPage >= totalPages()"
                  (click)="goToPage(currentPage + 1)"
                ></button>
              </div>
            </div>
          }
        }
      </div>
    </div>

    <!-- Start Sprint Dialog -->
    <p-dialog
      [(visible)]="showStartDialog"
      [header]="t().startSprintHeader"
      [modal]="true"
      [style]="{ width: '400px' }"
      [closable]="true"
    >
      <div class="flex items-start gap-3 py-1">
        <div class="w-8 h-8 rounded-full bg-green-50 dark:bg-green-950/30 flex items-center justify-center flex-shrink-0 mt-0.5">
          <i class="pi pi-play text-green-600 dark:text-green-400 text-sm"></i>
        </div>
        <div>
          <p class="text-sm text-gray-700 dark:text-surface-200">
            {{ t().startSprintConfirm }} <strong class="text-gray-900 dark:text-surface-0">{{ startingSprintName }}</strong>?
          </p>
          <p class="text-xs text-gray-500 dark:text-surface-400 mt-1">
            Sprint sẽ chuyển sang trạng thái <span class="font-medium text-green-600 dark:text-green-400">{{ t().statusActive }}</span>.
          </p>
        </div>
      </div>

      <ng-template pTemplate="footer">
        <div class="flex justify-end gap-2">
          <button
            pButton
            type="button"
            [label]="t().cancel"
            severity="secondary"
            size="small"
            [fluid]="false"
            [outlined]="true"
            (click)="showStartDialog.set(false)"
          ></button>
          <button
            pButton
            type="button"
            [label]="t().start"
            icon="pi pi-play"
            severity="success"
            size="small"
            [fluid]="false"
            [loading]="starting()"
            [disabled]="starting()"
            (click)="doStartSprint()"
          ></button>
        </div>
      </ng-template>
    </p-dialog>

    <!-- Complete Sprint Dialog -->
    <p-dialog
      [(visible)]="showCompleteDialog"
      [header]="t().completeSprintHeader"
      [modal]="true"
      [style]="{ width: '460px' }"
      [closable]="true"
    >
      @if (completingSprintName) {
        <p class="text-sm text-gray-600 dark:text-surface-300 mb-4">
          Sprint <strong class="text-gray-900 dark:text-surface-0">{{ completingSprintName }}</strong> {{ t().completeSprintDesc }}
        </p>
      }

      <div class="space-y-3">
        <p class="text-sm font-medium text-gray-700 dark:text-surface-200">{{ t().incompleteTasksMoveTo }}</p>

        <!-- Option: backlog -->
        <label
          class="flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition"
          [class]="completeMode === 'backlog'
            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 dark:border-indigo-500'
            : 'border-gray-200 dark:border-surface-600 hover:border-gray-300 dark:hover:border-surface-500'"
        >
          <input
            type="radio"
            [(ngModel)]="completeMode"
            value="backlog"
            class="mt-0.5 accent-indigo-600 dark:accent-indigo-400"
          />
          <div>
            <p class="text-sm font-medium text-gray-900 dark:text-surface-0">{{ t().moveToBacklog }}</p>
            <p class="text-xs text-gray-500 dark:text-surface-400 mt-0.5">{{ t().moveToBacklogDesc }}</p>
          </div>
        </label>

        <!-- Option: move to sprint -->
        <label
          class="flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition"
          [class]="completeMode === 'sprint'
            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 dark:border-indigo-500'
            : 'border-gray-200 dark:border-surface-600 hover:border-gray-300 dark:hover:border-surface-500'"
        >
          <input
            type="radio"
            [(ngModel)]="completeMode"
            value="sprint"
            class="mt-0.5 accent-indigo-600 dark:accent-indigo-400"
          />
          <div class="flex-1">
            <p class="text-sm font-medium text-gray-900 dark:text-surface-0">{{ t().moveToSprint }}</p>
            <p class="text-xs text-gray-500 dark:text-surface-400 mt-0.5 mb-2">{{ t().moveToSprintDesc }}</p>
            @if (completeMode === 'sprint') {
              <button
                type="button"
                (click)="targetSprintPop.toggle($event)"
                class="w-full flex items-center justify-between gap-2 px-3 py-1.5 text-xs font-semibold border border-surface-200 dark:border-surface-700 rounded-md bg-white dark:bg-surface-800 text-gray-800 dark:text-surface-100 cursor-pointer hover:bg-surface-50 dark:hover:bg-surface-700 transition-all select-none h-[34px] mt-2"
              >
                <span class="truncate">{{ getTargetSprintLabel() }}</span>
                <i class="pi pi-chevron-down text-[10px] opacity-60 flex-shrink-0"></i>
              </button>
              <p-popover #targetSprintPop appendTo="body" styleClass="!p-0">
                <div class="pop-list w-64 max-h-40 overflow-y-auto">
                  @for (s of planningSprints(); track s.id) {
                    <div
                      (click)="completeTargetSprintId = s.id; targetSprintPop.hide()"
                      class="pop-item"
                      [class.selected]="completeTargetSprintId === s.id"
                    >
                      {{ s.name }}
                    </div>
                  } @empty {
                    <div class="p-3 text-xs text-gray-400 text-center">{{ t().noPlanningSprint }}</div>
                  }
                </div>
              </p-popover>
            }
          </div>
        </label>
      </div>

      <ng-template pTemplate="footer">
        <div class="flex justify-end gap-2">
          <button
            pButton
            type="button"
            [label]="t().cancel"
            severity="secondary"
            size="small"
            [fluid]="false"
            [outlined]="true"
            (click)="showCompleteDialog.set(false)"
          ></button>
          <button
            pButton
            type="button"
            [label]="t().confirmComplete"
            icon="pi pi-check"
            size="small"
            [fluid]="false"
            [disabled]="completing() || (completeMode === 'sprint' && !completeTargetSprintId)"
            [loading]="completing()"
            (click)="doCompleteSprint()"
          ></button>
        </div>
      </ng-template>
    </p-dialog>

    <!-- Delete Dialog -->
    <p-dialog
      [(visible)]="showDeleteDialog"
      [header]="t().confirmDeleteHeader"
      [modal]="true"
      [style]="{ width: '380px' }"
      [closable]="true"
    >
      <div class="flex items-start gap-3 py-1">
        <div class="w-8 h-8 rounded-full bg-red-50 dark:bg-red-950/30 flex items-center justify-center flex-shrink-0 mt-0.5">
          <i class="pi pi-trash text-red-600 dark:text-red-400 text-sm"></i>
        </div>
        <p class="text-sm text-gray-700 dark:text-surface-200" [innerHTML]="deletingLabel"></p>
      </div>

      <ng-template pTemplate="footer">
        <div class="flex justify-end gap-2">
          <button
            pButton
            type="button"
            [label]="t().cancel"
            severity="secondary"
            size="small"
            [fluid]="false"
            [outlined]="true"
            (click)="showDeleteDialog.set(false)"
          ></button>
          <button
            pButton
            type="button"
            [label]="t().deleteBtn"
            icon="pi pi-trash"
            severity="danger"
            size="small"
            [fluid]="false"
            [loading]="deleting()"
            [disabled]="deleting()"
            (click)="doDelete()"
          ></button>
        </div>
      </ng-template>
    </p-dialog>

    <!-- Create Dialog -->
    <p-dialog
      [(visible)]="showCreateDialog"
      [header]="t().createSprintHeader"
      [modal]="true"
      [style]="{ width: '440px' }"
      [closable]="true"
    >
      <div class="space-y-4 py-2">
        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-medium text-gray-700 dark:text-surface-300">
            {{ t().sprintNameLabel }} <span class="text-red-500 dark:text-red-400">*</span>
          </label>
          <input
            pInputText
            type="text"
            [(ngModel)]="newSprint.name"
            [placeholder]="t().sprintNamePlaceholder"
            class="text-sm"
          />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-medium text-gray-700 dark:text-surface-300">{{ t().goalLabel }}</label>
          <app-rich-text-editor
            [(ngModel)]="newSprint.goal"
            [placeholder]="t().goalPlaceholder"
          ></app-rich-text-editor>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div class="flex flex-col gap-1.5">
            <label class="text-sm font-medium text-gray-700 dark:text-surface-300">{{ t().startDateLabel }}</label>
            <input
              pInputText
              type="date"
              [(ngModel)]="newSprint.startDate"
              class="text-sm"
            />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-sm font-medium text-gray-700 dark:text-surface-300">{{ t().endDateLabel }}</label>
            <input
              pInputText
              type="date"
              [(ngModel)]="newSprint.endDate"
              class="text-sm"
            />
          </div>
        </div>
      </div>

      <ng-template pTemplate="footer">
        <div class="flex justify-end gap-2">
          <button
            pButton
            type="button"
            [label]="t().cancel"
            severity="secondary"
            size="small"
            [fluid]="false"
            [outlined]="true"
            (click)="showCreateDialog.set(false)"
          ></button>
          <button
            pButton
            type="button"
            [label]="t().createSprint"
            size="small"
            [fluid]="false"
            [disabled]="!newSprint.name?.trim() || creating()"
            [loading]="creating()"
            (click)="createSprint()"
          ></button>
        </div>
      </ng-template>
    </p-dialog>
  `,
})
export class SprintListComponent implements OnInit, OnDestroy {
  private readonly projectStore = inject(ProjectStore);
  private readonly sprintService = inject(SprintService);
  private readonly messageService = inject(MessageService);
  private readonly destroy$ = new Subject<void>();
  private readonly searchChange$ = new Subject<string>();
  private readonly currentProject$ = toObservable(this.projectStore.currentProject);
  readonly loading = signal(false);
  readonly creating = signal(false);
  readonly starting = signal(false);
  readonly completing = signal(false);
  readonly sprints = signal<Sprint[]>([]);
  readonly total = signal(0);
  readonly selectedIds = signal<string[]>([]);
  readonly showCreateDialog = signal(false);
  readonly showStartDialog = signal(false);
  readonly showCompleteDialog = signal(false);
  readonly showDeleteDialog = signal(false);
  readonly deleting = signal(false);

  readonly planningSprints = computed(() =>
    this.sprints().filter((s) => s.status === 'planning'),
  );

  readonly totalPages = computed(() =>
    this.total() > 0 ? Math.ceil(this.total() / 20) : 1,
  );

  searchValue = '';
  selectedStatus: SprintStatus | null = null;
  currentPage = 1;
  projectId = '';

  newSprint: Partial<CreateSprintDto> = { name: '' };

  startingSprintId: string | null = null;
  startingSprintName: string | null = null;

  deletingIds: string[] = [];
  deletingLabel = '';

  completingSprintId: string | null = null;
  completingSprintName: string | null = null;
  completeMode: 'backlog' | 'sprint' = 'backlog';
  completeTargetSprintId: string | null = null;

  readonly hasFilter = computed(
    () => !!this.searchValue || !!this.selectedStatus,
  );

  readonly t = computed(() => {
    const isEn = this.projectStore.projectLanguage() === 'en';
    return isEn ? {
      title: 'Sprints',
      searchPlaceholder: 'Search sprint...',
      allStatus: 'All statuses',
      selectedPrefix: 'Selected',
      selectedSuffix: 'sprint(s)',
      deleteSelected: 'Delete selected',
      createSprint: 'Create Sprint',
      noSprintFoundFilter: 'No sprints found matching filters.',
      clearFilters: 'Clear filters',
      noSprintFound: 'No sprints yet. Create your first sprint!',
      start: 'Start',
      complete: 'Complete',
      startSprintHeader: 'Start Sprint',
      startSprintConfirm: 'Start sprint',
      activeStatusDesc: 'The sprint status will change to Active.',
      cancel: 'Cancel',
      completeSprintHeader: 'Complete Sprint',
      completeSprintDesc: 'will be marked as completed.',
      incompleteTasksMoveTo: 'Incomplete tasks will be:',
      moveToBacklog: 'Move to Backlog',
      moveToBacklogDesc: 'Incomplete tasks will return to project backlog.',
      moveToSprint: 'Move to another sprint',
      moveToSprintDesc: 'Move all tasks to a planning sprint.',
      selectSprintPlaceholder: 'Select sprint...',
      noPlanningSprint: 'No planning sprints available',
      confirmComplete: 'Confirm Complete',
      confirmDeleteHeader: 'Confirm Delete',
      deleteBtn: 'Delete',
      createSprintHeader: 'Create new Sprint',
      sprintNameLabel: 'Sprint Name',
      sprintNamePlaceholder: 'Enter sprint name...',
      goalLabel: 'Goal',
      goalPlaceholder: 'Sprint goal...',
      startDateLabel: 'Start Date',
      endDateLabel: 'End Date',
      spUnit: 'SP',
      statusPlanning: 'Planning',
      statusActive: 'Active',
      statusCompleted: 'Completed',
      toastSuccessCreate: 'Sprint created successfully',
      toastErrorCreate: 'Could not create sprint',
      toastSuccessStart: 'Sprint started successfully',
      toastErrorStart: 'Could not start sprint',
      toastSuccessComplete: 'Sprint completed successfully',
      toastErrorComplete: 'Could not complete sprint',
      toastSuccessDelete: 'Sprint(s) deleted successfully',
      toastErrorDelete: 'Could not delete sprint(s)',
      toastErrorLoad: 'Could not load sprints',
      toastSuccessHeader: 'Success',
      toastErrorHeader: 'Error'
    } : {
      title: 'Sprints',
      searchPlaceholder: 'Tìm kiếm sprint...',
      allStatus: 'Tất cả trạng thái',
      selectedPrefix: 'Đã chọn',
      selectedSuffix: 'sprint',
      deleteSelected: 'Xóa đã chọn',
      createSprint: 'Tạo Sprint',
      noSprintFoundFilter: 'Không tìm thấy sprint khớp với bộ lọc.',
      clearFilters: 'Xóa bộ lọc',
      noSprintFound: 'Chưa có sprint nào. Tạo sprint đầu tiên!',
      start: 'Bắt đầu',
      complete: 'Hoàn thành',
      startSprintHeader: 'Bắt đầu Sprint',
      startSprintConfirm: 'Bắt đầu sprint',
      activeStatusDesc: 'Sprint sẽ chuyển sang trạng thái Đang chạy.',
      cancel: 'Hủy',
      completeSprintHeader: 'Hoàn thành Sprint',
      completeSprintDesc: 'sẽ được đánh dấu hoàn thành.',
      incompleteTasksMoveTo: 'Task chưa hoàn thành sẽ được:',
      moveToBacklog: 'Chuyển về Backlog',
      moveToBacklogDesc: 'Các task chưa xong sẽ quay lại backlog của dự án.',
      moveToSprint: 'Chuyển sang sprint khác',
      moveToSprintDesc: 'Chuyển toàn bộ task sang sprint đang lên kế hoạch.',
      selectSprintPlaceholder: 'Chọn sprint...',
      noPlanningSprint: 'Không có sprint nào đang lên kế hoạch',
      confirmComplete: 'Xác nhận hoàn thành',
      confirmDeleteHeader: 'Xác nhận xóa',
      deleteBtn: 'Xóa',
      createSprintHeader: 'Tạo Sprint mới',
      sprintNameLabel: 'Tên Sprint',
      sprintNamePlaceholder: 'Nhập tên sprint...',
      goalLabel: 'Mục tiêu',
      goalPlaceholder: 'Mục tiêu của sprint...',
      startDateLabel: 'Ngày bắt đầu',
      endDateLabel: 'Ngày kết thúc',
      spUnit: 'SP',
      statusPlanning: 'Lên kế hoạch',
      statusActive: 'Đang chạy',
      statusCompleted: 'Hoàn thành',
      toastSuccessCreate: 'Sprint đã được tạo',
      toastErrorCreate: 'Không thể tạo sprint',
      toastSuccessStart: 'Sprint đã được bắt đầu',
      toastErrorStart: 'Không thể bắt đầu sprint',
      toastSuccessComplete: 'Sprint đã hoàn thành',
      toastErrorComplete: 'Không thể hoàn thành sprint',
      toastSuccessDelete: 'Đã xóa sprint thành công',
      toastErrorDelete: 'Không thể xóa sprint',
      toastErrorLoad: 'Không thể tải danh sách sprint',
      toastSuccessHeader: 'Thành công',
      toastErrorHeader: 'Lỗi'
    };
  });

  readonly statusOptions = computed(() => {
    const trans = this.t();
    return [
      { label: trans.statusPlanning, value: 'planning' as SprintStatus },
      { label: trans.statusActive, value: 'active' as SprintStatus },
      { label: trans.statusCompleted, value: 'completed' as SprintStatus },
    ];
  });

  getStatusLabel(): string {
    const found = this.statusOptions().find((o) => o.value === this.selectedStatus);
    return found ? found.label : this.t().allStatus;
  }

  getTargetSprintLabel(): string {
    const found = this.planningSprints().find((s) => s.id === this.completeTargetSprintId);
    return found ? found.name : this.t().selectSprintPlaceholder;
  }

  ngOnInit(): void {
    this.searchChange$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => this.loadSprints());

    this.currentProject$.pipe(takeUntil(this.destroy$)).subscribe((project) => {
      if (project) {
        this.projectId = project.id;
        this.loadSprints();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadSprints(): void {
    this.loading.set(true);
    this.sprintService
      .getSprints(this.projectId, {
        search: this.searchValue || undefined,
        status: this.selectedStatus ?? undefined,
        page: this.currentPage,
        limit: 20,
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.sprints.set(res.data);
          this.total.set(res.total);
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          // 404 = bảng chưa có → hiện empty state im lặng
          if (err?.status !== 404) {
            this.messageService.add({
              severity: 'error',
              summary: this.t().toastErrorHeader,
              detail: this.t().toastErrorLoad,
              life: 5000,
            });
          }
          this.sprints.set([]);
          this.total.set(0);
        },
      });
  }

  onSearchChange(value: string): void {
    this.searchValue = value;
    this.searchChange$.next(value);
  }

  goToPage(page: number): void {
    this.currentPage = page;
    this.loadSprints();
  }

  clearFilters(): void {
    this.searchValue = '';
    this.selectedStatus = null;
    this.currentPage = 1;
    this.loadSprints();
  }

  toggleSelect(id: string): void {
    const current = this.selectedIds();
    if (current.includes(id)) {
      this.selectedIds.set(current.filter((x) => x !== id));
    } else {
      this.selectedIds.set([...current, id]);
    }
  }

  statusBadgeClass(status: SprintStatus): string {
    const map: Record<SprintStatus, string> = {
      planning: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400',
      active: 'bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400',
      completed: 'bg-gray-100 text-gray-600 dark:bg-surface-700 dark:text-surface-300',
    };
    return map[status] ?? '';
  }

  stripHtml(html: string): string {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent?.trim() ?? '';
  }

  statusLabel(status: SprintStatus): string {
    const trans = this.t();
    const map: Record<SprintStatus, string> = {
      planning: trans.statusPlanning,
      active: trans.statusActive,
      completed: trans.statusCompleted,
    };
    return map[status] ?? status;
  }

  createSprint(): void {
    if (!this.newSprint.name?.trim()) return;
    this.creating.set(true);
    this.sprintService
      .createSprint(this.projectId, this.newSprint as CreateSprintDto)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.creating.set(false);
          this.showCreateDialog.set(false);
          this.newSprint = { name: '' };
          this.messageService.add({
            severity: 'success',
            summary: this.t().toastSuccessHeader,
            detail: this.t().toastSuccessCreate,
            life: 3000,
          });
          this.loadSprints();
        },
        error: () => {
          this.creating.set(false);
          this.messageService.add({
            severity: 'error',
            summary: this.t().toastErrorHeader,
            detail: this.t().toastErrorCreate,
            life: 5000,
          });
        },
      });
  }

  confirmStart(sprint: Sprint): void {
    this.startingSprintId = sprint.id;
    this.startingSprintName = sprint.name;
    this.showStartDialog.set(true);
  }

  doStartSprint(): void {
    if (!this.startingSprintId) return;
    this.starting.set(true);
    this.sprintService
      .startSprint(this.projectId, this.startingSprintId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.starting.set(false);
          this.showStartDialog.set(false);
          this.messageService.add({
            severity: 'success',
            summary: this.t().toastSuccessHeader,
            detail: `${this.t().toastSuccessStart}: "${this.startingSprintName}"`,
            life: 3000,
          });
          this.loadSprints();
        },
        error: (err) => {
          this.starting.set(false);
          this.messageService.add({
            severity: 'error',
            summary: this.t().toastErrorHeader,
            detail: err?.error?.message ?? this.t().toastErrorStart,
            life: 5000,
          });
        },
      });
  }

  openCompleteDialog(sprint: Sprint): void {
    this.completingSprintId = sprint.id;
    this.completingSprintName = sprint.name;
    this.completeMode = 'backlog';
    this.completeTargetSprintId = null;
    this.showCompleteDialog.set(true);
  }

  doCompleteSprint(): void {
    if (!this.completingSprintId) return;
    const dto =
      this.completeMode === 'backlog'
        ? { moveToBacklog: true }
        : { targetSprintId: this.completeTargetSprintId! };

    this.completing.set(true);
    this.sprintService
      .completeSprint(this.projectId, this.completingSprintId, dto)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.completing.set(false);
          this.showCompleteDialog.set(false);
          this.messageService.add({
            severity: 'success',
            summary: this.t().toastSuccessHeader,
            detail: `${this.t().toastSuccessComplete}: "${this.completingSprintName}"`,
            life: 3000,
          });
          this.loadSprints();
        },
        error: (err) => {
          this.completing.set(false);
          this.messageService.add({
            severity: 'error',
            summary: this.t().toastErrorHeader,
            detail: err?.error?.message ?? this.t().toastErrorComplete,
            life: 5000,
          });
        },
      });
  }

  confirmDelete(sprint: Sprint): void {
    this.deletingIds = [sprint.id];
    const isEn = this.projectStore.projectLanguage() === 'en';
    this.deletingLabel = isEn
      ? `Delete sprint <strong class="text-gray-900 dark:text-surface-0">${sprint.name}</strong>? This action cannot be undone.`
      : `Xóa sprint <strong class="text-gray-900 dark:text-surface-0">${sprint.name}</strong>? Hành động này không thể hoàn tác.`;
    this.showDeleteDialog.set(true);
  }

  confirmBulkDelete(): void {
    const count = this.selectedIds().length;
    this.deletingIds = this.selectedIds();
    const isEn = this.projectStore.projectLanguage() === 'en';
    this.deletingLabel = isEn
      ? `Delete <strong class="text-gray-900 dark:text-surface-0">${count} selected sprints</strong>? This action cannot be undone.`
      : `Xóa <strong class="text-gray-900 dark:text-surface-0">${count} sprint</strong> đã chọn? Hành động này không thể hoàn tác.`;
    this.showDeleteDialog.set(true);
  }

  doDelete(): void {
    if (!this.deletingIds.length) return;
    this.deleting.set(true);
    this.sprintService
      .deleteSprints(this.projectId, this.deletingIds)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.deleting.set(false);
          this.showDeleteDialog.set(false);
          this.selectedIds.set([]);
          this.messageService.add({
            severity: 'success',
            summary: this.t().toastSuccessHeader,
            detail: this.t().toastSuccessDelete,
            life: 3000,
          });
          this.loadSprints();
        },
        error: () => {
          this.deleting.set(false);
          this.messageService.add({
            severity: 'error',
            summary: this.t().toastErrorHeader,
            detail: this.t().toastErrorDelete,
            life: 5000,
          });
        },
      });
  }
}
