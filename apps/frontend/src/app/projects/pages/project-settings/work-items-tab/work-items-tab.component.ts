import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { PopoverModule } from 'primeng/popover';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { ProjectStore } from '../../../state/project.store';
import { ProjectService } from '../../../services/project.service';
import { CustomTranslationService } from '../../../../shared/services/custom-translation.service';
import { TaskTypeConfigService, TASK_TYPE_DEFAULTS } from '../../../../shared/services/task-type-config.service';
import { IconPickerPanelComponent } from '../../../../shared/components/icon-picker-panel/icon-picker-panel.component';
import { IconDisplayComponent } from '../../../../shared/components/icon-display/icon-display.component';
import { ColorPickerPanelComponent } from '../../../../shared/components/color-picker-panel/color-picker-panel.component';

interface WorkItemRow {
  key: string;
  labelVi: string;
  labelEn: string;
}

const WORK_ITEM_ROWS: WorkItemRow[] = [
  { key: 'epic',    labelVi: 'Epic',    labelEn: 'Epic' },
  { key: 'story',   labelVi: 'Story',   labelEn: 'Story' },
  { key: 'task',    labelVi: 'Task',    labelEn: 'Task' },
  { key: 'subtask', labelVi: 'Subtask', labelEn: 'Subtask' },
];

const PRESET_COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#84CC16', '#22C55E',
  '#10B981', '#06B6D4', '#3B82F6', '#8B5CF6', '#EC4899',
  '#6B7280', '#374151',
];

