import {
  Component, Input, Output, EventEmitter, ViewChild, ElementRef,
  OnChanges, inject, signal, computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { MultiSelectModule } from 'primeng/multiselect';
import { DatePickerModule } from 'primeng/datepicker';
import { TooltipModule } from 'primeng/tooltip';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { PopoverModule, Popover } from 'primeng/popover';

import { ProjectStore } from '../../../../projects/state/project.store';
import { TaskStore } from '../../../state/task.store';
import type { TaskType, TaskPriority, CreateTaskDto } from '@mpm/shared-types';

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

@Component({
  standalone: true,
  selector: 'app-quick-create',
  imports: [
    CommonModule, FormsModule,
    DialogModule, ButtonModule, InputTextModule, TextareaModule,
    SelectModule, MultiSelectModule, DatePickerModule,
    TooltipModule, ToggleSwitchModule, PopoverModule,
  ],
  template: `
    <p-dialog
      [(visible)]="visible"
      [modal]="true"
      [closable]="false"
      [showHeader]="false"
      [style]="{ width: '640px', padding: '0' }"
      [contentStyle]="{ padding: '0', borderRadius: '12px', overflow: 'hidden' }"
      [dismissableMask]="true"
      (onHide)="onCancel()"
    >
      <div class="flex flex-col bg-white dark:bg-surface-800 rounded-xl shadow-xl">

        <!-- ── Type selector (top-left pill) ── -->
        <div class="flex items-center gap-2 px-5 pt-4 pb-1">
          <button
            class="flex items-center gap-1.5 text-xs border border-gray-200 dark:border-surface-600 rounded-md px-2 py-1 hover:bg-gray-50 dark:hover:bg-surface-700 transition-colors"
            (click)="typePopover.toggle($event)"
          >
            <i class="text-xs" [class]="selectedTypeConfig().icon" [style.color]="selectedTypeConfig().color"></i>
            <span class="text-gray-600 dark:text-surface-200">{{ selectedTypeConfig().label }}</span>
            <i class="pi pi-chevron-down text-[9px] text-gray-400"></i>
          </button>
        </div>

        <!-- ── Title ── -->
        <div class="px-5 py-2">
          <input
            #titleInput
            pInputText
            class="w-full text-base font-medium !border-none !shadow-none !ring-0 !bg-transparent !p-0 placeholder:text-gray-300 dark:placeholder:text-surface-500"
            placeholder="Title"
            [(ngModel)]="title"
            (keydown.escape)="onCancel()"
          />
        </div>

        <!-- ── Description ── -->
        <div class="px-5 pb-3">
          <textarea
            pTextarea
            class="w-full text-sm text-gray-500 !border-none !shadow-none !ring-0 !bg-transparent !p-0 resize-none placeholder:text-gray-300 dark:placeholder:text-surface-500"
            placeholder="Click to add description"
            rows="3"
            [(ngModel)]="description"
          ></textarea>
        </div>

        <!-- ── Separator ── -->
        <div class="border-t border-gray-100 dark:border-surface-700"></div>

        <!-- ── Metadata pills ── -->
        <div class="flex items-center gap-2 px-5 py-3 flex-wrap">

          <!-- State -->
          <button
            class="flex items-center gap-1.5 text-xs border border-gray-200 dark:border-surface-600 rounded-md px-2 py-1 hover:bg-gray-50 dark:hover:bg-surface-700 transition-colors"
            (click)="statePopover.toggle($event)"
          >
            <span class="w-2.5 h-2.5 rounded-sm" [style.background]="selectedStateColor()"></span>
            <span class="text-gray-600 dark:text-surface-200">{{ selectedStateName() }}</span>
          </button>

          <!-- Priority -->
          <button
            class="flex items-center gap-1.5 text-xs border border-gray-200 dark:border-surface-600 rounded-md px-2 py-1 hover:bg-gray-50 dark:hover:bg-surface-700 transition-colors"
            (click)="priorityPopover.toggle($event)"
          >
            <i class="text-xs" [class]="selectedPriorityConfig().icon" [style.color]="selectedPriorityConfig().color"></i>
            <span class="text-gray-600 dark:text-surface-200">{{ selectedPriorityConfig().label }}</span>
          </button>

          <!-- Assignees -->
          <p-multiselect
            [options]="memberOptions()"
            [(ngModel)]="selectedAssigneeIds"
            optionLabel="displayName"
            optionValue="userId"
            placeholder="Assignees"
            [showHeader]="false"
            styleClass="!border-gray-200 !text-xs !rounded-md"
            [style]="{ height: '26px', fontSize: '12px' }"
          />

          <!-- Labels -->
          <p-multiselect
            [options]="labelOptions()"
            [(ngModel)]="selectedLabelIds"
            optionLabel="name"
            optionValue="id"
            placeholder="Labels"
            [showHeader]="false"
            styleClass="!border-gray-200 !text-xs !rounded-md"
            [style]="{ height: '26px', fontSize: '12px' }"
          />

          <!-- Due date -->
          <p-datepicker
            [(ngModel)]="dueDate"
            placeholder="Due date"
            dateFormat="dd/mm/yy"
            [style]="{ height: '26px', fontSize: '12px' }"
            styleClass="!border-gray-200 !text-xs !rounded-md"
            [showIcon]="false"
            inputStyleClass="!text-xs !py-0"
          />
        </div>

        <!-- ── Actions bar ── -->
        <div class="flex items-center justify-between px-5 py-3 border-t border-gray-100 dark:border-surface-700 bg-gray-50 dark:bg-surface-900 rounded-b-xl">
          <div class="flex items-center gap-2">
            <p-toggleswitch [(ngModel)]="createMore" [style]="{ transform: 'scale(0.75)' }" />
            <span class="text-xs text-gray-500 dark:text-surface-400">Create more</span>
          </div>
          <div class="flex items-center gap-2">
            <button pButton label="Discard" severity="secondary" [text]="true" size="small"
              (click)="onCancel()"></button>
            <button pButton label="Save" size="small"
              (click)="onSubmit()" [disabled]="!title.trim()"></button>
          </div>
        </div>
      </div>
    </p-dialog>

    <!-- ── State picker popover ── -->
    <p-popover #statePopover>
      <div class="w-48 py-1">
        @for (s of stateOptions(); track s.id) {
          <button
            class="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-surface-700 transition-colors"
            [class.bg-indigo-50]="selectedStateId === s.id"
            (click)="selectedStateId = s.id; statePopover.hide()"
          >
            <span class="w-3 h-3 rounded-sm flex-shrink-0 border border-black/10" [style.background]="s.color"></span>
            <span class="text-gray-700 dark:text-surface-100">{{ s.name }}</span>
          </button>
        }
      </div>
    </p-popover>

    <!-- ── Priority picker popover ── -->
    <p-popover #priorityPopover>
      <div class="w-40 py-1">
        @for (p of priorityOptions; track p.value) {
          <button
            class="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-surface-700 transition-colors"
            [class.bg-indigo-50]="selectedPriority === p.value"
            (click)="selectedPriority = p.value; priorityPopover.hide()"
          >
            <i class="text-sm" [class]="p.icon" [style.color]="p.color"></i>
            <span class="text-gray-700 dark:text-surface-100">{{ p.label }}</span>
          </button>
        }
      </div>
    </p-popover>

    <!-- ── Type picker popover ── -->
    <p-popover #typePopover>
      <div class="w-36 py-1">
        @for (t of typeOptions; track t.value) {
          <button
            class="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-surface-700 transition-colors"
            [class.bg-indigo-50]="selectedType === t.value"
            (click)="selectedType = t.value; typePopover.hide()"
          >
            <i class="text-sm" [class]="t.icon" [style.color]="t.color"></i>
            <span class="text-gray-700 dark:text-surface-100">{{ t.label }}</span>
          </button>
        }
      </div>
    </p-popover>
  `,
})
export class QuickCreateComponent implements OnChanges {
  private readonly projectStore = inject(ProjectStore);
  private readonly taskStore = inject(TaskStore);

  @Input() visible = false;
  @Input() parentId?: string;
  @Input() stateId?: string;

  @Output() create = new EventEmitter<CreateTaskDto>();
  @Output() cancel = new EventEmitter<void>();

  @ViewChild('titleInput') titleInput?: ElementRef<HTMLInputElement>;

  protected title = '';
  protected description = '';
  protected selectedType: TaskType = 'task';
  protected selectedPriority: TaskPriority = 'none';
  protected selectedStateId = '';
  protected selectedAssigneeIds: string[] = [];
  protected selectedLabelIds: string[] = [];
  protected dueDate: Date | null = null;
  protected createMore = false;

  protected readonly priorityOptions = PRIORITY_OPTIONS;
  protected readonly typeOptions = TYPE_OPTIONS;

  protected readonly stateOptions = computed(() => {
    const grouped = this.projectStore.currentProjectStates();
    return grouped ? Object.values(grouped).flat() : [];
  });

  protected readonly memberOptions = computed(() => this.projectStore.members());

  protected readonly labelOptions = computed(() =>
    this.taskStore.labels().map((l) => ({ id: l.id, name: l.name, color: l.color })),
  );

  protected readonly selectedStateColor = computed(() =>
    this.stateOptions().find((s) => s.id === this.selectedStateId)?.color ?? '#9CA3AF',
  );

  protected readonly selectedStateName = computed(() =>
    this.stateOptions().find((s) => s.id === this.selectedStateId)?.name ?? 'State',
  );

  protected readonly selectedPriorityConfig = computed(() =>
    PRIORITY_OPTIONS.find((p) => p.value === this.selectedPriority) ?? PRIORITY_OPTIONS[4],
  );

  protected readonly selectedTypeConfig = computed(() =>
    TYPE_OPTIONS.find((t) => t.value === this.selectedType) ?? TYPE_OPTIONS[2],
  );

  ngOnChanges(): void {
    if (this.visible) {
      // Pre-select the passed stateId, or default state
      if (this.stateId) {
        this.selectedStateId = this.stateId;
      } else {
        const defaultState = this.stateOptions().find((s) => s.isDefault);
        this.selectedStateId = defaultState?.id ?? this.stateOptions()[0]?.id ?? '';
      }
      setTimeout(() => this.titleInput?.nativeElement.focus(), 80);
    }
  }

  protected onSubmit(): void {
    const t = this.title.trim();
    if (!t) return;
    this.create.emit({
      title: t,
      type: this.selectedType,
      priority: this.selectedPriority !== 'none' ? this.selectedPriority : undefined,
      description: this.description.trim() || undefined,
      stateId: this.selectedStateId || undefined,
      assigneeIds: this.selectedAssigneeIds.length ? this.selectedAssigneeIds : undefined,
      labelIds: this.selectedLabelIds.length ? this.selectedLabelIds : undefined,
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
    this.selectedType = 'task';
    this.selectedPriority = 'none';
    this.selectedAssigneeIds = [];
    this.selectedLabelIds = [];
    this.dueDate = null;
    this.createMore = false;
  }
}
