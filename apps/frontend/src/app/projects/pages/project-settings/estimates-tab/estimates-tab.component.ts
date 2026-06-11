import { Component, OnInit, inject, computed, signal } from '@angular/core';
import { ProjectStore } from '../../../state/project.store';
import { ProjectService } from '../../../services/project.service';
import { AuthService } from '../../../../auth/services/auth.service';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { FluidModule } from 'primeng/fluid';
import { PopoverModule } from 'primeng/popover';
import { SliderModule } from 'primeng/slider';
import { MessageService, ConfirmationService } from 'primeng/api';
import { FormsModule } from '@angular/forms';
import { EstimateType } from '@mpm/shared-types';

@Component({
  standalone: true,
  selector: 'app-estimates-tab',
  imports: [
    CommonModule,
    ButtonModule,
    FluidModule,
    PopoverModule,
    SliderModule,
    FormsModule,
  ],
  template: `
    <div class="space-y-5">
      <!-- Section 1: Estimate Type Selection -->
      <div class="space-y-3">
        <label class="text-sm font-semibold text-gray-700 dark:text-surface-200">Loại ước lượng</label>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <!-- Points Card -->
          <div
            (click)="selectType(EstimateType.POINTS)"
            [ngClass]="{
              'border-indigo-600 ring-2 ring-indigo-600 bg-indigo-50/10 dark:bg-indigo-950/40': tempType === EstimateType.POINTS,
              'border-gray-200 dark:border-surface-700 hover:border-gray-300 dark:hover:border-surface-600 bg-white dark:bg-surface-800': tempType !== EstimateType.POINTS,
              'opacity-60 cursor-not-allowed': isReadOnly()
            }"
            class="border rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition select-none"
          >
            <i class="pi pi-percentage text-2xl mb-2" [ngClass]="tempType === EstimateType.POINTS ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-surface-500'"></i>
            <span class="text-sm font-bold text-gray-800 dark:text-surface-100">Story Points</span>
            <span class="text-xs text-gray-400 dark:text-surface-500 mt-1">Sử dụng điểm số (Fibonacci, Linear, etc.) để tính toán độ phức tạp.</span>
          </div>

          <!-- Categories Card -->
          <div
            (click)="selectType(EstimateType.CATEGORIES)"
            [ngClass]="{
              'border-indigo-600 ring-2 ring-indigo-600 bg-indigo-50/10 dark:bg-indigo-950/40': tempType === EstimateType.CATEGORIES,
              'border-gray-200 dark:border-surface-700 hover:border-gray-300 dark:hover:border-surface-600 bg-white dark:bg-surface-800': tempType !== EstimateType.CATEGORIES,
              'opacity-60 cursor-not-allowed': isReadOnly()
            }"
            class="border rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition select-none"
          >
            <i class="pi pi-tags text-2xl mb-2" [ngClass]="tempType === EstimateType.CATEGORIES ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-surface-500'"></i>
            <span class="text-sm font-bold text-gray-800 dark:text-surface-100">T-Shirt Sizes</span>
            <span class="text-xs text-gray-400 dark:text-surface-500 mt-1">Sử dụng kích cỡ (XS, S, M, L, XL) hoặc phân loại Easy, Medium, Hard.</span>
          </div>

          <!-- Time Card -->
          <div
            (click)="selectType(EstimateType.TIME)"
            [ngClass]="{
              'border-indigo-600 ring-2 ring-indigo-600 bg-indigo-50/10 dark:bg-indigo-950/40': tempType === EstimateType.TIME,
              'border-gray-200 dark:border-surface-700 hover:border-gray-300 dark:hover:border-surface-600 bg-white dark:bg-surface-800': tempType !== EstimateType.TIME,
              'opacity-60 cursor-not-allowed': isReadOnly()
            }"
            class="border rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition select-none"
          >
            <i class="pi pi-clock text-2xl mb-2" [ngClass]="tempType === EstimateType.TIME ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-surface-500'"></i>
            <span class="text-sm font-bold text-gray-800 dark:text-surface-100">Thời gian (Hours)</span>
            <span class="text-xs text-gray-400 dark:text-surface-500 mt-1">Ước lượng trực tiếp theo số giờ làm việc (0.5h, 1h, 2h, 4h, etc.).</span>
          </div>
        </div>
      </div>

      <!-- Section 2: Template Selection -->
      @if (hasTemplates(tempType) && !isReadOnly()) {
        <div class="bg-gray-50 dark:bg-surface-800 rounded-xl p-4 border border-gray-100 dark:border-surface-700 space-y-3">
          <label for="template" class="text-sm font-semibold text-gray-700 dark:text-surface-200">Mẫu giá trị gợi ý (Templates)</label>
          <div class="flex gap-3">
            <button
              type="button"
              (click)="tplPop.toggle($event)"
              class="w-64 flex items-center justify-between gap-2 px-3 py-2 text-sm border border-surface-200 dark:border-surface-700 rounded-lg bg-white dark:bg-surface-900 text-gray-800 dark:text-surface-100 font-semibold cursor-pointer hover:bg-surface-50 dark:hover:bg-surface-800 transition-all select-none h-[38px]"
            >
              <span class="truncate">{{ getTemplateLabel() }}</span>
              <i class="pi pi-chevron-down text-xs opacity-60 flex-shrink-0"></i>
            </button>
            <p-popover #tplPop appendTo="body" styleClass="!p-0">
              <div class="pop-list w-64 max-h-60 overflow-y-auto">
                @for (opt of getTemplates(tempType); track opt.value) {
                  <div
                    (click)="selectedTemplate = opt.value; tplPop.hide()"
                    class="pop-item"
                    [class.selected]="selectedTemplate === opt.value"
                  >
                    {{ opt.label }}
                  </div>
                }
              </div>
            </p-popover>
            <button
              pButton
              type="button"
              label="Áp dụng mẫu"
              severity="secondary"
              (click)="applyTemplate()"
              [disabled]="!selectedTemplate"
            ></button>
          </div>
        </div>
      }

      <!-- Section 3: Custom Values Chips Editor -->
      <div class="space-y-3">
        <div class="flex justify-between items-center">
          <label class="text-sm font-semibold text-gray-700 dark:text-surface-200">Các giá trị ước lượng (Values)</label>
          <span class="text-xs text-gray-400 dark:text-surface-500 font-medium">Từ 2 đến 12 phần tử</span>
        </div>

        <div class="border border-gray-200 dark:border-surface-700 rounded-xl p-4 bg-white dark:bg-surface-800 flex flex-wrap gap-2 items-center">
          @for (val of tempValues; track $index) {
            <span class="inline-flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 rounded-lg px-2.5 py-1 text-sm font-bold text-indigo-700">
              {{ val }}
              @if (!isReadOnly()) {
                <button
                  type="button"
                  class="cursor-pointer text-indigo-400 hover:text-indigo-650 transition border-none bg-transparent p-0 flex items-center justify-center h-4 w-4"
                  (click)="removeValue($index)"
                >
                  <i class="pi pi-times text-[10px]"></i>
                </button>
              }
            </span>
          }

          @if (!isReadOnly() && tempValues.length < 12) {
            <input
              type="text"
              [(ngModel)]="newValueInput"
              (keydown.enter)="addValue($event)"
              placeholder="Thêm giá trị..."
              class="border-none focus:outline-none text-sm px-2 py-1 text-gray-800 dark:text-surface-100 bg-transparent flex-1 min-w-[120px]"
            />
          }
        </div>
      </div>

      <!-- Section 4: Preview Mockup -->
      <div class="bg-white dark:bg-surface-900 rounded-xl border border-gray-200 dark:border-surface-800 p-5 space-y-4">
        <h3 class="text-sm font-bold text-gray-800 dark:text-surface-100 border-b border-gray-50 dark:border-surface-800 pb-2">Xem trước (Preview)</h3>
        <div class="max-w-md border border-gray-100 dark:border-surface-700 rounded-xl p-4 bg-gray-50/50 dark:bg-surface-800 space-y-3">
          <div class="flex flex-col gap-2">
            <div class="flex justify-between items-center text-xs font-bold text-gray-500 dark:text-surface-400">
              <span>Task Estimate:</span>
              <span class="text-sm text-indigo-600 dark:text-indigo-400 font-extrabold">{{ getMockupLabel() }}</span>
            </div>

            @if (tempValues.length > 0) {
              <div class="flex items-center h-[34px] px-3 border border-surface-200 dark:border-surface-700 rounded bg-white dark:bg-surface-900 mt-1">
                <p-slider
                  [ngModel]="getMockupIndex()"
                  (ngModelChange)="onMockupSliderChange($event)"
                  [min]="0"
                  [max]="tempValues.length - 1"
                  [step]="1"
                  class="w-full"
                />
              </div>
              <div class="flex justify-between text-[10px] text-gray-400 mt-1 px-1">
                <span>{{ tempValues[0] }}{{ tempType === EstimateType.TIME ? 'h' : '' }}</span>
                <span>{{ tempValues[tempValues.length - 1] }}{{ tempType === EstimateType.TIME ? 'h' : '' }}</span>
              </div>
            } @else {
              <p class="text-xs text-gray-400 italic">Thêm giá trị để xem trước thanh trượt.</p>
            }
          </div>
        </div>
      </div>

      <!-- Form actions -->
      @if (!isReadOnly()) {
        <div class="flex justify-end gap-3 pt-3 border-t border-gray-100 dark:border-surface-800">
          <button
            pButton
            type="button"
            label="Hủy thay đổi"
            severity="secondary"
            [text]="true"
            (click)="resetTemp()"
            [disabled]="isSubmitting()"
          ></button>
          <button
            pButton
            type="button"
            label="Lưu cấu hình"
            [disabled]="isSubmitting() || tempValues.length < 2 || tempValues.length > 12"
            (click)="onSubmit()"
          ></button>
        </div>
      }
    </div>
  `,
})
export class EstimatesTabComponent implements OnInit {
  readonly EstimateType = EstimateType;

