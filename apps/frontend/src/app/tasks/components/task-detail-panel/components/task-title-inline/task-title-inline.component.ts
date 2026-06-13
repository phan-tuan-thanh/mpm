import {
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
  ElementRef,
  ViewChild,
  OnChanges,
  SimpleChanges,
} from '@angular/core';

/**
 * TaskTitleInlineComponent — Inline editable title
 *
 * Hiển thị title ở chế độ xem (display mode) hoặc chỉnh sửa (edit mode).
 * - Display mode: text hiển thị font lớn, click để chuyển edit
 * - Edit mode: input field cùng font size, maxlength 255
 * - Save: Enter/blur khi trimmed value khác original và non-empty
 * - Revert: Escape hoặc trimmed value rỗng
 * - Component emit `titleSaved` — parent xử lý API call
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6
 */
@Component({
  standalone: true,
  selector: 'app-task-title-inline',
  template: `
    @if (!isEditing()) {
      <!-- Display mode -->
      <h1
        class="rounded-lg px-1 -mx-1 transition-colors duration-150"
        [class.cursor-text]="!disabled"
        [class.hover:bg-gray-50]="!disabled"
        [class.dark:hover:bg-surface-800]="!disabled"
        [class.text-2xl]="viewMode === 'full-page'"
        [class.font-bold]="viewMode === 'full-page'"
        [class.text-lg]="viewMode !== 'full-page'"
        [class.font-semibold]="viewMode !== 'full-page'"
        [attr.aria-label]="disabled ? 'Tiêu đề: ' + title : 'Nhấn để chỉnh sửa tiêu đề: ' + title"
        [attr.role]="disabled ? null : 'button'"
        [attr.tabindex]="disabled ? null : '0'"
        (click)="enterEditMode()"
        (keydown.enter)="enterEditMode(); $event.preventDefault()"
        (keydown.space)="enterEditMode(); $event.preventDefault()"
      >
        {{ title }}
      </h1>
    } @else {
      <!-- Edit mode -->
      <input
        #titleInput
        type="text"
        class="w-full border-none shadow-none focus:ring-2 focus:ring-primary-500/30
               bg-transparent p-0 px-1 -mx-1 rounded outline-none
               text-gray-800 dark:text-surface-100"
        [class.text-2xl]="viewMode === 'full-page'"
        [class.font-bold]="viewMode === 'full-page'"
        [class.text-lg]="viewMode !== 'full-page'"
        [class.font-semibold]="viewMode !== 'full-page'"
        [maxLength]="255"
        [value]="editValue"
        [attr.aria-label]="'Chỉnh sửa tiêu đề task'"
        (input)="editValue = $any($event.target).value"
        (blur)="onBlur()"
        (keydown.enter)="onEnter($event)"
        (keydown.escape)="onEscape($event)"
      />
    }
  `,
})
export class TaskTitleInlineComponent implements OnChanges {
  /** Title hiện tại từ parent */
  @Input() title = '';

  /** Chế độ hiển thị — quyết định font size */
  @Input() viewMode: 'full-page' | 'drawer' | 'popup' = 'full-page';

  @Input() disabled = false;

  /** Emit khi user lưu title mới (trimmed, non-empty, khác original) */
  @Output() titleSaved = new EventEmitter<string>();

  @ViewChild('titleInput') titleInputRef?: ElementRef<HTMLInputElement>;

  /** Trạng thái đang edit — public cho template và testing */
  isEditing = signal(false);

  /** Giá trị đang chỉnh sửa — public cho template binding */
  editValue = '';

  /** Flag để tránh focus sau khi view đã init lần đầu */
  private needsFocus = false;

  ngOnChanges(changes: SimpleChanges): void {
    // Khi parent cập nhật title (ví dụ: revert sau lỗi server), sync lại
    if (changes['title'] && !this.isEditing()) {
      this.editValue = this.title;
    }
  }

  /** Chuyển sang edit mode */
  enterEditMode(): void {
    if (this.disabled) return;
    this.editValue = this.title;
    this.isEditing.set(true);
    this.needsFocus = true;

    // Focus input sau khi Angular render xong
    setTimeout(() => this.focusInputIfNeeded());
  }

  /** Xử lý khi blur (mất focus) */
  onBlur(): void {
    this.attemptSave();
  }

  /** Xử lý khi nhấn Enter */
  onEnter(event: Event): void {
    event.preventDefault();
    (event.target as HTMLInputElement)?.blur();
  }

  /** Xử lý khi nhấn Escape — revert và thoát edit mode */
  onEscape(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.editValue = this.title;
    this.isEditing.set(false);
  }

  /**
   * Kiểm tra và lưu title:
   * - Nếu trimmed value rỗng → revert
   * - Nếu trimmed value giống original → thoát edit mode
   * - Nếu trimmed value khác original → emit titleSaved
   */
  private attemptSave(): void {
    const trimmed = this.editValue.trim();

    if (!trimmed) {
      // Requirement 2.4: Revert nếu rỗng
      this.editValue = this.title;
      this.isEditing.set(false);
      return;
    }

    if (trimmed !== this.title) {
      // Requirement 2.3: Save khi khác original
      this.titleSaved.emit(trimmed);
    }

    // Thoát edit mode
    this.isEditing.set(false);
  }

  /** Auto-focus input khi vào edit mode */
  private focusInputIfNeeded(): void {
    if (this.needsFocus && this.titleInputRef) {
      this.titleInputRef.nativeElement.focus();
      this.titleInputRef.nativeElement.select();
      this.needsFocus = false;
    }
  }
}
