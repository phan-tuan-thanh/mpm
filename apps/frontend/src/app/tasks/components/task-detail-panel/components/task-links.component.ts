import { Component, Input, Output, EventEmitter, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import type { TaskLink } from '@mpm/shared-types';
import { ProjectStore } from '../../../../projects/state/project.store';

@Component({
  standalone: true,
  selector: 'app-task-links',
  imports: [CommonModule, FormsModule, ButtonModule, InputTextModule],
  template: `
    <div class="mt-4 px-2">
      <div class="flex items-center justify-between mb-2">
        <label class="text-xs text-gray-500 uppercase tracking-wide">Links ({{ links?.length ?? 0 }})</label>
      </div>
      @for (link of links; track link.id) {
        <div class="flex items-center gap-2 py-1 text-sm">
          <span>🔗</span>
          <a [href]="link.url" target="_blank" class="flex-1 text-indigo-600 hover:underline truncate">{{ link.title || link.url }}</a>
          @if (!disabled) {
            <button pButton icon="pi pi-times" severity="danger" size="small" text (click)="delete.emit(link)"></button>
          }
        </div>
      }
      @if (!disabled) {
        <div class="flex gap-2 mt-1">
          <input pInputText class="flex-1 text-xs" placeholder="URL..." [(ngModel)]="newLinkUrl" />
          <input pInputText class="flex-1 text-xs" [placeholder]="t().titlePlaceholder" [(ngModel)]="newLinkTitle" />
          <button pButton [label]="t().addBtn" size="small" (click)="onAdd()" [disabled]="!newLinkUrl.trim()"></button>
        </div>
      }
    </div>
  `,
})
export class TaskLinksComponent {
  private readonly projectStore = inject(ProjectStore);

  readonly t = computed(() => {
    const isEn = this.projectStore.projectLanguage() === 'en';
    return isEn ? {
      titlePlaceholder: 'Title (optional)',
      addBtn: 'Add'
    } : {
      titlePlaceholder: 'Tiêu đề (tùy chọn)',
      addBtn: 'Thêm'
    };
  });
  @Input() links: TaskLink[] = [];
  @Input() disabled = false;
  @Output() add = new EventEmitter<{ url: string; title?: string }>();
  @Output() delete = new EventEmitter<TaskLink>();

  protected newLinkUrl = '';
  protected newLinkTitle = '';

  protected onAdd(): void {
    if (this.disabled) return;
    if (this.newLinkUrl.trim()) {
      this.add.emit({ url: this.newLinkUrl, title: this.newLinkTitle || undefined });
      this.newLinkUrl = '';
      this.newLinkTitle = '';
    }
  }
}
