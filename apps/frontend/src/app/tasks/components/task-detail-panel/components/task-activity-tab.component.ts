import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
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
          <!-- Avatar -->
          <div class="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-semibold"
            [class]="entry.actorAvatar ? '' : 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600'">
            @if (entry.actorAvatar) {
              <img [src]="entry.actorAvatar" class="w-7 h-7 rounded-full object-cover" />
            } @else {
              {{ (entry.actorName ?? '?')[0].toUpperCase() }}
            }
          </div>

          <!-- Content -->
          <div class="flex-1 min-w-0">
            <div class="flex items-baseline gap-2">
              <span class="font-medium text-gray-800 dark:text-surface-100">{{ entry.actorName ?? 'Unknown' }}</span>
              <span class="text-xs text-gray-400 flex-shrink-0">{{ formatRelativeTime(entry.createdAt) }}</span>
              @if (entry.entryType === 'comment_edited') {
                <span class="text-[10px] text-gray-400 italic">(đã sửa)</span>
              }
            </div>

            @if (isComment(entry.entryType)) {
              <!-- Comment: view or inline-edit mode -->
              @if (editingId() === entry.id) {
                <div class="mt-1">
                  <textarea pTextarea class="w-full text-sm" rows="3" [(ngModel)]="editText"></textarea>
                  <div class="flex gap-2 mt-1">
                    <button pButton label="Lưu" size="small" (click)="saveEdit(entry.id)" [disabled]="!editText.trim()"></button>
                    <button pButton label="Hủy" size="small" severity="secondary" [text]="true" (click)="cancelEdit()"></button>
                  </div>
                </div>
              } @else {
                <p class="text-gray-700 dark:text-surface-200 mt-0.5 break-words whitespace-pre-wrap">{{ entry.comment }}</p>
                @if (entry.actorId === currentUserId) {
                  <div class="flex gap-2 mt-1">
                    <button pButton label="Sửa" size="small" [text]="true" (click)="startEdit(entry)"></button>
                    <button pButton label="Xóa" size="small" [text]="true" severity="danger" (click)="deleteComment.emit(entry.id)"></button>
                  </div>
                }
              }
            } @else {
              <p class="text-gray-500 dark:text-surface-400 mt-0.5 text-xs">{{ formatActivity(entry) }}</p>
            }
          </div>
        </div>
      }

      @if (!activity.length) {
        <p class="text-center text-xs text-gray-400 py-4">Chưa có hoạt động nào.</p>
      }

      <!-- New comment input -->
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
  @Output() editComment = new EventEmitter<{ id: string; content: string }>();
  @Output() deleteComment = new EventEmitter<string>();

  protected newComment = '';
  protected editText = '';
  protected readonly editingId = signal<string | null>(null);

  protected isComment(type: string): boolean {
    return type === 'comment_added' || type === 'comment_edited';
  }

  protected startEdit(entry: TaskActivity): void {
    this.editingId.set(entry.id);
    this.editText = entry.comment ?? '';
  }

  protected cancelEdit(): void {
    this.editingId.set(null);
    this.editText = '';
  }

  protected saveEdit(commentId: string): void {
    const content = this.editText.trim();
    if (!content) return;
    this.editComment.emit({ id: commentId, content });
    this.cancelEdit();
  }

  protected onSubmit(): void {
    const content = this.newComment.trim();
    if (!content) return;
    this.submitComment.emit(content);
    this.newComment = '';
  }

  protected formatRelativeTime(date: Date | string): string {
    const d = new Date(date);
    const diff = Date.now() - d.getTime();
    if (diff < 60_000) return 'vừa xong';
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} phút trước`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} giờ trước`;
    return d.toLocaleDateString('vi-VN');
  }

  protected formatActivity(entry: TaskActivity): string {
    const { entryType: type, oldValue: ov, newValue: nv, field } = entry;
    switch (type) {
      case 'created':           return 'đã tạo task này';
      case 'title_changed':     return `đổi tiêu đề từ "${ov}" → "${nv}"`;
      case 'description_changed': return 'cập nhật mô tả';
      case 'state_changed':     return `chuyển trạng thái từ "${ov}" → "${nv}"`;
      case 'priority_changed':  return `đổi độ ưu tiên từ ${ov} → ${nv}`;
      case 'type_changed':      return `đổi loại task từ ${ov} → ${nv}`;
      case 'parent_changed':    return nv ? `gán task cha → ${nv}` : 'gỡ task cha';
      case 'estimate_changed':  return nv ? `đặt estimate ${nv}` : 'xóa estimate';
      case 'start_date_changed': return nv ? `đặt ngày bắt đầu ${nv}` : 'xóa ngày bắt đầu';
      case 'due_date_changed':  return nv ? `đặt deadline ${nv}` : 'xóa deadline';
      case 'assignee_added':    return `thêm assignee ${nv ?? ''}`.trim();
      case 'assignee_removed':  return `bỏ assignee ${ov ?? ''}`.trim();
      case 'label_added':       return `gắn nhãn "${nv}"`;
      case 'label_removed':     return `gỡ nhãn "${ov}"`;
      case 'attachment_added':  return `đính kèm tập tin "${nv}"`;
      case 'attachment_removed': return `xóa tập tin đính kèm "${ov}"`;
      case 'link_added':        return `thêm link "${nv}"`;
      case 'link_removed':      return `xóa link "${ov}"`;
      case 'relation_added':    return `thêm liên kết "${nv}"`;
      case 'relation_removed':  return `xóa liên kết "${ov}"`;
      case 'completed':         return 'đánh dấu hoàn thành';
      case 'reopened':          return 'mở lại task';
      case 'deleted':           return 'đã xóa task';
      default:                  return (field ? `${field}: ` : '') + type.replace(/_/g, ' ');
    }
  }
}
