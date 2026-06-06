import {
  Component, Input, Output, EventEmitter, ViewChild, ElementRef,
  OnChanges, SimpleChanges, inject, signal, computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LayoutService } from '../../../../layout/services/layout.service';

import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { DatePickerModule } from 'primeng/datepicker';
import { TooltipModule } from 'primeng/tooltip';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { PopoverModule } from 'primeng/popover';
import { InputNumberModule } from 'primeng/inputnumber';

import { ProjectStore } from '../../../../projects/state/project.store';
import { TaskStore } from '../../../state/task.store';
import { LabelStore } from '../../../state/label.store';
import type { TaskType, TaskPriority, CreateTaskDto } from '@mpm/shared-types';

// ─── Static option sets ──────────────────────────────────────────────────────

const PRIORITY_OPTIONS: { label: string; value: TaskPriority; icon: string; color: string }[] = [
  { label: 'Urgent', value: 'urgent', icon: 'pi pi-angle-double-up', color: '#EF4444' },
  { label: 'High',   value: 'high',   icon: 'pi pi-angle-up',        color: '#F97316' },
  { label: 'Medium', value: 'medium', icon: 'pi pi-minus',           color: '#EAB308' },
  { label: 'Low',    value: 'low',    icon: 'pi pi-angle-down',      color: '#3B82F6' },
  { label: 'None',   value: 'none',   icon: 'pi pi-circle',          color: '#9CA3AF' },
];

const TYPE_OPTIONS: { label: string; value: TaskType; icon: string; color: string }[] = [
  { label: 'Epic',    value: 'epic',    icon: 'pi pi-bolt',         color: '#8B5CF6' },
  { label: 'Story',   value: 'story',   icon: 'pi pi-book',         color: '#3B82F6' },
  { label: 'Task',    value: 'task',    icon: 'pi pi-check-circle', color: '#10B981' },
  { label: 'Subtask', value: 'subtask', icon: 'pi pi-minus-circle', color: '#6B7280' },
];

const VALID_CHILDREN: Partial<Record<TaskType, TaskType[]>> = {
  epic:  ['story', 'task'],
  story: ['task'],
  task:  ['subtask'],
};

