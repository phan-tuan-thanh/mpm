import { Component, OnInit, inject, signal, computed, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ColorPickerModule } from 'primeng/colorpicker';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TabsModule } from 'primeng/tabs';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { CheckboxModule } from 'primeng/checkbox';

import { LabelStore } from '../../state/label.store';
import { LabelService } from '../../services/label.service';
import { AuthStore } from '../../../auth/state/auth.store';
import { LayoutService } from '../../../layout/services/layout.service';
import type { Label } from '@mpm/shared-types';

@Component({
  standalone: true,
  selector: 'app-label-manager',
  imports: [
    CommonModule, FormsModule,
    DialogModule, ButtonModule, InputTextModule, ColorPickerModule,
    ConfirmDialogModule, TabsModule, ToastModule, TooltipModule, CheckboxModule,
  ],
  providers: [ConfirmationService, MessageService],
  styles: [`
    .label-row {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 10px;
      border-radius: 8px;
      transition: background 0.15s;
    }
    .label-row:hover { background: var(--surface-hover, #f8fafc); }

    .label-swatch {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      flex-shrink: 0;
      border: 1.5px solid rgba(0,0,0,0.08);
      box-shadow: 0 1px 3px rgba(0,0,0,0.12);
    }

    .label-name {
      flex: 1;
      font-size: 13px;
      font-weight: 500;
      color: var(--text-color);
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .label-count {
      font-size: 11px;
      color: var(--text-color-secondary);
      background: var(--surface-100, #f3f4f6);
      border-radius: 20px;
      padding: 1px 8px;
      flex-shrink: 0;
      font-weight: 500;
    }

    .inline-edit-group {
      display: flex;
      align-items: center;
      gap: 6px;
      flex: 1;
    }

    .create-form {
      display: flex;
      align-items: center;
      gap: 8px;
      background: var(--surface-50, #f9fafb);
      border: 1px solid var(--surface-200, #e5e7eb);
      border-radius: 10px;
      padding: 8px 12px;
    }

    .color-preview-swatch {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      flex-shrink: 0;
      border: 2px solid rgba(0,0,0,0.1);
      cursor: pointer;
      transition: transform 0.15s, box-shadow 0.15s;
    }
    .color-preview-swatch:hover {
      transform: scale(1.15);
      box-shadow: 0 2px 6px rgba(0,0,0,0.18);
    }

    .section-label {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--text-color-secondary);
      margin-bottom: 8px;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 32px 0;
      gap: 8px;
      color: var(--text-color-secondary);
    }

    .list-scroll {
      max-height: 260px;
      overflow-y: auto;
      padding-right: 2px;
    }
    .list-scroll::-webkit-scrollbar { width: 4px; }
    .list-scroll::-webkit-scrollbar-track { background: transparent; }
    .list-scroll::-webkit-scrollbar-thumb { background: var(--surface-300, #d1d5db); border-radius: 4px; }

    .icon-btn {
      width: 26px;
      height: 26px;
      border-radius: 6px;
      border: none;
      background: transparent;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: background 0.15s;
      flex-shrink: 0;
      color: var(--text-color-secondary);
      font-size: 12px;
    }
    .icon-btn:hover { background: var(--surface-200, #e5e7eb); }
    .icon-btn.danger:hover { background: #fee2e2; color: #ef4444; }
    .icon-btn.success { color: #10b981; }
    .icon-btn.success:hover { background: #d1fae5; }
  `],
  template: `
    <p-dialog
      [(visible)]="visible"
      header="Quản lý Labels"
      [modal]="true"
      [style]="{ width: '550px' }"
      (onHide)="visible = false"
    >
      <p-tabs [value]="'project'" class="label-manager-tabs">
        <p-tablist>
          <p-tab value="workspace">
            <i class="pi pi-globe mr-1.5"></i> Workspace
          </p-tab>
          <p-tab value="project">
            <i class="pi pi-folder mr-1.5"></i> Project
          </p-tab>
        </p-tablist>

        <p-tabpanels>

          <!-- ════ Workspace Labels Tab ════ -->
          <p-tabpanel value="workspace">
            <div class="pt-3">
              <!-- List -->
              <div class="list-scroll mb-4">
                @if (workspaceLabels().length === 0) {
                  <div class="empty-state">
                    <i class="pi pi-globe" style="font-size: 28px; opacity: 0.25"></i>
                    <span style="font-size: 13px">Chưa có workspace label nào</span>
                    @if (isAdmin()) {
                      <span style="font-size: 12px; opacity: 0.6">Tạo label bên dưới để bắt đầu</span>
                    }
                  </div>
                }
                @for (label of workspaceLabels(); track label.id) {
                  <div class="label-row">
                    <i class="pi pi-globe" style="font-size: 11px; color: #6366f1; flex-shrink: 0"></i>

                    @if (isAdmin() && wsEditingId() === label.id) {
                      <!-- Inline edit -->
                      <div class="inline-edit-group flex-wrap gap-y-2">
                        <div class="color-preview-swatch" [style.background]="'#' + wsEditColor" (click)="wsColorPicker.toggle($event)"></div>
                        <p-colorpicker #wsColorPicker [(ngModel)]="wsEditColor" [inline]="false" appendTo="body" />
                        <input pInputText class="flex-1" style="height: 30px; font-size: 13px; padding: 0 8px"
                          [(ngModel)]="wsEditName"
                          (keydown.enter)="saveWsEdit(label)"
                          (keydown.escape)="cancelWsEdit()"
                          placeholder="Tên label..." />
                        @if (isScoped(wsEditName)) {
                          <div class="flex items-center gap-1.5 ml-2 select-none">
                            <p-checkbox [(ngModel)]="wsEditIsExclusive" [binary]="true" id="wsEditExclusiveCheck" />
                            <label for="wsEditExclusiveCheck" class="text-xs text-gray-500 font-medium cursor-pointer">Exclusive</label>
                          </div>
                        }
                      </div>
                      <button class="icon-btn success" pTooltip="Lưu" (click)="saveWsEdit(label)">
                        <i class="pi pi-check"></i>
                      </button>
                      <button class="icon-btn" pTooltip="Hủy" (click)="cancelWsEdit()">
                        <i class="pi pi-times"></i>
                      </button>
                    } @else {
                      <!-- Display mode -->
                      <div class="flex-1 flex items-center min-w-0 mr-2">
                        @if (isScoped(label.name)) {
                          <span class="inline-flex items-center text-xs rounded-full overflow-hidden border border-surface-200 dark:border-surface-700 font-medium"
                                [pTooltip]="label.isExclusive !== false ? 'Exclusive' : 'Multi-select'">
                            <span class="px-2 py-0.5" 
                                  [style.background]="layoutService.getAdaptiveColor(getScopeColor(label.name, label.color))" 
                                  [style.color]="layoutService.getTextColor(layoutService.getAdaptiveColor(getScopeColor(label.name, label.color)))">
                              {{ getScope(label.name) }}
                            </span>
                            <span class="px-2 py-0.5" 
                                  [style.background]="layoutService.getAdaptiveColor(label.color) + '18'" 
                                  [style.color]="layoutService.getAdaptiveColor(label.color)">
                              {{ getValue(label.name) }}
                            </span>
                            @if (label.isExclusive === false) {
                              <i class="pi pi-clone text-[9px] px-1 text-gray-400" pTooltip="Multi-select allowed"></i>
                            }
                          </span>
                        } @else {
                          <span class="text-xs px-2 py-0.5 rounded-full font-medium"
                                [style.background]="layoutService.getAdaptiveColor(label.color) + '22'" 
                                [style.color]="layoutService.getAdaptiveColor(label.color)">
                            {{ label.name }}
                          </span>
                        }
                      </div>
                      <span class="label-count">{{ label.taskCount }} tasks</span>
                      @if (isAdmin()) {
                        <button class="icon-btn" pTooltip="Sửa" (click)="startWsEdit(label)">
                          <i class="pi pi-pencil"></i>
                        </button>
                        <button class="icon-btn danger" pTooltip="Xóa" (click)="confirmDeleteWsLabel(label)">
                          <i class="pi pi-trash"></i>
                        </button>
                      }
                    }
                  </div>
                }
              </div>

              <!-- Create (admin only) -->
              @if (isAdmin()) {
                <div class="mt-4">
                  <div class="section-label">Thêm workspace label</div>
                  
                  <div class="flex flex-col gap-2 mb-2.5">
                    @if (isScoped(wsNewName)) {
                      <!-- Checkbox for Exclusive -->
                      <div class="flex items-center gap-2 select-none mb-1">
                        <p-checkbox [(ngModel)]="wsIsExclusive" [binary]="true" id="wsNewExclusiveCheck" />
                        <label for="wsNewExclusiveCheck" class="text-xs text-gray-600 font-medium cursor-pointer">
                          Chỉ cho phép chọn 1 label trong scope này trên mỗi task
                        </label>
                      </div>

                      <!-- Theme Selector -->
                      <div class="flex items-center gap-1.5 select-none mb-1">
                        <span class="text-[11px] text-gray-400 font-bold mr-1 uppercase">Bộ Preset:</span>
                        @for (theme of themes; track theme.id) {
                          <button 
                            class="text-[10px] px-2 py-0.5 rounded border transition-colors cursor-pointer font-medium"
                            [class.bg-indigo-50]="selectedThemeId() === theme.id"
                            [class.border-indigo-600]="selectedThemeId() === theme.id"
                            [class.text-indigo-700]="selectedThemeId() === theme.id"
                            [class.bg-white]="selectedThemeId() !== theme.id"
                            [class.border-gray-200]="selectedThemeId() !== theme.id"
                            [class.text-gray-600]="selectedThemeId() !== theme.id"
                            [class.dark:bg-surface-800]="selectedThemeId() !== theme.id"
                            (click)="selectedThemeId.set(theme.id)"
                          >
                            {{ theme.name }}
                          </button>
                        }
                      </div>

                      <!-- Color Pair Presets -->
                      <div class="flex items-center gap-2 flex-wrap">
                        @for (pair of currentPresets(); track pair.label) {
                          <button
                            class="w-12 h-6 rounded-full border transition-all duration-150 flex overflow-hidden cursor-pointer hover:scale-105"
                            [style.border-color]="isPairSelected(pair, true) ? 'var(--primary-color, #4f46e5)' : 'rgba(0,0,0,0.08)'"
                            [style.box-shadow]="isPairSelected(pair, true) ? '0 0 0 2px rgba(79, 70, 229, 0.2)' : 'none'"
                            (click)="selectColorPair(pair, true)"
                            [pTooltip]="pair.label"
                          >
                            <span class="w-1/2 h-full" [style.background-color]="'#' + pair.scope"></span>
                            <span class="w-1/2 h-full" [style.background-color]="'#' + pair.value"></span>
                          </button>
                        }
                        <div class="w-px h-4 bg-gray-200 mx-1"></div>
                        <!-- Custom picker trigger -->
                        <div class="w-6 h-6 rounded-full border border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:bg-gray-50 relative"
                          pTooltip="Màu tùy chỉnh" (click)="wsNewColorPicker.toggle($event)">
                          <i class="pi pi-palette text-[11px] text-gray-500"></i>
                          <p-colorpicker #wsNewColorPicker [(ngModel)]="wsNewColor" [inline]="false" appendTo="body" />
                        </div>
                      </div>
                    } @else {
                      <!-- Color Presets -->
                      <div class="flex items-center gap-1.5 flex-wrap">
                        @for (color of colorPresets; track color) {
                          <button
                            class="w-6 h-6 rounded-full border transition-all duration-150 flex items-center justify-center cursor-pointer hover:scale-110"
                            [style.background-color]="'#' + color"
                            [style.border-color]="color === wsNewColor ? 'var(--primary-color, #4f46e5)' : 'rgba(0,0,0,0.08)'"
                            [style.box-shadow]="color === wsNewColor ? '0 0 0 2px rgba(79, 70, 229, 0.2)' : 'none'"
                            (click)="wsNewColor = color"
                            pTooltip="Chọn màu"
                          >
                            @if (color === wsNewColor) {
                              <i class="pi pi-check text-[10px] text-white"></i>
                            }
                          </button>
                        }
                        <div class="w-px h-4 bg-gray-200 mx-1"></div>
                        <!-- Custom picker trigger -->
                        <div class="w-6 h-6 rounded-full border border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:bg-gray-50 relative"
                          pTooltip="Màu tùy chỉnh" (click)="wsNewColorPicker.toggle($event)">
                          <i class="pi pi-palette text-[11px] text-gray-500"></i>
                          <p-colorpicker #wsNewColorPicker [(ngModel)]="wsNewColor" [inline]="false" appendTo="body" />
                        </div>
                      </div>
                    }
                  </div>

                  <div class="create-form">
                    <div class="color-preview-swatch" [style.background]="'#' + wsNewColor" pTooltip="Màu đang chọn"></div>
                    <input pInputText class="flex-1" style="height: 32px; font-size: 13px; padding: 0 8px; background: transparent; border: none; box-shadow: none"
                      placeholder="Tên label..."
                      [(ngModel)]="wsNewName"
                      (keydown.enter)="wsNewName.trim() && createWsLabel()"
                    />
                    <button pButton label="Thêm" size="small"
                      (click)="createWsLabel()"
                      [disabled]="!wsNewName.trim()"
                      style="height: 30px; font-size: 12px; padding: 0 14px"
                    ></button>
                  </div>
                </div>
              }
            </div>
          </p-tabpanel>

          <!-- ════ Project Labels Tab ════ -->
          <p-tabpanel value="project">
            <div class="pt-3">
              <!-- List -->
              <div class="list-scroll mb-4">
                @if (projectLabels().length === 0) {
                  <div class="empty-state">
                    <i class="pi pi-folder" style="font-size: 28px; opacity: 0.25"></i>
                    <span style="font-size: 13px">Chưa có project label nào</span>
                    <span style="font-size: 12px; opacity: 0.6">Tạo label bên dưới để bắt đầu</span>
                  </div>
                }
                @for (label of projectLabels(); track label.id) {
                  <div class="label-row">
                    @if (editingId() === label.id) {
                      <!-- Inline edit -->
                      <div class="inline-edit-group flex-wrap gap-y-2">
                        <div class="color-preview-swatch" [style.background]="'#' + editColor" (click)="editColorPicker.toggle($event)"></div>
                        <p-colorpicker #editColorPicker [(ngModel)]="editColor" [inline]="false" appendTo="body" />
                        <input pInputText class="flex-1" style="height: 30px; font-size: 13px; padding: 0 8px"
                          [(ngModel)]="editName"
                          (keydown.enter)="saveEdit(label)"
                          (keydown.escape)="cancelEdit()"
                          placeholder="Tên label..." />
                        @if (isScoped(editName)) {
                          <div class="flex items-center gap-1.5 ml-2 select-none">
                            <p-checkbox [(ngModel)]="editIsExclusive" [binary]="true" id="editExclusiveCheck" />
                            <label for="editExclusiveCheck" class="text-xs text-gray-500 font-medium cursor-pointer">Exclusive</label>
                          </div>
                        }
                      </div>
                      <button class="icon-btn success" pTooltip="Lưu" (click)="saveEdit(label)">
                        <i class="pi pi-check"></i>
                      </button>
                      <button class="icon-btn" pTooltip="Hủy" (click)="cancelEdit()">
                        <i class="pi pi-times"></i>
                      </button>
                    } @else {
                      <!-- Display mode -->
                      <div class="flex-1 flex items-center min-w-0 mr-2">
                        @if (isScoped(label.name)) {
                          <span class="inline-flex items-center text-xs rounded-full overflow-hidden border border-surface-200 dark:border-surface-700 font-medium"
                                [pTooltip]="label.isExclusive !== false ? 'Exclusive' : 'Multi-select'">
                            <span class="px-2 py-0.5" 
                                  [style.background]="layoutService.getAdaptiveColor(getScopeColor(label.name, label.color))" 
                                  [style.color]="layoutService.getTextColor(layoutService.getAdaptiveColor(getScopeColor(label.name, label.color)))">
                              {{ getScope(label.name) }}
                            </span>
                            <span class="px-2 py-0.5" 
                                  [style.background]="layoutService.getAdaptiveColor(label.color) + '18'" 
                                  [style.color]="layoutService.getAdaptiveColor(label.color)">
                              {{ getValue(label.name) }}
                            </span>
                            @if (label.isExclusive === false) {
                              <i class="pi pi-clone text-[9px] px-1 text-gray-400" pTooltip="Multi-select allowed"></i>
                            }
                          </span>
                        } @else {
                          <span class="text-xs px-2 py-0.5 rounded-full font-medium"
                                [style.background]="layoutService.getAdaptiveColor(label.color) + '22'" 
                                [style.color]="layoutService.getAdaptiveColor(label.color)">
                            {{ label.name }}
                          </span>
                        }
                      </div>
                      <span class="label-count">{{ label.taskCount }} tasks</span>
                      <button class="icon-btn" pTooltip="Sửa" (click)="startEdit(label)">
                        <i class="pi pi-pencil"></i>
                      </button>
                      <button class="icon-btn danger" pTooltip="Xóa" (click)="confirmDelete(label)">
                        <i class="pi pi-trash"></i>
                      </button>
                    }
                  </div>
                }
              </div>

              <!-- Create -->
              <div class="mt-4">
                <div class="section-label">Tạo label mới</div>
                
                <div class="flex flex-col gap-2 mb-2.5">
                  @if (isScoped(newName)) {
                    <!-- Checkbox for Exclusive -->
                    <div class="flex items-center gap-2 select-none mb-1">
                      <p-checkbox [(ngModel)]="isExclusive" [binary]="true" id="newExclusiveCheck" />
                      <label for="newExclusiveCheck" class="text-xs text-gray-600 font-medium cursor-pointer">
                        Chỉ cho phép chọn 1 label trong scope này trên mỗi task
                      </label>
                    </div>

                    <!-- Theme Selector -->
                    <div class="flex items-center gap-1.5 select-none mb-1">
                      <span class="text-[11px] text-gray-400 font-bold mr-1 uppercase">Bộ Preset:</span>
                      @for (theme of themes; track theme.id) {
                        <button 
                          class="text-[10px] px-2 py-0.5 rounded border transition-colors cursor-pointer font-medium"
                          [class.bg-indigo-50]="selectedThemeId() === theme.id"
                          [class.border-indigo-600]="selectedThemeId() === theme.id"
                          [class.text-indigo-700]="selectedThemeId() === theme.id"
                          [class.bg-white]="selectedThemeId() !== theme.id"
                          [class.border-gray-200]="selectedThemeId() !== theme.id"
                          [class.text-gray-600]="selectedThemeId() !== theme.id"
                          [class.dark:bg-surface-800]="selectedThemeId() !== theme.id"
                          (click)="selectedThemeId.set(theme.id)"
                        >
                          {{ theme.name }}
                        </button>
                      }
                    </div>

                    <!-- Color Pair Presets -->
                    <div class="flex items-center gap-2 flex-wrap">
                      @for (pair of currentPresets(); track pair.label) {
                        <button
                          class="w-12 h-6 rounded-full border transition-all duration-150 flex overflow-hidden cursor-pointer hover:scale-105"
                          [style.border-color]="isPairSelected(pair, false) ? 'var(--primary-color, #4f46e5)' : 'rgba(0,0,0,0.08)'"
                          [style.box-shadow]="isPairSelected(pair, false) ? '0 0 0 2px rgba(79, 70, 229, 0.2)' : 'none'"
                          (click)="selectColorPair(pair, false)"
                          [pTooltip]="pair.label"
                        >
                          <span class="w-1/2 h-full" [style.background-color]="'#' + pair.scope"></span>
                          <span class="w-1/2 h-full" [style.background-color]="'#' + pair.value"></span>
                        </button>
                      }
                      <div class="w-px h-4 bg-gray-200 mx-1"></div>
                      <!-- Custom picker trigger -->
                      <div class="w-6 h-6 rounded-full border border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:bg-gray-50 relative"
                        pTooltip="Màu tùy chỉnh" (click)="newColorPicker.toggle($event)">
                        <i class="pi pi-palette text-[11px] text-gray-500"></i>
                        <p-colorpicker #newColorPicker [(ngModel)]="newColor" [inline]="false" appendTo="body" />
                      </div>
                    </div>
                  } @else {
                    <!-- Color Presets -->
                    <div class="flex items-center gap-1.5 flex-wrap">
                      @for (color of colorPresets; track color) {
                        <button
                          class="w-6 h-6 rounded-full border transition-all duration-150 flex items-center justify-center cursor-pointer hover:scale-110"
                          [style.background-color]="'#' + color"
                          [style.border-color]="color === newColor ? 'var(--primary-color, #4f46e5)' : 'rgba(0,0,0,0.08)'"
                          [style.box-shadow]="color === newColor ? '0 0 0 2px rgba(79, 70, 229, 0.2)' : 'none'"
                          (click)="newColor = color"
                          pTooltip="Chọn màu"
                        >
                          @if (color === newColor) {
                            <i class="pi pi-check text-[10px] text-white"></i>
                          }
                        </button>
                      }
                      <div class="w-px h-4 bg-gray-200 mx-1"></div>
                      <!-- Custom picker trigger -->
                      <div class="w-6 h-6 rounded-full border border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:bg-gray-50 relative"
                        pTooltip="Màu tùy chỉnh" (click)="newColorPicker.toggle($event)">
                        <i class="pi pi-palette text-[11px] text-gray-500"></i>
                        <p-colorpicker #newColorPicker [(ngModel)]="newColor" [inline]="false" appendTo="body" />
                      </div>
                    </div>
                  }
                </div>

                <div class="create-form">
                  <div class="color-preview-swatch" [style.background]="'#' + newColor" pTooltip="Màu đang chọn"></div>
                  <input pInputText class="flex-1" style="height: 32px; font-size: 13px; padding: 0 8px; background: transparent; border: none; box-shadow: none"
                    placeholder="Tên label..."
                    [(ngModel)]="newName"
                    (keydown.enter)="newName.trim() && createLabel()"
                  />
                  <button pButton label="Thêm" size="small"
                    (click)="createLabel()"
                    [disabled]="!newName.trim()"
                    style="height: 30px; font-size: 12px; padding: 0 14px"
                  ></button>
                </div>
              </div>
            </div>
          </p-tabpanel>

        </p-tabpanels>
      </p-tabs>
    </p-dialog>

    <p-toast />
    <p-confirmDialog />
  `,
})
export class LabelManagerComponent implements OnInit {
  readonly labelStore = inject(LabelStore);
  private readonly labelService = inject(LabelService);
  private readonly authStore = inject(AuthStore);
  private readonly confirmService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);
  protected readonly layoutService = inject(LayoutService);

  @Input() projectId = '';
  @Input() workspaceId = '';
  visible = false;

  // Admin check
  protected readonly isAdmin = this.authStore.isAdmin;

  protected readonly colorPresets = [
    'EF4444', // Red
    'F97316', // Orange
    'F59E0B', // Yellow
    '10B981', // Green
    '0D9488', // Teal
    '3B82F6', // Blue
    '6366F1', // Indigo
    '8B5CF6', // Purple
    'EC4899', // Pink
    '6B7280', // Gray
  ];

  protected readonly themes = [
    {
      id: 'classic',
      name: 'Classic',
      presets: [
        { scope: 'EF4444', value: 'F97316', label: 'Red - Orange' },
        { scope: '10B981', value: '0D9488', label: 'Green - Teal' },
        { scope: '3B82F6', value: '6366F1', label: 'Blue - Indigo' },
        { scope: '8B5CF6', value: 'EC4899', label: 'Purple - Pink' },
        { scope: '6B7280', value: '475569', label: 'Gray - Slate' },
      ]
    },
    {
      id: 'pastel',
      name: 'Pastel',
      presets: [
        { scope: 'FCA5A5', value: 'FFEDD5', label: 'Light Red - Orange' },
        { scope: 'A7F3D0', value: 'CCFBF1', label: 'Light Green - Teal' },
        { scope: 'BFDBFE', value: 'E0E7FF', label: 'Light Blue - Indigo' },
        { scope: 'C084FC', value: 'FCE7F3', label: 'Light Purple - Pink' },
        { scope: 'D1D5DB', value: 'F3F4F6', label: 'Light Gray - White' },
      ]
    },
    {
      id: 'neon',
      name: 'Vibrant / Neon',
      presets: [
        { scope: 'FF007F', value: 'FF5E00', label: 'Neon Pink - Orange' },
        { scope: '00FF66', value: '00E5FF', label: 'Neon Green - Cyan' },
        { scope: '0066FF', value: '7F00FF', label: 'Neon Blue - Purple' },
        { scope: 'FFD700', value: 'FF3300', label: 'Vibrant Yellow - Red' },
        { scope: 'E0B0FF', value: 'DA70D6', label: 'Vibrant Mauve - Orchid' },
      ]
    }
  ];

  protected selectedThemeId = signal('classic');

  protected readonly currentPresets = computed(() => {
    const theme = this.themes.find(t => t.id === this.selectedThemeId());
    return theme ? theme.presets : this.themes[0].presets;
  });

  // Workspace labels (loaded separately)
  protected readonly wsLabels = signal<Array<Label & { taskCount: number }>>([]);

  // Computed: filter labels by scope
  protected readonly workspaceLabels = computed(() => this.wsLabels());
  protected readonly projectLabels = computed(() =>
    this.labelStore.labels().filter(l => l.scope === 'project' || !l.scope)
  );

  // Project label editing state
  protected editingId = signal<string | null>(null);
  protected editName = '';
  protected editColor = '';
  protected editIsExclusive = true;
  protected newName = '';
  protected newColor = '';
  protected isExclusive = true;

  // Workspace label editing state
  protected wsEditingId = signal<string | null>(null);
  protected wsEditName = '';
  protected wsEditColor = '';
  protected wsEditIsExclusive = true;
  protected wsNewName = '';
  protected wsNewColor = '';
  protected wsIsExclusive = true;

  ngOnInit(): void {
    this.newColor = this.getRandomPresetColor();
    this.wsNewColor = this.getRandomPresetColor();
    if (this.projectId) this.labelStore.loadLabels(this.projectId);
  }

  open(): void {
    this.visible = true;
    this.newColor = this.getRandomPresetColor();
    this.wsNewColor = this.getRandomPresetColor();
    if (this.projectId) this.labelStore.loadLabels(this.projectId);
    if (this.workspaceId) this.loadWorkspaceLabels();
  }

  private loadWorkspaceLabels(): void {
    if (!this.workspaceId) return;
    this.labelService.getWorkspaceLabels(this.workspaceId).subscribe(
      (data) => this.wsLabels.set(data),
    );
  }

  protected isScoped(name: string): boolean {
    return name.includes('::');
  }

  protected getScope(name: string): string {
    return name.split('::')[0].trim();
  }

  protected getValue(name: string): string {
    return name.split('::').slice(1).join('::').trim();
  }

  protected getRandomPresetColor(): string {
    const idx = Math.floor(Math.random() * this.colorPresets.length);
    return this.colorPresets[idx];
  }

  protected isPairSelected(pair: { scope: string; value: string }, isWs: boolean): boolean {
    const currentColor = isWs ? this.wsNewColor : this.newColor;
    return currentColor.toUpperCase() === pair.scope.toUpperCase() || currentColor.toUpperCase() === pair.value.toUpperCase();
  }

  protected selectColorPair(pair: { scope: string; value: string }, isWs: boolean): void {
    const name = isWs ? this.wsNewName.trim() : this.newName.trim();
    if (!name.includes('::')) {
      if (isWs) this.wsNewColor = pair.scope;
      else this.newColor = pair.scope;
      return;
    }
    const scope = name.split('::')[0].trim().toLowerCase();
    const labels = isWs ? this.wsLabels() : this.labelStore.labels();
    const exists = labels.some(l => l.name.includes('::') && l.name.split('::')[0].trim().toLowerCase() === scope);
    if (exists) {
      if (isWs) this.wsNewColor = pair.value;
      else this.newColor = pair.value;
    } else {
      if (isWs) this.wsNewColor = pair.scope;
      else this.newColor = pair.scope;
    }
  }

  protected getScopeColor(name: string, fallbackColor: string): string {
    if (!this.isScoped(name)) return fallbackColor;
    const scope = this.getScope(name).toLowerCase();
    
    // Search in project labels
    const projMatch = this.labelStore.labels().find(l => l.name.includes('::') && l.name.split('::')[0].trim().toLowerCase() === scope);
    if (projMatch) return projMatch.color;

    // Search in workspace labels
    const wsMatch = this.wsLabels().find(l => l.name.includes('::') && l.name.split('::')[0].trim().toLowerCase() === scope);
    if (wsMatch) return wsMatch.color;

    return fallbackColor;
  }

  // --- Project Label Operations ---

  protected async createLabel(): Promise<void> {
    if (!this.newName.trim()) return;
    const result = await this.labelStore.createLabel(this.projectId, {
      name: this.newName.trim(),
      color: `#${this.newColor}`.replace('##', '#'),
      isExclusive: this.isExclusive,
    });
    if (result) {
      this.newName = '';
      this.newColor = this.getRandomPresetColor();
      this.isExclusive = true;
      this.messageService.add({ severity: 'success', summary: 'Thành công', detail: 'Đã tạo label mới' });
    } else {
      this.messageService.add({ severity: 'error', summary: 'Lỗi', detail: 'Không thể tạo label. Vui lòng thử lại.' });
    }
  }

  protected startEdit(label: Label & { taskCount: number }): void {
    this.editingId.set(label.id);
    this.editName = label.name;
    this.editColor = label.color.replace('#', '');
    this.editIsExclusive = label.isExclusive !== false;
  }

  protected async saveEdit(label: Label & { taskCount: number }): Promise<void> {
    const success = await this.labelStore.updateLabel(this.projectId, label.id, {
      name: this.editName.trim() || label.name,
      color: `#${this.editColor}`.replace('##', '#'),
      isExclusive: this.editIsExclusive,
    });
    if (success) {
      this.editingId.set(null);
      this.messageService.add({ severity: 'success', summary: 'Thành công', detail: 'Đã cập nhật label' });
    } else {
      this.messageService.add({ severity: 'error', summary: 'Lỗi', detail: 'Không thể cập nhật label. Vui lòng thử lại.' });
    }
  }

  protected cancelEdit(): void {
    this.editingId.set(null);
  }

  protected confirmDelete(label: Label & { taskCount: number }): void {
    this.confirmService.confirm({
      message: `Xóa label "${label.name}" sẽ bỏ label khỏi ${label.taskCount} tasks. Tiếp tục?`,
      header: 'Xác nhận xóa',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Xóa',
      rejectLabel: 'Hủy',
      acceptButtonStyleClass: 'p-button-danger',
      accept: async () => {
        const success = await this.labelStore.deleteLabel(this.projectId, label.id);
        if (success) {
          this.messageService.add({ severity: 'success', summary: 'Thành công', detail: 'Đã xóa label' });
        } else {
          this.messageService.add({ severity: 'error', summary: 'Lỗi', detail: 'Không thể xóa label. Vui lòng thử lại.' });
        }
      },
    });
  }

  // --- Workspace Label Operations (admin only) ---

  protected async createWsLabel(): Promise<void> {
    if (!this.wsNewName.trim() || !this.workspaceId) return;
    const label = await this.labelStore.createWorkspaceLabel(this.workspaceId, {
      name: this.wsNewName.trim(),
      color: `#${this.wsNewColor}`.replace('##', '#'),
      isExclusive: this.wsIsExclusive,
    });
    if (label) {
      this.wsLabels.update(prev => [...prev, { ...label, taskCount: 0 }]);
      this.wsNewName = '';
      this.wsNewColor = this.getRandomPresetColor();
      this.wsIsExclusive = true;
      this.messageService.add({ severity: 'success', summary: 'Thành công', detail: 'Đã tạo workspace label' });
    } else {
      this.messageService.add({ severity: 'error', summary: 'Lỗi', detail: 'Không thể tạo workspace label. Vui lòng thử lại.' });
    }
  }

  protected startWsEdit(label: Label & { taskCount: number }): void {
    this.wsEditingId.set(label.id);
    this.wsEditName = label.name;
    this.wsEditColor = label.color.replace('#', '');
    this.wsEditIsExclusive = label.isExclusive !== false;
  }

  protected async saveWsEdit(label: Label & { taskCount: number }): Promise<void> {
    if (!this.workspaceId) return;
    const newColor = `#${this.wsEditColor}`.replace('##', '#');
    const newName = this.wsEditName.trim() || label.name;
    const success = await this.labelStore.updateWorkspaceLabel(this.workspaceId, label.id, {
      name: newName,
      color: newColor,
      isExclusive: this.wsEditIsExclusive,
    });
    if (success) {
      this.wsLabels.update(prev =>
        prev.map(l => {
          if (l.id === label.id) {
            return { ...l, name: newName, color: newColor, isExclusive: this.wsEditIsExclusive };
          }
          // Propagate isExclusive update to same-scope labels locally
          if (newName.includes('::') && l.name.includes('::') && l.name.split('::')[0].trim().toLowerCase() === newName.split('::')[0].trim().toLowerCase()) {
            return { ...l, isExclusive: this.wsEditIsExclusive };
          }
          return l;
        })
      );
      this.wsEditingId.set(null);
      this.messageService.add({ severity: 'success', summary: 'Thành công', detail: 'Đã cập nhật workspace label' });
    } else {
      this.messageService.add({ severity: 'error', summary: 'Lỗi', detail: 'Không thể cập nhật workspace label. Vui lòng thử lại.' });
    }
  }

  protected cancelWsEdit(): void {
    this.wsEditingId.set(null);
  }

  protected confirmDeleteWsLabel(label: Label & { taskCount: number }): void {
    this.confirmService.confirm({
      message: `Label này đang dùng trong ${label.taskCount} tasks. Xóa sẽ bỏ label khỏi tất cả.`,
      header: 'Xác nhận xóa workspace label',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Xóa',
      rejectLabel: 'Hủy',
      acceptButtonStyleClass: 'p-button-danger',
      accept: async () => {
        const success = await this.labelStore.deleteWorkspaceLabel(this.workspaceId, label.id);
        if (success) {
          this.wsLabels.update(prev => prev.filter(l => l.id !== label.id));
          this.messageService.add({ severity: 'success', summary: 'Thành công', detail: 'Đã xóa workspace label' });
        } else {
          this.messageService.add({ severity: 'error', summary: 'Lỗi', detail: 'Không thể xóa workspace label. Vui lòng thử lại.' });
        }
      },
    });
  }
}