@Component({
  standalone: true,
  selector: 'app-work-items-tab',
  imports: [
    CommonModule,
    ButtonModule,
    PopoverModule,
    TooltipModule,
    ToastModule,
    IconPickerPanelComponent,
    IconDisplayComponent,
    ColorPickerPanelComponent,
  ],
  providers: [MessageService],
  template: `
    <p-toast />
    <div class="space-y-5">
      <div>
        <h2 class="text-lg font-semibold text-gray-900 dark:text-surface-0">{{ t().title }}</h2>
        <p class="text-sm text-gray-500 dark:text-surface-400 mt-1">{{ t().subtitle }}</p>
      </div>

      <!-- Work item list -->
      <div class="space-y-1">
        @for (row of rows; track row.key) {
          <div class="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-surface-100 dark:border-surface-800 bg-white dark:bg-surface-900">

            <!-- Type preview pill (same style as priority badge) -->
            <span
              class="text-xs px-2.5 py-0.5 rounded-full font-medium border border-gray-300 dark:border-surface-600 select-none flex items-center gap-1.5 shrink-0 min-w-[80px]"
              [style.background]="getColor(row.key) + '22'"
              [style.color]="getColor(row.key)"
              [style.border-color]="getColor(row.key) + '44'"
            >
              <app-icon-display [icon]="getIcon(row.key)" class="text-[11px]" />
              {{ isEn() ? row.labelEn : row.labelVi }}
            </span>

            @if (isOverridden(row.key)) {
              <span class="text-xs px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-medium shrink-0">
                {{ t().customized }}
              </span>
            }

            <div class="flex-1"></div>

            <!-- Color circle button (same style as priorities tab) -->
            <button
              type="button"
              class="w-8 h-8 rounded-full border border-black/10 hover:scale-110 active:scale-95 transition cursor-pointer shrink-0"
              [style.background]="getColor(row.key)"
              (click)="colorPop.toggle($event); activeType.set(row.key); showCustomColor.set(false)"
              [pTooltip]="t().colorTooltip"
              tooltipPosition="top"
            ></button>

            <!-- Icon square button (same style as priorities tab) -->
            <button
              type="button"
              class="w-8 h-8 flex items-center justify-center rounded border border-gray-200 dark:border-surface-600 hover:bg-gray-100 dark:hover:bg-surface-800 cursor-pointer text-gray-500 dark:text-surface-400 shrink-0"
              (click)="iconPop.toggle($event); activeType.set(row.key)"
              [pTooltip]="t().iconTooltip"
              tooltipPosition="top"
            >
              <app-icon-display [icon]="getIcon(row.key)" class="text-sm" [style.color]="getColor(row.key)" />
            </button>

            <!-- Reset button — only when overridden -->
            @if (isOverridden(row.key)) {
              <button
                pButton
                type="button"
                severity="secondary"
                [outlined]="true"
                size="small"
                [fluid]="false"
                icon="pi pi-undo"
                [label]="t().resetBtn"
                (click)="resetType(row.key)"
              ></button>
            } @else {
              <!-- Spacer to keep row height consistent when no reset button -->
              <span class="w-[84px] shrink-0"></span>
            }
          </div>
        }
      </div>

      <!-- Save / Discard -->
      <div class="flex items-center gap-3 pt-2">
        <button
          pButton
          type="button"
          [label]="t().saveBtn"
          icon="pi pi-check"
          [loading]="isSaving()"
          [disabled]="!hasChanges()"
          [fluid]="false"
          (click)="save()"
        ></button>
        @if (hasChanges()) {
          <button
            pButton
            type="button"
            severity="secondary"
            [outlined]="true"
            [label]="t().discardBtn"
            [fluid]="false"
            (click)="discardChanges()"
          ></button>
        }
      </div>
    </div>

    <!-- Icon popover -->
    <p-popover #iconPop styleClass="!p-0" appendTo="body">
      <app-icon-picker-panel
        [value]="getIcon(activeType())"
        (valueChange)="setIcon(activeType(), $event); iconPop.hide()"
      />
    </p-popover>

    <!-- Color popover — preset circles + expandable custom (same pattern as priorities) -->
    <p-popover #colorPop styleClass="p-2" appendTo="body">
      <div class="space-y-3 p-1">
        <div class="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{{ t().quickColorTitle }}</div>

        <div class="grid grid-cols-5 gap-2 w-48">
          @for (color of presetColors; track color) {
            <button
              type="button"
              class="w-8 h-8 rounded-full border border-black/10 hover:scale-110 active:scale-95 transition cursor-pointer flex items-center justify-center relative"
              [style.background]="color"
              (click)="setColor(activeType(), color); colorPop.hide()"
            >
              @if (getColor(activeType()) === color) {
                <i class="pi pi-check text-[10px] text-white shadow-sm"></i>
              }
            </button>
          }
        </div>

        <div class="border-t border-surface-200 dark:border-surface-700 pt-2">
          <button
            type="button"
            class="text-[11px] font-semibold text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 cursor-pointer select-none"
            (click)="showCustomColor.set(!showCustomColor())"
          >
            <i class="pi" [class]="showCustomColor() ? 'pi-chevron-down' : 'pi-chevron-right'"></i>
            {{ t().customColorBtn }}
          </button>
          @if (showCustomColor()) {
            <div class="mt-2 pl-1">
              <app-color-picker-panel
                [value]="getColor(activeType())"
                (valueChange)="setColor(activeType(), $event)"
              />
            </div>
          }
        </div>
      </div>
    </p-popover>
  `,
  styles: [],
})
export class WorkItemsTabComponent {
  private readonly projectStore = inject(ProjectStore);
  private readonly projectService = inject(ProjectService);
  private readonly customTrans = inject(CustomTranslationService);
  private readonly typeConfigSvc = inject(TaskTypeConfigService);
  private readonly messageService = inject(MessageService);

  protected readonly rows = WORK_ITEM_ROWS;
  protected readonly presetColors = PRESET_COLORS;

  readonly isEn = computed(() => this.projectStore.projectLanguage() === 'en');
  readonly showCustomColor = signal(false);