@Component({
  standalone: true,
  selector: 'app-quick-create',
  imports: [
    CommonModule, FormsModule,
    DialogModule, ButtonModule, InputTextModule, TextareaModule,
    DatePickerModule, TooltipModule, ToggleSwitchModule, PopoverModule, InputNumberModule,
  ],
  styles: [`
    /* ── Dialog overrides ── */
    :host ::ng-deep .qc-dialog .p-dialog-content {
      padding: 0 !important;
      border-radius: 14px !important;
      overflow: hidden !important;
    }
    :host ::ng-deep .qc-dialog .p-dialog {
      border-radius: 14px !important;
      box-shadow: 0 20px 60px rgba(0,0,0,0.15) !important;
    }

    /* ── Pill buttons ── */
    .meta-pill {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 12px;
      border: 1px solid var(--surface-200, #e5e7eb);
      border-radius: 6px;
      padding: 4px 9px;
      cursor: pointer;
      user-select: none;
      background: transparent;
      color: var(--text-color-secondary, #6b7280);
      transition: background 0.12s, border-color 0.12s, color 0.12s;
      white-space: nowrap;
    }
    .meta-pill:hover {
      background: var(--surface-50, #f9fafb);
      border-color: var(--surface-300, #d1d5db);
      color: var(--text-color, #374151);
    }
    .meta-pill.active {
      background: var(--surface-50, #f9fafb);
      border-color: var(--surface-300, #d1d5db);
      color: var(--text-color, #374151);
    }

    /* ── Type pill (in header) ── */
    .type-pill {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 12px;
      font-weight: 600;
      border: 1px solid var(--surface-200, #e5e7eb);
      border-radius: 6px;
      padding: 3px 8px;
      cursor: pointer;
      user-select: none;
      background: var(--surface-50, #f9fafb);
      transition: background 0.12s;
    }
    .type-pill:hover { background: var(--surface-100, #f3f4f6); }

    /* ── Assignee avatar ── */
    .avatar-xs {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #6366f1;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 9px;
      color: #fff;
      font-weight: 700;
      flex-shrink: 0;
      border: 1.5px solid #fff;
    }

    /* ── Popover items ── */
    .pop-item {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      padding: 7px 12px;
      border: none;
      background: transparent;
      border-radius: 6px;
      font-size: 13px;
      cursor: pointer;
      color: var(--text-color);
      transition: background 0.12s;
      text-align: left;
    }
    .pop-item:hover { background: var(--surface-50, #f9fafb); }
    .pop-item.selected { background: #eef2ff; color: #4f46e5; }

    /* ── Metadata separator ── */
    .meta-divider {
      width: 1px;
      height: 14px;
      background: var(--surface-200, #e5e7eb);
      flex-shrink: 0;
    }

    /* ── Scrollbar ── */
    ::-webkit-scrollbar { width: 4px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 4px; }
  `],
  template: `
    <p-dialog
      [(visible)]="visible"
      [modal]="true"
      [closable]="false"
      [showHeader]="false"
      styleClass="qc-dialog"
      [style]="{ width: '750px', padding: '0' }"
      [contentStyle]="{ padding: '0', borderRadius: '14px', overflow: 'hidden' }"
      [dismissableMask]="true"
      (onHide)="onCancel()"
    >
      <div style="display: flex; flex-direction: column; background: var(--surface-0, #fff); border-radius: 14px; overflow: hidden">

        <!-- ══ Header ══ -->
        <div style="display: flex; align-items: center; gap: 8px; padding: 14px 18px 10px">
          <!-- Type dropdown pill -->
          <button class="type-pill" (click)="typePopover.toggle($event)">
            <i [class]="selectedTypeConfig().icon" [style.color]="selectedTypeConfig().color" style="font-size: 11px"></i>
            <span style="color: var(--text-color)">{{ selectedTypeConfig().label }}</span>
            <i class="pi pi-chevron-down" style="font-size: 9px; color: var(--text-color-secondary)"></i>
          </button>
        </div>

        <!-- ══ Title ══ -->
        <div style="padding: 0 18px 6px">
          <input
            #titleInput
            pInputText
            style="width: 100%; font-size: 15px; font-weight: 600; border: none; box-shadow: none; background: transparent; padding: 0; outline: none; color: var(--text-color)"
            placeholder="Tên task"
            [(ngModel)]="title"
            (keydown.escape)="onCancel()"
            (keydown.enter)="title.trim() && onSubmit()"
          />
        </div>

        <!-- ══ Description ══ -->
        <div style="padding: 0 18px 12px">
          <textarea
            pTextarea
            style="width: 100%; font-size: 13px; color: var(--text-color-secondary); border: none; box-shadow: none; background: transparent; padding: 0; min-height: 120px; resize: vertical; outline: none"
            placeholder="Mô tả (tùy chọn)"
            [rows]="6"
            [(ngModel)]="description"
            (keydown.control.enter)="title.trim() && onSubmit()"
            (keydown.meta.enter)="title.trim() && onSubmit()"
            (keydown.escape)="onCancel()"
          ></textarea>
        </div>

        <!-- ══ Divider ══ -->
        <div style="height: 1px; background: var(--surface-100, #f3f4f6); margin: 0 18px"></div>

        <!-- ══ Metadata row ══ -->
        <div style="display: flex; align-items: center; gap: 6px; padding: 10px 18px; flex-wrap: wrap">

          <!-- State -->
          <button class="meta-pill" [class.active]="!!selectedStateId()" (click)="statePopover.toggle($event)">
            <span style="width: 10px; height: 10px; border-radius: 3px; flex-shrink: 0; display: inline-block"
              [style.background]="selectedStateColor()"></span>
            <span>{{ selectedStateName() }}</span>
          </button>

          <div class="meta-divider"></div>

          <!-- Priority -->
          <button class="meta-pill" [class.active]="selectedPriority() !== 'none'" (click)="priorityPopover.toggle($event)">
            <i [class]="selectedPriorityConfig().icon" [style.color]="selectedPriorityConfig().color" style="font-size: 11px"></i>
            <span>{{ selectedPriorityConfig().label }}</span>
          </button>

          <div class="meta-divider"></div>

          <!-- Assignees -->
          <button class="meta-pill" [class.active]="selectedAssigneeIds.length > 0" (click)="assigneePopover.toggle($event)">
            @if (selectedAssigneeIds.length) {
              <div style="display: flex; align-items: center; gap: -2px">
                @for (id of selectedAssigneeIds.slice(0, 3); track id) {
                  <div class="avatar-xs" style="margin-right: -4px">{{ getMemberInitial(id) }}</div>
                }
              </div>
              <span style="margin-left: 6px">
                {{ selectedAssigneeIds.length === 1 ? getMemberName(selectedAssigneeIds[0]) : selectedAssigneeIds.length + ' người' }}
              </span>
            } @else {
              <i class="pi pi-user" style="font-size: 11px"></i>
              <span>Assignees</span>
            }
          </button>

          <!-- Labels -->
          <button class="meta-pill" [class.active]="selectedLabelIds.length > 0" (click)="labelPopover.toggle($event)">
            <i class="pi pi-tag" style="font-size: 11px"></i>
            @if (selectedLabelIds.length) {
              <div class="flex items-center gap-1">
                @for (id of selectedLabelIds.slice(0, 2); track id) {
                  @if (isScoped(getLabelName(id))) {
                    <span class="inline-flex items-center text-[10px] rounded-full overflow-hidden border border-gray-200 bg-white font-medium" [pTooltip]="getLabelDescription(id) ? getLabelName(id) + ': ' + getLabelDescription(id) : getLabelName(id)">
                      <span class="px-1.5 py-px text-white" 
                            [style.background]="layoutService.getAdaptiveColor(getScopeColor(getLabelName(id), getLabelColor(id)))" 
                            [style.color]="layoutService.getTextColor(layoutService.getAdaptiveColor(getScopeColor(getLabelName(id), getLabelColor(id))))">{{ getScope(getLabelName(id)) }}</span>
                      <span class="px-1.5 py-px" 
                            [style.background]="layoutService.getAdaptiveColor(getLabelColor(id)) + '18'" 
                            [style.color]="layoutService.getAdaptiveColor(getLabelColor(id))">{{ getValue(getLabelName(id)) }}</span>
                    </span>
                  } @else {
                    <span class="text-[10px] px-1 py-px rounded-full font-medium bg-white border" 
                          [style.border-color]="layoutService.getAdaptiveColor(getLabelColor(id))"
                          [style.color]="layoutService.getAdaptiveColor(getLabelColor(id))"
                          [pTooltip]="getLabelDescription(id) ? getLabelName(id) + ': ' + getLabelDescription(id) : getLabelName(id)">
                      {{ getLabelName(id) }}
                    </span>
                  }
                }
                @if (selectedLabelIds.length > 2) {
                  <span class="text-[10px] font-medium text-gray-400">+{{ selectedLabelIds.length - 2 }}</span>
                }
              </div>
            } @else {
              <span>Labels</span>
            }
          </button>

          <div class="meta-divider"></div>

          <!-- Start date -->
          <button class="meta-pill" [class.active]="!!startDate" (click)="startDatePopover.toggle($event)">
            <i class="pi pi-calendar" style="font-size: 11px" [style.color]="startDate ? '#6366f1' : undefined"></i>
            <span [style.color]="startDate ? '#6366f1' : undefined">
              {{ startDate ? (startDate | date:'dd/MM/yy') : 'Bắt đầu' }}
            </span>
          </button>

          <!-- Due date -->
          <button class="meta-pill" [class.active]="!!dueDate" (click)="dueDatePopover.toggle($event)">
            <i class="pi pi-calendar" style="font-size: 11px"
              [style.color]="isOverdue() ? '#ef4444' : dueDate ? '#6366f1' : undefined"></i>
            <span [style.color]="isOverdue() ? '#ef4444' : dueDate ? '#6366f1' : undefined">
              {{ dueDate ? (dueDate | date:'dd/MM/yy') : 'Hết hạn' }}
            </span>
          </button>

          <!-- Estimate -->
          <button class="meta-pill" [class.active]="estimateValue !== null" (click)="estimatePopover.toggle($event)">
            <i class="pi pi-stopwatch" style="font-size: 11px" [style.color]="estimateValue !== null ? '#6366f1' : undefined"></i>
            <span [style.color]="estimateValue !== null ? '#6366f1' : undefined">
              {{ estimateValue !== null ? estimateValue + ' pts' : 'Estimate' }}
            </span>
          </button>

        </div>

        <!-- ══ Footer ══ -->
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 18px 14px; border-top: 1px solid var(--surface-100, #f3f4f6)">
          <div style="display: flex; align-items: center; gap: 8px">
            <p-toggleswitch [(ngModel)]="createMore" [style]="{ transform: 'scale(0.8)', transformOrigin: 'left center' }" />
            <span style="font-size: 12px; color: var(--text-color-secondary)">Tạo tiếp</span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px">
            <button pButton label="Hủy" severity="secondary" [text]="true" size="small" (click)="onCancel()"></button>
            <button pButton label="Lưu" size="small" [disabled]="!title.trim()" (click)="onSubmit()"></button>
          </div>
        </div>
      </div>
    </p-dialog>

    <!-- ═══ POPOVERS ════════════════════════════════════════════════════════ -->

    <!-- Type -->
    <p-popover #typePopover>
      <div style="min-width: 110px; padding: 2px">
        @for (t of availableTypes(); track t.value) {
          <button class="pop-item" [class.selected]="selectedType() === t.value"
            style="padding: 5px 10px; font-size: 12px"
            (click)="selectedType.set(t.value); typePopover.hide()">
            <i [class]="t.icon" [style.color]="t.color" style="font-size: 11px"></i>
            <span>{{ t.label }}</span>
            @if (selectedType() === t.value) {
              <i class="pi pi-check" style="margin-left: auto; font-size: 10px"></i>
            }
          </button>
        }
      </div>
    </p-popover>

    <!-- State -->
    <p-popover #statePopover>
      <div style="min-width: 140px; padding: 2px">
        @for (s of stateOptions(); track s.id) {
          <button class="pop-item" [class.selected]="selectedStateId() === s.id"
            style="padding: 5px 10px; font-size: 12px"
            (click)="selectedStateId.set(s.id); statePopover.hide()">
            <span style="width: 10px; height: 10px; border-radius: 3px; flex-shrink: 0; border: 1px solid rgba(0,0,0,0.08)"
              [style.background]="s.color"></span>
            <span>{{ s.name }}</span>
            @if (selectedStateId() === s.id) {
              <i class="pi pi-check" style="margin-left: auto; font-size: 10px"></i>
            }
          </button>
        }
      </div>
    </p-popover>

    <!-- Priority -->
    <p-popover #priorityPopover>
      <div style="min-width: 120px; padding: 2px">
        @for (p of priorityOptions; track p.value) {
          <button class="pop-item" [class.selected]="selectedPriority() === p.value"
            style="padding: 5px 10px; font-size: 12px"
            (click)="selectedPriority.set(p.value); priorityPopover.hide()">
            <i [class]="p.icon" [style.color]="p.color" style="font-size: 11px"></i>
            <span>{{ p.label }}</span>
            @if (selectedPriority() === p.value) {
              <i class="pi pi-check" style="margin-left: auto; font-size: 10px"></i>
            }
          </button>
        }
      </div>
    </p-popover>

    <!-- Assignees -->
    <p-popover #assigneePopover>
      <div style="min-width: 180px; padding: 2px; max-height: 240px; overflow-y: auto">
        @if (!memberOptions().length) {
          <p style="padding: 8px 10px; font-size: 12px; color: var(--text-color-secondary)">Chưa có thành viên</p>
        }
        @for (m of memberOptions(); track m.userId) {
          <button class="pop-item" [class.selected]="selectedAssigneeIds.includes(m.userId)"
            style="padding: 5px 10px; font-size: 12px"
            (click)="toggleAssignee(m.userId)">
            <div class="avatar-xs" style="margin: 0; width: 20px; height: 20px; font-size: 9px">
              {{ m.displayName[0]?.toUpperCase() }}
            </div>
            <span style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap">{{ m.displayName }}</span>
            @if (selectedAssigneeIds.includes(m.userId)) {
              <i class="pi pi-check" style="font-size: 10px; color: #6366f1"></i>
            }
          </button>
        }
      </div>
    </p-popover>

    <!-- Labels -->
    <p-popover #labelPopover (onShow)="focusLabelSearch()">
      <div style="min-width: 200px; max-width: 260px; padding: 2px; display: flex; flex-direction: column; gap: 2px">
        <div style="padding: 2px">
          <input
            #labelSearchInput
            pInputText type="text"
            style="width: 100%; height: 26px; font-size: 11px; padding: 0 6px; border-radius: 4px"
            placeholder="Tìm kiếm hoặc tạo nhãn..."
            [ngModel]="labelSearch()"
            (ngModelChange)="labelSearch.set($event)"
            (click)="$event.stopPropagation()"
            (keydown.enter)="onLabelSearchEnter($event)"
          />
        </div>
        <div style="max-height: 180px; overflow-y: auto; display: flex; flex-direction: column; gap: 1px">
          @if (!filteredLabels().length) {
            <p style="padding: 6px; font-size: 11px; color: var(--text-color-secondary); text-align: center">
              {{ labelOptions().length ? 'Không tìm thấy nhãn' : 'Chưa có nhãn' }}
            </p>
          }
          @for (l of filteredLabels(); track l.id) {
            <button class="pop-item" style="display: flex; align-items: center; justify-content: space-between; padding: 5px 8px; border-radius: 4px"
              [class.selected]="selectedLabelIds.includes(l.id)"
              (click)="toggleLabel(l.id)"
              [pTooltip]="l.description ? l.name + ': ' + l.description : l.name">
              <div style="display: flex; align-items: center; gap: 6px; overflow: hidden">
                @if (isScoped(l.name)) {
                  <span class="inline-flex items-center text-[10px] rounded-full overflow-hidden border border-gray-200 dark:border-surface-700 font-medium bg-white dark:bg-surface-800">
                    <span class="px-1.5 py-px text-white" 
                          [style.background]="layoutService.getAdaptiveColor(getScopeColor(l.name, l.color))" 
                          [style.color]="layoutService.getTextColor(layoutService.getAdaptiveColor(getScopeColor(l.name, l.color)))">{{ getScope(l.name) }}</span>
                    <span class="px-1.5 py-px" 
                          [style.background]="layoutService.getAdaptiveColor(l.color) + '18'" 
                          [style.color]="layoutService.getAdaptiveColor(l.color)">{{ getValue(l.name) }}</span>
                  </span>
                } @else {
                  <span class="text-[10px] px-1.5 py-px rounded-full font-medium" 
                        [style.background]="layoutService.getAdaptiveColor(l.color) + '22'" 
                        [style.color]="layoutService.getAdaptiveColor(l.color)">
                    {{ l.name }}
                  </span>
                }
              </div>
              @if (selectedLabelIds.includes(l.id)) {
                <i class="pi pi-check" style="font-size: 10px; color: #6366f1; flex-shrink: 0"></i>
              }
            </button>
          }
        </div>
        @if (labelSearch().trim() && !hasExactMatch()) {
          <button class="pop-item" style="display: flex; align-items: center; gap: 6px; color: #6366f1; border-top: 1px solid var(--surface-100, #f1f5f9); margin-top: 2px; padding: 6px 8px; border-radius: 4px" (click)="quickCreateLabel()">
            <i class="pi pi-plus" style="font-size: 10px"></i>
            <span style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 11px">
              Tạo nhãn <strong>"{{ labelSearch().trim() }}"</strong>
            </span>
          </button>
        }
      </div>
    </p-popover>

    <!-- Start date -->
    <p-popover #startDatePopover>
      <p-datepicker [(ngModel)]="startDate" [inline]="true" dateFormat="dd/mm/yy"
        (ngModelChange)="startDatePopover.hide()" />
      @if (startDate) {
        <div style="display: flex; justify-content: center; padding: 4px 0 8px">
          <button pButton label="Xóa ngày" severity="secondary" [text]="true" size="small"
            (click)="startDate = null; startDatePopover.hide()"></button>
        </div>
      }
    </p-popover>

    <!-- Due date -->
    <p-popover #dueDatePopover>
      <p-datepicker [(ngModel)]="dueDate" [inline]="true" dateFormat="dd/mm/yy"
        (ngModelChange)="dueDatePopover.hide()" />
      @if (dueDate) {
        <div style="display: flex; justify-content: center; padding: 4px 0 8px">
          <button pButton label="Xóa ngày" severity="secondary" [text]="true" size="small"
            (click)="dueDate = null; dueDatePopover.hide()"></button>
        </div>
      }
    </p-popover>

    <!-- Estimate -->
    <p-popover #estimatePopover>
      <div style="padding: 6px 8px; display: flex; align-items: center; gap: 6px; width: 160px">
        <p-inputnumber [(ngModel)]="estimateValue" [min]="0" [maxFractionDigits]="1"
          styleClass="w-full flex-1" inputStyleClass="w-full text-xs" placeholder="Story points" [autofocus]="true"
          (keydown.enter)="estimatePopover.hide()" />
        @if (estimateValue !== null) {
          <button pButton icon="pi pi-times" severity="secondary" [text]="true" size="small"
            pTooltip="Xóa" (click)="estimateValue = null; estimatePopover.hide()" style="flex-shrink: 0; width: 24px; height: 24px; padding: 0"></button>
        }
      </div>
    </p-popover>
  `,
})
export class QuickCreateComponent implements OnChanges {
  private readonly projectStore = inject(ProjectStore);
  private readonly taskStore = inject(TaskStore);
  private readonly labelStore = inject(LabelStore);
  protected readonly layoutService = inject(LayoutService);

