import {
  Component, Input, Output, EventEmitter, signal, computed, ViewChild, ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PopoverModule } from 'primeng/popover';
import { DatePickerModule } from 'primeng/datepicker';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import type { TaskPriority, MemberResponse } from '@mpm/shared-types';

// ─── Priority option config ──────────────────────────────────────────────────

interface PriorityOption {
  label: string;
  value: TaskPriority;
  icon: string;
  color: string;
}

const PRIORITY_OPTIONS: PriorityOption[] = [
  { label: 'Urgent', value: 'urgent', icon: 'pi pi-flag', color: '#EF4444' },
  { label: 'High',   value: 'high',   icon: 'pi pi-flag', color: '#F97316' },
  { label: 'Medium', value: 'medium', icon: 'pi pi-flag', color: '#EAB308' },
  { label: 'Low',    value: 'low',    icon: 'pi pi-flag', color: '#3B82F6' },
  { label: 'None',   value: 'none',   icon: 'pi pi-flag', color: '#9CA3AF' },
];

/**
 * SubItemQuickToolbarComponent — Toolbar for setting properties on a new sub-item
 *
 * Hiển thị dưới inline input khi tạo sub-item mới.
 * Cung cấp quick-selection cho assignee, priority, due date.
 * Reset về default sau khi tạo (no assignee, priority "none", no due date).
 *
 * Requirements: 7.1, 7.2, 7.3
 */
