import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnDestroy,
  signal,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { MultiSelectModule } from 'primeng/multiselect';
import { DatePickerModule } from 'primeng/datepicker';
import { InputNumberModule } from 'primeng/inputnumber';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';

import { PropertySaveQueue } from './property-save-queue';

// ─── Field type definitions ──────────────────────────────────────────────────

export type PropertyFieldType = 'dropdown' | 'multi-select' | 'date' | 'number';

export interface PropertyFieldOption {
  label: string;
  value: string;
  color?: string;
  icon?: string;
}

export interface PropertyFieldConfig {
  /** Field name as sent to the API (e.g. 'stateId', 'priority', 'assigneeIds') */
  field: string;
  /** Display label */
  label: string;
  /** Editor type */
  type: PropertyFieldType;
  /** Options for dropdown/multi-select */
  options?: PropertyFieldOption[];
  /** Option label field name (default: 'label') */
  optionLabel?: string;
  /** Option value field name (default: 'value') */
  optionValue?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Min value for number fields */
  min?: number;
  /** Max value for number fields */
  max?: number;
  /** Step for number fields */
  step?: number;
}

/**
 * InlinePropertyEditorComponent — Field-type-specific inline editor
 *
 * Configurable component that renders the appropriate PrimeNG editor
 * based on field type. Encapsulates:
 * - Debounced auto-save (500ms) without save button
 * - Loading spinner per field during save
 * - Error handling with revert and toast
 * - Save queue for rapid edits on same field
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.6
 */
@Component({
  standalone: true,
  selector: 'app-inline-property-editor',
  imports: [
    FormsModule,
    SelectModule,
    MultiSelectModule,
    DatePickerModule,
    InputNumberModule,
    ProgressSpinnerModule,
    TooltipModule,
  ],
  template: `
    <div class="flex items-center gap-2 px-3 py-1.5 min-h-[36px] group">
      <!-- Label -->
      <span class="text-xs text-gray-500 dark:text-surface-400 w-[100px] shrink-0 uppercase tracking-wide">
        {{ config.label }}
      </span>

      <!-- Editor area -->
      <div class="flex-1 relative min-w-0">
        @switch (config.type) {
          <!-- ═══ Dropdown (State, Priority) ═══ -->
          @case ('dropdown') {
            <p-select
              [options]="config.options ?? []"
              [ngModel]="currentValue()"
              [optionLabel]="config.optionLabel ?? 'label'"
              [optionValue]="config.optionValue ?? 'value'"
              [placeholder]="config.placeholder ?? 'Chọn...'"
              [disabled]="isSaving()"
              styleClass="w-full text-sm"
              (ngModelChange)="onValueChange($event)"
            />
          }

          <!-- ═══ Multi-Select (Assignees, Labels, Modules) ═══ -->
          @case ('multi-select') {
            <p-multiselect
              [options]="config.options ?? []"
              [ngModel]="currentValue()"
              [optionLabel]="config.optionLabel ?? 'label'"
              [optionValue]="config.optionValue ?? 'value'"
              [placeholder]="config.placeholder ?? 'Chọn...'"
              [disabled]="isSaving()"
              styleClass="w-full text-sm"
              display="chip"
              (ngModelChange)="onValueChange($event)"
            />
          }

          <!-- ═══ Date Picker (Start Date, Due Date) ═══ -->
          @case ('date') {
            <p-datepicker
              [ngModel]="dateValue()"
              [disabled]="isSaving()"
              dateFormat="dd/mm/yy"
              [showButtonBar]="true"
              [showIcon]="true"
              styleClass="w-full text-sm"
              (ngModelChange)="onDateChange($event)"
              (onClearClick)="onDateChange(null)"
            />
          }

          <!-- ═══ Number Input (Estimate: 0.5-100, step 0.5) ═══ -->
          @case ('number') {
            <p-inputnumber
              [ngModel]="currentValue()"
              [min]="config.min ?? 0.5"
              [max]="config.max ?? 100"
              [step]="config.step ?? 0.5"
              [disabled]="isSaving()"
              [showButtons]="true"
              styleClass="w-full text-sm"
              (ngModelChange)="onValueChange($event)"
            />
          }
        }

        <!-- Loading spinner overlay (Req 6.3) -->
        @if (isSaving()) {
          <div class="absolute inset-0 flex items-center justify-end pr-8 pointer-events-none">
            <p-progressSpinner
              [style]="{ width: '16px', height: '16px' }"
              strokeWidth="4"
              animationDuration="0.8s"
            />
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    :host ::ng-deep .p-select,
    :host ::ng-deep .p-multiselect,
    :host ::ng-deep .p-datepicker,
    :host ::ng-deep .p-inputnumber {
      font-size: 0.875rem;
      width: 100%;
      max-width: 100%;
    }

    /* p-inputnumber with showButtons: the inner <input> keeps its intrinsic
       (size-attr) width and pushes the stepper buttons past the column.
       Force it to shrink so the whole control fits the sidebar width. */
    :host ::ng-deep .p-inputnumber input,
    :host ::ng-deep .p-inputnumber .p-inputnumber-input {
      width: 100%;
      min-width: 0;
    }

    :host ::ng-deep .p-select.p-disabled,
    :host ::ng-deep .p-multiselect.p-disabled,
    :host ::ng-deep .p-datepicker.p-disabled,
    :host ::ng-deep .p-inputnumber.p-disabled {
      opacity: 0.7;
    }
  `],
})
export class InlinePropertyEditorComponent implements OnDestroy {
  private readonly messageService = inject(MessageService);
  private readonly saveQueue = new PropertySaveQueue(500);

