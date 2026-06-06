import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { InputNumberModule } from 'primeng/inputnumber';
import { MultiSelectModule } from 'primeng/multiselect';
import { TextareaModule } from 'primeng/textarea';
import { TaskAttachmentsComponent } from './task-attachments.component';
import { TaskLinksComponent } from './task-links.component';
import type { Task, TaskAttachment, TaskLink } from '@mpm/shared-types';

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
    MultiSelectModule, TextareaModule, TaskAttachmentsComponent, TaskLinksComponent,
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
        <textarea pTextarea class="w-full text-sm resize-none" rows="6" placeholder="Thêm mô tả..."
          [(ngModel)]="editDescription" (blur)="onBlurDescription()"></textarea>
      </div>
      <app-task-attachments [projectId]="projectId" [taskId]="taskVal.id" [attachments]="taskVal.attachments ?? []"
        (upload)="uploadAttachment.emit($event)" (delete)="deleteAttachment.emit($event)" />
      <app-task-links [links]="taskVal.links ?? []" (add)="addLink.emit($event)" (delete)="deleteLink.emit($event)" />
    }
  `,
})
export class TaskOverviewTabComponent {
  @Input() projectId = '';
  @Input() stateOptions: any[] = [];
  @Input() memberOptions: any[] = [];
  @Input() moduleGroupOptions: any[] = [];
  taskVal: Task | null = null;

  @Input() set task(v: Task | null) {
    this.taskVal = v;
    if (v) {
      this.editStateId = v.stateId;
      this.editPriority = v.priority;
      // Backend returns User[] (field: .id), shared type declares TaskAssignee (field: .userId)
      this.editAssigneeIds = v.assignees?.map((a: any) => a.userId ?? a.id) ?? [];
      this.editEstimate = v.estimateValue;
      this.editStartDate = v.startDate ? new Date(v.startDate) : null;
      this.editDueDate = v.dueDate ? new Date(v.dueDate) : null;
      this.editDescription = v.description ?? '';
      this.editModuleIds = v.modules?.map((m) => m.id) ?? [];
    }
  }

  @Output() saveField = new EventEmitter<{ field: string; value: any }>();
  @Output() saveDescription = new EventEmitter<string>();
  @Output() changeModules = new EventEmitter<string[]>();
  @Output() uploadAttachment = new EventEmitter<FileList>();
  @Output() deleteAttachment = new EventEmitter<TaskAttachment>();
  @Output() addLink = new EventEmitter<{ url: string; title?: string }>();
  @Output() deleteLink = new EventEmitter<TaskLink>();

  protected editStateId = '';
  protected editPriority = '';
  protected editAssigneeIds: string[] = [];
  protected editEstimate: number | null = null;
  protected editStartDate: Date | null = null;
  protected editDueDate: Date | null = null;
  protected editDescription = '';
  protected editModuleIds: string[] = [];
  protected readonly priorityOptions = PRIORITY_OPTIONS;

  protected isOverdue(): boolean {
    return !!this.taskVal?.dueDate && new Date(this.taskVal.dueDate) < new Date();
  }

  protected formatDateToISO(date: Date | null): string | null {
    return date ? date.toISOString().split('T')[0] : null;
  }

  protected onBlurDescription(): void {
    if (this.taskVal && this.editDescription !== this.taskVal.description) {
      this.saveDescription.emit(this.editDescription);
    }
  }
}