@Component({
  standalone: true,
  selector: 'app-sub-item-quick-toolbar',
  imports: [
    CommonModule, FormsModule,
    PopoverModule, DatePickerModule, ButtonModule, InputTextModule, TooltipModule,
  ],
  template: `
    <div class="flex items-center gap-1 py-1.5">

      <!-- ═══ Assignee Selector ═══ -->
      <button
        class="toolbar-btn"
        [class.active]="!!selectedAssigneeId()"
        pTooltip="Chọn người phụ trách"
        tooltipPosition="top"
        (click)="assigneePopover.toggle($event)"
        aria-label="Select assignee"
      >
        @if (selectedAssigneeId()) {
          <div class="avatar-badge">
            {{ getSelectedMemberInitial() }}
          </div>
        }
        <i class="pi pi-user" style="font-size: 12px"></i>
      </button>

      <!-- ═══ Priority Selector ═══ -->
      <button
        class="toolbar-btn"
        [class.active]="selectedPriority() !== 'none'"
        pTooltip="Chọn ưu tiên"
        tooltipPosition="top"
        (click)="priorityPopover.toggle($event)"
        aria-label="Select priority"
      >
        <i
          [class]="selectedPriorityConfig().icon"
          [style.color]="selectedPriorityConfig().color"
          style="font-size: 12px"
        ></i>
      </button>

      <!-- ═══ Due Date Picker ═══ -->
      <button
        class="toolbar-btn"
        [class.active]="!!selectedDueDate()"
        pTooltip="Chọn hạn chót"
        tooltipPosition="top"
        (click)="dueDatePopover.toggle($event)"
        aria-label="Select due date"
      >
        <i
          class="pi pi-calendar"
          style="font-size: 12px"
          [style.color]="selectedDueDate() ? 'var(--p-primary-color)' : undefined"
        ></i>
        @if (selectedDueDate()) {
          <span class="text-[10px] text-indigo-500 font-medium ml-0.5">
            {{ formatShortDate(selectedDueDate()!) }}
          </span>
        }
      </button>
    </div>

    <!-- ═══ POPOVERS ═══ -->

    <!-- Assignee Popover -->
    <p-popover #assigneePopover (onShow)="focusAssigneeSearch()">
      <div class="min-w-[200px] max-w-[260px] p-0.5 flex flex-col gap-0.5">
        <div class="p-0.5">
          <input
            #assigneeSearchInput
            pInputText
            type="text"
            class="w-full text-xs"
            style="height: 28px; padding: 0 8px; border-radius: 4px"
            placeholder="Tìm kiếm thành viên..."
            [ngModel]="assigneeSearch()"
            (ngModelChange)="assigneeSearch.set($event)"
            (click)="$event.stopPropagation()"
          />
        </div>
        <div class="max-h-[200px] overflow-y-auto flex flex-col gap-px">
          @if (!filteredMembers().length) {
            <p class="py-2 text-xs text-gray-400 text-center">
              {{ members.length ? 'Không tìm thấy thành viên' : 'Chưa có thành viên' }}
            </p>
          }
          @for (m of filteredMembers(); track m.userId) {
            <button
              class="pop-item"
              [class.selected]="selectedAssigneeId() === m.userId"
              (click)="onAssigneeSelect(m.userId)"
            >
              <div class="avatar-sm">
                @if (m.avatarUrl) {
                  <img [src]="m.avatarUrl" [alt]="m.displayName" class="w-full h-full rounded-full object-cover" />
                } @else {
                  {{ m.displayName[0]?.toUpperCase() }}
                }
              </div>
              <span class="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-xs">
                {{ m.displayName }}
              </span>
              @if (selectedAssigneeId() === m.userId) {
                <i class="pi pi-check text-[10px] text-indigo-500 shrink-0"></i>
              }
            </button>
          }
        </div>
        @if (selectedAssigneeId()) {
          <div class="border-t border-gray-100 dark:border-surface-700 pt-1 mt-1">
            <button class="pop-item text-red-500" (click)="onAssigneeSelect(null)">
              <i class="pi pi-times text-[10px]"></i>
              <span class="text-xs">Bỏ chọn</span>
            </button>
          </div>
        }
      </div>
    </p-popover>

    <!-- Priority Popover -->
    <p-popover #priorityPopover>
      <div class="min-w-[120px] p-0.5">
        @for (p of priorityOptions; track p.value) {
          <button
            class="pop-item"
            [class.selected]="selectedPriority() === p.value"
            (click)="onPrioritySelect(p.value); priorityPopover.hide()"
          >
            <i [class]="p.icon" [style.color]="p.color" style="font-size: 11px"></i>
            <span class="text-xs">{{ p.label }}</span>
            @if (selectedPriority() === p.value) {
              <i class="pi pi-check text-[10px] ml-auto"></i>
            }
          </button>
        }
      </div>
    </p-popover>

    <!-- Due Date Popover -->
    <p-popover #dueDatePopover>
      <div class="p-1">
        <p-datePicker
          [(ngModel)]="dueDateModel"
          [inline]="true"
          [showButtonBar]="true"
          dateFormat="dd/mm/yy"
          (onSelect)="onDueDateSelect($event); dueDatePopover.hide()"
          (onClearClick)="onDueDateClear(); dueDatePopover.hide()"
        />
      </div>
    </p-popover>
  `,
  styles: [`
    :host {
      display: block;
    }

    .toolbar-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      border-radius: 6px;
      border: 1px solid transparent;
      background: transparent;
      cursor: pointer;
      transition: all 150ms ease;
      color: var(--text-color-secondary);
    }

    .toolbar-btn:hover {
      background: var(--surface-100);
      border-color: var(--surface-200);
    }

    .toolbar-btn.active {
      background: var(--surface-50);
      border-color: var(--surface-200);
      color: var(--text-color);
    }

    .avatar-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: var(--p-primary-color);
      color: #fff;
      font-size: 9px;
      font-weight: 600;
      line-height: 1;
    }

    .avatar-sm {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: #e0e7ff;
      color: #4338ca;
      font-size: 10px;
      font-weight: 600;
      flex-shrink: 0;
    }

    .pop-item {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      padding: 6px 10px;
      border: none;
      background: transparent;
      border-radius: 4px;
      cursor: pointer;
      transition: background 100ms ease;
      text-align: left;
      color: var(--text-color);
    }

    .pop-item:hover {
      background: var(--surface-100);
    }

    .pop-item.selected {
      background: var(--surface-50);
    }
  `],
})
export class SubItemQuickToolbarComponent {
  /** Danh sách thành viên dự án khả dụng cho assignee selector */
  @Input() members: MemberResponse[] = [];

