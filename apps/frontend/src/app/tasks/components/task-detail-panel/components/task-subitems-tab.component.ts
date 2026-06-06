import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import type { Task } from '@mpm/shared-types';

@Component({
  standalone: true,
  selector: 'app-task-subitems-tab',
  imports: [CommonModule, FormsModule, ButtonModule, InputTextModule],
  template: `
    @if (task) {
      <div class="space-y-1 p-2">
        @for (child of task.children ?? []; track child.id) {
          <div
            class="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-gray-50 dark:hover:bg-surface-800 cursor-pointer text-sm"
            (click)="openChild.emit(child.taskId)"
          >
            <span class="font-mono text-xs text-gray-400">{{ child.taskId }}</span>
            <span class="flex-1 text-gray-800 dark:text-surface-100">{{ child.title }}</span>
            @if (child.state) {
              <span class="text-xs px-1.5 py-0.5 rounded"
                [style.background]="child.state.color + '22'"
                [style.color]="child.state.color"
              >{{ child.state.name }}</span>
            }
          </div>
        }
        <div class="flex gap-2 mt-2">
          <input pInputText class="flex-1 text-sm" placeholder="Thêm sub-item..." [(ngModel)]="newChildTitle"
            (keydown.enter)="onAdd()" />
          <button pButton label="Thêm" size="small" (click)="onAdd()" [disabled]="!newChildTitle.trim()"></button>
        </div>
      </div>
    }
  `,
})
export class TaskSubitemsTabComponent {
  @Input() task: Task | null = null;
  @Output() openChild = new EventEmitter<string>();
  @Output() addSubItem = new EventEmitter<string>();

  protected newChildTitle = '';

  protected onAdd(): void {
    if (this.newChildTitle.trim()) {
      this.addSubItem.emit(this.newChildTitle);
      this.newChildTitle = '';
    }
  }
}
