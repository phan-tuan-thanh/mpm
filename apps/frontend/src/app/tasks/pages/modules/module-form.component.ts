import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PopoverModule } from 'primeng/popover';
import { DatePickerModule } from 'primeng/datepicker';
import { MODULE_LIFECYCLE_STATUSES, type ProjectModule, type ModuleLifecycleStatus, type TiptapDoc } from '@mpm/shared-types';
import { RichTextEditorComponent } from '../../../shared/components/rich-text-editor/rich-text-editor.component';
import { ModuleTransitionSelectorComponent } from './module-transition-selector.component';
import { STATUS_CONFIG, STATUS_CONFIG_EN } from './module-status-badge.component';
import { ProjectStore } from '../../../projects/state/project.store';

export interface ModuleFormData {
  name: string;
  description: TiptapDoc | null;
  status?: ModuleLifecycleStatus;
  startDate: string | null;
  endDate: string | null;
}

@Component({
  standalone: true,
  selector: 'app-module-form',
  imports: [
    CommonModule,
    FormsModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
    PopoverModule,
    DatePickerModule,
    RichTextEditorComponent,
    ModuleTransitionSelectorComponent,
  ],
  template: `
    <p-dialog
      [header]="editModule ? t().editHeader : t().createHeader"
      [(visible)]="visible"
      [modal]="true"
      [closable]="true"
      [style]="{ width: '500px' }"
      (onHide)="onCancel()"
      appendTo="body"
    >
      <div class="flex flex-col gap-4 pt-2">
        <!-- Name -->
        <div class="flex flex-col gap-1">
          <label for="module-name" class="text-sm font-medium text-gray-700 dark:text-surface-300">
            {{ t().nameLabel }} <span class="text-red-500">*</span>
          </label>
          <input
            id="module-name"
            pInputText
            [(ngModel)]="formData.name"
            [placeholder]="t().namePlaceholder"
            [maxlength]="100"
            [class.ng-invalid]="submitted && !formData.name.trim()"
          />
          @if (submitted && !formData.name.trim()) {
            <small class="text-red-500 text-xs">{{ t().nameRequired }}</small>
          }
        </div>

        <!-- Description -->
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-gray-700 dark:text-surface-300">{{ t().descriptionLabel }}</label>
          <app-rich-text-editor [(ngModel)]="formData.description" [placeholder]="t().descriptionPlaceholder"></app-rich-text-editor>
        </div>

        <!-- Status: dropdown khi tạo mới, transition selector khi edit -->
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-gray-700 dark:text-surface-300">{{ t().statusLabel }}</label>

          @if (editModule) {
            <!-- Edit: chỉ cho phép transition hợp lệ -->
            <app-module-transition-selector
              [currentStatus]="editModule.status"
              [allowedTransitions]="editModule.allowedTransitions"
              (transitionRequested)="onStatusTransition($event)"
            />
          } @else {
            <!-- Create: chọn bất kỳ trong 7 trạng thái, mặc định 'planning' -->
            <button
              type="button"
              (click)="statusPop.toggle($event)"
              class="w-full flex items-center justify-between gap-2 px-3 py-1.5 text-sm border border-surface-200 dark:border-surface-700 rounded bg-white dark:bg-surface-900 text-gray-800 dark:text-surface-100 cursor-pointer hover:bg-surface-50 dark:hover:bg-surface-800 transition-all select-none"
            >
              <div class="flex items-center gap-2 min-w-0">
                @if (getSelectedStatusOption(); as opt) {
                  <i [class]="opt.icon + ' text-xs'" [style.color]="opt.color"></i>
                  <span class="truncate">{{ opt.label }}</span>
                } @else {
                  <span class="text-gray-400">{{ t().selectStatusPlaceholder }}</span>
                }
              </div>
              <i class="pi pi-chevron-down text-xs opacity-60 flex-shrink-0"></i>
            </button>
            <p-popover #statusPop appendTo="body" styleClass="!p-0">
              <div class="pop-list w-64 max-h-56 overflow-y-auto">
                @for (opt of allStatusOptions(); track opt.value) {
                  <div
                    (click)="formData.status = opt.value; statusPop.hide()"
                    class="pop-item flex items-center gap-2"
                    [class.selected]="formData.status === opt.value"
                  >
                    <i [class]="opt.icon + ' text-xs'" [style.color]="opt.color"></i>
                    <span>{{ opt.label }}</span>
                  </div>
                }
              </div>
            </p-popover>
          }
        </div>

        <!-- Dates -->
        <div class="grid grid-cols-2 gap-3">
          <div class="flex flex-col gap-1">
            <label for="module-start" class="text-sm font-medium text-gray-700 dark:text-surface-300">
              {{ t().startDateLabel }}
            </label>
            <p-datepicker
              id="module-start"
              [(ngModel)]="startDateValue"
              [showIcon]="true"
              dateFormat="dd/mm/yy"
              placeholder="dd/mm/yyyy"
              [showClear]="true"
              appendTo="body"
            />
          </div>
          <div class="flex flex-col gap-1">
            <label for="module-end" class="text-sm font-medium text-gray-700 dark:text-surface-300">
              {{ t().endDateLabel }}
            </label>
            <p-datepicker
              id="module-end"
              [(ngModel)]="endDateValue"
              [showIcon]="true"
              dateFormat="dd/mm/yy"
              placeholder="dd/mm/yyyy"
              [showClear]="true"
              [minDate]="startDateValue!"
              appendTo="body"
            />
          </div>
        </div>
      </div>

      <ng-template #footer>
        <div class="flex justify-end gap-2">
          <button pButton [label]="t().cancelBtn" severity="secondary" (click)="onCancel()"></button>
          <button pButton [label]="editModule ? t().updateBtn : t().createBtn" (click)="onSubmit()"></button>
        </div>
      </ng-template>
    </p-dialog>
  `,
})
export class ModuleFormComponent implements OnChanges {
  @Input() visible = false;
  @Input() editModule: ProjectModule | null = null;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() save = new EventEmitter<ModuleFormData>();
  @Output() cancel = new EventEmitter<void>();

