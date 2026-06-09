import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { RadioButtonModule } from 'primeng/radiobutton';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';

import { DisplayProperties, DEFAULT_DISPLAY_PROPS } from '@mpm/shared-types';

@Component({
  standalone: true,
  selector: 'app-display-properties-panel',
  imports: [
    CommonModule, FormsModule,
    ToggleSwitchModule, RadioButtonModule, InputNumberModule, SelectModule,
  ],
  styles: [`
    :host { display:block; width:360px; overflow:hidden; box-sizing:border-box; }
    .sec-hdr {
      font-size:9px; font-weight:700; letter-spacing:.1em; text-transform:uppercase;
      padding:5px 10px; border-bottom:1px solid var(--surface-border);
    }
    .cell { display:flex; align-items:center; justify-content:space-between; height:32px; padding:0 10px; gap:8px; }
    .cell > span { font-size:12px; color:var(--text-color); flex:1; min-width:0; white-space:nowrap; }
    .cell-sm > span { font-size:11px; color:var(--text-color-secondary); }
    .sp { width:76px; min-width:76px; flex-shrink:0; }
    .sp ::ng-deep .p-inputnumber,
    .sp ::ng-deep .p-inputnumber-input { width:100% !important; }
    .sel-cell { display:grid; grid-template-columns:40px 1fr; align-items:center; gap:6px; padding:5px 10px; }
    .sel-cell > span { font-size:11px; color:var(--text-color-secondary); white-space:nowrap; }
    .sel-cell ::ng-deep .p-select { width:100% !important; min-width:0 !important; }
    .box { border:1px solid var(--surface-border); border-radius:8px; overflow:hidden; }
    .vdiv { border-right:1px solid var(--surface-border); }
    .hdiv { border-bottom:1px solid var(--surface-border); }
  `],
  template: `
    <div style="display:flex; flex-direction:column; box-sizing:border-box;">

      <!-- Panel header -->
      <div style="padding:10px 12px 8px; border-bottom:1px solid var(--surface-border); background:rgba(99,102,241,0.06);">
        <span style="font-size:10px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:#6366f1;">Display Properties</span>
      </div>

      <div style="padding:12px; display:flex; flex-direction:column; gap:10px;">

        <!-- ── FIELDS ── -->
        <div class="box">
          <div class="sec-hdr" style="background:rgba(99,102,241,0.08); color:#6366f1;">Fields</div>
          <div style="display:grid; grid-template-columns:1fr 1fr;">
            @for (f of simpleFields; track f.key; let i = $index) {
              <div class="cell"
                   [class.vdiv]="i % 2 === 0"
                   [class.hdiv]="i < simpleFields.length - 2"
                   [style.background]="i % 2 === 0 ? 'rgba(99,102,241,0.03)' : ''">
                <span>{{ f.label }}</span>
                <p-toggleswitch [ngModel]="getVal(f.key)" (ngModelChange)="onToggle(f.key, $event)" />
              </div>
            }
          </div>
        </div>

        <!-- ── LABELS | SUB-ITEMS + MODULES ── -->
        <div class="box" style="display:grid; grid-template-columns:1fr 1fr;">

          <!-- Labels (purple) -->
          <div class="vdiv" style="background:rgba(139,92,246,0.04);">
            <div class="cell hdiv" style="background:rgba(139,92,246,0.1);">
              <span style="font-weight:600; color:#8b5cf6;">Labels</span>
              <p-toggleswitch [ngModel]="displayProps.showLabels" (ngModelChange)="onToggle('showLabels',$event)" />
            </div>
            @if (displayProps.showLabels) {
              <div class="cell hdiv cell-sm" style="gap:5px; justify-content:flex-start;">
                <span style="width:32px; flex-shrink:0; flex:unset; font-size:11px; color:var(--text-color-secondary);">Mode</span>
                <label style="display:flex;align-items:center;gap:3px;cursor:pointer;font-size:11px;color:var(--text-color);white-space:nowrap;">
                  <p-radiobutton name="lm" value="badge" [ngModel]="displayProps.labelMode" (ngModelChange)="onToggle('labelMode',$event)" />Badge
                </label>
                <label style="display:flex;align-items:center;gap:3px;cursor:pointer;font-size:11px;color:var(--text-color);margin-left:4px;white-space:nowrap;">
                  <p-radiobutton name="lm" value="dot" [ngModel]="displayProps.labelMode" (ngModelChange)="onToggle('labelMode',$event)" />Dot
                </label>
              </div>
              <div class="cell hdiv cell-sm">
                <span>Max shown</span>
                <div class="sp"><p-inputnumber [ngModel]="displayProps.maxLabels" (ngModelChange)="onToggle('maxLabels',$event)" [min]="1" [max]="4" [showButtons]="true" inputStyleClass="text-xs" size="small" /></div>
              </div>
              <div class="cell cell-sm">
                <span>Always show</span>
                <p-toggleswitch [ngModel]="displayProps.alwaysShowLabels" (ngModelChange)="onToggle('alwaysShowLabels',$event)" />
              </div>
            }
          </div>

          <!-- Sub-items (green) + Modules (amber) -->
          <div style="display:flex; flex-direction:column;">
            <div class="sec-hdr hdiv" style="background:rgba(16,185,129,0.1); color:#10b981;">Sub-items</div>
            <div class="cell hdiv cell-sm" style="background:rgba(16,185,129,0.03);">
              <span>Show count</span>
              <p-toggleswitch [ngModel]="displayProps.showSubItemCount" (ngModelChange)="onToggle('showSubItemCount',$event)" />
            </div>
            <div class="cell hdiv cell-sm" style="background:rgba(16,185,129,0.03);">
              <span>Depth <span style="font-size:9px;opacity:.6;">(0=ẩn)</span></span>
              <div class="sp"><p-inputnumber [ngModel]="displayProps.maxSubItemDepth" (ngModelChange)="onToggle('maxSubItemDepth',$event)" [min]="0" [max]="5" [showButtons]="true" inputStyleClass="text-xs" size="small" /></div>
            </div>
            <div class="cell hdiv" style="background:rgba(245,158,11,0.1);">
              <span style="font-weight:600; color:#f59e0b;">Modules</span>
              <p-toggleswitch [ngModel]="displayProps.showModules" (ngModelChange)="onToggle('showModules',$event)" />
            </div>
            <div class="cell cell-sm" style="background:rgba(245,158,11,0.03);"
                 [style.opacity]="displayProps.showModules?'1':'0.4'"
                 [class.pointer-events-none]="!displayProps.showModules">
              <span>Max shown</span>
              <div class="sp"><p-inputnumber [ngModel]="displayProps.maxModules" (ngModelChange)="onToggle('maxModules',$event)" [min]="1" [max]="3" [showButtons]="true" [disabled]="!displayProps.showModules" inputStyleClass="text-xs" size="small" /></div>
            </div>
          </div>

        </div>

        <!-- ── VIEW | OPEN TASK AS ── -->
        <div class="box" style="display:grid; grid-template-columns:1fr 1fr;">

          <div class="vdiv" style="background:rgba(59,130,246,0.04);">
            <div class="sec-hdr hdiv" style="background:rgba(59,130,246,0.1); color:#3b82f6;">View</div>
            <div class="sel-cell hdiv"><span>Group</span><p-select [options]="groupByOptions" [ngModel]="selectedGroupBy" optionLabel="label" optionValue="value" styleClass="text-xs" (ngModelChange)="groupByChange.emit($event)" /></div>
            <div class="sel-cell"><span>Order</span><p-select [options]="orderByOptions" [ngModel]="selectedOrderBy" optionLabel="label" optionValue="value" styleClass="text-xs" (ngModelChange)="orderByChange.emit($event)" /></div>
          </div>

          <div style="background:rgba(20,184,166,0.04);">
            <div class="sec-hdr hdiv" style="background:rgba(20,184,166,0.1); color:#14b8a6;">Open task as</div>
            <div class="sel-cell hdiv"><span>Create</span><p-select [options]="creationModeOptions" [ngModel]="displayProps.taskCreationViewMode || 'popup'" optionLabel="label" optionValue="value" styleClass="text-xs" (ngModelChange)="onToggle('taskCreationViewMode',$event)" /></div>
            <div class="sel-cell"><span>Detail</span><p-select [options]="detailModeOptions" [ngModel]="displayProps.taskDetailViewMode || 'right-pane'" optionLabel="label" optionValue="value" styleClass="text-xs" (ngModelChange)="onToggle('taskDetailViewMode',$event)" /></div>
          </div>

        </div>

      </div>
    </div>
  `,
})
export class DisplayPropertiesPanelComponent {
  @Input() displayProps: DisplayProperties = DEFAULT_DISPLAY_PROPS;
  @Input() selectedGroupBy = 'none';
  @Input() selectedOrderBy = 'rank';

