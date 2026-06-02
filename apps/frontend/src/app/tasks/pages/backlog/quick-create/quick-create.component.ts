import {
  Component, Input, Output, EventEmitter, ElementRef, ViewChild, OnChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';

import type { TaskType, CreateTaskDto } from '@mpm/shared-types';

@Component({
  standalone: true,
  selector: 'app-quick-create',
  imports: [CommonModule, FormsModule, ButtonModule, InputTextModule, SelectModule],
  template: `
    <div class="flex items-center gap-2 px-4 py-2 border-t border-gray-200 dark:border-surface-700 bg-white dark:bg-surface-900">
      <!-- Type selector -->
      <p-select
        [options]="typeOptions"
        [(ngModel)]="selectedType"
        optionLabel="label"
        optionValue="value"
        styleClass="text-sm w-28 flex-shrink-0"
      />

      <!-- Title input -->
      <input
        #titleInput
        pInputText
        class="flex-1 text-sm"
        placeholder="Nhập title task và nhấn Enter..."
        [(ngModel)]="title"
        (keydown.enter)="onSubmit()"
        (keydown.escape)="onCancel()"
        autofocus
      />

      <button pButton label="Thêm" size="small"
        (click)="onSubmit()" [disabled]="!title.trim()"></button>
      <button pButton label="Hủy" severity="secondary" size="small" text
        (click)="onCancel()"></button>
    </div>
  `,
})
export class QuickCreateComponent implements OnChanges {
  @Input() visible = false;
  @Input() parentId?: string;

  @Output() create = new EventEmitter<CreateTaskDto>();
  @Output() cancel = new EventEmitter<void>();

  @ViewChild('titleInput') titleInput?: ElementRef<HTMLInputElement>;

  protected title = '';
  protected selectedType: TaskType = 'task';

  readonly typeOptions = [
    { label: '⚡ Epic', value: 'epic' },
    { label: '📖 Story', value: 'story' },
    { label: '✅ Task', value: 'task' },
    { label: '↳ Subtask', value: 'subtask' },
  ];

  ngOnChanges(): void {
    if (this.visible) {
      setTimeout(() => this.titleInput?.nativeElement.focus(), 50);
    }
  }

  protected onSubmit(): void {
    const t = this.title.trim();
    if (!t) return;
    this.create.emit({
      title: t,
      type: this.selectedType,
      parentId: this.parentId,
    });
    this.title = '';
  }

  protected onCancel(): void {
    this.title = '';
    this.cancel.emit();
  }
}
