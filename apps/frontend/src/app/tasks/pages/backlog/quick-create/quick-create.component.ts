import {
  Component, Input, Output, EventEmitter, ViewChild, ElementRef,
  OnChanges, SimpleChanges, inject, signal, computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { DatePickerModule } from 'primeng/datepicker';
import { TooltipModule } from 'primeng/tooltip';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { PopoverModule } from 'primeng/popover';
import { InputNumberModule } from 'primeng/inputnumber';

import { ProjectStore } from '../../../../projects/state/project.store';
import { TaskStore } from '../../../state/task.store';
import type { TaskType, TaskPriority, CreateTaskDto } from '@mpm/shared-types';

// ─── Static option sets ──────────────────────────────────────────────────────

const PRIORITY_OPTIONS: { label: string; value: TaskPriority; icon: string; color: string }[] = [
  { label: 'Urgent', value: 'urgent', icon: 'pi pi-angle-double-up', color: '#EF4444' },
  { label: 'High',   value: 'high',   icon: 'pi pi-angle-up',        color: '#F97316' },
  { label: 'Medium', value: 'medium', icon: 'pi pi-minus',           color: '#EAB308' },
  { label: 'Low',    value: 'low',    icon: 'pi pi-angle-down',      color: '#3B82F6' },
  { label: 'None',   value: 'none',   icon: 'pi pi-circle',          color: '#9CA3AF' },
];

const TYPE_OPTIONS: { label: string; value: TaskType; icon: string; color: string }[] = [
  { label: 'Epic',    value: 'epic',    icon: 'pi pi-bolt',         color: '#8B5CF6' },
  { label: 'Story',   value: 'story',   icon: 'pi pi-book',         color: '#3B82F6' },
  { label: 'Task',    value: 'task',    icon: 'pi pi-check-circle', color: '#10B981' },
  { label: 'Subtask', value: 'subtask', icon: 'pi pi-minus-circle', color: '#6B7280' },
];

const VALID_CHILDREN: Partial<Record<TaskType, TaskType[]>> = {
  epic:  ['story', 'task'],
  story: ['task'],
  task:  ['subtask'],
};

// ─── CSS class shared by every metadata pill ────────────────────────────────
const PILL = 'inline-flex items-center gap-1.5 text-xs border border-gray-200 dark:border-surface-600 rounded-md px-2 py-1 cursor-pointer select-none hover:bg-gray-50 dark:hover:bg-surface-700 transition-colors';

@Component({
  standalone: true,
  selector: 'app-quick-create',
  imports: [
    CommonModule, FormsModule,
    DialogModule, ButtonModule, InputTextModule, TextareaModule,
    DatePickerModule, TooltipModule, ToggleSwitchModule, PopoverModule, InputNumberModule,
  ],
  template: `
    <p-dialog
      [(visible)]="visible"
      [modal]="true"
      [closable]="false"
      [showHeader]="false"
      [style]="{ width: '620px', padding: '0' }"
      [contentStyle]="{ padding: '0', borderRadius: '12px', overflow: 'hidden' }"
      [dismissableMask]="true"
      (onHide)="onCancel()"
    >
      <div class="flex flex-col bg-white dark:bg-surface-800 rounded-xl shadow-xl">

        <!-- ── Header: Type pill ── -->
        <div class="flex items-center gap-2 px-5 pt-4 pb-2">
          <button [class]="pill" (click)="typePopover.toggle($event)">
            <i class="text-[11px]" [class]="selectedTypeConfig().icon" [style.color]="selectedTypeConfig().color"></i>
            <span class="text-gray-600 dark:text-surface-200 font-medium">{{ selectedTypeConfig().label }}</span>
            <i class="pi pi-chevron-down text-[9px] text-gray-400"></i>
          </button>
        </div>

        <!-- ── Title ── -->
        <div class="px-5 pb-1">
          <input
            #titleInput
            pInputText
            class="w-full text-[15px] font-semibold !border-none !shadow-none !ring-0 !bg-transparent !p-0 placeholder:text-gray-300 dark:placeholder:text-surface-500"
            placeholder="Tên task"
            [(ngModel)]="title"
            (keydown.escape)="onCancel()"
            (keydown.enter)="title.trim() && onSubmit()"
          />
        </div>

        <!-- ── Description ── -->
        <div class="px-5 pb-3">
          <textarea
            pTextarea
            class="w-full text-sm text-gray-500 !border-none !shadow-none !ring-0 !bg-transparent !p-0 resize-none placeholder:text-gray-300 dark:placeholder:text-surface-500"
            placeholder="Mô tả (tùy chọn)"
            rows="2"
            [(ngModel)]="description"
          ></textarea>
        </div>

        <!-- ── Separator ── -->
        <div class="border-t border-gray-100 dark:border-surface-700 mx-5"></div>

        <!-- ── Metadata row: all consistent pill buttons ── -->
        <div class="flex items-center gap-1.5 px-5 py-3 flex-wrap">

          <!-- State -->
          <button [class]="pill" (click)="statePopover.toggle($event)">
            <span class="w-2.5 h-2.5 rounded-sm flex-shrink-0" [style.background]="selectedStateColor()"></span>
            <span class="text-gray-600 dark:text-surface-200">{{ selectedStateName() }}</span>
          </button>

          <!-- Priority -->
          <button [class]="pill" (click)="priorityPopover.toggle($event)">
            <i class="text-[11px]" [class]="selectedPriorityConfig().icon" [style.color]="selectedPriorityConfig().color"></i>
            <span class="text-gray-600 dark:text-surface-200">{{ selectedPriorityConfig().label }}</span>
          </button>

          <!-- Assignees -->
          <button [class]="pill" (click)="assigneePopover.toggle($event)">
            @if (selectedAssigneeIds.length) {
              <div class="flex items-center -space-x-1">
                @for (id of selectedAssigneeIds.slice(0, 3); track id) {
                  <div class="w-4 h-4 rounded-full bg-indigo-500 flex items-center justify-center text-[9px] text-white ring-1 ring-white">
                    {{ getMemberInitial(id) }}
                  </div>
                }
              </div>
              <span class="text-gray-600 dark:text-surface-200">
                {{ selectedAssigneeIds.length === 1 ? getMemberName(selectedAssigneeIds[0]) : selectedAssigneeIds.length + ' người' }}
              </span>
            } @else {
              <i class="pi pi-user text-[11px] text-gray-300"></i>
              <span class="text-gray-300 dark:text-surface-500">Assignees</span>
            }
          </button>

          <!-- Labels -->
          <button [class]="pill" (click)="labelPopover.toggle($event)">
            @if (selectedLabelIds.length) {
              <div class="flex gap-0.5">
                @for (id of selectedLabelIds.slice(0, 3); track id) {
                  <span class="w-2.5 h-2.5 rounded-full" [style.background]="getLabelColor(id)"></span>
                }
              </div>
              <span class="text-gray-600 dark:text-surface-200">
                {{ selectedLabelIds.length === 1 ? getLabelName(selectedLabelIds[0]) : selectedLabelIds.length + ' nhãn' }}
              </span>
            } @else {
              <i class="pi pi-tag text-[11px] text-gray-300"></i>
              <span class="text-gray-300 dark:text-surface-500">Labels</span>
            }
          </button>

          <!-- Start date -->
          <button [class]="pill" (click)="startDatePopover.toggle($event)">
            <i class="pi pi-calendar text-[11px]" [class.text-gray-300]="!startDate" [class.text-gray-600]="startDate"></i>
            <span [class.text-gray-300]="!startDate" [class.text-gray-600]="startDate">
              {{ startDate ? (startDate | date:'dd/MM/yy') : 'Bắt đầu' }}
            </span>
          </button>

          <!-- Due date -->
          <button [class]="pill" (click)="dueDatePopover.toggle($event)">
            <i class="pi pi-calendar text-[11px]" [class.text-gray-300]="!dueDate" [class.text-gray-600]="dueDate" [class.text-red-500]="isOverdue()"></i>
            <span [class.text-gray-300]="!dueDate" [class.text-gray-600]="dueDate && !isOverdue()" [class.text-red-500]="isOverdue()">
              {{ dueDate ? (dueDate | date:'dd/MM/yy') : 'Hết hạn' }}
            </span>
          </button>

          <!-- Estimate -->
          <button [class]="pill" (click)="estimatePopover.toggle($event)">
            <i class="pi pi-stopwatch text-[11px]" [class.text-gray-300]="estimateValue === null" [class.text-gray-600]="estimateValue !== null"></i>
            <span [class.text-gray-300]="estimateValue === null" [class.text-gray-600]="estimateValue !== null">
              {{ estimateValue !== null ? estimateValue : 'Estimate' }}
            </span>
          </button>

        </div>

        <!-- ── Footer ── -->
        <div class="flex items-center justify-between px-5 py-3 border-t border-gray-100 dark:border-surface-700 bg-gray-50/60 dark:bg-surface-900 rounded-b-xl">
          <div class="flex items-center gap-2">
            <p-toggleswitch [(ngModel)]="createMore" [style]="{ transform: 'scale(0.75)', transformOrigin: 'left center' }" />
            <span class="text-xs text-gray-500 dark:text-surface-400">Tạo tiếp</span>
          </div>
          <div class="flex items-center gap-2">
            <button pButton label="Hủy" severity="secondary" [text]="true" size="small" (click)="onCancel()"></button>
            <button pButton label="Lưu" size="small" [disabled]="!title.trim()" (click)="onSubmit()"></button>
          </div>
        </div>
      </div>
    </p-dialog>

    <!-- ═══ POPOVERS ═══════════════════════════════════════════════════════ -->

    <!-- Type -->
    <p-popover #typePopover>
      <div class="w-36 py-1">
        @for (t of availableTypes(); track t.value) {
          <button class="flex items-center gap-2 w-full px-3 py-1.5 text-sm rounded hover:bg-gray-50 dark:hover:bg-surface-700 transition-colors"
            [class.bg-indigo-50]="selectedType() === t.value"
            (click)="selectedType.set(t.value); typePopover.hide()">
            <i [class]="t.icon" [style.color]="t.color"></i>
            <span class="text-gray-700 dark:text-surface-100">{{ t.label }}</span>
          </button>
        }
      </div>
    </p-popover>

    <!-- State -->
    <p-popover #statePopover>
      <div class="w-44 py-1">
        @for (s of stateOptions(); track s.id) {
          <button class="flex items-center gap-2 w-full px-3 py-1.5 text-sm rounded hover:bg-gray-50 dark:hover:bg-surface-700 transition-colors"
            [class.bg-indigo-50]="selectedStateId() === s.id"
            (click)="selectedStateId.set(s.id); statePopover.hide()">
            <span class="w-3 h-3 rounded-sm flex-shrink-0 border border-black/10" [style.background]="s.color"></span>
            <span class="text-gray-700 dark:text-surface-100">{{ s.name }}</span>
          </button>
        }
      </div>
    </p-popover>

    <!-- Priority -->
    <p-popover #priorityPopover>
      <div class="w-36 py-1">
        @for (p of priorityOptions; track p.value) {
          <button class="flex items-center gap-2 w-full px-3 py-1.5 text-sm rounded hover:bg-gray-50 dark:hover:bg-surface-700 transition-colors"
            [class.bg-indigo-50]="selectedPriority() === p.value"
            (click)="selectedPriority.set(p.value); priorityPopover.hide()">
            <i [class]="p.icon" [style.color]="p.color"></i>
            <span class="text-gray-700 dark:text-surface-100">{{ p.label }}</span>
          </button>
        }
      </div>
    </p-popover>

    <!-- Assignees -->
    <p-popover #assigneePopover>
      <div class="w-56 py-1">
        <div class="px-3 pb-1.5 text-[10px] uppercase tracking-wide text-gray-400 font-semibold">Thành viên dự án</div>
        @if (!memberOptions().length) {
          <p class="px-3 py-2 text-xs text-gray-400">Chưa có thành viên</p>
        }
        @for (m of memberOptions(); track m.userId) {
          <button class="flex items-center gap-2.5 w-full px-3 py-1.5 text-sm hover:bg-gray-50 dark:hover:bg-surface-700 transition-colors"
            (click)="toggleAssignee(m.userId)">
            <div class="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center text-[10px] text-white flex-shrink-0">
              {{ m.displayName[0]?.toUpperCase() }}
            </div>
            <span class="flex-1 text-gray-700 dark:text-surface-100 truncate">{{ m.displayName }}</span>
            @if (selectedAssigneeIds.includes(m.userId)) {
              <i class="pi pi-check text-indigo-500 text-xs"></i>
            }
          </button>
        }
      </div>
    </p-popover>

    <!-- Labels -->
    <p-popover #labelPopover>
      <div class="w-52 py-1">
        <div class="px-3 pb-1.5 text-[10px] uppercase tracking-wide text-gray-400 font-semibold">Nhãn</div>
        @if (!labelOptions().length) {
          <p class="px-3 py-2 text-xs text-gray-400">Chưa có nhãn — tạo nhãn trong "Quản lý Labels"</p>
        }
        @for (l of labelOptions(); track l.id) {
          <button class="flex items-center gap-2.5 w-full px-3 py-1.5 text-sm hover:bg-gray-50 dark:hover:bg-surface-700 transition-colors"
            (click)="toggleLabel(l.id)">
            <span class="w-3 h-3 rounded-full flex-shrink-0" [style.background]="l.color"></span>
            <span class="flex-1 text-gray-700 dark:text-surface-100 truncate">{{ l.name }}</span>
            @if (selectedLabelIds.includes(l.id)) {
              <i class="pi pi-check text-indigo-500 text-xs"></i>
            }
          </button>
        }
      </div>
    </p-popover>

    <!-- Start date -->
    <p-popover #startDatePopover>
      <p-datepicker [(ngModel)]="startDate" [inline]="true" dateFormat="dd/mm/yy"
        (ngModelChange)="startDatePopover.hide()" />
      @if (startDate) {
        <div class="flex justify-center py-1">
          <button pButton label="Xóa ngày" severity="secondary" [text]="true" size="small"
            (click)="startDate = null; startDatePopover.hide()"></button>
        </div>
      }
    </p-popover>

    <!-- Due date -->
    <p-popover #dueDatePopover>
      <p-datepicker [(ngModel)]="dueDate" [inline]="true" dateFormat="dd/mm/yy"
        (ngModelChange)="dueDatePopover.hide()" />
      @if (dueDate) {
        <div class="flex justify-center py-1">
          <button pButton label="Xóa ngày" severity="secondary" [text]="true" size="small"
            (click)="dueDate = null; dueDatePopover.hide()"></button>
        </div>
      }
    </p-popover>

    <!-- Estimate -->
    <p-popover #estimatePopover>
      <div class="p-3 flex flex-col gap-2 w-44">
        <label class="text-xs text-gray-500 font-medium">Estimate (story points)</label>
        <p-inputnumber [(ngModel)]="estimateValue" [min]="0" [maxFractionDigits]="1"
          styleClass="w-full" inputStyleClass="text-sm" placeholder="0" [autofocus]="true" />
        <div class="flex gap-1.5">
          <button pButton label="Xong" size="small" class="flex-1" (click)="estimatePopover.hide()"></button>
          @if (estimateValue !== null) {
            <button pButton icon="pi pi-times" severity="secondary" [text]="true" size="small"
              pTooltip="Xóa" (click)="estimateValue = null; estimatePopover.hide()"></button>
          }
        </div>
      </div>
    </p-popover>
  `,
})
export class QuickCreateComponent implements OnChanges {
  private readonly projectStore = inject(ProjectStore);
  private readonly taskStore = inject(TaskStore);

  @Input() visible = false;
  @Input() parentId?: string;
  @Input() parentType?: TaskType;
  @Input() stateId?: string;

  @Output() create = new EventEmitter<CreateTaskDto>();
  @Output() cancel = new EventEmitter<void>();

  @ViewChild('titleInput') titleInput?: ElementRef<HTMLInputElement>;

  // ─── CSS constant exposed to template ───────────────────────────────────
  protected readonly pill = 'inline-flex items-center gap-1.5 text-xs border border-gray-200 dark:border-surface-600 rounded-md px-2 py-1 cursor-pointer select-none hover:bg-gray-50 dark:hover:bg-surface-700 transition-colors';

  // ─── Plain form fields ───────────────────────────────────────────────────
  protected title = '';
  protected description = '';
  protected selectedAssigneeIds: string[] = [];
  protected selectedLabelIds: string[] = [];
  protected dueDate: Date | null = null;
  protected startDate: Date | null = null;
  protected estimateValue: number | null = null;
  protected createMore = false;

  // ─── Signals (must be signals so computed() re-evaluates) ───────────────
  protected readonly selectedType = signal<TaskType>('task');
  protected readonly selectedPriority = signal<TaskPriority>('none');
  protected readonly selectedStateId = signal('');

  // ─── Option lists ────────────────────────────────────────────────────────
  protected readonly priorityOptions = PRIORITY_OPTIONS;

  protected readonly availableTypes = computed(() => {
    if (this.parentType) {
      const valid = VALID_CHILDREN[this.parentType] ?? [];
      return TYPE_OPTIONS.filter((t) => valid.includes(t.value));
    }
    return TYPE_OPTIONS.filter((t) => t.value !== 'subtask');
  });

  // ─── Data sources ────────────────────────────────────────────────────────
  protected readonly stateOptions = computed(() => {
    const grouped = this.projectStore.currentProjectStates();
    return grouped ? Object.values(grouped).flat() : [];
  });

  protected readonly memberOptions = computed(() => this.projectStore.members());

  protected readonly labelOptions = computed(() =>
    this.taskStore.labels().map((l) => ({ id: l.id, name: l.name, color: l.color })),
  );

  // ─── Computed display values ─────────────────────────────────────────────
  protected readonly selectedStateColor = computed(() =>
    this.stateOptions().find((s) => s.id === this.selectedStateId())?.color ?? '#9CA3AF',
  );

  protected readonly selectedStateName = computed(() =>
    this.stateOptions().find((s) => s.id === this.selectedStateId())?.name ?? 'State',
  );

  protected readonly selectedPriorityConfig = computed(() =>
    PRIORITY_OPTIONS.find((p) => p.value === this.selectedPriority()) ?? PRIORITY_OPTIONS[4],
  );

  protected readonly selectedTypeConfig = computed(() =>
    TYPE_OPTIONS.find((t) => t.value === this.selectedType()) ?? TYPE_OPTIONS[2],
  );

  // ─── Assignee/Label helpers ──────────────────────────────────────────────
  protected getMemberInitial(userId: string): string {
    return this.memberOptions().find((m) => m.userId === userId)?.displayName[0]?.toUpperCase() ?? '?';
  }

  protected getMemberName(userId: string): string {
    return this.memberOptions().find((m) => m.userId === userId)?.displayName ?? userId;
  }

  protected getLabelColor(id: string): string {
    return this.labelOptions().find((l) => l.id === id)?.color ?? '#9CA3AF';
  }

  protected getLabelName(id: string): string {
    return this.labelOptions().find((l) => l.id === id)?.name ?? id;
  }

  protected toggleAssignee(userId: string): void {
    this.selectedAssigneeIds = this.selectedAssigneeIds.includes(userId)
      ? this.selectedAssigneeIds.filter((id) => id !== userId)
      : [...this.selectedAssigneeIds, userId];
  }

  protected toggleLabel(labelId: string): void {
    this.selectedLabelIds = this.selectedLabelIds.includes(labelId)
      ? this.selectedLabelIds.filter((id) => id !== labelId)
      : [...this.selectedLabelIds, labelId];
  }

  protected isOverdue(): boolean {
    return !!this.dueDate && this.dueDate < new Date();
  }

  // ─── Lifecycle ───────────────────────────────────────────────────────────
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible']?.currentValue === true && !changes['visible'].previousValue) {
      const defaultType = this.parentType
        ? (VALID_CHILDREN[this.parentType]?.[0] ?? 'task')
        : 'task';
      this.selectedType.set(defaultType);
      this.selectedPriority.set('none');
      this.selectedAssigneeIds = [];
      this.selectedLabelIds = [];
      this.dueDate = null;
      this.startDate = null;
      this.estimateValue = null;
      this.title = '';
      this.description = '';

      const defaultState = this.stateId
        ?? this.stateOptions().find((s) => s.isDefault)?.id
        ?? this.stateOptions()[0]?.id
        ?? '';
      this.selectedStateId.set(defaultState);

      setTimeout(() => this.titleInput?.nativeElement.focus(), 80);
    }
  }

  // ─── Actions ─────────────────────────────────────────────────────────────
  protected onSubmit(): void {
    const t = this.title.trim();
    if (!t) return;

    this.create.emit({
      title: t,
      type: this.selectedType(),
      priority: this.selectedPriority() !== 'none' ? this.selectedPriority() : undefined,
      description: this.description.trim() || undefined,
      stateId: this.selectedStateId() || undefined,
      assigneeIds: this.selectedAssigneeIds.length ? this.selectedAssigneeIds : undefined,
      labelIds: this.selectedLabelIds.length ? this.selectedLabelIds : undefined,
      estimateValue: this.estimateValue ?? undefined,
      startDate: this.startDate ? this.startDate.toISOString().split('T')[0] : undefined,
      dueDate: this.dueDate ? this.dueDate.toISOString().split('T')[0] : undefined,
      parentId: this.parentId,
    });

    if (this.createMore) {
      this.title = '';
      this.description = '';
      setTimeout(() => this.titleInput?.nativeElement.focus(), 50);
    } else {
      this.resetForm();
    }
  }

  protected onCancel(): void {
    this.resetForm();
    this.cancel.emit();
  }

  private resetForm(): void {
    this.title = '';
    this.description = '';
    this.selectedType.set('task');
    this.selectedPriority.set('none');
    this.selectedAssigneeIds = [];
    this.selectedLabelIds = [];
    this.dueDate = null;
    this.startDate = null;
    this.estimateValue = null;
    this.createMore = false;
  }
}
