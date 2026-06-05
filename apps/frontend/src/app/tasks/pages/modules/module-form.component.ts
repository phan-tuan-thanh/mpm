import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import type { ProjectModule, ModuleStatus } from '@mpm/shared-types';

export interface ModuleFormData {
  name: string;
  description: string | null;
  status: ModuleStatus;
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
    TextareaModule,
    SelectModule,
    DatePickerModule,
  ],
  template: `
    <p-dialog
      [header]="editModule ? 'Sửa Module' : 'Tạo Module mới'"
      [(visible)]="visible"
      [modal]="true"
      [closable]="true"
      [style]="{ width: '500px' }"
      (onHide)="onCancel()"
    >
      <div class="flex flex-col gap-4 pt-2">
        <!-- Name -->
        <div class="flex flex-col gap-1">
          <label for="module-name" class="text-sm font-medium text-gray-700 dark:text-surface-300">
            Tên module <span class="text-red-500">*</span>
          </label>
          <input
            id="module-name"
            pInputText
            [(ngModel)]="formData.name"
            placeholder="Ví dụ: Sprint 3, Release v2.0..."
            [maxlength]="100"
            [class.ng-invalid]="submitted && !formData.name.trim()"
          />
          @if (submitted && !formData.name.trim()) {
            <small class="text-red-500 text-xs">Tên module là bắt buộc</small>
          }
        </div>

        <!-- Description -->
        <div class="flex flex-col gap-1">
          <label for="module-desc" class="text-sm font-medium text-gray-700 dark:text-surface-300">
            Mô tả (Markdown)
          </label>
          <textarea
            id="module-desc"
            pTextarea
            [(ngModel)]="formData.description"
            [rows]="4"
            [autoResize]="true"
            placeholder="Mô tả ngắn gọn cho module..."
          ></textarea>
        </div>

        <!-- Status -->
        <div class="flex flex-col gap-1">
          <label for="module-status" class="text-sm font-medium text-gray-700 dark:text-surface-300">
            Trạng thái
          </label>
          <p-select
            id="module-status"
            [(ngModel)]="formData.status"
            [options]="statusOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Chọn trạng thái"
          />
        </div>

        <!-- Dates -->
        <div class="grid grid-cols-2 gap-3">
          <div class="flex flex-col gap-1">
            <label for="module-start" class="text-sm font-medium text-gray-700 dark:text-surface-300">
              Ngày bắt đầu
            </label>
            <p-datepicker
              id="module-start"
              [(ngModel)]="startDateValue"
              [showIcon]="true"
              dateFormat="dd/mm/yy"
              placeholder="dd/mm/yyyy"
              [showClear]="true"
            />
          </div>
          <div class="flex flex-col gap-1">
            <label for="module-end" class="text-sm font-medium text-gray-700 dark:text-surface-300">
              Ngày kết thúc
            </label>
            <p-datepicker
              id="module-end"
              [(ngModel)]="endDateValue"
              [showIcon]="true"
              dateFormat="dd/mm/yy"
              placeholder="dd/mm/yyyy"
              [showClear]="true"
              [minDate]="startDateValue!"
            />
          </div>
        </div>
      </div>

      <ng-template #footer>
        <div class="flex justify-end gap-2">
          <button pButton label="Hủy" severity="secondary" (click)="onCancel()"></button>
          <button pButton [label]="editModule ? 'Cập nhật' : 'Tạo'" (click)="onSubmit()"></button>
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

  formData: ModuleFormData = {
    name: '',
    description: null,
    status: 'backlog',
    startDate: null,
    endDate: null,
  };

  startDateValue: Date | null = null;
  endDateValue: Date | null = null;
  submitted = false;

  readonly statusOptions = [
    { label: 'Backlog', value: 'backlog' },
    { label: 'In Progress', value: 'in_progress' },
    { label: 'Paused', value: 'paused' },
    { label: 'Completed', value: 'completed' },
    { label: 'Cancelled', value: 'cancelled' },
  ];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible'] && this.visible) {
      this.submitted = false;
      if (this.editModule) {
        this.formData = {
          name: this.editModule.name,
          description: this.editModule.description,
          status: this.editModule.status,
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

  onSubmit(): void {
    this.submitted = true;
    if (!this.formData.name.trim()) return;

    const data: ModuleFormData = {
      ...this.formData,
      name: this.formData.name.trim(),
      startDate: this.startDateValue ? this.formatDate(this.startDateValue) : null,
      endDate: this.endDateValue ? this.formatDate(this.endDateValue) : null,
    };

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
      status: 'backlog',
      startDate: null,
      endDate: null,
    };
    this.startDateValue = null;
    this.endDateValue = null;
  }

  /** Formats Date to 'YYYY-MM-DD' for API */
  private formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
