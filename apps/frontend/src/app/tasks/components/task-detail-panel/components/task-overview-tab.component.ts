import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { InputNumberModule } from 'primeng/inputnumber';
import { MultiSelectModule } from 'primeng/multiselect';
import { TooltipModule } from 'primeng/tooltip';
import { TaskAttachmentsComponent } from './task-attachments.component';
import { TaskLinksComponent } from './task-links.component';
import { LayoutService } from '../../../../layout/services/layout.service';
import { RichTextEditorComponent } from '../../../../shared/components/rich-text-editor/rich-text-editor.component';
import type { Task, TaskAttachment, TaskLink, TiptapDoc } from '@mpm/shared-types';

const PRIORITY_OPTIONS = [
  { label: '🔴 Urgent', value: 'urgent' }, { label: '🟠 High', value: 'high' },
  { label: '🟡 Medium', value: 'medium' }, { label: '🔵 Low', value: 'low' },
  { label: '⚪ None', value: 'none' },
];

@Component({
  standalone: true,
  selector: 'app-task-overview-tab',
  imports: [
    CommonModule, FormsModule, SelectModule, DatePickerModule, InputNumberModule,
    MultiSelectModule, TooltipModule, TaskAttachmentsComponent, TaskLinksComponent, RichTextEditorComponent,
  ],
  template: `
    @if (taskVal) {
      <div class="grid grid-cols-2 gap-x-6 gap-y-3 text-sm p-2">
        <div>
          <label class="text-xs text-gray-500 uppercase tracking-wide mb-1 block">State</label>
          <p-select [options]="stateOptions" [(ngModel)]="editStateId" optionLabel="name" optionValue="id"
            placeholder="Chọn state" styleClass="w-full text-sm" (ngModelChange)="saveField.emit({ field: 'stateId', value: $event })" />
        </div>
        <div>
          <label class="text-xs text-gray-500 uppercase tracking-wide mb-1 block">Priority</label>
          <p-select [options]="priorityOptions" [(ngModel)]="editPriority" optionLabel="label" optionValue="value"
            placeholder="Chọn priority" styleClass="w-full text-sm" (ngModelChange)="saveField.emit({ field: 'priority', value: $event })" />
        </div>
        <div class="col-span-2">
          <label class="text-xs text-gray-500 uppercase tracking-wide mb-1 block">Assignees</label>
          <p-multiselect [options]="memberOptions" [(ngModel)]="editAssigneeIds" optionLabel="displayName" optionValue="userId"
            placeholder="Thêm assignee" styleClass="w-full text-sm" (ngModelChange)="saveField.emit({ field: 'assigneeIds', value: $event })" />
        </div>
        <div class="col-span-2">
          <label class="text-xs text-gray-500 uppercase tracking-wide mb-1 block">Nhãn (Labels)</label>
          <p-multiselect
            [options]="labelOptions"
            [ngModel]="editLabelIds"
            optionLabel="name"
            optionValue="id"
            placeholder="Chọn nhãn..."
            styleClass="w-full text-sm"
            (ngModelChange)="onLabelsChange($event)"
          >
            <!-- Custom dropdown item template -->
            <ng-template let-label pTemplate="item">
              <div class="flex items-center gap-2" [pTooltip]="label.description ? label.name + ': ' + label.description : label.name">
                @if (isScoped(label.name)) {
                  <span class="inline-flex items-center text-xs rounded-full overflow-hidden border border-gray-200 dark:border-surface-700 font-medium bg-white dark:bg-surface-800">
                    <span class="px-1.5 py-px text-white" 
                          [style.background]="layoutService.getAdaptiveColor(getScopeColor(label.name, label.color))" 
                          [style.color]="layoutService.getTextColor(layoutService.getAdaptiveColor(getScopeColor(label.name, label.color)))">{{ getScope(label.name) }}</span>
                    <span class="px-1.5 py-px" 
                          [style.background]="layoutService.getAdaptiveColor(label.color) + '18'" 
                          [style.color]="layoutService.getAdaptiveColor(label.color)">{{ getValue(label.name) }}</span>
                  </span>
                } @else {
                  <span class="text-xs px-2 py-0.5 rounded-full font-medium" 
                        [style.background]="layoutService.getAdaptiveColor(label.color) + '22'" 
                        [style.color]="layoutService.getAdaptiveColor(label.color)">
                    {{ label.name }}
                  </span>
                }
              </div>
            </ng-template>

            <!-- Custom selected items chip template -->
            <ng-template pTemplate="selectedItems">
              <div class="flex flex-wrap gap-1">
                @for (valId of editLabelIds; track valId) {
                  @let label = getLabelById(valId);
                  @if (label) {
                    @if (isScoped(label.name)) {
                      <span class="inline-flex items-center text-[10px] rounded-full overflow-hidden border border-gray-200 dark:border-surface-700 font-medium bg-white dark:bg-surface-800" [pTooltip]="label.description ? label.name + ': ' + label.description : label.name">
                        <span class="px-1.5 py-px text-white" 
                              [style.background]="layoutService.getAdaptiveColor(getScopeColor(label.name, label.color))" 
                              [style.color]="layoutService.getTextColor(layoutService.getAdaptiveColor(getScopeColor(label.name, label.color)))">{{ getScope(label.name) }}</span>
                        <span class="px-1.5 py-px" 
                              [style.background]="layoutService.getAdaptiveColor(label.color) + '18'" 
                              [style.color]="layoutService.getAdaptiveColor(label.color)">{{ getValue(label.name) }}</span>
                      </span>
                    } @else {
                      <span class="text-[10px] px-2 py-px rounded-full font-medium bg-white dark:bg-surface-800 border" 
                            [style.border-color]="layoutService.getAdaptiveColor(label.color)" 
                            [style.color]="layoutService.getAdaptiveColor(label.color)"
                            [pTooltip]="label.description ? label.name + ': ' + label.description : label.name">
                        {{ label.name }}
                      </span>
                    }
                  }
                }
                @if (!editLabelIds || editLabelIds.length === 0) {
                  <span class="text-gray-400 text-xs">Chọn nhãn...</span>
                }
              </div>
            </ng-template>
          </p-multiselect>
        </div>
        <div>
          <label class="text-xs text-gray-500 uppercase tracking-wide mb-1 block">Estimate</label>
          <p-inputnumber [(ngModel)]="editEstimate" [min]="0" styleClass="w-full text-sm"
            (onBlur)="saveField.emit({ field: 'estimateValue', value: editEstimate })" />
        </div>
        <div>
          <label class="text-xs text-gray-500 uppercase tracking-wide mb-1 block">Bắt đầu</label>
          <p-datepicker [(ngModel)]="editStartDate" dateFormat="dd/mm/yy" styleClass="w-full text-sm"
            (ngModelChange)="saveField.emit({ field: 'startDate', value: formatDateToISO($event) })" />
        </div>
        <div>
          <label class="text-xs text-gray-500 uppercase tracking-wide mb-1 block">Hết hạn</label>
          <p-datepicker [(ngModel)]="editDueDate" dateFormat="dd/mm/yy" styleClass="w-full text-sm" [class.border-red-500]="isOverdue()"
            (ngModelChange)="saveField.emit({ field: 'dueDate', value: formatDateToISO($event) })" />
        </div>
        <div>
          <label class="text-xs text-gray-500 uppercase tracking-wide mb-1 block">Reporter</label>
          <span class="text-gray-700 dark:text-surface-200">{{ taskVal.reporter?.displayName }}</span>
        </div>
        <div>
          <label class="text-xs text-gray-500 uppercase tracking-wide mb-1 block">Tạo lúc</label>
          <span class="text-gray-500 text-xs">{{ taskVal.createdAt | date:'dd/MM/yyyy HH:mm' }}</span>
        </div>
      </div>
      <!-- Modules -->
      <div class="mt-3 px-2">
        <label class="text-xs text-gray-500 uppercase tracking-wide mb-1 block">Modules</label>
        <p-multiselect
          [options]="moduleGroupOptions"
          [(ngModel)]="editModuleIds"
          [group]="true"
          optionLabel="name"
          optionValue="id"
          optionGroupLabel="label"
          optionGroupChildren="items"
          placeholder="Chọn modules..."
          styleClass="w-full text-sm"
          display="chip"
          (ngModelChange)="changeModules.emit($event)"
        >
          <!-- Group header — keep icon+label -->
          <ng-template let-group pTemplate="group">
            <div class="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <i [class]="group.icon" class="text-xs"></i>
              <span>{{ group.label }}</span>
            </div>
          </ng-template>
          <!-- No custom item template: PrimeNG renders default checkbox + optionLabel so selection is visible -->
        </p-multiselect>
      </div>
      <div class="mt-4 px-2">
        <label class="text-xs text-gray-500 uppercase tracking-wide mb-2 block">Mô tả</label>
        <app-rich-text-editor [(ngModel)]="editDescription" placeholder="Thêm mô tả..."
          (blurEditor)="onBlurDescription()"></app-rich-text-editor>
      </div>
      <app-task-attachments [projectId]="projectId" [taskId]="taskVal.id" [attachments]="taskVal.attachments ?? []"
        (upload)="uploadAttachment.emit($event)" (delete)="deleteAttachment.emit($event)"
        (deleteGroup)="deleteAttachmentGroup.emit($event)" (batchUpdate)="batchUpdateAttachments.emit($event)" />
      <app-task-links [links]="taskVal.links ?? []" (add)="addLink.emit($event)" (delete)="deleteLink.emit($event)" />
    }
  `,
})
export class TaskOverviewTabComponent {
  protected readonly layoutService = inject(LayoutService);

