import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TextareaModule } from 'primeng/textarea';
import type { TaskActivity } from '@mpm/shared-types';

@Component({
  standalone: true,
  selector: 'app-task-activity-tab',
  imports: [CommonModule, FormsModule, ButtonModule, TextareaModule],
  template: `
    <div class="p-2 space-y-3">
      @for (entry of activity; track entry.id) {
        <div class="flex gap-3 text-sm">
          <div class="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-xs font-semibold text-indigo-600 flex-shrink-0">
            {{ (entry.actorName ?? '?')[0].toUpperCase() }}
          </div>
          <div class="flex-1">
            <div class="flex items-baseline gap-2">
              <span class="font-medium text-gray-800 dark:text-surface-100">{{ entry.actorName ?? 'Unknown' }}</span>
              <span class="text-xs text-gray-400">{{ formatRelativeTime(entry.createdAt) }}</span>
            </div>
            @if (entry.entryType === 'comment_added' || entry.entryType === 'comment_edited') {
              <p class="text-gray-700 dark:text-surface-200 mt-0.5">{{ entry.comment }}</p>
              @if (entry.actorId === currentUserId) {
                <div class="flex gap-2 mt-1">
                  <button pButton label="Sửa" size="small" text (click)="editComment.emit(entry)"></button>
                  <button pButton label="Xóa" size="small" text severity="danger" (click)="deleteComment.emit(entry.id)"></button>
                </div>
              }
            } @else {
              <p class="text-gray-500 mt-0.5 text-xs">
                {{ formatActivity(entry) }}
              </p>
            }
          </div>
        </div>
      }

      <div class="border-t border-gray-100 dark:border-surface-700 pt-3">
        <textarea pTextarea class="w-full text-sm" rows="3" placeholder="Viết bình luận..."
          [(ngModel)]="newComment"></textarea>
        <div class="flex justify-end mt-2">
          <button pButton label="Gửi" size="small" (click)="onSubmit()" [disabled]="!newComment.trim()"></button>
        </div>
      </div>
    </div>
  `,
})
export class TaskActivityTabComponent {
  @Input() activity: TaskActivity[] = [];
  @Input() currentUserId = '';

  @Output() submitComment = new EventEmitter<string>();
  @Output() editComment = new EventEmitter<TaskActivity>();
  @Output() deleteComment = new EventEmitter<string>();

  protected newComment = '';

  protected onSubmit(): void {
    if (this.newComment.trim()) {
      this.submitComment.emit(this.newComment.trim());
      this.newComment = '';
    }
  }

  protected formatRelativeTime(date: Date | string): string {
    const d = new Date(date);
    const diff = Date.now() - d.getTime();
    if (diff < 60000) return 'vừa xong';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} phút trước`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} giờ trước`;
    return d.toLocaleDateString('vi-VN');
  }

  protected formatActivity(entry: TaskActivity): string {
    const typeMap: Record<string, string> = {
      title_changed: `đổi tiêu đề từ "${entry.oldValue}" → "${entry.newValue}"`,
      state_changed: `đổi state`,
      priority_changed: `đổi priority từ ${entry.oldValue} → ${entry.newValue}`,
      assignee_added: `thêm assignee`,
      assignee_removed: `bỏ assignee`,
      created: 'đã tạo task này',
    };
    return typeMap[entry.entryType] ?? entry.entryType.replace(/_/g, ' ');
  }
}
