import { Component, Input, Output, EventEmitter } from '@angular/core';

/**
 * CollapsibleSectionComponent — Reusable expand/collapse section
 *
 * Dùng cho các nhóm thuộc tính trong Properties Sidebar.
 * Component không tự quản lý persistence — chỉ emit event để parent xử lý.
 * Hỗ trợ two-way binding: [(expanded)]
 *
 * Requirements: 3.4, 3.5, 3.6, 3.7, 3.8
 */
@Component({
  standalone: true,
  selector: 'app-collapsible-section',
  template: `
    <div class="border-b border-gray-200 dark:border-surface-700">
      <!-- Section header — clickable, keyboard accessible -->
      <div
        class="flex items-center gap-2 px-3 py-2 cursor-pointer select-none
               hover:bg-gray-50 dark:hover:bg-surface-800 transition-colors duration-150"
        role="button"
        tabindex="0"
        [attr.aria-expanded]="expanded"
        [attr.aria-label]="'Toggle ' + title + ' section'"
        (click)="toggle()"
        (keydown.enter)="toggle(); $event.preventDefault()"
        (keydown.space)="toggle(); $event.preventDefault()"
      >
        <!-- Chevron icon with rotation animation -->
        <i
          class="pi pi-chevron-down text-xs text-gray-500 dark:text-surface-400 transition-transform duration-200"
          [class.-rotate-90]="!expanded"
        ></i>

        <!-- Section title -->
        <span class="text-sm font-semibold text-gray-700 dark:text-surface-200 uppercase tracking-wide">
          {{ title }}
        </span>
      </div>

      <!-- Collapsible content area -->
      @if (expanded) {
        <div class="pb-3">
          <ng-content />
        </div>
      }
    </div>
  `,
})
export class CollapsibleSectionComponent {
  /** Tiêu đề hiển thị trên header */
  @Input() title = '';

  /** Key dùng để parent persist vào session storage */
  @Input() sectionKey = '';

  /** Trạng thái mở/đóng — controlled by parent */
  @Input() expanded = true;

  /** Emit khi trạng thái thay đổi — parent sẽ persist */
  @Output() expandedChange = new EventEmitter<boolean>();

  /** Toggle expand/collapse và emit event */
  toggle(): void {
    this.expanded = !this.expanded;
    this.expandedChange.emit(this.expanded);
  }
}
