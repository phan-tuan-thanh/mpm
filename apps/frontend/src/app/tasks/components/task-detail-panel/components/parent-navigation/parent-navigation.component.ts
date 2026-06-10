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
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';

import type { TaskParentRef, TaskType, TaskListItem } from '@mpm/shared-types';
import { TYPE_CONFIG, filterValidParents } from './parent-navigation.helpers';

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
    SelectModule,
    ButtonModule,
    TooltipModule,
    ConfirmDialogModule,
  ],
  template: `
    <div class="flex items-center gap-2 min-h-[32px]">
      @if (parent) {
        <!-- Có parent: hiển thị link (Req 10.1) -->
        <div class="flex items-center gap-1.5 flex-1 min-w-0">
          <i
            class="text-xs flex-shrink-0"
            [class]="parentTypeIcon()"
            [style.color]="parentTypeColor()"
          ></i>
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
          pTooltip="Gỡ parent"
          tooltipPosition="top"
          (click)="onRemoveParent()"
          aria-label="Gỡ parent task"
        ></button>
      } @else {
        <!-- Không có parent (Req 10.3) -->
        @if (!dropdownVisible()) {
          <div class="flex items-center gap-1.5">
            <span class="text-sm text-gray-500 dark:text-surface-400">Không có</span>
            <a
              class="text-sm text-primary-600 dark:text-primary-400 hover:underline cursor-pointer"
              (click)="showDropdown()"
              (keydown.enter)="showDropdown()"
              tabindex="0"
            >
              Thêm parent
            </a>
          </div>
        } @else {
          <!-- Searchable dropdown (Req 10.3) -->
          <p-select
            [options]="filteredTasks()"
            [filter]="true"
            filterBy="taskId,title"
            [filterPlaceholder]="'Tìm task...'"
            [placeholder]="'Chọn parent task...'"
            optionLabel="title"
            optionValue="id"
            [showClear]="true"
            [style]="{ width: '100%' }"
            appendTo="body"
            (onChange)="onParentSelected($event)"
            (onHide)="onDropdownHide()"
            [autoDisplayFirst]="false"
            [autofocus]="true"
          >
            <ng-template #item let-item>
              <div class="flex items-center gap-2">
                <i
                  class="text-xs"
                  [class]="getTypeIcon(item.type)"
                  [style.color]="getTypeColor(item.type)"
                ></i>
                <span class="text-xs font-mono text-gray-400">{{ item.taskId }}</span>
                <span class="text-sm truncate">{{ item.title }}</span>
              </div>
            </ng-template>

            <ng-template #selectedItem let-item>
              <div class="flex items-center gap-2" *ngIf="item">
                <i
                  class="text-xs"
                  [class]="getTypeIcon(item.type)"
                  [style.color]="getTypeColor(item.type)"
                ></i>
                <span class="text-xs font-mono">{{ item.taskId }}</span>
                <span class="text-sm truncate">{{ item.title }}</span>
              </div>
            </ng-template>
          </p-select>
        }
      }
    </div>

    <p-confirmDialog />
  `,
})
export class ParentNavigationComponent implements OnChanges {
  private readonly confirmService = inject(ConfirmationService);

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

  /** Icon & color cho parent hiện tại */
  readonly parentTypeIcon = computed(() => {
    if (!this.parent) return '';
    return TYPE_CONFIG[this.parent.type]?.icon ?? 'pi pi-circle';
  });

  readonly parentTypeColor = computed(() => {
    if (!this.parent) return '';
    return TYPE_CONFIG[this.parent.type]?.color ?? '#9CA3AF';
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
  }

  /** Khi user click vào parent link (Req 10.2) */
  onParentClick(): void {
    if (this.parent) {
      this.parentClicked.emit(this.parent.id);
    }
  }

  /** Khi user chọn parent từ dropdown (Req 10.4) */
  onParentSelected(event: { value: string | null }): void {
    if (event.value) {
      this.parentChanged.emit(event.value);
      this.dropdownVisible.set(false);
    }
  }

  /** Khi dropdown đóng mà không chọn gì */
  onDropdownHide(): void {
    this.dropdownVisible.set(false);
  }

  /** Xóa parent với confirm dialog (Req 10.6) */
  onRemoveParent(): void {
    this.confirmService.confirm({
      message: `Bạn có chắc muốn gỡ parent task "${this.parent?.taskId}" không?`,
      header: 'Xác nhận gỡ parent',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Gỡ',
      rejectLabel: 'Hủy',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.parentChanged.emit(null);
      },
    });
  }

  /** Helper: lấy icon class cho task type */
  getTypeIcon(type: TaskType): string {
    return TYPE_CONFIG[type]?.icon ?? 'pi pi-circle';
  }

  /** Helper: lấy color cho task type */
  getTypeColor(type: TaskType): string {
    return TYPE_CONFIG[type]?.color ?? '#9CA3AF';
  }
}
