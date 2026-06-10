import {
  Component,
  Input,
  Output,
  EventEmitter,
  inject,
  signal,
  effect,
} from '@angular/core';
import { MessageService } from 'primeng/api';

import { RelativeTimePipe } from '../../pipes/relative-time.pipe';
import {
  getPriorityBadgeClasses,
  getPriorityLabel,
  SAVE_STATUS_DURATIONS,
} from './task-header.helpers';
import type { Task } from '@mpm/shared-types';

@Component({
  standalone: true,
  selector: 'app-task-header',
  imports: [RelativeTimePipe],
  template: `
    <div class="flex items-center gap-2 flex-wrap">
      <!-- Task ID Badge (Req 1.1) -->
      <span
        class="font-mono text-xs font-semibold text-gray-600 dark:text-surface-300 bg-gray-100 dark:bg-surface-800 px-2 py-1 rounded cursor-pointer hover:bg-gray-200 dark:hover:bg-surface-700 transition-colors select-none"
        title="Nhấn để sao chép ID"
        (click)="onCopyTaskId()"
        role="button"
        tabindex="0"
        (keydown.enter)="onCopyTaskId()"
        (keydown.space)="onCopyTaskId(); $event.preventDefault()"
        [attr.aria-label]="'Sao chép Task ID ' + taskId()"
      >
        {{ taskId() }}
      </span>

      <!-- Save Status Indicator (Req 1.6, 1.7, 1.8) -->
      @switch (currentSaveStatus()) {
        @case ('saving') {
          <span class="text-xs text-indigo-500 dark:text-indigo-400 animate-pulse font-medium">
            Đang lưu...
          </span>
        }
        @case ('saved') {
          <span class="text-xs text-green-600 dark:text-green-400 font-medium">
            ✓ Đã lưu
          </span>
        }
        @case ('error') {
          <span class="text-xs text-red-600 dark:text-red-400 font-medium">
            ✗ Lỗi lưu
          </span>
        }
      }



      <!-- Spacer -->
      <div class="flex-1"></div>

      <!-- Relative Time (Req 1.9) -->
      @if (task()?.updatedAt) {
        <span class="text-xs text-gray-400 dark:text-surface-500 whitespace-nowrap">
          Chỉnh sửa lần cuối {{ task()!.updatedAt | relativeTime }}
        </span>
      }
    </div>
  `,
})
export class TaskHeaderComponent {
  private readonly messageService = inject(MessageService);

  /** Task data signal from parent */
  @Input({ required: true }) task!: () => Task | null;

  /** Save status signal from parent */
  @Input({ required: true }) saveStatus!: () => 'idle' | 'saving' | 'saved' | 'error';

  /** Emitted after successful clipboard copy */
  @Output() taskIdCopied = new EventEmitter<string>();

  /** Displayed save status — shows 'saved'/'error' for a duration then auto-hides */
  readonly currentSaveStatus = signal<'idle' | 'saving' | 'saved' | 'error'>('idle');

  private hideTimer: ReturnType<typeof setTimeout> | null = null;

  /** Task ID extracted from the task signal for easy template use */
  readonly taskId = signal<string>('');

  /** Priority CSS classes */
  readonly priorityClasses = signal<string>('');

  /** Priority label text */
  readonly priorityLabel = signal<string>('');

  constructor() {
    // Sync task ID and priority from the task signal
    effect(() => {
      const t = this.task?.();
      this.taskId.set(t?.taskId ?? '');
      if (t?.priority) {
        this.priorityClasses.set(getPriorityBadgeClasses(t.priority));
        this.priorityLabel.set(getPriorityLabel(t.priority));
      } else {
        this.priorityClasses.set('');
        this.priorityLabel.set('');
      }
    });

    // Mirror saveStatus and manage auto-hide timing for 'saved' and 'error'
    effect(() => {
      const status = this.saveStatus?.();
      if (!status) return;

      // Clear any existing timer
      if (this.hideTimer) {
        clearTimeout(this.hideTimer);
        this.hideTimer = null;
      }

      this.currentSaveStatus.set(status);

      if (status === 'saved') {
        this.hideTimer = setTimeout(
          () => this.currentSaveStatus.set('idle'),
          SAVE_STATUS_DURATIONS.saved,
        );
      } else if (status === 'error') {
        this.hideTimer = setTimeout(
          () => this.currentSaveStatus.set('idle'),
          SAVE_STATUS_DURATIONS.error,
        );
      }
    });
  }

  /** Clipboard copy handler (Req 1.2, 1.3) */
  async onCopyTaskId(): Promise<void> {
    const id = this.taskId();
    if (!id) return;

    try {
      await navigator.clipboard.writeText(id);
      this.messageService.add({
        severity: 'success',
        summary: 'Đã sao chép',
        detail: `Task ID "${id}" đã được sao chép`,
        life: 1500,
      });
      this.taskIdCopied.emit(id);
    } catch {
      this.messageService.add({
        severity: 'error',
        summary: 'Không thể sao chép',
        detail: 'Trình duyệt không cho phép truy cập clipboard',
        life: 3000,
      });
    }
  }
}