  private readonly projectStore = inject(ProjectStore);

  readonly t = computed(() => {
    const isEn = this.projectStore.projectLanguage() === 'en';
    return isEn ? {
      editHeader: 'Edit Module',
      createHeader: 'Create New Module',
      nameLabel: 'Module Name',
      namePlaceholder: 'e.g. Sprint 3, Release v2.0...',
      nameRequired: 'Module name is required',
      descriptionLabel: 'Description',
      descriptionPlaceholder: 'Brief description of the module...',
      statusLabel: 'Status',
      selectStatusPlaceholder: 'Select status',
      startDateLabel: 'Start Date',
      endDateLabel: 'End Date',
      cancelBtn: 'Cancel',
      updateBtn: 'Update',
      createBtn: 'Create',
    } : {
      editHeader: 'Sửa Module',
      createHeader: 'Tạo Module mới',
      nameLabel: 'Tên module',
      namePlaceholder: 'Ví dụ: Sprint 3, Release v2.0...',
      nameRequired: 'Tên module là bắt buộc',
      descriptionLabel: 'Mô tả',
      descriptionPlaceholder: 'Mô tả ngắn gọn cho module...',
      statusLabel: 'Trạng thái',
      selectStatusPlaceholder: 'Chọn trạng thái',
      startDateLabel: 'Ngày bắt đầu',
      endDateLabel: 'Ngày kết thúc',
      cancelBtn: 'Hủy',
      updateBtn: 'Cập nhật',
      createBtn: 'Tạo',
    };
  });

  formData: ModuleFormData = {
    name: '',
    description: null,
    status: 'planning',
    startDate: null,
    endDate: null,
  };

  startDateValue: Date | null = null;
  endDateValue: Date | null = null;
  submitted = false;
  private pendingStatusTransition: ModuleLifecycleStatus | undefined = undefined;

  readonly allStatusOptions = computed(() => {
    const isEn = this.projectStore.projectLanguage() === 'en';
    return MODULE_LIFECYCLE_STATUSES.map((s) => ({
      value: s,
      label: isEn ? STATUS_CONFIG_EN[s] : STATUS_CONFIG[s].label,
      icon: STATUS_CONFIG[s].icon,
      color: STATUS_CONFIG[s].color,
    }));
  });

  getSelectedStatusOption(): any {
    const status = this.formData.status;
    return this.allStatusOptions().find((o) => o.value === status);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible'] && this.visible) {
      this.submitted = false;
      this.pendingStatusTransition = undefined;
      if (this.editModule) {
        this.formData = {
          name: this.editModule.name,
          description: this.editModule.description,
          startDate: this.editModule.startDate,
          endDate: this.editModule.endDate,
        };
        this.startDateValue = this.editModule.startDate ? new Date(this.editModule.startDate) : null;
        this.endDateValue = this.editModule.endDate ? new Date(this.editModule.endDate) : null;
      } else {
        this.resetForm();
      }
    }
  }

  onStatusTransition(status: ModuleLifecycleStatus): void {
    this.pendingStatusTransition = status;
  }

  onSubmit(): void {
    this.submitted = true;
    if (!this.formData.name.trim()) return;

    const data: ModuleFormData = {
      ...this.formData,
      name: this.formData.name.trim(),
      startDate: this.startDateValue ? this.formatDate(this.startDateValue) : null,
      endDate: this.endDateValue ? this.formatDate(this.endDateValue) : null,
    };

    if (this.pendingStatusTransition) {
      data.status = this.pendingStatusTransition;
    }

    this.save.emit(data);
    this.close();
  }

  onCancel(): void {
    this.cancel.emit();
    this.close();
  }

  private close(): void {
    this.visible = false;
    this.visibleChange.emit(false);
  }

  private resetForm(): void {
    this.formData = {
      name: '',
      description: null,
      status: 'planning',
      startDate: null,
      endDate: null,
    };
    this.startDateValue = null;
    this.endDateValue = null;
  }

  private formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