  readonly t = computed(() => {
    const isEn = this.isEn();
    const ct = this.customTrans;
    return {
      title:           ct.t('work-items-tab.title',           isEn ? 'Work Item Types'                                       : 'Loại Work Item'),
      subtitle:        ct.t('work-items-tab.subtitle',        isEn ? 'Customize the icon and color for each work item type.' : 'Tùy chỉnh icon và màu sắc cho từng loại work item trong dự án.'),
      saveBtn:         ct.t('work-items-tab.saveBtn',         isEn ? 'Save'             : 'Lưu thay đổi'),
      discardBtn:      ct.t('work-items-tab.discardBtn',      isEn ? 'Discard'          : 'Hủy'),
      resetBtn:        ct.t('work-items-tab.resetBtn',        isEn ? 'Reset'            : 'Mặc định'),
      customized:      ct.t('work-items-tab.customized',      isEn ? 'Custom'           : 'Tùy chỉnh'),
      saveOk:          ct.t('work-items-tab.saveOk',          isEn ? 'Saved successfully.' : 'Đã lưu cấu hình.'),
      saveErr:         ct.t('work-items-tab.saveErr',         isEn ? 'Failed to save.'     : 'Lưu thất bại.'),
      quickColorTitle: ct.t('work-items-tab.quickColorTitle', isEn ? 'Quick Colors'     : 'Màu chọn nhanh'),
      customColorBtn:  ct.t('work-items-tab.customColorBtn',  isEn ? 'Custom color'     : 'Tùy chỉnh màu'),
      iconTooltip:     ct.t('work-items-tab.iconTooltip',     isEn ? 'Change icon'      : 'Đổi icon'),
      colorTooltip:    ct.t('work-items-tab.colorTooltip',    isEn ? 'Change color'     : 'Đổi màu'),
    };
  });

  readonly activeType = signal<string>('epic');
  readonly isSaving = signal(false);

  private readonly draftOverrides = signal<Record<string, { icon: string; color: string }>>({});

  private get savedConfig(): Record<string, { icon: string; color: string }> | null | undefined {
    return this.projectStore.currentProject()?.taskTypeConfig;
  }

  protected getIcon(type: string): string {
    return this.draftOverrides()[type]?.icon ?? this.typeConfigSvc.getIcon(type, this.savedConfig);
  }

  protected getColor(type: string): string {
    return this.draftOverrides()[type]?.color ?? this.typeConfigSvc.getColor(type, this.savedConfig);
  }

  protected isOverridden(type: string): boolean {
    return !!(this.draftOverrides()[type] || this.savedConfig?.[type]);
  }

  protected hasChanges(): boolean {
    return Object.keys(this.draftOverrides()).length > 0;
  }

  protected setIcon(type: string, icon: string): void {
    this.draftOverrides.update((d) => ({
      ...d,
      [type]: { ...TASK_TYPE_DEFAULTS[type], ...this.savedConfig?.[type], ...d[type], icon },
    }));
  }

  protected setColor(type: string, color: string): void {
    this.draftOverrides.update((d) => ({
      ...d,
      [type]: { ...TASK_TYPE_DEFAULTS[type], ...this.savedConfig?.[type], ...d[type], color },
    }));
  }

  protected resetType(type: string): void {
    this.draftOverrides.update((d) => {
      const next = { ...d };
      next[type] = { icon: TASK_TYPE_DEFAULTS[type].icon, color: TASK_TYPE_DEFAULTS[type].color, _reset: true } as any;
      return next;
    });
  }

  protected discardChanges(): void {
    this.draftOverrides.set({});
  }

  protected save(): void {
    const projectId = this.projectStore.currentProject()?.id;
    if (!projectId) return;

    const saved = { ...(this.savedConfig ?? {}) };
    const draft = this.draftOverrides();

    for (const [type, cfg] of Object.entries(draft)) {
      if ((cfg as any)._reset) {
        delete saved[type];
      } else {
        saved[type] = { icon: cfg.icon, color: cfg.color };
      }
    }

    for (const type of Object.keys(saved)) {
      const def = TASK_TYPE_DEFAULTS[type];
      if (def && saved[type].icon === def.icon && saved[type].color === def.color) {
        delete saved[type];
      }
    }

    this.isSaving.set(true);
    this.projectService.updateTaskTypeConfig(projectId, saved).subscribe({
      next: (config) => {
        this.projectStore.currentProject.update((p) => p ? { ...p, taskTypeConfig: config } : p);
        this.draftOverrides.set({});
        this.isSaving.set(false);
        this.messageService.add({ severity: 'success', summary: this.t().saveOk, life: 3000 });
      },
      error: () => {
        this.isSaving.set(false);
        this.messageService.add({ severity: 'error', summary: this.t().saveErr, life: 3000 });
      },
    });
  }
}
