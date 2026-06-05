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
  template: `
    <div class="w-80 p-4 flex flex-col gap-4">
      <h3 class="text-sm font-semibold text-gray-700 dark:text-surface-200 uppercase tracking-wide">
        Display Properties
      </h3>

      <!-- Property Toggles -->
      <div class="flex flex-col gap-3">
        <div class="flex items-center justify-between">
          <label class="text-sm text-gray-600 dark:text-surface-300">Assignee</label>
          <p-toggleswitch
            [ngModel]="displayProps.showAssignee"
            (ngModelChange)="onToggle('showAssignee', $event)"
          />
        </div>

        <div class="flex items-center justify-between">
          <label class="text-sm text-gray-600 dark:text-surface-300">Priority</label>
          <p-toggleswitch
            [ngModel]="displayProps.showPriority"
            (ngModelChange)="onToggle('showPriority', $event)"
          />
        </div>

        <div class="flex items-center justify-between">
          <label class="text-sm text-gray-600 dark:text-surface-300">Due date</label>
          <p-toggleswitch
            [ngModel]="displayProps.showDueDate"
            (ngModelChange)="onToggle('showDueDate', $event)"
          />
        </div>

        <div class="flex items-center justify-between">
          <label class="text-sm text-gray-600 dark:text-surface-300">Start date</label>
          <p-toggleswitch
            [ngModel]="displayProps.showStartDate"
            (ngModelChange)="onToggle('showStartDate', $event)"
          />
        </div>

        <div class="flex items-center justify-between">
          <label class="text-sm text-gray-600 dark:text-surface-300">Labels</label>
          <p-toggleswitch
            [ngModel]="displayProps.showLabels"
            (ngModelChange)="onToggle('showLabels', $event)"
          />
        </div>

        <!-- Labels sub-options -->
        @if (displayProps.showLabels) {
          <div class="ml-4 pl-3 border-l-2 border-gray-200 dark:border-surface-600 flex flex-col gap-2">
            <!-- Label Mode -->
            <div class="flex flex-col gap-1">
              <span class="text-xs text-gray-500 dark:text-surface-400">Mode</span>
              <div class="flex items-center gap-4">
                <div class="flex items-center gap-1">
                  <p-radiobutton
                    name="labelMode"
                    value="badge"
                    [ngModel]="displayProps.labelMode"
                    (ngModelChange)="onToggle('labelMode', $event)"
                  />
                  <label class="text-xs text-gray-600 dark:text-surface-300">Badge</label>
                </div>
                <div class="flex items-center gap-1">
                  <p-radiobutton
                    name="labelMode"
                    value="dot"
                    [ngModel]="displayProps.labelMode"
                    (ngModelChange)="onToggle('labelMode', $event)"
                  />
                  <label class="text-xs text-gray-600 dark:text-surface-300">Dot</label>
                </div>
              </div>
            </div>

            <!-- Max Labels -->
            <div class="flex items-center justify-between">
              <span class="text-xs text-gray-500 dark:text-surface-400">Max</span>
              <p-inputnumber
                [ngModel]="displayProps.maxLabels"
                (ngModelChange)="onToggle('maxLabels', $event)"
                [min]="1"
                [max]="4"
                [showButtons]="true"
                [style]="{ width: '5rem' }"
                inputStyleClass="text-xs w-full"
                size="small"
              />
            </div>

            <!-- Always Show -->
            <div class="flex items-center justify-between">
              <span class="text-xs text-gray-500 dark:text-surface-400">Always show</span>
              <p-toggleswitch
                [ngModel]="displayProps.alwaysShowLabels"
                (ngModelChange)="onToggle('alwaysShowLabels', $event)"
              />
            </div>
          </div>
        }

        <div class="flex items-center justify-between">
          <label class="text-sm text-gray-600 dark:text-surface-300">Estimate</label>
          <p-toggleswitch
            [ngModel]="displayProps.showEstimate"
            (ngModelChange)="onToggle('showEstimate', $event)"
          />
        </div>

        <div class="flex items-center justify-between">
          <label class="text-sm text-gray-600 dark:text-surface-300">Sub-item count</label>
          <p-toggleswitch
            [ngModel]="displayProps.showSubItemCount"
            (ngModelChange)="onToggle('showSubItemCount', $event)"
          />
        </div>

        <div class="flex items-center justify-between">
          <label class="text-sm text-gray-600 dark:text-surface-300">State</label>
          <p-toggleswitch
            [ngModel]="displayProps.showState"
            (ngModelChange)="onToggle('showState', $event)"
          />
        </div>

        <div class="flex items-center justify-between">
          <label class="text-sm text-gray-600 dark:text-surface-300">Modules</label>
          <p-toggleswitch
            [ngModel]="displayProps.showModules"
            (ngModelChange)="onToggle('showModules', $event)"
          />
        </div>

        <!-- Modules sub-options (disabled when showModules = false) -->
        <div class="ml-4 pl-3 border-l-2 border-gray-200 dark:border-surface-600 flex flex-col gap-2"
             [class.opacity-50]="!displayProps.showModules"
             [class.pointer-events-none]="!displayProps.showModules">
          <div class="flex items-center justify-between">
            <span class="text-xs text-gray-500 dark:text-surface-400">Max</span>
            <p-inputnumber
              [ngModel]="displayProps.maxModules"
              (ngModelChange)="onToggle('maxModules', $event)"
              [min]="1"
              [max]="3"
              [showButtons]="true"
              [disabled]="!displayProps.showModules"
              [style]="{ width: '5rem' }"
              inputStyleClass="text-xs w-full"
              size="small"
            />
          </div>
        </div>
      </div>

      <!-- Divider -->
      <hr class="border-gray-200 dark:border-surface-600" />

      <!-- Group by -->
      <div class="flex flex-col gap-1">
        <label class="text-xs text-gray-500 dark:text-surface-400 uppercase tracking-wide">Group by</label>
        <p-select
          [options]="groupByOptions"
          [ngModel]="selectedGroupBy"
          optionLabel="label"
          optionValue="value"
          styleClass="w-full text-sm"
          (ngModelChange)="groupByChange.emit($event)"
        />
      </div>

      <!-- Order by -->
      <div class="flex flex-col gap-1">
        <label class="text-xs text-gray-500 dark:text-surface-400 uppercase tracking-wide">Order by</label>
        <p-select
          [options]="orderByOptions"
          [ngModel]="selectedOrderBy"
          optionLabel="label"
          optionValue="value"
          styleClass="w-full text-sm"
          (ngModelChange)="orderByChange.emit($event)"
        />
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

  onToggle(key: keyof DisplayProperties, value: boolean | string | number): void {
    this.displayPropsChange.emit({ [key]: value } as Partial<DisplayProperties>);
  }
}
