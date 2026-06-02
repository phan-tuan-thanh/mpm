import { Component, OnInit, inject, computed, signal } from '@angular/core';
import { ProjectStore } from '../../../state/project.store';
import { ProjectService } from '../../../services/project.service';
import { AuthService } from '../../../../auth/services/auth.service';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { FluidModule } from 'primeng/fluid';
import { SelectModule } from 'primeng/select';
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
    SelectModule,
    FormsModule,
  ],
  template: `
    <div class="space-y-6 max-w-3xl">
      <div>
        <h2 class="text-lg font-bold text-gray-900 pb-2 border-b border-gray-150">
          Cấu hình ước lượng (Estimates)
        </h2>
        <p class="text-xs text-gray-500 mt-1">Thiết lập cách nhóm của bạn ước lượng khối lượng công việc cho dự án.</p>
      </div>

      <!-- Section 1: Estimate Type Selection -->
      <div class="space-y-3">
        <label class="text-sm font-semibold text-gray-700">Loại ước lượng</label>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <!-- Points Card -->
          <div
            (click)="selectType(EstimateType.POINTS)"
            [ngClass]="{
              'border-indigo-600 ring-2 ring-indigo-600 bg-indigo-50/10': tempType === EstimateType.POINTS,
              'border-gray-200 hover:border-gray-300 bg-white': tempType !== EstimateType.POINTS,
              'opacity-60 cursor-not-allowed': isReadOnly()
            }"
            class="border rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition select-none"
          >
            <i class="pi pi-percentage text-2xl mb-2" [ngClass]="tempType === EstimateType.POINTS ? 'text-indigo-600' : 'text-gray-400'"></i>
            <span class="text-sm font-bold text-gray-800">Story Points</span>
            <span class="text-xs text-gray-400 mt-1">Sử dụng điểm số (Fibonacci, Linear, etc.) để tính toán độ phức tạp.</span>
          </div>

          <!-- Categories Card -->
          <div
            (click)="selectType(EstimateType.CATEGORIES)"
            [ngClass]="{
              'border-indigo-600 ring-2 ring-indigo-600 bg-indigo-50/10': tempType === EstimateType.CATEGORIES,
              'border-gray-200 hover:border-gray-300 bg-white': tempType !== EstimateType.CATEGORIES,
              'opacity-60 cursor-not-allowed': isReadOnly()
            }"
            class="border rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition select-none"
          >
            <i class="pi pi-tags text-2xl mb-2" [ngClass]="tempType === EstimateType.CATEGORIES ? 'text-indigo-600' : 'text-gray-400'"></i>
            <span class="text-sm font-bold text-gray-800">T-Shirt Sizes</span>
            <span class="text-xs text-gray-400 mt-1">Sử dụng kích cỡ (XS, S, M, L, XL) hoặc phân loại Easy, Medium, Hard.</span>
          </div>

          <!-- Time Card -->
          <div
            (click)="selectType(EstimateType.TIME)"
            [ngClass]="{
              'border-indigo-600 ring-2 ring-indigo-600 bg-indigo-50/10': tempType === EstimateType.TIME,
              'border-gray-200 hover:border-gray-300 bg-white': tempType !== EstimateType.TIME,
              'opacity-60 cursor-not-allowed': isReadOnly()
            }"
            class="border rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition select-none"
          >
            <i class="pi pi-clock text-2xl mb-2" [ngClass]="tempType === EstimateType.TIME ? 'text-indigo-600' : 'text-gray-400'"></i>
            <span class="text-sm font-bold text-gray-800">Thời gian (Hours)</span>
            <span class="text-xs text-gray-400 mt-1">Ước lượng trực tiếp theo số giờ làm việc (0.5h, 1h, 2h, 4h, etc.).</span>
          </div>
        </div>
      </div>

      <!-- Section 2: Template Selection -->
      @if (hasTemplates(tempType) && !isReadOnly()) {
        <div class="bg-gray-55 rounded-xl p-4 border border-gray-100 space-y-3">
          <label for="template" class="text-sm font-semibold text-gray-700">Mẫu giá trị gợi ý (Templates)</label>
          <div class="flex gap-3">
            <p-select
              id="template"
              [options]="getTemplates(tempType)"
              [(ngModel)]="selectedTemplate"
              optionLabel="label"
              optionValue="value"
              placeholder="Chọn mẫu có sẵn"
              class="w-64"
            ></p-select>
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
          <label class="text-sm font-semibold text-gray-700">Các giá trị ước lượng (Values)</label>
          <span class="text-xs text-gray-400 font-medium">Từ 2 đến 12 phần tử</span>
        </div>

        <div class="border border-gray-200 rounded-xl p-4 bg-white flex flex-wrap gap-2 items-center">
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
              class="border-none focus:outline-none text-sm px-2 py-1 text-gray-800 flex-1 min-w-[120px]"
            />
          }
        </div>
      </div>

      <!-- Section 4: Preview Mockup -->
      <div class="bg-white rounded-xl border border-gray-150 p-5 space-y-4">
        <h3 class="text-sm font-bold text-gray-800 border-b border-gray-50 pb-2">Xem trước (Preview)</h3>
        <div class="max-w-md border border-gray-100 rounded-xl p-4 bg-gray-50/50 space-y-3">
          <div class="flex items-center gap-3">
            <span class="text-xs font-bold text-gray-500 w-24">Task Estimate:</span>
            <div class="flex-1">
              <select class="w-full border border-gray-200 rounded-lg p-2 text-sm bg-white font-semibold text-gray-850">
                <option value="">-- Chọn độ phức tạp --</option>
                @for (val of tempValues; track val) {
                  <option [value]="val">{{ val }} {{ tempType === EstimateType.TIME ? 'h' : '' }}</option>
                }
              </select>
            </div>
          </div>
        </div>
      </div>

      <!-- Form actions -->
      @if (!isReadOnly()) {
        <div class="flex justify-end gap-3 pt-3 border-t border-gray-100">
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
  }

  removeValue(index: number): void {
    if (this.isReadOnly()) return;
    this.tempValues.splice(index, 1);
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
