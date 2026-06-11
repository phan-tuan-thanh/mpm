import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { toObservable } from '@angular/core/rxjs-interop';
import { MessageService } from 'primeng/api';
import { ProjectStore } from '../../../state/project.store';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { PopoverModule } from 'primeng/popover';
import { SliderModule } from 'primeng/slider';
import { SelectButtonModule } from 'primeng/selectbutton';
import { IconPickerPanelComponent } from '../../../../shared/components/icon-picker-panel/icon-picker-panel.component';
import { IconDisplayComponent } from '../../../../shared/components/icon-display/icon-display.component';
import { SprintService } from '../../services/sprint.service';
import {
  SprintSettings,
  Terminology,
  CapacityMode,
} from '../../models/sprint.models';

@Component({
  standalone: true,
  selector: 'app-sprint-settings',
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    SkeletonModule,
    TooltipModule,
    PopoverModule,
    SliderModule,
    SelectButtonModule,
    IconPickerPanelComponent,
    IconDisplayComponent,
  ],
  template: `
    @if (loading()) {
      <div class="flex flex-col xl:flex-row gap-5 items-start">
        <div class="flex-1 min-w-0 space-y-5">
          <p-skeleton height="12rem" borderRadius="12px" />
          <p-skeleton height="18rem" borderRadius="12px" />
        </div>
        <div class="w-full xl:w-1/3 xl:min-w-[20rem] xl:max-w-[24rem] flex-shrink-0">
          <p-skeleton height="10rem" borderRadius="12px" />
        </div>
      </div>
    } @else {
          <!-- 2-column layout: main content left, metadata right -->
          <div class="flex flex-col xl:flex-row gap-5 items-start">

            <!-- Left: Nhận diện + Vận hành -->
            <div class="flex-1 min-w-0 space-y-5">

              <!-- ── Nhận diện ── -->
              <div class="bg-surface-0 dark:bg-surface-900 rounded-xl border border-surface-100 dark:border-surface-800 shadow-sm overflow-hidden">
                <div class="px-5 py-3.5 border-b border-surface-100 dark:border-surface-800">
                  <h2 class="text-sm font-bold text-gray-900 dark:text-surface-0">Nhận diện</h2>
                  <p class="text-xs text-gray-400 dark:text-surface-500 mt-0.5">Tên gọi và biểu tượng hiển thị trong toàn bộ UI của dự án này.</p>
                </div>
                <div class="p-5 space-y-5">

                  <!-- Terminology -->
                  <div class="flex flex-col gap-1.5">
                    <label class="text-xs font-semibold text-gray-500 dark:text-surface-400 uppercase tracking-wider">Gọi Sprint là</label>
                    <div class="mt-1">
                      <p-selectbutton
                        [options]="terminologyOptions"
                        [(ngModel)]="form.terminology"
                        [allowEmpty]="false"
                        optionLabel="label"
                        optionValue="value"
                        size="small"
                      />
                    </div>
                  </div>

                  <!-- Icon picker (kho icon dùng chung, lọc context sprint) -->
                  <div class="flex flex-col gap-1.5">
                    <label class="text-xs font-semibold text-gray-500 dark:text-surface-400 uppercase tracking-wider">Biểu tượng</label>
                    <div class="flex items-center gap-2">
                      <p-popover #iconPop styleClass="!p-0" appendTo="body">
                        <app-icon-picker-panel
                          context="sprint"
                          [value]="form.icon"
                          (valueChange)="onIconPicked($event); iconPop.hide()"
                        />
                      </p-popover>
                      <button
                        type="button"
                        class="w-12 h-10 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-primary flex items-center justify-center transition hover:border-primary"
                        (click)="iconPop.toggle($event)"
                      >
                        <app-icon-display [icon]="form.icon" class="text-lg"></app-icon-display>
                      </button>
                      <button
                        pButton
                        type="button"
                        label="Chọn biểu tượng"
                        icon="pi pi-palette"
                        severity="secondary"
                        size="small"
                        [outlined]="true"
                        [fluid]="false"
                        (click)="iconPop.toggle($event)"
                      ></button>
                    </div>
                    <p class="text-xs text-gray-400 dark:text-surface-500">Hiển thị ở sidebar và các badge sprint.</p>
                  </div>
                </div>
              </div>

              <!-- ── Vận hành ── -->
              <div class="bg-surface-0 dark:bg-surface-900 rounded-xl border border-surface-100 dark:border-surface-800 shadow-sm overflow-hidden">
                <div class="px-5 py-3.5 border-b border-surface-100 dark:border-surface-800">
                  <h2 class="text-sm font-bold text-gray-900 dark:text-surface-0">Vận hành</h2>
                  <p class="text-xs text-gray-400 dark:text-surface-500 mt-0.5">Giới hạn sprint chạy đồng thời và thời lượng mặc định khi tạo mới.</p>
                </div>
                <div class="p-5 space-y-5">

                  <!-- Max active sprints -->
                  <div class="flex flex-col gap-1.5">
                    <label class="text-xs font-semibold text-gray-500 dark:text-surface-400 uppercase tracking-wider">
                      Số sprint active tối đa
                    </label>
                    <div class="flex items-center gap-4 max-w-sm mt-1">
                      <p-slider
                        [(ngModel)]="form.maxActiveSprints"
                        [min]="1"
                        [max]="10"
                        class="flex-1"
                      />
                      <span class="text-sm font-semibold text-gray-700 dark:text-surface-300 w-6 text-right">
                        {{ form.maxActiveSprints }}
                      </span>
                    </div>
                    <p class="text-xs text-gray-400 dark:text-surface-500 mt-1">Giới hạn bao nhiêu sprint có thể đồng thời ở trạng thái "active" (từ 1 đến 10).</p>
                  </div>

                  <!-- Default duration -->
                  <div class="flex flex-col gap-1.5">
                    <label class="text-xs font-semibold text-gray-500 dark:text-surface-400 uppercase tracking-wider">
                      Thời lượng mặc định
                      <span class="text-xs font-normal text-gray-400 dark:text-surface-500 ml-1">(1–12 tuần)</span>
                    </label>
                    <div class="flex items-center gap-2 flex-wrap">
                      <!-- Preset nhanh -->
                      @for (opt of durationOptions; track opt.value) {
                        <button
                          type="button"
                          class="px-3 py-1.5 text-xs font-medium rounded-lg border transition-all duration-150"
                          [ngClass]="form.defaultDurationWeeks === opt.value
                            ? 'text-white border-transparent'
                            : 'bg-transparent text-gray-600 dark:text-surface-300 border-surface-200 dark:border-surface-700 hover:border-gray-400 dark:hover:border-surface-500'"
                          [style.background]="form.defaultDurationWeeks === opt.value ? 'var(--p-primary-color)' : null"
                          (click)="form.defaultDurationWeeks = opt.value"
                        >
                          {{ opt.label }}
                        </button>
                      }

                      <span class="w-px h-5 bg-surface-200 dark:bg-surface-700 mx-1"></span>

                      <!-- Tùy chỉnh -->
                      <div class="flex items-center gap-1">
                        <button
                          type="button"
                          class="w-9 h-9 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-gray-500 dark:text-surface-400 flex items-center justify-center transition hover:border-primary hover:text-primary disabled:opacity-40 disabled:pointer-events-none"
                          [disabled]="form.defaultDurationWeeks <= 1"
                          (click)="form.defaultDurationWeeks = form.defaultDurationWeeks - 1"
                        >
                          <i class="pi pi-minus text-xs"></i>
                        </button>
                        <span
                          class="min-w-16 h-9 px-2 rounded-lg border flex items-center justify-center text-sm font-semibold transition"
                          [ngClass]="isCustomDuration()
                            ? 'text-white border-transparent'
                            : 'bg-gray-50 dark:bg-surface-800 border-surface-200 dark:border-surface-700 text-gray-900 dark:text-surface-0'"
                          [style.background]="isCustomDuration() ? 'var(--p-primary-color)' : null"
                        >
                          {{ form.defaultDurationWeeks }} tuần
                        </span>
                        <button
                          type="button"
                          class="w-9 h-9 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-gray-500 dark:text-surface-400 flex items-center justify-center transition hover:border-primary hover:text-primary disabled:opacity-40 disabled:pointer-events-none"
                          [disabled]="form.defaultDurationWeeks >= 12"
                          (click)="form.defaultDurationWeeks = form.defaultDurationWeeks + 1"
                        >
                          <i class="pi pi-plus text-xs"></i>
                        </button>
                      </div>
                    </div>
                    <p class="text-xs text-gray-400 dark:text-surface-500">Dùng để tự gợi ý ngày kết thúc khi tạo sprint mới.</p>
                  </div>
                </div>
              </div>

            </div>

            <!-- Right: Capacity + Save changes -->
            <div class="w-full xl:w-1/3 xl:min-w-[20rem] xl:max-w-[24rem] flex-shrink-0">
              <div class="xl:sticky xl:top-4 space-y-4">

                <!-- ── Capacity ── -->
                <div class="bg-surface-0 dark:bg-surface-900 rounded-xl border border-surface-100 dark:border-surface-800 shadow-sm overflow-hidden">
                  <div class="px-5 py-3.5 border-b border-surface-100 dark:border-surface-800">
                    <h2 class="text-sm font-bold text-gray-900 dark:text-surface-0">Capacity</h2>
                    <p class="text-xs text-gray-400 dark:text-surface-500 mt-0.5">Cách tính năng lực sprint khi lập kế hoạch.</p>
                  </div>
                  <div class="p-5">
                    <div class="flex flex-col gap-1.5">
                      <label class="text-xs font-semibold text-gray-500 dark:text-surface-400 uppercase tracking-wider">Tính capacity theo</label>
                      <div class="mt-1.5">
                        <p-selectbutton
                          [options]="capacityOptions"
                          [(ngModel)]="form.capacityMode"
                          [allowEmpty]="false"
                          optionLabel="label"
                          optionValue="value"
                          size="small"
                        />
                      </div>
                      <p class="text-xs text-gray-400 dark:text-surface-500 mt-2 leading-relaxed">
                        <strong class="text-gray-600 dark:text-surface-400">Tổng sprint:</strong> dùng targetCapacity của sprint.<br/>
                        <strong class="text-gray-600 dark:text-surface-400">Theo thành viên:</strong> tổng capacity từng member.
                      </p>
                    </div>
                  </div>
                </div>

                <!-- Save button -->
                <div class="flex justify-end">
                  <button
                    pButton
                    type="button"
                    label="Lưu thay đổi"
                    icon="pi pi-save"
                    [fluid]="false"
                    [loading]="saving()"
                    [disabled]="saving() || loading()"
                    (click)="save()"
                  ></button>
                </div>

              </div>
            </div>

          </div>
        }
  `,
})
export class SprintSettingsComponent implements OnInit, OnDestroy {
  private readonly projectStore = inject(ProjectStore);
  private readonly sprintService = inject(SprintService);
  private readonly messageService = inject(MessageService);
  private readonly destroy$ = new Subject<void>();
  private readonly currentProject$ = toObservable(this.projectStore.currentProject);

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly settings = signal<SprintSettings | null>(null);