  @Input() visible = false;
  @Input() parentId?: string;
  @Input() parentType?: TaskType;
  @Input() stateId?: string;

  @Output() create = new EventEmitter<CreateTaskDto>();
  @Output() cancel = new EventEmitter<void>();

  @ViewChild('titleInput') titleInput?: ElementRef<HTMLInputElement>;
  @ViewChild('labelSearchInput') labelSearchInput?: ElementRef<HTMLInputElement>;

  // ─── Plain form fields ───────────────────────────────────────────────────
  protected title = '';
  protected description = '';
  protected selectedAssigneeIds: string[] = [];
  protected selectedLabelIds: string[] = [];
  protected dueDate: Date | null = null;
  protected startDate: Date | null = null;
  protected estimateValue: number | null = null;
  protected createMore = false;

  // ─── Signals ─────────────────────────────────────────────────────────────
  protected readonly selectedType = signal<TaskType>('task');
  protected readonly selectedPriority = signal<TaskPriority>('none');
  protected readonly selectedStateId = signal('');

  // ─── Option lists ────────────────────────────────────────────────────────
  protected readonly priorityOptions = PRIORITY_OPTIONS;

  protected readonly availableTypes = computed(() => {
    if (this.parentType) {
      const valid = VALID_CHILDREN[this.parentType] ?? [];
      return TYPE_OPTIONS.filter((t) => valid.includes(t.value));
    }
    return TYPE_OPTIONS.filter((t) => t.value !== 'subtask');
  });

