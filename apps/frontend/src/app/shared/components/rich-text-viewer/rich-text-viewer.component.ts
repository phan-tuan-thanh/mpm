import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import type { TiptapDoc } from '@mpm/shared-types';
import { flipTaskItemAt, isDocEmpty, renderDocToHtml } from './rte-render';
import { sanitizeRteHtml } from './rte-sanitize';

/**
 * Render tĩnh nội dung TipTap — KHÔNG mount ProseMirror.
 * Nhận [doc] (TiptapDoc JSON) hoặc [html] (string đã là HTML, vd comment).
 * Dùng chung CSS content với rich-text-editor (class `tiptap`).
 */
@Component({
  standalone: true,
  selector: 'app-rich-text-viewer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['../rich-text-editor/rich-text-editor.component.css'],
  styles: [`
    /* Viewer không phải input: bỏ chrome của editor nếu .tiptap có border/min-height */
    :host ::ng-deep .rte-viewer.tiptap { border: none; padding: 0; min-height: 0; background: transparent; }
  `],
  template: `
    @if (renderFailed()) {
      <p class="text-sm italic text-gray-400 dark:text-surface-500">Không hiển thị được nội dung, bấm để sửa</p>
    } @else {
      <div class="tiptap rte-viewer" [innerHTML]="safeHtml()" (click)="onClick($event)"></div>
    }
  `,
})
export class RichTextViewerComponent {
  private readonly sanitizer = inject(DomSanitizer);
  private readonly _doc = signal<TiptapDoc | null>(null);
  private readonly _html = signal<string | null>(null);

  @Input() set doc(v: TiptapDoc | null | undefined) { this._doc.set(v ?? null); }
  @Input() set html(v: string | null | undefined) { this._html.set(v ?? null); }

  @Output() editRequested = new EventEmitter<void>();
  @Output() checkboxToggled = new EventEmitter<TiptapDoc>();

  // Memoize: generateHTML + sanitize chỉ chạy lại khi input đổi, không theo CD cycle.
  private readonly rawHtml = computed<string | null>(() => {
    const html = this._html();
    if (html !== null) return html;
    const d = this._doc();
    if (!d || isDocEmpty(d)) return '';
    return renderDocToHtml(d); // null = doc lỗi
  });

  protected readonly renderFailed = computed(() => this.rawHtml() === null);

  protected readonly safeHtml = computed<SafeHtml>(() =>
    this.sanitizer.bypassSecurityTrustHtml(sanitizeRteHtml(this.rawHtml() ?? '')),
  );

  protected onClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target.closest('a')) {
      // Link đã có target=_blank từ sanitize hook — để browser xử lý, không bật edit
      event.stopPropagation();
      return;
    }
    if (target instanceof HTMLInputElement && target.type === 'checkbox') {
      event.preventDefault();
      this.toggleCheckbox(target);
      return;
    }
    if (target.tagName === 'IMG') {
      const src = target.getAttribute('src');
      if (src) window.open(src, '_blank', 'noopener');
      return;
    }
    if (window.getSelection()?.toString()) return; // đang bôi đen để copy
    this.editRequested.emit();
  }

  private toggleCheckbox(input: HTMLInputElement): void {
    const d = this._doc();
    if (!d) return; // chế độ [html] không hỗ trợ toggle
    const host = input.closest('.rte-viewer');
    if (!host) return;
    const index = Array.from(host.querySelectorAll('input[type="checkbox"]')).indexOf(input);
    if (index < 0) return;
    const next = flipTaskItemAt(d, index);
    if (next) this.checkboxToggled.emit(next);
  }
}
