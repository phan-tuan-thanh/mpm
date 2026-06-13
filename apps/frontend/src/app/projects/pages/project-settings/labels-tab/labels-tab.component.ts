import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { CheckboxModule } from 'primeng/checkbox';
import { PopoverModule } from 'primeng/popover';

import { LabelStore } from '../../../../tasks/state/label.store';
import { LayoutService } from '../../../../layout/services/layout.service';
import { ProjectStore } from '../../../state/project.store';
import type { Label } from '@mpm/shared-types';
import { computed, signal } from '@angular/core';

import { IconPickerPanelComponent } from '../../../../shared/components/icon-picker-panel/icon-picker-panel.component';
import { ColorPickerPanelComponent } from '../../../../shared/components/color-picker-panel/color-picker-panel.component';
import { IconDisplayComponent } from '../../../../shared/components/icon-display/icon-display.component';

@Component({
  standalone: true,
  selector: 'app-labels-tab',
  imports: [
    CommonModule, FormsModule,
    ButtonModule, InputTextModule,
    ConfirmDialogModule, ToastModule, TooltipModule, CheckboxModule,
    PopoverModule, IconPickerPanelComponent, ColorPickerPanelComponent, IconDisplayComponent,
  ],
  providers: [ConfirmationService, MessageService],
  template: `
    <p-toast />
    <p-confirmDialog />

    <div class="space-y-5">

      <!-- Common Icon Config -->
      <div class="bg-surface-50/20 rounded-xl border border-dashed border-surface-300 dark:border-surface-700 p-4 flex items-center justify-between">
        <div>
          <h3 class="text-xs font-semibold text-gray-900 dark:text-surface-0 uppercase tracking-wide">{{ t().commonIconTitle }}</h3>
          <p class="text-[11px] text-gray-400 dark:text-surface-500 mt-0.5">{{ t().commonIconDesc }}</p>
        </div>
        <div class="relative flex items-center gap-2">
          <p-popover #commonIconPop styleClass="!p-0" appendTo="body">
            <app-icon-picker-panel
              [value]="commonLabelsIcon()"
              (valueChange)="updateCommonIcon($event); commonIconPop.hide()"
            />
          </p-popover>
          <button type="button"
            class="w-10 h-8 flex items-center justify-center rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-primary hover:border-primary cursor-pointer transition shrink-0"
            (click)="commonIconPop.toggle($event)"
            [pTooltip]="t().commonIconTooltip"
            tooltipPosition="top"
          >
            <app-icon-display [icon]="commonLabelsIcon()" class="text-sm"></app-icon-display>
          </button>
        </div>
      </div>

      <!-- Create form — dashed box, đặt ở top của tab -->
      <div id="create-label-form" class="border border-dashed border-surface-300 dark:border-surface-700 rounded-xl p-4 space-y-3 bg-surface-50/20">
        <div class="flex items-center justify-between flex-wrap gap-2">
          <p class="text-xs font-semibold text-gray-500 dark:text-surface-400 uppercase tracking-wide">{{ t().addNewTitle }}</p>
          
          <!-- Scoped Toggle -->
          <label class="flex items-center gap-1.5 text-xs text-gray-600 dark:text-surface-300 cursor-pointer select-none">
            <input type="checkbox" [checked]="isScopedLabel()" (change)="isScopedLabel.set(!isScopedLabel())"
              class="cursor-pointer rounded border-gray-300">
            {{ t().scopedLabelToggle }}
          </label>
        </div>

        <div class="flex items-center gap-2 flex-wrap">
          <!-- Input Fields (Normal vs Scoped) -->
          @if (isScopedLabel()) {
            <input pInputText [(ngModel)]="scopePrefix" [placeholder]="t().scopedGroupPlaceholder" style="height:32px;font-size:12px;width:120px" (keyup.enter)="createLabel()" />
            <span class="text-gray-400 font-bold select-none">::</span>
            <input pInputText [(ngModel)]="scopeValue" [placeholder]="t().scopedValuePlaceholder" style="height:32px;font-size:12px;width:120px" (keyup.enter)="createLabel()" />
          } @else {
            <input pInputText [(ngModel)]="newName" [placeholder]="t().labelNamePlaceholder" style="height:32px;font-size:12px;width:160px" (keyup.enter)="createLabel()" />
          }

          <input pInputText [(ngModel)]="newDescription" [placeholder]="t().descPlaceholder" style="height:32px;font-size:12px;flex:1;min-width:140px" (keyup.enter)="createLabel()" />

          <!-- Color Popover Button -->
          <p-popover #colorPop styleClass="p-2" appendTo="body">
            <div class="space-y-3 p-1">
              <div class="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{{ t().quickColorTitle }}</div>
              <div class="grid grid-cols-5 gap-2 w-48">
                @for (pair of presetPairs; track pair.light) {
                  <button type="button" 
                    class="w-8 h-8 rounded-full border border-black/10 hover:scale-110 active:scale-95 transition cursor-pointer flex items-center justify-center relative"
                    [style.background]="getPresetGradient(pair.light, pair.dark)"
                    (click)="newColorLight.set(pair.light); newColorDark.set(pair.dark); colorPop.hide()">
                    @if (newColorLight() === pair.light && newColorDark() === pair.dark) {
                      <i class="pi pi-check text-[10px] text-white shadow-sm"></i>
                    }
                  </button>
                }
              </div>
              
              <div class="border-t border-surface-200 dark:border-surface-700 pt-2">
                <button type="button"
                  class="text-[11px] font-semibold text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 cursor-pointer select-none"
                  (click)="showCustomAddColors.set(!showCustomAddColors())">
                  <i class="pi" [class]="showCustomAddColors() ? 'pi-chevron-down' : 'pi-chevron-right'"></i>
                  {{ t().customColorBtn }}
                </button>
                
                @if (showCustomAddColors()) {
                  <div class="mt-2 space-y-3 pl-1">
                    <div>
                      <div class="text-[10px] text-gray-400 dark:text-surface-500 font-medium mb-1">{{ t().lightModeLabel }}</div>
                      <app-color-picker-panel
                        [value]="newColorLight()"
                        (valueChange)="newColorLight.set($event)"
                      />
                    </div>
                    <div>
                      <div class="text-[10px] text-gray-400 dark:text-surface-500 font-medium mb-1">{{ t().darkModeLabel }}</div>
                      <app-color-picker-panel
                        [value]="newColorDark()"
                        (valueChange)="newColorDark.set($event)"
                      />
                    </div>
                  </div>
                }
              </div>
            </div>
          </p-popover>
          <button type="button"
            class="w-8 h-8 rounded-full border border-black/10 hover:scale-115 active:scale-95 transition cursor-pointer flex-shrink-0"
            [style.background]="getPresetGradient(newColorLight(), newColorDark())"
            (click)="colorPop.toggle($event)"
            [pTooltip]="t().colorTooltip"
            tooltipPosition="top"
          ></button>

          <!-- Single/Multi choice selection -->
          @if (isScopedLabel()) {
            <label class="flex items-center gap-1.5 text-xs text-gray-600 dark:text-surface-300 cursor-pointer select-none">
              <p-checkbox [(ngModel)]="isExclusive" [binary]="true" />
              {{ t().singleChoiceToggle }}
            </label>
          }

          <button pButton [label]="t().addBtn" icon="pi pi-plus" size="small" [fluid]="false"
            [disabled]="isScopedLabel() ? (!scopePrefix().trim() || !scopeValue().trim()) : !newName().trim()" (click)="createLabel()"></button>
        </div>

        <!-- Live Preview -->
        <div class="pt-2 border-t border-dashed border-surface-200 dark:border-surface-700 flex items-center gap-2 flex-wrap">
          <span class="text-xs text-gray-500 dark:text-surface-400 font-medium select-none">{{ t().previewLabelTitle }}</span>
          @if (isScopedLabel()) {
            <span class="inline-flex items-center text-xs rounded-full overflow-hidden border border-gray-300 dark:border-surface-600 font-medium select-none cursor-default">
              <span class="px-2 py-0.5 flex items-center gap-1"
                    [style.background]="layoutService.isDarkMode() ? previewLabel().colorDark : previewLabel().colorLight"
                    [style.color]="getTextColor(layoutService.isDarkMode() ? previewLabel().colorDark : previewLabel().colorLight)">
                @if (previewLabel().icon) {
                  <app-icon-display [icon]="previewLabel().icon!" class="text-[11px]"></app-icon-display>
                }
                {{ previewLabel().name.split('::')[0] }}
              </span>
              <span class="px-2 py-0.5"
                    [style.background]="(layoutService.isDarkMode() ? previewLabel().colorDark : previewLabel().colorLight) + '28'"
                    [style.color]="layoutService.isDarkMode() ? previewLabel().colorDark : previewLabel().colorLight">
                {{ previewLabel().name.split('::')[1] }}
              </span>
            </span>
          } @else {
            <span class="text-xs px-2.5 py-0.5 rounded-full font-medium border border-gray-300 dark:border-surface-600 select-none cursor-default flex items-center gap-1"
                  [style.background]="(layoutService.isDarkMode() ? previewLabel().colorDark : previewLabel().colorLight) + '22'"
                  [style.color]="layoutService.isDarkMode() ? previewLabel().colorDark : previewLabel().colorLight">
              @if (previewLabel().icon) {
                <app-icon-display [icon]="previewLabel().icon!" class="text-[11px]"></app-icon-display>
              }
              {{ previewLabel().name }}
            </span>
          }
        </div>
      </div>

      <!-- Action controls — bulk-delete cluster -->
      @if (projSelected().size > 0) {
        <div class="flex items-center justify-end gap-2">
          <button pButton icon="pi pi-trash" severity="danger" size="small" [fluid]="false"
            [label]="t().bulkDeleteLabel(projSelected().size)" (click)="confirmBulkDeleteProj()"></button>
          <button pButton icon="pi pi-times" severity="secondary" size="small" text [fluid]="false"
            [pTooltip]="t().deselectAllTooltip" (click)="clearProjSelection()"></button>
        </div>
      }

      <!-- Toolbar: search + filter chips + Select All -->
      <div class="flex flex-col gap-3">
        <div class="flex items-center justify-between gap-3 flex-wrap">
          <div class="relative max-w-xs flex-1">
            <i class="pi pi-search absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-surface-500 text-xs pointer-events-none"></i>
            <input pInputText class="w-full !pl-7" style="height:32px;font-size:12px"
              [placeholder]="t().searchPlaceholder"
              [ngModel]="projSearch()" (ngModelChange)="setProjSearch($event)" />
          </div>

          @if (paginatedProjectLabels().length > 0) {
            <label class="flex items-center gap-2 text-xs text-gray-600 dark:text-surface-300 cursor-pointer select-none">
              <input type="checkbox" [checked]="isAllPaginatedSelected()" (change)="toggleSelectAllPaginated()"
                class="cursor-pointer rounded border-gray-300">
              {{ t().selectAllOnPage(paginatedProjectLabels().length) }}
            </label>
          }
        </div>

        <div class="flex items-center gap-1 flex-wrap">
          @for (chip of filterChips(); track chip.value) {
            <button type="button"
              class="px-2.5 py-0.5 text-xs rounded-full border transition-colors"
              [class]="projFilter() === chip.value
                ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 font-semibold'
                : 'border-surface-200 dark:border-surface-700 text-gray-500 dark:text-surface-400 hover:bg-surface-50 dark:hover:bg-surface-800'"
              (click)="setProjFilter(chip.value)">{{ chip.label }}</button>
          }
        </div>
      </div>

      <!-- Label List -->
      <div class="space-y-1">
        @for (label of paginatedProjectLabels(); track label.id) {
          <div class="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-surface-100 dark:border-surface-800 bg-white dark:bg-surface-900 hover:border-surface-200 dark:hover:border-surface-700 transition group min-h-[44px]">
            <!-- Checkbox -->
            <input type="checkbox" [checked]="isProjSelected(label.id)" (change)="toggleProjSelect(label.id)"
              class="cursor-pointer rounded border-gray-300">

            @if (editingId() === label.id) {
              <!-- Inline edit form -->
              <div class="flex-1 flex items-center gap-2 flex-wrap">
                <!-- Color Picker button -->
                <p-popover #editColorPop styleClass="p-2" appendTo="body">
                  <div class="space-y-3 p-1">
                    <div class="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{{ t().quickColorTitle }}</div>
                    <div class="grid grid-cols-5 gap-2 w-48">
                      @for (pair of presetPairs; track pair.light) {
                        <button type="button" 
                          class="w-8 h-8 rounded-full border border-black/10 hover:scale-110 active:scale-95 transition cursor-pointer flex items-center justify-center relative"
                          [style.background]="getPresetGradient(pair.light, pair.dark)"
                          (click)="editColorLight.set(pair.light); editColorDark.set(pair.dark); editColorPop.hide()">
                          @if (editColorLight() === pair.light && editColorDark() === pair.dark) {
                            <i class="pi pi-check text-[10px] text-white shadow-sm"></i>
                          }
                        </button>
                      }
                    </div>
                    <div class="border-t border-surface-200 dark:border-surface-700 pt-2">
                      <button type="button"
                        class="text-[11px] font-semibold text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 cursor-pointer select-none"
                        (click)="showCustomEditColors.set(!showCustomEditColors())">
                        <i class="pi" [class]="showCustomEditColors() ? 'pi-chevron-down' : 'pi-chevron-right'"></i>
                        {{ t().customColorBtn }}
                      </button>
                      
                      @if (showCustomEditColors()) {
                        <div class="mt-2 space-y-3 pl-1">
                          <div>
                            <div class="text-[10px] text-gray-400 dark:text-surface-500 font-medium mb-1">{{ t().lightModeLabel }}</div>
                            <app-color-picker-panel
                              [value]="editColorLight()"
                              (valueChange)="editColorLight.set($event)"
                            />
                          </div>
                          <div>
                            <div class="text-[10px] text-gray-400 dark:text-surface-500 font-medium mb-1">{{ t().darkModeLabel }}</div>
                            <app-color-picker-panel
                              [value]="editColorDark()"
                              (valueChange)="editColorDark.set($event)"
                            />
                          </div>
                        </div>
                      }
                    </div>
                  </div>
                </p-popover>
                <button type="button"
                  class="w-7 h-7 rounded-full border border-black/10 hover:scale-110 active:scale-95 transition cursor-pointer flex-shrink-0"
                  [style.background]="getPresetGradient(editColorLight(), editColorDark())"
                  (click)="editColorPop.toggle($event)"
                  [pTooltip]="t().colorTooltip"
                  tooltipPosition="top"
                ></button>

                <input pInputText [(ngModel)]="editName" [placeholder]="t().labelNamePlaceholder" style="height:28px;font-size:12px;width:160px" />
                <input pInputText [(ngModel)]="editDescription" [placeholder]="t().descPlaceholder" style="height:28px;font-size:12px;flex:1;min-width:120px" />
                
                @if (isScoped(editName)) {
                  <label class="flex items-center gap-1 text-xs text-gray-500 dark:text-surface-400 cursor-pointer select-none">
                    <p-checkbox [(ngModel)]="editIsExclusive" [binary]="true" />
                    Exclusive
                  </label>
                }
                <button pButton icon="pi pi-check" size="small" severity="success" [fluid]="false" style="height:28px;padding:0 8px;" (click)="saveEdit(label)"></button>
                <button pButton icon="pi pi-times" size="small" severity="secondary" text [fluid]="false" style="height:28px;padding:0 8px;" (click)="cancelEdit()"></button>
              </div>
            } @else {
              <!-- Badge display -->
              <div class="shrink-0 flex items-center">
                @if (isScoped(label.name)) {
                  <span class="inline-flex items-center text-xs rounded-full overflow-hidden border border-gray-300 dark:border-surface-600 font-medium select-none cursor-default"
                        [pTooltip]="label.description ? label.name + ': ' + label.description : label.name"
                        tooltipPosition="top">
                    <span class="px-2 py-0.5 flex items-center gap-1"
                          [style.background]="getScopeColor(label.name, layoutService.isDarkMode(), (layoutService.isDarkMode() ? label.colorDark : label.colorLight))"
                          [style.color]="getTextColor(getScopeColor(label.name, layoutService.isDarkMode(), (layoutService.isDarkMode() ? label.colorDark : label.colorLight)))">
                      @if (label.icon) {
                        <app-icon-display [icon]="label.icon" class="text-[11px]"></app-icon-display>
                      }
                      {{ getScope(label.name) }}
                    </span>
                    <span class="px-2 py-0.5"
                          [style.background]="(layoutService.isDarkMode() ? label.colorDark : label.colorLight) + '28'"
                          [style.color]="layoutService.isDarkMode() ? label.colorDark : label.colorLight">{{ getValue(label.name) }}</span>
                  </span>
                } @else {
                  <span class="text-xs px-2.5 py-0.5 rounded-full font-medium border border-gray-300 dark:border-surface-600 select-none cursor-default flex items-center gap-1"
                        [style.background]="(layoutService.isDarkMode() ? label.colorDark : label.colorLight) + '22'"
                        [style.color]="layoutService.isDarkMode() ? label.colorDark : label.colorLight"
                        [pTooltip]="label.description ? label.name + ': ' + label.description : label.name"
                        tooltipPosition="top">
                    @if (label.icon) {
                      <app-icon-display [icon]="label.icon" class="text-[11px]"></app-icon-display>
                    }
                    {{ label.name }}
                  </span>
                }
              </div>

              <!-- Description text next to badge -->
              <div class="flex-1 min-w-0 text-xs text-gray-500 dark:text-surface-400 truncate px-2">
                {{ label.description || '' }}
              </div>

              <!-- Choice type indicator -->
              @if (isScoped(label.name)) {
                <span class="text-[10px] px-1.5 py-0.5 rounded border border-surface-200 dark:border-surface-700 text-gray-400 dark:text-surface-500 shrink-0 select-none mr-2">
                  {{ label.isExclusive !== false ? 'Single' : 'Multi' }}
                </span>
              }

              <!-- Action buttons -->
              <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button pButton icon="pi pi-copy" size="small" severity="secondary" text [fluid]="false"
                  [pTooltip]="t().copyTooltip" (click)="cloneLabel(label)"></button>
                <button pButton icon="pi pi-pencil" size="small" severity="secondary" text [fluid]="false"
                  [pTooltip]="t().editTooltip" (click)="startEdit(label)"></button>
                <button pButton icon="pi pi-trash" size="small" severity="danger" text [fluid]="false"
                  [pTooltip]="t().deleteTooltip" (click)="confirmDelete(label)"></button>
              </div>
            }
          </div>
        }

        @if (filteredProjectLabels().length === 0) {
          <div class="flex flex-col items-center gap-3 py-12 text-center text-gray-400 dark:text-surface-500">
            <i class="pi pi-tags text-4xl opacity-30"></i>
            @if (projSearch() || projFilter() !== 'all') {
              <span class="text-sm">{{ t().noMatchingFound }}</span>
            } @else {
              <span class="text-sm">{{ t().emptyStateDesc }}</span>
            }
          </div>
        }
      </div>

      <!-- Pagination -->
      @if (projTotalPages() > 1) {
        <div class="flex items-center justify-between text-xs text-gray-500 dark:text-surface-400">
          <span>{{ projPage() * PAGE_SIZE + 1 }}–{{ projEndIdx() }} / {{ filteredProjectLabels().length }}</span>
          <div class="flex items-center gap-1">
            <button pButton icon="pi pi-chevron-left" size="small" severity="secondary" text [fluid]="false"
              [disabled]="projPage() === 0" (click)="projPage.set(projPage() - 1)"></button>
            @for (i of pageRange(projTotalPages()); track i) {
              <button type="button"
                class="w-6 h-6 rounded text-xs font-medium transition-colors"
                [class]="projPage() === i
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-500 hover:bg-surface-100 dark:hover:bg-surface-800'"
                (click)="projPage.set(i)">{{ i + 1 }}</button>
            }
            <button pButton icon="pi pi-chevron-right" size="small" severity="secondary" text [fluid]="false"
              [disabled]="projPage() >= projTotalPages() - 1" (click)="projPage.set(projPage() + 1)"></button>
          </div>
        </div>
      }

    </div>
  `,
})
export class LabelsTabComponent implements OnInit {
  readonly labelStore = inject(LabelStore);
  private readonly confirmService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);
  protected readonly layoutService = inject(LayoutService);
  private readonly projectStore = inject(ProjectStore);

  protected get projectId(): string {
    return this.projectStore.currentProject()?.id ?? '';
  }

  // ── Preset colors ─────────────────────────────────────────────
  readonly presetPairs = [
    { light: '#EF4444', dark: '#F87171' }, // Red
    { light: '#F97316', dark: '#FB923C' }, // Orange
    { light: '#F59E0B', dark: '#FBBF24' }, // Amber
    { light: '#10B981', dark: '#34D399' }, // Emerald
    { light: '#0D9488', dark: '#2DD4BF' }, // Teal
    { light: '#3B82F6', dark: '#60A5FA' }, // Blue
    { light: '#6366F1', dark: '#818CF8' }, // Indigo
    { light: '#8B5CF6', dark: '#A78BFA' }, // Violet
    { light: '#EC4899', dark: '#F472B6' }, // Pink
    { light: '#6B7280', dark: '#9CA3AF' }  // Gray
  ];

  // ── Localization ──────────────────────────────────────────────
  readonly t = computed(() => {
    const isEn = this.projectStore.projectLanguage() === 'en';
    return isEn ? {
      commonIconTitle: 'Common Label Icon',
      commonIconDesc: 'This icon is displayed uniformly on every project label.',
      commonIconTooltip: 'Change common icon',
      addNewTitle: 'Add new label',
      scopedLabelToggle: 'Scoped Label (group::value)',
      scopedGroupPlaceholder: 'Group (e.g. type)',
      scopedValuePlaceholder: 'Value (e.g. bug)',
      labelNamePlaceholder: 'Label name',
      descPlaceholder: 'Description (optional)',
      quickColorTitle: 'Quick Colors (Light / Dark)',
      customColorBtn: 'Customize Light & Dark colors',
      lightModeLabel: 'Light mode color:',
      darkModeLabel: 'Dark mode color:',
      colorTooltip: 'Choose color pair',
      singleChoiceToggle: 'Single Choice (Each task can select at most 1 label)',
      addBtn: 'Add',
      cancelBtn: 'Cancel',
      previewLabelTitle: 'Label preview:',
      bulkDeleteLabel: (count: number) => `Delete ${count}`,
      deselectAllTooltip: 'Deselect all',
      searchPlaceholder: 'Search by name or description...',
      selectAllOnPage: (count: number) => `Select all on this page (${count})`,
      copyTooltip: 'Clone',
      editTooltip: 'Edit',
      deleteTooltip: 'Delete',
      noMatchingFound: 'No matching label found',
      emptyStateDesc: 'No labels yet. Create the first label above.',
      chipAll: 'All',
      chipRegular: 'Regular',
      chipScoped: 'Scoped',
      chipSingle: 'Single',
      chipMulti: 'Multi',
      scopedEmptyWarn: 'Please fill in both Group and Value for the Scoped Label.',
      createSuccessDetail: 'Successfully created new label.',
      createErrorDetail: 'Could not create label. Please try again.',
      updateSuccessDetail: 'Label updated successfully.',
      updateErrorDetail: 'Could not update label.',
      commonIconSuccessDetail: 'Common label icon updated successfully.',
      cloneDetail: (name: string) => `Filled label info for "${name}" into the form above.`,
      confirmDeleteHeader: 'Confirm Deletion',
      confirmDeleteMsg: (name: string) => `Delete label "${name}"?`,
      deleteSuccessDetail: 'Label deleted successfully.',
      deleteErrorDetail: 'Could not delete label.',
      bulkConfirmHeader: 'Delete Multiple Labels',
      bulkConfirmMsg: (count: number) => `Delete ${count} selected label(s)?`,
      bulkConfirmBtn: (count: number) => `Delete ${count} label(s)`,
      bulkDeleteSuccessDetail: (ok: number, total: number) => `Deleted ${ok}/${total} label(s).`,
      previewGroupName: 'group',
      previewValueName: 'value',
      previewLabelName: 'Label name',
      applyTemplateSuccessSummary: 'Success',
      deleteErrorSummary: 'Error',
      cloneLabelName: 'Clone label',
      deleteBtn: 'Delete',
      successSummary: 'Success',
    } : {
      commonIconTitle: 'Biểu tượng chung của Labels',
      commonIconDesc: 'Biểu tượng này được hiển thị đồng bộ trên mọi nhãn của dự án.',
      commonIconTooltip: 'Thay đổi biểu tượng chung',
      addNewTitle: 'Thêm label mới',
      scopedLabelToggle: 'Scoped Label (nhóm::giá trị)',
      scopedGroupPlaceholder: 'Nhóm (ví dụ: type)',
      scopedValuePlaceholder: 'Giá trị (ví dụ: bug)',
      labelNamePlaceholder: 'Tên label',
      descPlaceholder: 'Mô tả (tuỳ chọn)',
      quickColorTitle: 'Màu chọn nhanh (Light / Dark)',
      customColorBtn: 'Tự tùy chỉnh màu sắc Light & Dark',
      lightModeLabel: 'Màu Light mode:',
      darkModeLabel: 'Màu Dark mode:',
      colorTooltip: 'Chọn cặp màu sắc',
      singleChoiceToggle: 'Single Choice (Mỗi task chỉ chọn tối đa 1 nhãn)',
      addBtn: 'Thêm',
      cancelBtn: 'Hủy',
      previewLabelTitle: 'Xem trước nhãn:',
      bulkDeleteLabel: (count: number) => `Xóa ${count}`,
      deselectAllTooltip: 'Bỏ chọn tất cả',
      searchPlaceholder: 'Tìm theo tên hoặc mô tả...',
      selectAllOnPage: (count: number) => `Chọn tất cả trên trang này (${count})`,
      copyTooltip: 'Sao chép',
      editTooltip: 'Sửa',
      deleteTooltip: 'Xóa',
      noMatchingFound: 'Không tìm thấy label khớp',
      emptyStateDesc: 'Chưa có label nào. Tạo label đầu tiên bên trên.',
      chipAll: 'Tất cả',
      chipRegular: 'Thường',
      chipScoped: 'Scoped',
      chipSingle: 'Single',
      chipMulti: 'Multi',
      scopedEmptyWarn: 'Vui lòng điền đầy đủ Nhóm và Giá trị cho Scoped Label.',
      createSuccessDetail: 'Đã tạo label mới',
      createErrorDetail: 'Không thể tạo label. Vui lòng thử lại.',
      updateSuccessDetail: 'Đã cập nhật label',
      updateErrorDetail: 'Không thể cập nhật label.',
      commonIconSuccessDetail: 'Đã cập nhật biểu tượng chung cho các nhãn.',
      cloneDetail: (name: string) => `Đã điền thông tin nhãn "${name}" vào form thêm mới ở trên.`,
      confirmDeleteHeader: 'Xác nhận xóa',
      confirmDeleteMsg: (name: string) => `Xóa label "${name}"?`,
      deleteSuccessDetail: 'Đã xóa label',
      deleteErrorDetail: 'Không thể xóa label.',
      bulkConfirmHeader: 'Xóa nhiều labels',
      bulkConfirmMsg: (count: number) => `Xóa ${count} label đã chọn?`,
      bulkConfirmBtn: (count: number) => `Xóa ${count} labels`,
      bulkDeleteSuccessDetail: (ok: number, total: number) => `Đã xóa ${ok}/${total} labels`,
      previewGroupName: 'nhóm',
      previewValueName: 'giá trị',
      previewLabelName: 'Tên label',
      applyTemplateSuccessSummary: 'Thành công',
      deleteErrorSummary: 'Lỗi',
      cloneLabelName: 'Sao chép nhãn',
      deleteBtn: 'Xóa',
      successSummary: 'Thành công',
    };
  });

  // ── Filter chips ──────────────────────────────────────────────
  readonly filterChips = computed(() => {
    const trans = this.t();
    return [
      { label: trans.chipAll, value: 'all' as const },
      { label: trans.chipRegular, value: 'regular' as const },
      { label: trans.chipScoped, value: 'scoped' as const },
      { label: trans.chipSingle, value: 'single' as const },
      { label: trans.chipMulti, value: 'multi' as const },
    ];
  });

  // ── Editing state ─────────────────────────────────────────────
  protected editingId = signal<string | null>(null);
  protected editName = '';
  protected editColorLight = signal('#EF4444');
  protected editColorDark = signal('#F87171');
  protected showCustomEditColors = signal(false);
  protected editIsExclusive = true;
  protected editDescription = '';

  // ── Create state ──────────────────────────────────────────────
  protected toggleProjSelect(id: string): void {
    this.projSelected.update(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  protected clearProjSelection(): void { this.projSelected.set(new Set()); }

  readonly isAllPaginatedSelected = computed(() => {
    const paginated = this.paginatedProjectLabels();
    if (paginated.length === 0) return false;
    const selected = this.projSelected();
    return paginated.every(l => selected.has(l.id));
  });

  protected toggleSelectAllPaginated(): void {
    const paginated = this.paginatedProjectLabels();
    const selected = this.projSelected();
    const allSelected = paginated.every(l => selected.has(l.id));

    this.projSelected.update(s => {
      const next = new Set(s);
      if (allSelected) {
        for (const l of paginated) {
          next.delete(l.id);
        }
      } else {
        for (const l of paginated) {
          next.add(l.id);
        }
      }
      return next;
    });
  }

  // ── Helpers ───────────────────────────────────────────────────
  protected isScoped(name: string): boolean { return name.includes('::'); }
  protected getScope(name: string): string { return name.split('::')[0].trim(); }
  protected getValue(name: string): string { return name.split('::').slice(1).join('::').trim(); }

  protected getScopeColor(name: string, isDark: boolean, fallbackColor: string): string {
    if (!this.isScoped(name)) return fallbackColor;
    const scope = this.getScope(name).toLowerCase();
    const allLabels = this.labelStore.labels();
    const match = allLabels.find(l => l.name.includes('::') && l.name.split('::')[0].trim().toLowerCase() === scope);
    return match ? (isDark ? match.colorDark : match.colorLight) : fallbackColor;
  }

  protected getPresetGradient(light: string, dark: string): string {
    return `linear-gradient(135deg, ${light} 50%, ${dark} 50%)`;
  }

  protected getTextColor(bgColor: string): string {
    if (!bgColor) return '#ffffff';
    const color = bgColor.replace('#', '');
    if (color.length !== 6) return '#ffffff';
    const r = parseInt(color.substring(0, 2), 16);
    const g = parseInt(color.substring(2, 4), 16);
    const b = parseInt(color.substring(4, 6), 16);
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 128 ? '#1f2937' : '#ffffff';
  }

  private readonly lightToDarkMap: Record<string, string> = {
    '#6B7280': '#9CA3AF', '#EF4444': '#F87171', '#F97316': '#FB923C',
    '#F59E0B': '#FBBF24', '#10B981': '#34D399', '#0D9488': '#2DD4BF',
    '#3B82F6': '#60A5FA', '#6366F1': '#818CF8', '#8B5CF6': '#A78BFA',
    '#EC4899': '#F472B6',
  };

  protected getDarkColor(color: string): string {
    if (!color) return '#6B7280';
    const upper = color.toUpperCase();
    if (this.lightToDarkMap[upper]) return this.lightToDarkMap[upper];
    try {
      const hex = color.replace('#', '');
      if (hex.length !== 6) return color;
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      let rN = r / 255, gN = g / 255, bN = b / 255;
      const max = Math.max(rN, gN, bN), min = Math.min(rN, gN, bN);
      let h = 0, s = 0, l = (max + min) / 2;
      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case rN: h = (gN - bN) / d + (gN < bN ? 6 : 0); break;
          case gN: h = (bN - rN) / d + 2; break;
          case bN: h = (rN - gN) / d + 4; break;
        }
        h /= 6;
      }
      if (l < 0.65) l = 0.65;
      if (s > 0.8) s = 0.7;
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1; if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };
      const q2 = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p2 = 2 * l - q2;
      const toHex = (x: number) => { const str = Math.round(x * 255).toString(16); return str.length === 1 ? '0' + str : str; };
      return `#${toHex(hue2rgb(p2, q2, h + 1 / 3))}${toHex(hue2rgb(p2, q2, h))}${toHex(hue2rgb(p2, q2, h - 1 / 3))}`;
    } catch { return color; }
  }

  // ── Lifecycle ─────────────────────────────────────────────────
  ngOnInit(): void {
    this.newColorLight.set('#EF4444');
    this.newColorDark.set('#F87171');
    if (this.projectId) this.labelStore.loadLabels(this.projectId);
  }

  // ── CRUD ──────────────────────────────────────────────────────
  protected async createLabel(): Promise<void> {
    let nameToCreate = '';
    const trans = this.t();
    if (this.isScopedLabel()) {
      const prefix = this.scopePrefix().trim();
      const val = this.scopeValue().trim();
      if (!prefix || !val) {
        this.messageService.add({ severity: 'warn', summary: trans.deleteErrorSummary, detail: trans.scopedEmptyWarn });
        return;
      }
      nameToCreate = `${prefix}::${val}`;
    } else {
      nameToCreate = this.newName().trim();
      if (!nameToCreate) return;
    }

    const result = await this.labelStore.createLabel(this.projectId, {
      name: nameToCreate,
      colorLight: this.newColorLight(),
      colorDark: this.newColorDark(),
      icon: this.commonLabelsIcon() || null,
      isExclusive: this.isScopedLabel() ? this.isExclusive() : true,
      description: this.newDescription().trim() || null,
    });
    if (result) {
      this.newName.set('');
      this.scopePrefix.set('');
      this.scopeValue.set('');
      this.newDescription.set('');
      this.newColorLight.set('#EF4444');
      this.newColorDark.set('#F87171');
      this.isExclusive.set(true);
      this.showCustomAddColors.set(false);
      this.messageService.add({ severity: 'success', summary: trans.applyTemplateSuccessSummary, detail: trans.createSuccessDetail });
    } else {
      this.messageService.add({ severity: 'error', summary: trans.deleteErrorSummary, detail: trans.createErrorDetail });
    }
  }

  protected startEdit(label: Label): void {
    this.editingId.set(label.id);
    this.editName = label.name;
    this.editColorLight.set(label.colorLight);
    this.editColorDark.set(label.colorDark);
    this.showCustomEditColors.set(false);
    this.editIsExclusive = label.isExclusive !== false;
    this.editDescription = label.description ?? '';
  }

  protected async saveEdit(label: Label): Promise<void> {
    const nameTrimmed = this.editName.trim();
    const isEditScoped = nameTrimmed.includes('::');
    const trans = this.t();
    const success = await this.labelStore.updateLabel(this.projectId, label.id, {
      name: nameTrimmed || label.name,
      colorLight: this.editColorLight(),
      colorDark: this.editColorDark(),
      icon: this.commonLabelsIcon() || null,
      isExclusive: isEditScoped ? this.editIsExclusive : true,
      description: this.editDescription.trim() || null,
    });
    if (success) {
      this.editingId.set(null);
      this.showCustomEditColors.set(false);
      this.messageService.add({ severity: 'success', summary: trans.applyTemplateSuccessSummary, detail: trans.updateSuccessDetail });
    } else {
      this.messageService.add({ severity: 'error', summary: trans.deleteErrorSummary, detail: trans.updateErrorDetail });
    }
  }

  protected cancelEdit(): void { this.editingId.set(null); }

  protected async updateCommonIcon(newIcon: string): Promise<void> {
    this.selectedCommonIcon.set(newIcon);

    const trans = this.t();
    const labelsToUpdate = this.labelStore.labels().filter(l => l.scope === 'project' || !l.scope);
    if (labelsToUpdate.length > 0) {
      for (const label of labelsToUpdate) {
        if (label.icon === newIcon) continue;
        await this.labelStore.updateLabel(this.projectId, label.id, {
          name: label.name,
          colorLight: label.colorLight,
          colorDark: label.colorDark,
          isExclusive: label.isExclusive,
          description: label.description,
          icon: newIcon || null,
        });
      }
    }

    this.messageService.add({
      severity: 'success',
      summary: trans.applyTemplateSuccessSummary,
      detail: trans.commonIconSuccessDetail,
    });
  }

  protected cloneLabel(label: Label): void {
    const hasScope = label.name.includes('::');
    this.isScopedLabel.set(hasScope);

    if (hasScope) {
      const parts = label.name.split('::');
      const prefix = parts[0].trim();
      const val = parts.slice(1).join('::').trim();
      this.scopePrefix.set(prefix);
      this.scopeValue.set(`${val} (Copy)`);
      this.newName.set('');
    } else {
      this.newName.set(`${label.name} (Copy)`);
      this.scopePrefix.set('');
      this.scopeValue.set('');
    }

    this.newColorLight.set(label.colorLight);
    this.newColorDark.set(label.colorDark);
    
    // Check if the colors match any presets
    const isPreset = this.presetPairs.some(
      p => p.light.toUpperCase() === label.colorLight.toUpperCase() && 
           p.dark.toUpperCase() === label.colorDark.toUpperCase()
    );
    this.showCustomAddColors.set(!isPreset);

    this.isExclusive.set(hasScope ? label.isExclusive !== false : true);
    this.newDescription.set(label.description ?? '');

    const trans = this.t();
    // Show a success message
    this.messageService.add({
      severity: 'info',
      summary: trans.cloneLabelName || 'Sao chép nhãn',
      detail: trans.cloneDetail(label.name),
    });

    // Smooth scroll to the top of the tab
    document.getElementById('create-label-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  protected confirmDelete(label: Label): void {
    const trans = this.t();
    this.confirmService.confirm({
      message: trans.confirmDeleteMsg(label.name),
      header: trans.confirmDeleteHeader,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: trans.deleteBtn,
      rejectLabel: trans.cancelBtn,
      acceptButtonStyleClass: 'p-button-danger',
      accept: async () => {
        const success = await this.labelStore.deleteLabel(this.projectId, label.id);
        if (success) {
          this.messageService.add({ severity: 'success', summary: trans.applyTemplateSuccessSummary, detail: trans.deleteSuccessDetail });
        } else {
          this.messageService.add({ severity: 'error', summary: trans.deleteErrorSummary, detail: trans.deleteErrorDetail });
        }
      },
    });
  }

  protected confirmBulkDeleteProj(): void {
    const ids = Array.from(this.projSelected());
    if (!ids.length) return;
    const trans = this.t();
    this.confirmService.confirm({
      message: trans.bulkConfirmMsg(ids.length),
      header: trans.bulkConfirmHeader,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: trans.bulkConfirmBtn(ids.length),
      rejectLabel: trans.cancelBtn,
      acceptButtonStyleClass: 'p-button-danger',
      accept: async () => {
        let ok = 0;
        for (const id of ids) {
          const success = await this.labelStore.deleteLabel(this.projectId, id);
          if (success) ok++;
        }
        this.projSelected.set(new Set());
        this.messageService.add({ severity: 'success', summary: trans.applyTemplateSuccessSummary, detail: trans.bulkDeleteSuccessDetail(ok, ids.length) });
      },
    });
  }

  // ── Create state ──────────────────────────────────────────────
  protected isScopedLabel = signal(false);
  protected scopePrefix = signal('');
  protected scopeValue = signal('');

  protected newName = signal('');
  protected newColorLight = signal('#EF4444');
  protected newColorDark = signal('#F87171');
  protected showCustomAddColors = signal(false);
  protected isExclusive = signal(true);
  protected newDescription = signal('');

  protected selectedCommonIcon = signal<string | null>(null);

  readonly commonLabelsIcon = computed(() => {
    if (this.selectedCommonIcon()) {
      return this.selectedCommonIcon()!;
    }
    const labels = this.labelStore.labels().filter(l => l.scope === 'project' || !l.scope);
    const found = labels.find(l => l.icon);
    return found?.icon ?? 'pi pi-tag';
  });

  // ── Live Preview badge computed ────────────────────────────────
  readonly previewLabel = computed(() => {
    const isScoped = this.isScopedLabel();
    const prefix = this.scopePrefix().trim();
    const val = this.scopeValue().trim();
    const normalName = this.newName().trim();
    const trans = this.t();
    const name = isScoped 
      ? (prefix || val ? `${prefix || trans.previewGroupName}::${val || trans.previewValueName}` : `${trans.previewGroupName}::${trans.previewValueName}`)
      : (normalName || trans.previewLabelName);
    
    return {
      name,
      colorLight: this.newColorLight(),
      colorDark: this.newColorDark(),
      icon: this.commonLabelsIcon() || null
    };
  });

  // ── Filter / search ───────────────────────────────────────────
  protected projSearch = signal('');
  protected projFilter = signal<'all'|'regular'|'scoped'|'single'|'multi'>('all');

  protected setProjSearch(val: string): void { this.projSearch.set(val); this.projPage.set(0); this.projSelected.set(new Set()); }
  protected setProjFilter(val: 'all'|'regular'|'scoped'|'single'|'multi'): void { this.projFilter.set(val); this.projPage.set(0); this.projSelected.set(new Set()); }

  // ── Computed labels ───────────────────────────────────────────
  readonly filteredProjectLabels = computed(() => {
    const q = this.projSearch().toLowerCase();
    const f = this.projFilter();
    return this.labelStore.labels()
      .filter(l => l.scope === 'project' || !l.scope)
      .filter(l => {
        if (q && !l.name.toLowerCase().includes(q) && !(l.description ?? '').toLowerCase().includes(q)) return false;
        const scoped = l.name.includes('::');
        if (f === 'regular') return !scoped;
        if (f === 'scoped')  return scoped;
        if (f === 'single')  return scoped && l.isExclusive !== false;
        if (f === 'multi')   return scoped && l.isExclusive === false;
        return true;
      });
  });

  // ── Pagination ────────────────────────────────────────────────
  readonly PAGE_SIZE = 10;
  readonly projPage = signal(0);

  readonly paginatedProjectLabels = computed(() => {
    const all = this.filteredProjectLabels();
    const start = this.projPage() * this.PAGE_SIZE;
    return all.slice(start, start + this.PAGE_SIZE);
  });

  readonly projTotalPages = computed(() => Math.max(1, Math.ceil(this.filteredProjectLabels().length / this.PAGE_SIZE)));
  protected projEndIdx(): number { return Math.min((this.projPage() + 1) * this.PAGE_SIZE, this.filteredProjectLabels().length); }
  protected pageRange(total: number): number[] { return Array.from({ length: total }, (_, i) => i); }

  // ── Multi-select / Bulk Select ────────────────────────────────
  protected projSelected = signal<Set<string>>(new Set());
  protected isProjSelected(id: string): boolean { return this.projSelected().has(id); }

}