  @Input() projectId = '';
  @Input() stateOptions: any[] = [];
  @Input() memberOptions: any[] = [];
  @Input() moduleGroupOptions: any[] = [];
  @Input() labelOptions: any[] = [];
  taskVal: Task | null = null;

  @Input() set task(v: Task | null) {
    this.taskVal = v;
    if (v) {
      this.editStateId = v.stateId;
      this.editPriority = v.priority;
      
      const newAssigneeIds = v.assignees?.map((a: any) => a.userId ?? a.id) ?? [];
      if (!this.areArraysEqual(this.editAssigneeIds, newAssigneeIds)) {
        this.editAssigneeIds = newAssigneeIds;
      }
      
      this.editEstimate = v.estimateValue;
      this.editStartDate = v.startDate ? new Date(v.startDate) : null;
      this.editDueDate = v.dueDate ? new Date(v.dueDate) : null;
      this.editDescription = v.description ?? null;
      
      const newModuleIds = v.modules?.map((m) => m.id) ?? [];
      if (!this.areArraysEqual(this.editModuleIds, newModuleIds)) {
        this.editModuleIds = newModuleIds;
      }
      
      const newLabelIds = v.labels?.map((l) => l.id) ?? [];
      if (!this.areArraysEqual(this.editLabelIds, newLabelIds)) {
        this.editLabelIds = newLabelIds;
      }
    }
  }