  readonly projectStore = inject(ProjectStore);
  private readonly projectService = inject(ProjectService);
  private readonly authService = inject(AuthService);
  private readonly messageService = inject(MessageService);
  private readonly confirmService = inject(ConfirmationService);

  // States
  tempType: EstimateType = EstimateType.POINTS;
  tempValues: any[] = [];
  newValueInput = '';
  selectedTemplate: string | null = null;
  readonly isSubmitting = signal<boolean>(false);
  readonly mockupValue = signal<any>(null);

  getMockupLabel(): string {
    const val = this.mockupValue();
    if (val === null || val === undefined) return '--';
    return `${val}${this.tempType === EstimateType.TIME ? 'h' : ''}`;
  }

  getMockupIndex(): number {
    const val = this.mockupValue();
    if (val === null || val === undefined) return 0;
    const idx = this.tempValues.indexOf(val);
    return idx >= 0 ? idx : 0;
  }

  onMockupSliderChange(index: number): void {
    if (this.tempValues[index] !== undefined) {
      this.mockupValue.set(this.tempValues[index]);
    }
  }

  resetMockupValue(): void {
    if (this.tempValues.length > 0) {
      this.mockupValue.set(this.tempValues[0]);
    } else {
      this.mockupValue.set(null);
    }
  }