  @Output() displayPropsChange = new EventEmitter<Partial<DisplayProperties>>();
  @Output() groupByChange = new EventEmitter<string>();
  @Output() orderByChange = new EventEmitter<string>();

  readonly simpleFields: { key: keyof DisplayProperties; label: string }[] = [
    { key: 'showAssignee',  label: 'Assignee'   },
    { key: 'showPriority',  label: 'Priority'   },
    { key: 'showDueDate',   label: 'Due date'   },
    { key: 'showStartDate', label: 'Start date' },
    { key: 'showEstimate',  label: 'Estimate'   },
    { key: 'showState',     label: 'State'      },
  ];

  getVal(key: keyof DisplayProperties): boolean {
    return !!this.displayProps[key];
  }

  readonly groupByOptions = [
    { label: 'None', value: 'none' },
    { label: 'State', value: 'state' },
    { label: 'Priority', value: 'priority' },
    { label: 'Assignee', value: 'assignee' },
  ];

  readonly orderByOptions = [
    { label: 'Manual Rank', value: 'rank' },
    { label: 'Created date', value: 'created_at' },
    { label: 'Due date', value: 'due_date' },
    { label: 'Priority', value: 'priority' },
  ];

  readonly creationModeOptions = [
    { label: 'Popup', value: 'popup' },
    { label: 'Right Pane', value: 'right-pane' },
    { label: 'Full Page', value: 'full-page' },
  ];

  readonly detailModeOptions = [
    { label: 'Popup', value: 'popup' },
    { label: 'Right Pane', value: 'right-pane' },
    { label: 'Full Page', value: 'full-page' },
  ];

  onToggle(key: keyof DisplayProperties, value: boolean | string | number): void {
    this.displayPropsChange.emit({ [key]: value } as Partial<DisplayProperties>);
  }
}
