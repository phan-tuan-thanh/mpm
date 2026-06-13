import {
  Component,
  Input,
  Output,
  EventEmitter,
  inject,
  signal,
  computed,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PopoverModule } from 'primeng/popover';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';

import type { TaskParentRef, TaskType, TaskListItem } from '@mpm/shared-types';
import { filterValidParents } from './parent-navigation.helpers';
import { ProjectStore } from '../../../../../projects/state/project.store';
import { TaskTypeConfigService } from '../../../../../shared/services/task-type-config.service';
import { IconDisplayComponent } from '../../../../../shared/components/icon-display/icon-display.component';

/**
 * ParentNavigationComponent — Hiển thị và quản lý parent task
 *
 * - Hiển thị parent task ID + title + type icon dạng clickable link (Req 10.1)
 * - Clicking parent → emit parentClicked (Req 10.2)
 * - Nếu không có parent: "Không có" + "Thêm parent" link → searchable dropdown (Req 10.3)
 * - Selecting parent → emit parentChanged(id) (Req 10.4)
 * - Remove action → confirm dialog → emit parentChanged(null) (Req 10.6)
 *
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6
 */
@Component({
  standalone: true,
  selector: 'app-parent-navigation',
  imports: [
    FormsModule,
    PopoverModule,
    InputTextModule,
    ButtonModule,
    TooltipModule,
    ConfirmDialogModule,
    IconDisplayComponent,
  ],
  template: `
    <div class="flex items-center gap-2 min-h-[32px]">
      @if (parent) {
        <!-- Có parent: hiển thị link (Req 10.1) -->
        <div class="flex items-center gap-1.5 flex-1 min-w-0">
          <app-icon-display
            class="text-xs flex-shrink-0"
            [icon]="parentTypeIcon()"
            [style.color]="parentTypeColor()"
          ></app-icon-display>
          <a
            class="text-sm text-primary-600 dark:text-primary-400 hover:underline cursor-pointer truncate"
            (click)="onParentClick()"
            (keydown.enter)="onParentClick()"
            tabindex="0"
            [title]="parent.taskId + ' — ' + parent.title"
          >
            {{ parent.taskId }} — {{ parent.title }}
          </a>
        </div>
        <!-- Nút xóa parent (Req 10.6) -->
        <button
          pButton
          type="button"
          icon="pi pi-times"
          class="p-button-text p-button-sm p-button-rounded p-button-plain"
          [style]="{ width: '24px', height: '24px' }"
          [pTooltip]="t().removeParentTooltip"
          tooltipPosition="top"
          (click)="onRemoveParent()"
          [attr.aria-label]="t().removeParentAria"
        ></button>
      } @else {
        <!-- Không có parent (Req 10.3) -->
        <div class="flex items-center gap-1.5">
          <span class="text-sm text-gray-500 dark:text-surface-400">{{ t().none }}</span>
          <button
            #addParentBtn
            type="button"
            class="text-sm text-primary-600 dark:text-primary-400 hover:underline cursor-pointer bg-transparent border-0 p-0 font-medium"
            (click)="parentPop.toggle($event); showDropdown()"
          >
            {{ t().addParent }}
          </button>
        </div>

        <p-popover #parentPop appendTo="body" styleClass="!p-0" (onHide)="onDropdownHide()">
          <div class="p-2 border-b border-surface-100 dark:border-surface-800 bg-surface-50 dark:bg-surface-900">
            <input
              type="text"
              pInputText
              [placeholder]="t().searchPlaceholder"
              class="w-full text-xs p-1"
              [ngModel]="filterSearch()"
              (ngModelChange)="filterSearch.set($event)"
              (click)="$event.stopPropagation()"
            />
          </div>
          <div class="pop-list w-80 max-h-60 overflow-y-auto">
            @for (item of filteredAndSearchedTasks(); track item.id) {
              <div
                (click)="onParentSelected(item.id); parentPop.hide()"
                class="pop-item flex items-center gap-2"
              >
                <app-icon-display
                  class="text-xs"
                  [icon]="getTypeIcon(item.type)"
                  [style.color]="getTypeColor(item.type)"
                ></app-icon-display>
                <span class="text-xs font-mono text-gray-400">{{ item.taskId }}</span>
                <span class="text-sm truncate">{{ item.title }}</span>
              </div>
            } @empty {
              <div class="p-3 text-xs text-gray-400 text-center">{{ t().noTaskFound }}</div>
            }
          </div>
        </p-popover>
      }
    </div>

    <p-confirmDialog />
  `,
})
export class ParentNavigationComponent implements OnChanges {
  private readonly confirmService = inject(ConfirmationService);
  private readonly projectStore = inject(ProjectStore);
  private readonly typeConfigSvc = inject(TaskTypeConfigService);