  // ─── Data sources ────────────────────────────────────────────────────────
  protected readonly stateOptions = computed(() => {
    const grouped = this.projectStore.currentProjectStates();
    return grouped ? Object.values(grouped).flat() : [];
  });

  protected readonly memberOptions = computed(() => this.projectStore.members());

  protected readonly labelOptions = computed(() =>
    this.taskStore.labels().map((l) => ({ id: l.id, name: l.name, color: l.color, isExclusive: l.isExclusive, description: l.description })),
  );

  // ─── Computed display values ─────────────────────────────────────────────
  protected readonly selectedStateColor = computed(() =>
    this.stateOptions().find((s) => s.id === this.selectedStateId())?.color ?? '#9CA3AF',
  );

  protected readonly selectedStateName = computed(() =>
    this.stateOptions().find((s) => s.id === this.selectedStateId())?.name ?? 'State',
  );

  protected readonly selectedPriorityConfig = computed(() =>
    PRIORITY_OPTIONS.find((p) => p.value === this.selectedPriority()) ?? PRIORITY_OPTIONS[4],
  );

  protected readonly selectedTypeConfig = computed(() =>
    TYPE_OPTIONS.find((t) => t.value === this.selectedType()) ?? TYPE_OPTIONS[2],
  );

  // ─── Helpers ─────────────────────────────────────────────────────────────
  protected readonly labelSearch = signal('');

