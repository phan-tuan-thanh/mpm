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
    <!-- 2-column layout: main content left, preview + actions right -->
    <div class="flex flex-col xl:flex-row gap-5 items-start">

      <!-- Left: Loại + Giá trị -->
      <div class="flex-1 min-w-0 space-y-5">

      <!-- ── Loại ước lượng ── -->
      <div class="bg-surface-0 dark:bg-surface-900 rounded-xl border border-surface-100 dark:border-surface-800 shadow-sm overflow-hidden">
        <div class="px-5 py-3.5 border-b border-surface-100 dark:border-surface-800">
          <h2 class="text-sm font-bold text-gray-900 dark:text-surface-0">{{ t().estimateTypeTitle }}</h2>
          <p class="text-xs text-gray-400 dark:text-surface-500 mt-0.5">{{ t().estimateTypeDesc }}</p>
        </div>
        <div class="p-5">
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
            <span class="text-xs text-gray-400 dark:text-surface-500 mt-1">{{ t().pointsDesc }}</span>
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
            <span class="text-xs text-gray-400 dark:text-surface-500 mt-1">{{ t().categoriesDesc }}</span>
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
            <span class="text-sm font-bold text-gray-800 dark:text-surface-100">{{ t().timeLabel }}</span>
            <span class="text-xs text-gray-400 dark:text-surface-500 mt-1">{{ t().timeDesc }}</span>
          </div>
        </div>
        </div>
      </div>

      <!-- ── Giá trị ước lượng ── -->
      <div class="bg-surface-0 dark:bg-surface-900 rounded-xl border border-surface-100 dark:border-surface-800 shadow-sm overflow-hidden">
        <div class="px-5 py-3.5 border-b border-surface-100 dark:border-surface-800 flex items-start justify-between gap-3">
          <div>
            <h2 class="text-sm font-bold text-gray-900 dark:text-surface-0">{{ t().estimateValuesTitle }}</h2>
            <p class="text-xs text-gray-400 dark:text-surface-500 mt-0.5">{{ t().estimateValuesDesc }}</p>
          </div>
          <span class="text-xs text-gray-400 dark:text-surface-500 font-medium whitespace-nowrap">{{ t().valuesCountHint }}</span>
        </div>
        <div class="p-5 space-y-4">

      <!-- Template Selection -->
      @if (hasTemplates(tempType) && !isReadOnly()) {
        <div class="flex flex-col gap-1.5">
          <label for="template" class="text-xs font-semibold text-gray-500 dark:text-surface-400 uppercase tracking-wider">{{ t().templateLabel }}</label>
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
              [label]="t().applyTemplateBtn"
              severity="secondary"
              (click)="applyTemplate()"
              [disabled]="!selectedTemplate"
            ></button>
          </div>
        </div>
      }

      <!-- Values Chips Editor -->
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
              [placeholder]="t().addValuePlaceholder"
              class="border-none focus:outline-none text-sm px-2 py-1 text-gray-800 dark:text-surface-100 bg-transparent flex-1 min-w-[120px]"
            />
          }
        </div>
        </div>
      </div>

      </div>

      <!-- Right: Xem trước + actions -->
      <div class="w-full xl:w-1/3 xl:min-w-[20rem] xl:max-w-[24rem] flex-shrink-0">
        <div class="xl:sticky xl:top-4 space-y-4">

      <!-- ── Xem trước ── -->
      <div class="bg-surface-0 dark:bg-surface-900 rounded-xl border border-surface-100 dark:border-surface-800 shadow-sm overflow-hidden">
        <div class="px-5 py-3.5 border-b border-surface-100 dark:border-surface-800">
          <h2 class="text-sm font-bold text-gray-900 dark:text-surface-0">{{ t().previewTitle }}</h2>
          <p class="text-xs text-gray-400 dark:text-surface-500 mt-0.5">{{ t().previewDesc }}</p>
        </div>
        <div class="p-5">
        <div class="border border-gray-100 dark:border-surface-700 rounded-xl p-4 bg-gray-50/50 dark:bg-surface-800 space-y-3">
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
              <p class="text-xs text-gray-400 italic">{{ t().previewEmpty }}</p>
            }
          </div>
        </div>
        </div>
      </div>

      <!-- Form actions -->
      @if (!isReadOnly()) {
        <div class="flex justify-end gap-3">
          <button
            pButton
            type="button"
            [label]="t().cancelBtn"
            severity="secondary"
            [text]="true"
            (click)="resetTemp()"
            [disabled]="isSubmitting()"
          ></button>
          <button
            pButton
            type="button"
            [label]="t().saveBtn"
            [disabled]="isSubmitting() || tempValues.length < 2 || tempValues.length > 12"
            (click)="onSubmit()"
          ></button>
        </div>
      }

        </div>
      </div>
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

  // Localization
  readonly t = computed(() => {
    const isEn = this.projectStore.projectLanguage() === 'en';
    return isEn ? {
      estimateTypeTitle: 'Estimate Type',
      estimateTypeDesc: 'Choose how to measure task complexity for this project.',
      pointsDesc: 'Use numeric points (Fibonacci, Linear, etc.) to assess complexity.',
      categoriesDesc: 'Use sizes (XS, S, M, L, XL) or difficulty levels Easy, Medium, Hard.',
      timeLabel: 'Time (Hours)',
      timeDesc: 'Estimate directly in hours (0.5h, 1h, 2h, 4h, etc.).',
      estimateValuesTitle: 'Estimate Values',
      estimateValuesDesc: 'The set of values assignable to tasks when estimating.',
      valuesCountHint: 'Between 2 and 12 elements',
      templateLabel: 'Suggested value templates',
      applyTemplateBtn: 'Apply template',
      addValuePlaceholder: 'Add value...',
      previewTitle: 'Preview',
      previewDesc: 'Estimate UI when assigned to a task.',
      previewEmpty: 'Add values to see the slider preview.',
      cancelBtn: 'Discard changes',
      saveBtn: 'Save configuration',
      templatePlaceholder: 'Choose template',
      fibonacciLabel: 'Fibonacci (0, 0.5, 1, 2, 3, 5, 8, 13, 21)',
      linearLabel: 'Linear (1-10)',
      squaresLabel: 'Squares (1, 4, 9, 16, 25)',
      tshirtLabel: 'T-Shirt Sizes (XS, S, M, L, XL, XXL)',
      difficultyLabel: 'Difficulty (Easy, Medium, Hard)',
      warnSummary: 'Warning',
      warnMax12: 'Maximum 12 elements.',
      errorValueSummary: 'Invalid value',
      errorPositiveNum: 'Please enter a positive number.',
      errorDuplicate: 'Duplicate',
      errorDuplicateDetail: 'This value already exists.',
      errorLengthSummary: 'Length error',
      errorMaxChars: 'Maximum 20 characters.',
      errorConfigSummary: 'Config error',
      errorMin2Values: 'Please enter at least 2 values.',
      confirmChangeTypeHeader: 'Confirm estimate type change',
      confirmChangeTypeMsg: (count: number) => `Changing the estimate type will clear all estimate values of ${count} current tasks in this project. Continue?`,
      confirmChangeTypeAccept: 'Confirm change',
      confirmChangeTypeReject: 'Cancel',
      saveSuccessSummary: 'Success',
      saveSuccessDetail: 'Estimate configuration updated successfully.',
      saveErrorSummary: 'Update failed',
      saveErrorDetail: 'An error occurred while saving the configuration.',
    } : {
      estimateTypeTitle: 'Loại ước lượng',
      estimateTypeDesc: 'Chọn cách đo độ phức tạp công việc của dự án.',
      pointsDesc: 'Sử dụng điểm số (Fibonacci, Linear, etc.) để tính toán độ phức tạp.',
      categoriesDesc: 'Sử dụng kích cỡ (XS, S, M, L, XL) hoặc phân loại Easy, Medium, Hard.',
      timeLabel: 'Thời gian (Hours)',
      timeDesc: 'Ước lượng trực tiếp theo số giờ làm việc (0.5h, 1h, 2h, 4h, etc.).',
      estimateValuesTitle: 'Giá trị ước lượng',
      estimateValuesDesc: 'Bộ giá trị có thể gán cho task khi ước lượng.',
      valuesCountHint: 'Từ 2 đến 12 phần tử',
      templateLabel: 'Mẫu giá trị gợi ý',
      applyTemplateBtn: 'Áp dụng mẫu',
      addValuePlaceholder: 'Thêm giá trị...',
      previewTitle: 'Xem trước',
      previewDesc: 'Giao diện ước lượng khi gán cho task.',
      previewEmpty: 'Thêm giá trị để xem trước thanh trượt.',
      cancelBtn: 'Hủy thay đổi',
      saveBtn: 'Lưu cấu hình',
      templatePlaceholder: 'Chọn mẫu có sẵn',
      fibonacciLabel: 'Fibonacci (0, 0.5, 1, 2, 3, 5, 8, 13, 21)',
      linearLabel: 'Tuyến tính (1-10)',
      squaresLabel: 'Bình phương (1, 4, 9, 16, 25)',
      tshirtLabel: 'T-Shirt Sizes (XS, S, M, L, XL, XXL)',
      difficultyLabel: 'Độ khó (Easy, Medium, Hard)',
      warnSummary: 'Cảnh báo',
      warnMax12: 'Tối đa 12 phần tử.',
      errorValueSummary: 'Lỗi giá trị',
      errorPositiveNum: 'Vui lòng nhập số dương.',
      errorDuplicate: 'Trùng lặp',
      errorDuplicateDetail: 'Giá trị này đã tồn tại.',
      errorLengthSummary: 'Lỗi độ dài',
      errorMaxChars: 'Tối đa 20 ký tự.',
      errorConfigSummary: 'Lỗi cấu hình',
      errorMin2Values: 'Vui lòng nhập tối thiểu 2 giá trị.',
      confirmChangeTypeHeader: 'Xác nhận thay đổi loại ước lượng',
      confirmChangeTypeMsg: (count: number) => `Thay đổi loại ước lượng sẽ xóa toàn bộ giá trị ước lượng của ${count} công việc hiện tại của dự án này. Bạn có chắc chẫn muốn tiếp tục?`,
      confirmChangeTypeAccept: 'Đồng ý thay đổi',
      confirmChangeTypeReject: 'Hủy',
      saveSuccessSummary: 'Thành công',
      saveSuccessDetail: 'Cấu hình ước lượng đã được cập nhật thành công.',
      saveErrorSummary: 'Cập nhật thất bại',
      saveErrorDetail: 'Có lỗi xảy ra khi lưu cấu hình.',
    };
  });

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
    return found ? found.label : this.t().templatePlaceholder;
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
    const tr = this.t();
    if (type === EstimateType.POINTS) {
      return [
        { label: tr.fibonacciLabel, value: 'fibonacci' },
        { label: tr.linearLabel, value: 'linear' },
        { label: tr.squaresLabel, value: 'squares' },
      ];
    }
    if (type === EstimateType.CATEGORIES) {
      return [
        { label: tr.tshirtLabel, value: 'tshirt' },
        { label: tr.difficultyLabel, value: 'difficulty' },
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
    const tr = this.t();

    if (this.tempValues.length >= 12) {
      this.messageService.add({ severity: 'warn', summary: tr.warnSummary, detail: tr.warnMax12 });
      return;
    }

    if (this.tempType === EstimateType.POINTS || this.tempType === EstimateType.TIME) {
      const num = parseFloat(valStr);
      if (isNaN(num) || num < 0) {
        this.messageService.add({ severity: 'error', summary: tr.errorValueSummary, detail: tr.errorPositiveNum });
        return;
      }
      if (this.tempValues.includes(num)) {
        this.messageService.add({ severity: 'warn', summary: tr.errorDuplicate, detail: tr.errorDuplicateDetail });
        return;
      }
      this.tempValues.push(num);
    } else {
      if (valStr.length > 20) {
        this.messageService.add({ severity: 'error', summary: tr.errorLengthSummary, detail: tr.errorMaxChars });
        return;
      }
      if (this.tempValues.includes(valStr)) {
        this.messageService.add({ severity: 'warn', summary: tr.errorDuplicate, detail: tr.errorDuplicateDetail });
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
    const tr = this.t();

    if (this.tempValues.length < 2) {
      this.messageService.add({ severity: 'error', summary: tr.errorConfigSummary, detail: tr.errorMin2Values });
      return;
    }

    const currentConfig = this.projectStore.currentEstimateConfig();
    const isTypeChanged = currentConfig && currentConfig.estimateType !== this.tempType;

    if (isTypeChanged) {
      const itemsCount = this.taskCount();
      this.confirmService.confirm({
        message: tr.confirmChangeTypeMsg(itemsCount),
        header: tr.confirmChangeTypeHeader,
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: tr.confirmChangeTypeAccept,
        rejectLabel: tr.confirmChangeTypeReject,
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
    const tr = this.t();

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
            summary: tr.saveSuccessSummary,
            detail: tr.saveSuccessDetail,
          });
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.messageService.add({
            severity: 'error',
            summary: tr.saveErrorSummary,
            detail: err.error?.message || tr.saveErrorDetail,
          });
        },
      });
  }
}
