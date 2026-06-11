import DOMPurify from 'dompurify';

// Khớp các extension đang bật trong rte-extensions.ts:
// Color, Highlight multicolor, TextAlign, FontFamily. Mở rộng = cập nhật cả 2 nơi.
const ALLOWED_STYLE_PROPS = ['color', 'background-color', 'text-align', 'font-family'];

let hooksRegistered = false;

function registerHooks(): void {
  if (hooksRegistered) return;
  hooksRegistered = true;
  DOMPurify.addHook('afterSanitizeAttributes', (el) => {
    const style = el.getAttribute('style');
    if (style) {
      const kept = style
        .split(';')
        .map((s) => s.trim())
        .filter((s) => ALLOWED_STYLE_PROPS.some((p) => s.toLowerCase().startsWith(p + ':')));
      if (kept.length) el.setAttribute('style', kept.join('; '));
      else el.removeAttribute('style');
    }
    if (el.tagName === 'A') {
      el.setAttribute('target', '_blank');
      el.setAttribute('rel', 'noopener noreferrer');
    }
  });
}

/** Sanitize HTML sinh từ TipTap trước khi bind innerHTML. Allowlist khóa bằng spec. */
export function sanitizeRteHtml(html: string): string {
  registerHooks();
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    ADD_ATTR: ['target', 'data-type', 'data-checked', 'checked', 'type', 'disabled', 'colspan', 'rowspan', 'width', 'height'],
  });
}