  private areArraysEqual(a: string[], b: string[]): boolean {
    if (!a || !b) return false;
    if (a.length !== b.length) return false;
    const setA = new Set(a);
    return b.every(val => setA.has(val));
  }

  @Output() saveField = new EventEmitter<{ field: string; value: any }>();
  @Output() saveDescription = new EventEmitter<TiptapDoc | null>();
  @Output() changeModules = new EventEmitter<string[]>();
  @Output() uploadAttachment = new EventEmitter<{ files: FileList; title: string }>();
  @Output() deleteAttachment = new EventEmitter<TaskAttachment>();
  @Output() deleteAttachmentGroup = new EventEmitter<TaskAttachment[]>();
  @Output() batchUpdateAttachments = new EventEmitter<Array<{ id: string; title?: string | null; sortOrder?: number }>>();
  @Output() addLink = new EventEmitter<{ url: string; title?: string }>();
  @Output() deleteLink = new EventEmitter<TaskLink>();

  protected editStateId = '';
  protected editPriority = '';
  protected editAssigneeIds: string[] = [];
  protected editLabelIds: string[] = [];
  protected editEstimate: number | null = null;
  protected editStartDate: Date | null = null;
  protected editDueDate: Date | null = null;
  protected editDescription: TiptapDoc | null = null;
  protected editModuleIds: string[] = [];
  protected readonly priorityOptions = PRIORITY_OPTIONS;

  protected isOverdue(): boolean {
    return !!this.taskVal?.dueDate && new Date(this.taskVal.dueDate) < new Date();
  }

  protected formatDateToISO(date: Date | null): string | null {
    return date ? date.toISOString().split('T')[0] : null;
  }

  protected onBlurDescription(): void {
    if (this.taskVal && JSON.stringify(this.editDescription) !== JSON.stringify(this.taskVal.description)) {
      this.saveDescription.emit(this.editDescription);
    }
  }

  protected onLabelsChange(newLabelIds: string[]): void {
    let filteredIds: string[] = [];
    const previousIds = this.editLabelIds;
    const addedId = newLabelIds.find(id => !previousIds.includes(id));

    if (addedId) {
      const addedLabel = this.labelOptions.find(l => l.id === addedId);
      if (addedLabel && addedLabel.name.includes('::') && addedLabel.isExclusive !== false) {
        const scope = addedLabel.name.split('::')[0].trim().toLowerCase();
        filteredIds = newLabelIds.filter(id => {
          if (id === addedId) return true;
          const label = this.labelOptions.find(l => l.id === id);
          if (label && label.name.includes('::') && label.isExclusive !== false) {
            return label.name.split('::')[0].trim().toLowerCase() !== scope;
          }
          return true;
        });
      } else {
        filteredIds = newLabelIds;
      }
    } else {
      filteredIds = newLabelIds;
    }

    this.editLabelIds = filteredIds;
    this.saveField.emit({ field: 'labelIds', value: filteredIds });
  }

  protected isScoped(name: string): boolean { return name.includes('::'); }
  protected getScope(name: string): string { return name.split('::')[0].trim(); }
  protected getValue(name: string): string { return name.split('::').slice(1).join('::').trim(); }

  protected getScopeColor(name: string, fallbackColor: string): string {
    if (!this.isScoped(name)) return fallbackColor;
    const scope = this.getScope(name).toLowerCase();
    const match = this.labelOptions.find(l => l.name.includes('::') && l.name.split('::')[0].trim().toLowerCase() === scope);
    return match ? match.color : fallbackColor;
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

  protected getLabelById(id: string): any {
    return this.labelOptions.find(l => l.id === id);
  }
}