  readonly taskCount = computed(() => {
    const stats = this.projectStore.currentProject()?.stateStats;
    if (!stats) return 0;
    return Object.values(stats).reduce((a, b) => a + b, 0);
  });

  readonly isReadOnly = computed(() => {
    const project = this.projectStore.currentProject();
    if (!project) return true;

    const user = this.authService.currentUser();
    if (!user) return true;

    if (user.systemRole === 'Admin') return false;

    const member = this.projectStore.members().find((m) => m.userId === user.id);
    return member?.projectRole !== 'Scrum_Master';
  });

  ngOnInit(): void {
    const project = this.projectStore.currentProject();
    if (project) {
      this.projectStore.loadEstimateConfig(project.id);
      this.projectStore.loadMembers(project.id);
      
      // Auto load values from store when config is updated
      this.resetTemp();
    }
  }

  resetTemp(): void {
    const config = this.projectStore.currentEstimateConfig();
    if (config) {
      this.tempType = config.estimateType;
      this.tempValues = [...(config.values || [])];
    } else {
      this.tempType = EstimateType.POINTS;
      this.tempValues = [0, 1, 2, 3, 5, 8, 13];
    }
    this.newValueInput = '';
    this.selectedTemplate = null;
    this.resetMockupValue();
  }

  getTemplateLabel(): string {
    const found = this.getTemplates(this.tempType).find((t) => t.value === this.selectedTemplate);
    return found ? found.label : 'Chọn mẫu có sẵn';
  }

  selectType(type: EstimateType): void {
    if (this.isReadOnly() || this.tempType === type) return;

    this.tempType = type;
    this.tempValues = [];
    this.selectedTemplate = null;
    this.newValueInput = '';

    // Apply default templates automatically
    const templates = this.getTemplates(type);
    if (templates.length > 0) {
      this.selectedTemplate = templates[0].value;
      this.applyTemplate();
    }
  }

  hasTemplates(type: EstimateType): boolean {
    return type === EstimateType.POINTS || type === EstimateType.CATEGORIES;
  }

