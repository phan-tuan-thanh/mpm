import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { AttachmentService } from '../../../services/attachment.service';
import type { TaskAttachment } from '@mpm/shared-types';

@Component({
  standalone: true,
  selector: 'app-task-attachments',
  imports: [CommonModule, ButtonModule],
  template: `
    <div class="mt-4 px-2">
      <div class="flex items-center justify-between mb-2">
        <label class="text-xs text-gray-500 uppercase tracking-wide">Attachments ({{ attachments?.length ?? 0 }})</label>
        <label class="cursor-pointer">
          <input type="file" class="hidden" (change)="onUpload($event)" multiple />
          <span class="text-xs text-indigo-600 hover:text-indigo-800 cursor-pointer">+ Upload</span>
        </label>
      </div>
      @for (att of attachments; track att.id) {
        <div class="flex items-center gap-2 py-1 text-sm">
          <span class="text-gray-500">📎</span>
          <a [href]="attachmentService.getDownloadUrl(projectId, taskId, att.id)" 
             class="flex-1 text-indigo-600 hover:underline truncate">{{ att.originalName }}</a>
          <span class="text-xs text-gray-400">{{ formatSize(att.sizeBytes) }}</span>
          <button pButton icon="pi pi-times" severity="danger" size="small" text (click)="delete.emit(att)"></button>
        </div>
      }
    </div>
  `,
})
export class TaskAttachmentsComponent {
  readonly attachmentService = inject(AttachmentService);

  @Input() projectId = '';
  @Input() taskId = '';
  @Input() attachments: TaskAttachment[] = [];
  @Output() upload = new EventEmitter<FileList>();
  @Output() delete = new EventEmitter<TaskAttachment>();

  protected onUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.upload.emit(input.files);
    }
  }

  protected formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  }
}