  /** Field configuration — determines which editor to render */
  @Input({ required: true }) config!: PropertyFieldConfig;

  /** Current value of the field */
  @Input() set value(v: unknown) {
    // Chỉ update nếu không đang save (tránh overwrite giá trị tạm)
    if (this.saveQueue.isSaving(this.config?.field ?? '')) return;
    // Bỏ qua nếu giá trị không đổi. QUAN TRỌNG cho multi-select: parent binding
    // `[value]="getFieldValue(field)"` trả về một MẢNG MỚI mỗi lần CD chạy
    // (vd assigneeIds = task.assignees.map(...)). Nếu không so sánh, mỗi CD sẽ
    // gọi currentValue.set() → ghi signal trong lúc CD → lên lịch CD lại →
    // vòng lặp vô hạn → treo trình duyệt.
    if (this.valuesEqual(v, this._previousValue)) return;
    this._previousValue = v;
    this.currentValue.set(v);
    this.syncDateValue(v);
  }

  /** Shallow equality — handles arrays by element so new-but-equal refs don't retrigger CD */
  private valuesEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true;
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
      }
      return true;
    }
    return false;
  }

  /** Emit when value changes — parent uses to persist via API */
  @Output() valueChanged = new EventEmitter<{ field: string; value: unknown }>();

  /** Emit when save fails — parent may show additional UI */
  @Output() saveError = new EventEmitter<{ field: string; error: unknown }>();

  /** Save function provided by parent — returns Promise<boolean> (true = success) */
  @Input() saveFn?: (field: string, value: unknown) => Promise<boolean>;

  // ─── Internal state ──────────────────────────────────────────────────────

  /** Current displayed value (may differ from server during edit) */
  readonly currentValue = signal<unknown>(null);

  /** Date value converted for p-datepicker (needs Date object) */
  readonly dateValue = signal<Date | null>(null);

  /** Whether this field is currently saving */
  readonly isSaving = signal(false);

  /** Previous value before editing — for revert on error */
  private _previousValue: unknown = null;

  // ─── Lifecycle ───────────────────────────────────────────────────────────

  ngOnDestroy(): void {
    this.saveQueue.destroy();
  }

  // ─── Event Handlers ──────────────────────────────────────────────────────

  /** Handle value change for dropdown, multi-select, number */
  onValueChange(newValue: unknown): void {
    this.currentValue.set(newValue);
    this.enqueueSave(newValue);
  }

  /** Handle date change — convert Date to ISO string for API */
  onDateChange(date: Date | null): void {
    this.dateValue.set(date);
    const isoDate = date ? this.formatDateToISO(date) : null;
    this.currentValue.set(isoDate);
    this.enqueueSave(isoDate);
  }

  // ─── Private methods ─────────────────────────────────────────────────────

  /**
   * Enqueue save via the PropertySaveQueue.
   * Debounces 500ms, queues if save in progress.
   */
  private enqueueSave(value: unknown): void {
    const field = this.config.field;
    const previousValue = this._previousValue;

    // If no saveFn provided, just emit the event
    if (!this.saveFn) {
      this.valueChanged.emit({ field, value });
      return;
    }

    this.saveQueue.enqueue(
      field,
      value,
      previousValue,
      // Save function
      async (f: string, v: unknown): Promise<boolean> => {
        try {
          const success = await this.saveFn!(f, v);
          return success;
        } catch {
          return false;
        }
      },
      // onSaveStart
      () => {
        this.isSaving.set(true);
        this.valueChanged.emit({ field, value });
      },
      // onSaveEnd
      (success: boolean) => {
        this.isSaving.set(false);

        if (success) {
          // Update previous value on success
          this._previousValue = this.currentValue();
        } else {
          // Revert on error (Req 6.4)
          this.revertValue();
          this.messageService.add({
            severity: 'error',
            summary: 'Lỗi',
            detail: `Không thể cập nhật ${this.config.label}`,
            life: 5000,
          });
          this.saveError.emit({ field, error: 'Save failed' });
        }
      },
    );
  }

  /** Revert field to previous value (Req 6.4) */
  private revertValue(): void {
    const prev = this._previousValue;
    this.currentValue.set(prev);
    this.syncDateValue(prev);
  }

  /** Sync the dateValue signal when value is a date string */
  private syncDateValue(value: unknown): void {
    if (this.config?.type === 'date') {
      if (value && typeof value === 'string') {
        this.dateValue.set(new Date(value));
      } else if (value instanceof Date) {
        this.dateValue.set(value);
      } else {
        this.dateValue.set(null);
      }
    }
  }

  /** Format Date to ISO date string (yyyy-MM-dd) */
  private formatDateToISO(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