  projectId = '';

  form: SprintSettings = {
    terminology: 'sprint',
    maxActiveSprints: 1,
    defaultDurationWeeks: 2,
    capacityMode: 'total',
    icon: 'pi-sync',
  };

  readonly terminologyOptions: { label: string; value: Terminology }[] = [
    { label: 'Sprint', value: 'sprint' },
    { label: 'Cycle', value: 'cycle' },
  ];

  readonly durationOptions: { label: string; value: number }[] = [
    { label: '1 tuần', value: 1 },
    { label: '2 tuần', value: 2 },
    { label: '4 tuần', value: 4 },
  ];

  /** Giá trị hiện tại không trùng preset nào → đang dùng thời lượng tùy chỉnh */
  isCustomDuration(): boolean {
    return !this.durationOptions.some((o) => o.value === this.form.defaultDurationWeeks);
  }

  /** Picker trả 'pi pi-x' hoặc emoji → lưu trữ dạng raw */
  onIconPicked(full: string): void {
    this.form.icon = full;
  }

  readonly capacityOptions: { label: string; value: CapacityMode }[] = [
    { label: 'Tổng sprint', value: 'total' },
    { label: 'Theo thành viên', value: 'member-based' },
  ];

  ngOnInit(): void {
    this.currentProject$.pipe(takeUntil(this.destroy$)).subscribe((project) => {
      if (project) {
        this.projectId = project.id;
        this.loadSettings();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadSettings(): void {
    this.loading.set(true);
    this.sprintService
      .getSettings(this.projectId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (s) => {
          this.settings.set(s);
          this.form = { ...s };
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          // 404 = bảng/column chưa migrate → dùng defaults, không show lỗi
          if (err?.status !== 404) {
            this.messageService.add({
              severity: 'error',
              summary: 'Lỗi',
              detail: 'Không thể tải cấu hình sprint',
              life: 5000,
            });
          }
          const defaults: SprintSettings = {
            terminology: 'sprint',
            maxActiveSprints: 1,
            defaultDurationWeeks: 2,
            capacityMode: 'total',
            icon: 'pi-sync',
          };
          this.settings.set(defaults);
          this.form = { ...defaults };
        },
      });
  }

  save(): void {
    this.saving.set(true);
    this.sprintService
      .updateSettings(this.projectId, {
        terminology: this.form.terminology,
        maxActiveSprints: this.form.maxActiveSprints,
        defaultDurationWeeks: this.form.defaultDurationWeeks,
        capacityMode: this.form.capacityMode,
        icon: this.form.icon,
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (s) => {
          this.settings.set(s);
          this.form = { ...s };
          this.saving.set(false);
          // Cập nhật cache chung để sidebar đổi icon ngay
          this.sprintService.projectSettings.set(s);
          this.messageService.add({
            severity: 'success',
            summary: 'Đã lưu',
            detail: 'Cấu hình sprint đã được cập nhật',
            life: 3000,
          });
        },
        error: (err) => {
          this.saving.set(false);
          const detail = err?.error?.message ?? 'Không thể lưu cấu hình';
          this.messageService.add({
            severity: 'error',
            summary: 'Lỗi',
            detail,
            life: 5000,
          });
        },
      });
  }
}
