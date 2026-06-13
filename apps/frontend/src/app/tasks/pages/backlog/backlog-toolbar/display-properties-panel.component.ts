import { Component, Input, Output, EventEmitter, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { RadioButtonModule } from 'primeng/radiobutton';
import { SelectModule } from 'primeng/select';
import { PopoverModule } from 'primeng/popover';
import { SliderModule } from 'primeng/slider';

import { DisplayProperties, DEFAULT_DISPLAY_PROPS } from '@mpm/shared-types';
import { SprintService } from '../../../../projects/sprints/services/sprint.service';
import { IconDisplayComponent } from '../../../../shared/components/icon-display/icon-display.component';
import { ProjectStore } from '../../../../projects/state/project.store';

@Component({
  standalone: true,
  selector: 'app-display-properties-panel',
  imports: [
    CommonModule, FormsModule,
    ToggleSwitchModule, RadioButtonModule, SelectModule,
    PopoverModule, SliderModule,
    IconDisplayComponent,
  ],
  styles: [`
    :host { display:block; min-width:600px; width:100%; box-sizing:border-box; }
    :host ::ng-deep .p-toggleswitch {
      transform: scale(0.8);
      transform-origin: right center;
    }
    .sec-hdr {
      font-size:9px; font-weight:700; letter-spacing:.1em; text-transform:uppercase;
      padding:0 10px; border-bottom:1px solid var(--surface-border);
      display:flex; align-items:center; gap:6px; height:34px; box-sizing:border-box;
    }
    .cell { display:flex; align-items:center; justify-content:space-between; height:32px; padding:0 10px; gap:8px; }
    .cell .cell-label-wrapper { display:flex; align-items:center; gap:8px; flex:1; min-width:0; }
    .cell .cell-label-wrapper > span { font-size:12px; color:var(--text-color); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .cell-sm .cell-label-wrapper > span { font-size:11px; color:var(--text-color-secondary); }
    .sel-cell { display:grid; grid-template-columns:105px 1fr; align-items:center; gap:8px; padding:5px 12px; height:32px; box-sizing:border-box; }
    .sel-cell > span { font-size:11px; color:var(--text-color-secondary); white-space:nowrap; }
    .box { border:1px solid var(--surface-border); border-radius:8px; overflow:hidden; }
    .vdiv { border-right:1px solid var(--surface-border); }
    .hdiv { border-bottom:1px solid var(--surface-border); }

    .select-btn {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      height: 24px;
      padding: 0 8px;
      font-size: 11px;
      background: var(--surface-card, #fff);
      border: 1px solid var(--surface-border, #e5e7eb);
      border-radius: 6px;
      cursor: pointer;
      color: var(--text-color, #374151);
      transition: background 0.12s, border-color 0.12s;
    }
    .select-btn:hover {
      background: var(--surface-hover, #f9fafb);
      border-color: var(--surface-300, #d1d5db);
    }
    :host-context(.dark) .select-btn {
      background: var(--surface-card, #1e293b);
      border-color: var(--surface-700, #334155);
      color: var(--text-color, #f3f4f6);
    }
    :host-context(.dark) .select-btn:hover {
      background: var(--surface-hover, #334155);
    }
    .pop-list {
      min-width: 130px;
      padding: 3px;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .pop-item {
      display: flex;
      align-items: center;
      width: 100%;
      padding: 5px 8px;
      border: none;
      background: transparent;
      border-radius: 4px;
      font-size: 11px;
      cursor: pointer;
      color: var(--text-color);
      transition: background 0.12s;
      text-align: left;
    }
    .pop-item:hover {
      background: var(--p-content-hover-background, #f9fafb);
    }
    .pop-item.selected {
      background: var(--p-highlight-background, #eef2ff);
      color: var(--p-highlight-color, var(--p-primary-600));
      font-weight: 500;
    }
  `],
  template: `
    <div style="display:flex; flex-direction:column; box-sizing:border-box;">

      <!-- Panel header -->
      <div style="padding:10px 12px 8px; border-bottom:1px solid var(--surface-border); background:rgba(99,102,241,0.06);">
        <span style="font-size:10px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:var(--p-primary-color);">{{ t().title }}</span>
      </div>

      <div style="padding:12px; display:flex; flex-direction:column; gap:10px;">

        <!-- ── FIELDS ── -->
        <div class="box">
          <div class="sec-hdr" style="background:rgba(99,102,241,0.08); color:var(--p-primary-color);">
            <i class="pi pi-th-large text-[10px]"></i>
            <span>{{ t().fields }}</span>
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr;">
            @for (f of simpleFields(); track f.key; let i = $index) {
              <div class="cell"
                   [class.vdiv]="i % 2 === 0"
                   [class.hdiv]="i < simpleFields().length - 2"
                   [style.background]="i % 2 === 0 ? 'rgba(99,102,241,0.03)' : ''">
                <div class="cell-label-wrapper">
                  @if (f.key === 'showSprint') {
                    <app-icon-display [icon]="getSprintIcon()" class="text-xs flex-shrink-0 text-gray-500 dark:text-surface-400"></app-icon-display>
                  } @else {
                    <i [class]="f.icon" class="text-xs flex-shrink-0 text-gray-500 dark:text-surface-400"></i>
                  }
                  <span>{{ f.label }}</span>
                </div>
                <p-toggleswitch [ngModel]="getVal(f.key)" (ngModelChange)="onToggle(f.key, $event)" />
              </div>
            }
          </div>
        </div>

        <!-- ── LABELS | SUB-ITEMS + MODULES ── -->
        <div class="box" style="display:grid; grid-template-columns:1fr 1fr;">

          <!-- Labels (purple) -->
          <div class="vdiv" style="background:rgba(139,92,246,0.04);">
            <div class="sec-hdr hdiv" style="background:rgba(139,92,246,0.1); justify-content:space-between; color:#8b5cf6;">
              <div style="display:flex; align-items:center; gap:6px;">
                <i class="pi pi-tag text-[10px] flex-shrink-0"></i>
                <span>{{ t().labels }}</span>
              </div>
              <p-toggleswitch [ngModel]="displayProps.showLabels" (ngModelChange)="onToggle('showLabels',$event)" />
            </div>
            @if (displayProps.showLabels) {
              <div class="cell hdiv cell-sm" style="gap:5px; justify-content:flex-start;">
                <span style="min-width:60px; flex-shrink:0; flex:unset; font-size:11px; color:var(--text-color-secondary);">{{ t().mode }}</span>
                <label style="display:flex;align-items:center;gap:3px;cursor:pointer;font-size:11px;color:var(--text-color);white-space:nowrap;">
                  <p-radiobutton name="lm" value="badge" [ngModel]="displayProps.labelMode" (ngModelChange)="onToggle('labelMode',$event)" />{{ t().badge }}
                </label>
                <label style="display:flex;align-items:center;gap:3px;cursor:pointer;font-size:11px;color:var(--text-color);margin-left:4px;white-space:nowrap;">
                  <p-radiobutton name="lm" value="dot" [ngModel]="displayProps.labelMode" (ngModelChange)="onToggle('labelMode',$event)" />{{ t().dot }}
                </label>
              </div>
              <div class="cell hdiv cell-sm">
                <div class="cell-label-wrapper">
                  <span>{{ t().maxShown }}</span>
                </div>
                <div class="flex items-center gap-2 w-28"><p-slider [ngModel]="displayProps.maxLabels" (ngModelChange)="onToggle('maxLabels',$event)" [min]="1" [max]="4" class="w-full"></p-slider><span class="text-xs font-semibold text-gray-500 w-4 text-right">{{ displayProps.maxLabels }}</span></div>
              </div>
              <div class="cell cell-sm">
                <div class="cell-label-wrapper">
                  <span>{{ t().alwaysShow }}</span>
                </div>
                <p-toggleswitch [ngModel]="displayProps.alwaysShowLabels" (ngModelChange)="onToggle('alwaysShowLabels',$event)" />
              </div>
            }
          </div>

          <!-- Sub-items (green) + Modules (amber) -->
          <div style="display:flex; flex-direction:column; min-width:0;">
            <div class="sec-hdr hdiv" style="background:rgba(16,185,129,0.1); justify-content:space-between; color:#10b981;">
              <div style="display:flex; align-items:center; gap:6px;">
                <i class="pi pi-sitemap text-[10px] flex-shrink-0"></i>
                <span>{{ t().subItems }}</span>
              </div>
              <p-toggleswitch [ngModel]="displayProps.showSubItemCount" (ngModelChange)="onToggle('showSubItemCount',$event)" />
            </div>
            <div class="hdiv" style="display:grid; grid-template-columns:1fr auto 18px; align-items:center; gap:6px; padding:0 10px; height:32px; box-sizing:border-box; background:rgba(16,185,129,0.03);">
              <span style="font-size:11px; color:var(--text-color-secondary); white-space:nowrap;">{{ t().depth }}</span>
              <p-slider [ngModel]="displayProps.maxSubItemDepth" (ngModelChange)="onToggle('maxSubItemDepth',$event)" [min]="0" [max]="5" style="width:80px; display:block;"></p-slider>
              <span style="font-size:11px; font-weight:600; color:var(--text-color-secondary); text-align:right;">{{ displayProps.maxSubItemDepth }}</span>
            </div>
            <div class="sec-hdr hdiv" style="background:rgba(245,158,11,0.1); justify-content:space-between; color:#f59e0b;">
              <div style="display:flex; align-items:center; gap:6px;">
                <i class="pi pi-box text-[10px] flex-shrink-0"></i>
                <span>{{ t().modules }}</span>
              </div>
              <p-toggleswitch [ngModel]="displayProps.showModules" (ngModelChange)="onToggle('showModules',$event)" />
            </div>
            <div [style.opacity]="displayProps.showModules?'1':'0.4'"
                 [class.pointer-events-none]="!displayProps.showModules"
                 style="display:grid; grid-template-columns:1fr auto 18px; align-items:center; gap:6px; padding:0 10px; height:32px; box-sizing:border-box; background:rgba(245,158,11,0.03);">
              <span style="font-size:11px; color:var(--text-color-secondary); white-space:nowrap;">{{ t().maxShown }}</span>
              <p-slider [ngModel]="displayProps.maxModules" (ngModelChange)="onToggle('maxModules',$event)" [min]="1" [max]="3" [disabled]="!displayProps.showModules" style="width:80px; display:block;"></p-slider>
              <span style="font-size:11px; font-weight:600; color:var(--text-color-secondary); text-align:right;">{{ displayProps.maxModules }}</span>
            </div>
          </div>

        </div>

        <!-- ── VIEW | OPEN TASK AS ── -->
        <div class="box" style="display:grid; grid-template-columns:1fr 1fr;">

          <div class="vdiv" style="background:rgba(59,130,246,0.04);">
            <div class="sec-hdr hdiv" style="background:rgba(59,130,246,0.1); color:#3b82f6;">
              <i class="pi pi-eye text-[10px]"></i>
              <span>{{ t().view }}</span>
            </div>
            
            <div class="sel-cell hdiv">
              <span>{{ t().group }}</span>
              <button type="button" class="select-btn" (click)="groupPop.toggle($event)">
                <span class="truncate">{{ getGroupByLabel(selectedGroupBy) }}</span>
                <i class="pi pi-chevron-down text-[9px] text-gray-400"></i>
              </button>
              <p-popover #groupPop appendTo="body" styleClass="p-0 select-popover">
                <div class="pop-list">
                  @for (opt of groupByOptions(); track opt.value) {
                    <button type="button" class="pop-item" [class.selected]="selectedGroupBy === opt.value"
                      (click)="groupByChange.emit(opt.value); groupPop.hide()">
                      {{ opt.label }}
                    </button>
                  }
                </div>
              </p-popover>
            </div>

            <div class="sel-cell hdiv">
              <span>{{ t().order }}</span>
              <button type="button" class="select-btn" (click)="orderPop.toggle($event)">
                <span class="truncate">{{ getOrderByLabel(selectedOrderBy) }}</span>
                <i class="pi pi-chevron-down text-[9px] text-gray-400"></i>
              </button>
              <p-popover #orderPop appendTo="body" styleClass="p-0 select-popover">
                <div class="pop-list">
                  @for (opt of orderByOptions(); track opt.value) {
                    <button type="button" class="pop-item" [class.selected]="selectedOrderBy === opt.value"
                      (click)="orderByChange.emit(opt.value); orderPop.hide()">
                      {{ opt.label }}
                    </button>
                  }
                </div>
              </p-popover>
            </div>

            <div class="sel-cell">
              <span>{{ t().kanbanColumnWidth }}</span>
              <div class="flex items-center gap-2 w-full">
                <p-slider [min]="240" [max]="400" [ngModel]="displayProps.kanbanColumnWidth || 288" (ngModelChange)="onToggle('kanbanColumnWidth', $event)" class="w-full"></p-slider>
                <span class="text-[10px] font-semibold text-gray-500 w-8 text-right flex-shrink-0">{{ displayProps.kanbanColumnWidth || 288 }}px</span>
              </div>
            </div>
          </div>

          <div style="background:rgba(20,184,166,0.04);">
            <div class="sec-hdr hdiv" style="background:rgba(20,184,166,0.1); color:#14b8a6;">
              <i class="pi pi-external-link text-[10px]"></i>
              <span>{{ t().openTaskAs }}</span>
            </div>

            <div class="sel-cell hdiv">
              <span>{{ t().create }}</span>
              <button type="button" class="select-btn" (click)="createPop.toggle($event)">
                <span class="truncate">{{ getCreationModeLabel(displayProps.taskCreationViewMode || 'popup') }}</span>
                <i class="pi pi-chevron-down text-[9px] text-gray-400"></i>
              </button>
              <p-popover #createPop appendTo="body" styleClass="p-0 select-popover">
                <div class="pop-list">
                  @for (opt of creationModeOptions(); track opt.value) {
                    <button type="button" class="pop-item" [class.selected]="(displayProps.taskCreationViewMode || 'popup') === opt.value"
                      (click)="onToggle('taskCreationViewMode', opt.value); createPop.hide()">
                      {{ opt.label }}
                    </button>
                  }
                </div>
              </p-popover>
            </div>

            <div class="sel-cell">
              <span>{{ t().detail }}</span>
              <button type="button" class="select-btn" (click)="detailPop.toggle($event)">
                <span class="truncate">{{ getDetailModeLabel(displayProps.taskDetailViewMode || 'right-pane') }}</span>
                <i class="pi pi-chevron-down text-[9px] text-gray-400"></i>
              </button>
              <p-popover #detailPop appendTo="body" styleClass="p-0 select-popover">
                <div class="pop-list">
                  @for (opt of detailModeOptions(); track opt.value) {
                    <button type="button" class="pop-item" [class.selected]="(displayProps.taskDetailViewMode || 'right-pane') === opt.value"
                      (click)="onToggle('taskDetailViewMode', opt.value); detailPop.hide()">
                      {{ opt.label }}
                    </button>
                  }
                </div>
              </p-popover>
            </div>
          </div>

        </div>

      </div>
    </div>
  `,
})
export class DisplayPropertiesPanelComponent {
  private readonly sprintService = inject(SprintService);
  private readonly projectStore = inject(ProjectStore);

  @Input() displayProps: DisplayProperties = DEFAULT_DISPLAY_PROPS;
  @Input() selectedGroupBy = 'none';
  @Input() selectedOrderBy = 'rank';

  @Output() displayPropsChange = new EventEmitter<Partial<DisplayProperties>>();
  @Output() groupByChange = new EventEmitter<string>();
  @Output() orderByChange = new EventEmitter<string>();

  readonly t = computed(() => {
    const isEn = this.projectStore.projectLanguage() === 'en';
    return isEn ? {
      title: 'Display Properties',
      fields: 'Fields',
      showAssignee: 'Assignee',
      showPriority: 'Priority',
      showDueDate: 'Due date',
      showStartDate: 'Start date',
      showEstimate: 'Estimate',
      showState: 'State',
      showSprint: 'Sprint',
      labels: 'Labels',
      mode: 'Mode',
      badge: 'Badge',
      dot: 'Dot',
      maxShown: 'Max shown',
      alwaysShow: 'Always show',
      subItems: 'Sub-items',
      depth: 'Depth (0=hide)',
      modules: 'Modules',
      view: 'View',
      group: 'Group',
      order: 'Order',
      kanbanColumnWidth: 'Kanban Column',
      openTaskAs: 'Open task as',
      create: 'Create',
      detail: 'Detail',
      none: 'None',
      state: 'State',
      priority: 'Priority',
      assignee: 'Assignee',
      manualRank: 'Manual Rank',
      createdDate: 'Created date',
      dueDate: 'Due date',
      popup: 'Popup',
      rightPane: 'Right Pane',
      fullPage: 'Full Page'
    } : {
      title: 'Thuộc tính hiển thị',
      fields: 'Trường thông tin',
      showAssignee: 'Người phụ trách',
      showPriority: 'Độ ưu tiên',
      showDueDate: 'Hạn chót',
      showStartDate: 'Ngày bắt đầu',
      showEstimate: 'Thời gian dự tính',
      showState: 'Trạng thái',
      showSprint: 'Sprint',
      labels: 'Nhãn',
      mode: 'Chế độ',
      badge: 'Huy hiệu',
      dot: 'Chấm màu',
      maxShown: 'Hiển thị tối đa',
      alwaysShow: 'Luôn hiển thị',
      subItems: 'Việc con',
      depth: 'Độ sâu (0=ẩn)',
      modules: 'Module',
      view: 'Giao diện',
      group: 'Gom nhóm',
      order: 'Sắp xếp',
      kanbanColumnWidth: 'Cột Kanban',
      openTaskAs: 'Mở công việc bằng',
      create: 'Tạo mới',
      detail: 'Chi tiết',
      none: 'Không gom nhóm',
      state: 'Trạng thái',
      priority: 'Độ ưu tiên',
      assignee: 'Người phụ trách',
      manualRank: 'Thứ tự thủ công',
      createdDate: 'Ngày tạo',
      dueDate: 'Hạn chót',
      popup: 'Hộp thoại',
      rightPane: 'Bảng bên phải',
      fullPage: 'Toàn trang'
    };
  });

  readonly simpleFields = computed(() => {
    const trans = this.t();
    return [
      { key: 'showAssignee' as keyof DisplayProperties,  label: trans.showAssignee,   icon: 'pi pi-user' },
      { key: 'showPriority' as keyof DisplayProperties,  label: trans.showPriority,   icon: 'pi pi-flag' },
      { key: 'showDueDate' as keyof DisplayProperties,   label: trans.showDueDate,    icon: 'pi pi-calendar' },
      { key: 'showStartDate' as keyof DisplayProperties, label: trans.showStartDate,  icon: 'pi pi-calendar' },
      { key: 'showEstimate' as keyof DisplayProperties,  label: trans.showEstimate,   icon: 'pi pi-hourglass' },
      { key: 'showState' as keyof DisplayProperties,     label: trans.showState,      icon: 'pi pi-check-circle' },
      { key: 'showSprint' as keyof DisplayProperties,    label: trans.showSprint },
    ];
  });

  getVal(key: keyof DisplayProperties): boolean {
    return !!this.displayProps[key];
  }

  getSprintIcon(): string {
    return this.sprintService.projectSettings()?.icon ?? 'pi-sync';
  }

  getGroupByLabel(val: string): string {
    return this.groupByOptions().find(o => o.value === val)?.label ?? val;
  }

  getOrderByLabel(val: string): string {
    return this.orderByOptions().find(o => o.value === val)?.label ?? val;
  }

  getCreationModeLabel(val: string): string {
    return this.creationModeOptions().find(o => o.value === val)?.label ?? val;
  }

  getDetailModeLabel(val: string): string {
    return this.detailModeOptions().find(o => o.value === val)?.label ?? val;
  }

  readonly groupByOptions = computed(() => {
    const trans = this.t();
    return [
      { label: trans.none, value: 'none' },
      { label: trans.state, value: 'state' },
      { label: trans.priority, value: 'priority' },
      { label: trans.assignee, value: 'assignee' },
    ];
  });

  readonly orderByOptions = computed(() => {
    const trans = this.t();
    return [
      { label: trans.manualRank, value: 'rank' },
      { label: trans.createdDate, value: 'created_at' },
      { label: trans.dueDate, value: 'due_date' },
      { label: trans.priority, value: 'priority' },
    ];
  });

  readonly creationModeOptions = computed(() => {
    const trans = this.t();
    return [
      { label: trans.popup, value: 'popup' },
      { label: trans.rightPane, value: 'right-pane' },
      { label: trans.fullPage, value: 'full-page' },
    ];
  });

  readonly detailModeOptions = computed(() => {
    const trans = this.t();
    return [
      { label: trans.popup, value: 'popup' },
      { label: trans.rightPane, value: 'right-pane' },
      { label: trans.fullPage, value: 'full-page' },
    ];
  });

  onToggle(key: keyof DisplayProperties, value: boolean | string | number): void {
    this.displayPropsChange.emit({ [key]: value } as Partial<DisplayProperties>);
  }
}