  getTemplates(type: EstimateType): { label: string; value: string }[] {
    if (type === EstimateType.POINTS) {
      return [
        { label: 'Fibonacci (0, 0.5, 1, 2, 3, 5, 8, 13, 21)', value: 'fibonacci' },
        { label: 'Tuyến tính (1-10)', value: 'linear' },
        { label: 'Bình phương (1, 4, 9, 16, 25)', value: 'squares' },
      ];
    }
    if (type === EstimateType.CATEGORIES) {
      return [
        { label: 'T-Shirt Sizes (XS, S, M, L, XL, XXL)', value: 'tshirt' },
        { label: 'Độ khó (Easy, Medium, Hard)', value: 'difficulty' },
      ];
    }
    return [];
  }

  applyTemplate(): void {
    if (!this.selectedTemplate) return;

    if (this.selectedTemplate === 'fibonacci') {
      this.tempValues = [0, 0.5, 1, 2, 3, 5, 8, 13, 21];
    } else if (this.selectedTemplate === 'linear') {
      this.tempValues = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    } else if (this.selectedTemplate === 'squares') {
      this.tempValues = [1, 4, 9, 16, 25];
    } else if (this.selectedTemplate === 'tshirt') {
      this.tempValues = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
    } else if (this.selectedTemplate === 'difficulty') {
      this.tempValues = ['Easy', 'Medium', 'Hard'];
    }
    this.resetMockupValue();
  }

  addValue(event: Event): void {
    event.preventDefault();
    const valStr = this.newValueInput.trim();
    if (!valStr) return;

    if (this.tempValues.length >= 12) {
      this.messageService.add({ severity: 'warn', summary: 'Cảnh báo', detail: 'Tối đa 12 phần tử.' });
      return;
    }

    if (this.tempType === EstimateType.POINTS || this.tempType === EstimateType.TIME) {
      const num = parseFloat(valStr);
      if (isNaN(num) || num < 0) {
        this.messageService.add({ severity: 'error', summary: 'Lỗi giá trị', detail: 'Vui lòng nhập số dương.' });
        return;
      }
      if (this.tempValues.includes(num)) {
        this.messageService.add({ severity: 'warn', summary: 'Trùng lặp', detail: 'Giá trị này đã tồn tại.' });
        return;
      }
      this.tempValues.push(num);
    } else {
      if (valStr.length > 20) {
        this.messageService.add({ severity: 'error', summary: 'Lỗi độ dài', detail: 'Tối đa 20 ký tự.' });
        return;
      }
      if (this.tempValues.includes(valStr)) {
        this.messageService.add({ severity: 'warn', summary: 'Trùng lặp', detail: 'Giá trị này đã tồn tại.' });
        return;
      }
      this.tempValues.push(valStr);
    }

    this.newValueInput = '';
    this.resetMockupValue();
  }

  removeValue(index: number): void {
    if (this.isReadOnly()) return;
    this.tempValues.splice(index, 1);
    this.resetMockupValue();
  }

  onSubmit(): void {
    const project = this.projectStore.currentProject();
    if (!project || this.isReadOnly()) return;

    if (this.tempValues.length < 2) {
      this.messageService.add({ severity: 'error', summary: 'Lỗi cấu hình', detail: 'Vui lòng nhập tối thiểu 2 giá trị.' });
      return;
    }

    const currentConfig = this.projectStore.currentEstimateConfig();
    const isTypeChanged = currentConfig && currentConfig.estimateType !== this.tempType;

    if (isTypeChanged) {
      const itemsCount = this.taskCount();
      this.confirmService.confirm({
        message: `Thay đổi loại ước lượng sẽ xóa toàn bộ giá trị ước lượng của ${itemsCount} công việc hiện tại của dự án này. Bạn có chắc chắn muốn tiếp tục?`,
        header: 'Xác nhận thay đổi loại ước lượng',
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: 'Đồng ý thay đổi',
        rejectLabel: 'Hủy',
        acceptButtonStyleClass: 'p-button-danger',
        rejectButtonStyleClass: 'p-button-secondary p-button-text',
        accept: () => {
          this.saveConfig(project.id);
        },
      });
    } else {
      this.saveConfig(project.id);
    }
  }

  private saveConfig(projectId: string): void {
    this.isSubmitting.set(true);

    this.projectService
      .updateEstimateConfig(projectId, {
        estimateType: this.tempType,
        values: this.tempValues,
      })
      .subscribe({
        next: (config) => {
          this.isSubmitting.set(false);
          this.projectStore.loadEstimateConfig(projectId);
          this.messageService.add({
            severity: 'success',
            summary: 'Thành công',
            detail: 'Cấu hình ước lượng đã được cập nhật thành công.',
          });
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Cập nhật thất bại',
            detail: err.error?.message || 'Có lỗi xảy ra khi lưu cấu hình.',
          });
        },
      });
  }
}