  protected readonly filteredLabels = computed(() => {
    const query = this.labelSearch().trim().toLowerCase();
    const allLabels = this.labelOptions();
    if (!query) return allLabels;
    return allLabels.filter(l => l.name.toLowerCase().includes(query));
  });

  protected isScoped(name: string): boolean {
    return name.includes('::');
  }

  protected getScope(name: string): string {
    return name.split('::')[0].trim();
  }

  protected getValue(name: string): string {
    return name.split('::').slice(1).join('::').trim();
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

  protected getMemberInitial(userId: string): string {
    return this.memberOptions().find((m) => m.userId === userId)?.displayName[0]?.toUpperCase() ?? '?';
  }

  protected getMemberName(userId: string): string {
    return this.memberOptions().find((m) => m.userId === userId)?.displayName ?? userId;
  }

  protected getLabelColor(id: string): string {
    return this.labelOptions().find((l) => l.id === id)?.color ?? '#9CA3AF';
  }

  protected getLabelName(id: string): string {
    return this.labelOptions().find((l) => l.id === id)?.name ?? id;
  }

  protected getLabelDescription(id: string): string | undefined {
    return this.labelOptions().find((l) => l.id === id)?.description || undefined;
  }

  protected toggleAssignee(userId: string): void {
    this.selectedAssigneeIds = this.selectedAssigneeIds.includes(userId)
      ? this.selectedAssigneeIds.filter((id) => id !== userId)
      : [...this.selectedAssigneeIds, userId];
  }

  protected toggleLabel(labelId: string): void {
    const label = this.labelOptions().find(l => l.id === labelId);
    if (!label) return;

    const isScoped = label.name.includes('::');
    if (isScoped && label.isExclusive !== false) {
      const scope = label.name.split('::')[0].trim().toLowerCase();
      const isCurrentlySelected = this.selectedLabelIds.includes(labelId);

      if (isCurrentlySelected) {
        this.selectedLabelIds = this.selectedLabelIds.filter(id => id !== labelId);
      } else {
        // Deselect other labels of the same scope ONLY if they/it is exclusive!
        const otherSameScopeIds = this.labelOptions()
          .filter(l => l.id !== labelId && l.name.includes('::') && l.name.split('::')[0].trim().toLowerCase() === scope && l.isExclusive !== false)
          .map(l => l.id);
        this.selectedLabelIds = this.selectedLabelIds.filter(id => !otherSameScopeIds.includes(id));
        this.selectedLabelIds = [...this.selectedLabelIds, labelId];
      }
    } else {
      this.selectedLabelIds = this.selectedLabelIds.includes(labelId)
        ? this.selectedLabelIds.filter((id) => id !== labelId)
        : [...this.selectedLabelIds, labelId];
    }
  }

  protected getScopeColor(name: string, fallbackColor: string): string {
    if (!this.isScoped(name)) return fallbackColor;
    const scope = this.getScope(name).toLowerCase();
    const allLabels = this.labelOptions();
    const match = allLabels.find(l => l.name.includes('::') && l.name.split('::')[0].trim().toLowerCase() === scope);
    return match ? match.color : fallbackColor;
  }

  protected isOverdue(): boolean {
    return !!this.dueDate && this.dueDate < new Date();
  }

  // ─── Lifecycle ───────────────────────────────────────────────────────────
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible']?.currentValue === true && !changes['visible'].previousValue) {
      const defaultType = this.parentType
        ? (VALID_CHILDREN[this.parentType]?.[0] ?? 'task')
        : 'task';
      this.selectedType.set(defaultType);
      this.selectedPriority.set('none');
      this.selectedAssigneeIds = [];
      this.selectedLabelIds = [];
      this.dueDate = null;
      this.startDate = null;
      this.estimateValue = null;
      this.title = '';
      this.description = '';

      const defaultState = this.stateId
        ?? this.stateOptions().find((s) => s.isDefault)?.id
        ?? this.stateOptions()[0]?.id
        ?? '';
      this.selectedStateId.set(defaultState);

      setTimeout(() => this.titleInput?.nativeElement.focus(), 80);
    }
  }

  // ─── Actions ─────────────────────────────────────────────────────────────
  protected onSubmit(): void {
    const t = this.title.trim();
    if (!t) return;

    this.create.emit({
      title: t,
      type: this.selectedType(),
      priority: this.selectedPriority() !== 'none' ? this.selectedPriority() : undefined,
      description: this.description.trim() || undefined,
      stateId: this.selectedStateId() || undefined,
      assigneeIds: this.selectedAssigneeIds.length ? this.selectedAssigneeIds : undefined,
      labelIds: this.selectedLabelIds.length ? this.selectedLabelIds : undefined,
      estimateValue: this.estimateValue ?? undefined,
      startDate: this.startDate ? this.startDate.toISOString().split('T')[0] : undefined,
      dueDate: this.dueDate ? this.dueDate.toISOString().split('T')[0] : undefined,
      parentId: this.parentId,
    });

    if (this.createMore) {
      this.title = '';
      this.description = '';
      setTimeout(() => this.titleInput?.nativeElement.focus(), 50);
    } else {
      this.resetForm();
    }
  }

  protected onCancel(): void {
    this.resetForm();
    this.cancel.emit();
  }

  protected focusLabelSearch(): void {
    setTimeout(() => this.labelSearchInput?.nativeElement.focus(), 50);
  }

  protected onLabelSearchEnter(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    const query = this.labelSearch().trim();
    if (!query) return;

    const filtered = this.filteredLabels();
    if (filtered.length === 1) {
      this.toggleLabel(filtered[0].id);
      this.labelSearch.set('');
    } else if (filtered.length === 0 && !this.hasExactMatch()) {
      this.quickCreateLabel();
    }
  }

  protected hasExactMatch(): boolean {
    const query = this.labelSearch().trim().toLowerCase();
    if (!query) return false;
    return this.labelOptions().some(l => l.name.toLowerCase() === query);
  }

  protected quickCreateLabel(): void {
    const query = this.labelSearch().trim();
    if (!query) return;
    const projectId = this.projectStore.currentProject()?.id;
    if (!projectId) return;

    let chosenColor = '';
    if (query.includes('::')) {
      const scope = query.split('::')[0].trim().toLowerCase();
      const match = this.labelOptions().find(l => l.name.includes('::') && l.name.split('::')[0].trim().toLowerCase() === scope);
      if (match) {
        chosenColor = match.color;
      }
    }

    if (!chosenColor) {
      const colorPresets = [
        '#EF4444', '#F97316', '#F59E0B', '#10B981', '#0D9488',
        '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899', '#6B7280',
      ];
      const idx = Math.floor(Math.random() * colorPresets.length);
      chosenColor = colorPresets[idx];
    }

    this.labelStore.createLabel(projectId, {
      name: query,
      color: chosenColor,
      isExclusive: true,
    }).then((created) => {
      if (created) {
        this.toggleLabel(created.id);
        this.labelSearch.set('');
      }
    });
  }

  private resetForm(): void {
    this.title = '';
    this.description = '';
    this.selectedType.set('task');
    this.selectedPriority.set('none');
    this.selectedAssigneeIds = [];
    this.selectedLabelIds = [];
    this.dueDate = null;
    this.startDate = null;
    this.estimateValue = null;
    this.createMore = false;
    this.labelSearch.set('');
  }
}