  /** Emit userId hoặc null khi assignee thay đổi */
  @Output() assigneeSelected = new EventEmitter<string | null>();

  /** Emit priority khi thay đổi */
  @Output() prioritySelected = new EventEmitter<TaskPriority>();

  /** Emit ISO date string hoặc null khi due date thay đổi */
  @Output() dueDateSelected = new EventEmitter<string | null>();

  @ViewChild('assigneeSearchInput') assigneeSearchInput?: ElementRef<HTMLInputElement>;

  // ─── Internal state ──────────────────────────────────────────────────────

  protected readonly selectedAssigneeId = signal<string | null>(null);
  protected readonly selectedPriority = signal<TaskPriority>('none');
  protected readonly selectedDueDate = signal<string | null>(null);
  protected readonly assigneeSearch = signal('');

  protected dueDateModel: Date | null = null;
  protected readonly priorityOptions = PRIORITY_OPTIONS;

  // ─── Computed ────────────────────────────────────────────────────────────

  protected readonly selectedPriorityConfig = computed(() =>
    PRIORITY_OPTIONS.find(p => p.value === this.selectedPriority()) ?? PRIORITY_OPTIONS[4],
  );

  protected readonly filteredMembers = computed(() => {
    const query = this.assigneeSearch().trim().toLowerCase();
    if (!query) return this.members;
    return this.members.filter(m =>
      m.displayName.toLowerCase().includes(query) ||
      m.email.toLowerCase().includes(query),
    );
  });

  // ─── Actions ─────────────────────────────────────────────────────────────

  protected focusAssigneeSearch(): void {
    setTimeout(() => this.assigneeSearchInput?.nativeElement.focus(), 50);
  }

  protected getSelectedMemberInitial(): string {
    const id = this.selectedAssigneeId();
    if (!id) return '?';
    const member = this.members.find(m => m.userId === id);
    return member?.displayName[0]?.toUpperCase() ?? '?';
  }

  protected onAssigneeSelect(userId: string | null): void {
    // Toggle: nếu click lại user đã chọn → bỏ chọn
    if (userId && this.selectedAssigneeId() === userId) {
      this.selectedAssigneeId.set(null);
      this.assigneeSelected.emit(null);
    } else {
      this.selectedAssigneeId.set(userId);
      this.assigneeSelected.emit(userId);
    }
  }

  protected onPrioritySelect(priority: TaskPriority): void {
    this.selectedPriority.set(priority);
    this.prioritySelected.emit(priority);
  }

  protected onDueDateSelect(event: Date): void {
    // Sử dụng local date components để tránh timezone shift
    const year = event.getFullYear();
    const month = String(event.getMonth() + 1).padStart(2, '0');
    const day = String(event.getDate()).padStart(2, '0');
    const isoDate = `${year}-${month}-${day}`;
    this.selectedDueDate.set(isoDate);
    this.dueDateSelected.emit(isoDate);
  }

  protected onDueDateClear(): void {
    this.dueDateModel = null;
    this.selectedDueDate.set(null);
    this.dueDateSelected.emit(null);
  }

  protected formatShortDate(isoDate: string): string {
    const parts = isoDate.split('-');
    if (parts.length !== 3) return isoDate;
    return `${parts[2]}/${parts[1]}`;
  }

  // ─── Public API (for parent to reset after creation) ─────────────────────

  /** Reset toolbar selections to defaults */
  reset(): void {
    this.selectedAssigneeId.set(null);
    this.selectedPriority.set('none');
    this.selectedDueDate.set(null);
    this.dueDateModel = null;
    this.assigneeSearch.set('');
  }
}