  readonly t = computed(() => {
    const isEn = this.projectStore.projectLanguage() === 'en';
    return isEn ? {
      removeParentTooltip: 'Remove parent',
      removeParentAria: 'Remove parent task',
      none: 'None',
      addParent: 'Add parent',
      searchPlaceholder: 'Search parent task...',
      noTaskFound: 'No task found',
      confirmMsg: (taskId: string) => `Are you sure you want to remove the parent task "${taskId}"?`,
      confirmHeader: 'Confirm Remove Parent',
      removeBtn: 'Remove',
      cancelBtn: 'Cancel'
    } : {
      removeParentTooltip: 'Gỡ parent',
      removeParentAria: 'Gỡ parent task',
      none: 'Không có',
      addParent: 'Thêm parent',
      searchPlaceholder: 'Tìm parent task...',
      noTaskFound: 'Không tìm thấy task',
      confirmMsg: (taskId: string) => `Bạn có chắc muốn gỡ parent task "${taskId}" không?`,
      confirmHeader: 'Xác nhận gỡ parent',
      removeBtn: 'Gỡ',
      cancelBtn: 'Hủy'
    };
  });

  /** Parent hiện tại (null nếu chưa có) */
  @Input() parent: TaskParentRef | null = null;

  /** Type của task hiện tại — dùng để lọc hierarchy hợp lệ */
  @Input() currentTaskType: TaskType = 'task';

  /** Danh sách tasks có thể chọn làm parent */
  @Input() availableTasks: TaskListItem[] = [];

  /** ID của task hiện tại (để loại khỏi dropdown) */
  @Input() currentTaskId = '';

  /** Emit khi user click vào parent link → navigate */
  @Output() parentClicked = new EventEmitter<string>();

  /** Emit khi user chọn parent mới (id) hoặc xóa parent (null) */
  @Output() parentChanged = new EventEmitter<string | null>();

  /** Trạng thái dropdown hiển thị */
  readonly dropdownVisible = signal(false);

  /** Search text for filtering parent tasks */
  readonly filterSearch = signal('');

  /** Signal lưu available tasks */
  private readonly _availableTasks = signal<TaskListItem[]>([]);
  private readonly _currentTaskType = signal<TaskType>('task');
  private readonly _currentTaskId = signal('');

  /** Danh sách tasks đã lọc theo hierarchy hợp lệ */
  readonly filteredTasks = computed(() =>
    filterValidParents(
      this._availableTasks(),
      this._currentTaskType(),
      this._currentTaskId(),
    ),
  );

  /** Filtered and searched list of parent tasks */
  readonly filteredAndSearchedTasks = computed(() => {
    const search = this.filterSearch().toLowerCase().trim();
    const tasks = this.filteredTasks();
    if (!search) return tasks;
    return tasks.filter((t) =>
      t.taskId.toLowerCase().includes(search) ||
      t.title.toLowerCase().includes(search)
    );
  });

  /** Icon & color cho parent hiện tại */
  readonly parentTypeIcon = computed(() => {
    if (!this.parent) return '';
    return this.typeConfigSvc.getIcon(this.parent.type, this.projectStore.currentProject()?.taskTypeConfig);
  });

  readonly parentTypeColor = computed(() => {
    if (!this.parent) return '';
    return this.typeConfigSvc.getColor(this.parent.type, this.projectStore.currentProject()?.taskTypeConfig);
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['availableTasks']) {
      this._availableTasks.set(this.availableTasks);
    }
    if (changes['currentTaskType']) {
      this._currentTaskType.set(this.currentTaskType);
    }
    if (changes['currentTaskId']) {
      this._currentTaskId.set(this.currentTaskId);
    }
    // Ẩn dropdown khi parent thay đổi từ bên ngoài (ví dụ: sau khi gán thành công)
    if (changes['parent'] && !changes['parent'].firstChange) {
      this.dropdownVisible.set(false);
    }
  }

  /** Hiển thị dropdown chọn parent */
  showDropdown(): void {
    this.dropdownVisible.set(true);
    this.filterSearch.set('');
  }

  /** Khi user click vào parent link (Req 10.2) */
  onParentClick(): void {
    if (this.parent) {
      this.parentClicked.emit(this.parent.id);
    }
  }

  /** Khi user chọn parent từ dropdown (Req 10.4) */
  onParentSelected(event: { value: string | null } | string | null): void {
    const value = (event && typeof event === 'object' && 'value' in event) ? event.value : event;
    if (value) {
      this.parentChanged.emit(value);
      this.dropdownVisible.set(false);
    }
  }

  /** Khi dropdown đóng mà không chọn gì */
  onDropdownHide(): void {
    this.dropdownVisible.set(false);
  }

  /** Xóa parent với confirm dialog (Req 10.6) */
  onRemoveParent(): void {
    const tr = this.t();
    this.confirmService.confirm({
      message: tr.confirmMsg(this.parent?.taskId ?? ''),
      header: tr.confirmHeader,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: tr.removeBtn,
      rejectLabel: tr.cancelBtn,
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.parentChanged.emit(null);
      },
    });
  }

  /** Helper: lấy icon class cho task type */
  getTypeIcon(type: TaskType): string {
    return this.typeConfigSvc.getIcon(type, this.projectStore.currentProject()?.taskTypeConfig);
  }

  /** Helper: lấy color cho task type */
  getTypeColor(type: TaskType): string {
    return this.typeConfigSvc.getColor(type, this.projectStore.currentProject()?.taskTypeConfig);
  }
}
