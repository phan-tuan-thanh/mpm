# Task Read Mode Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Mô tả task hiển thị mặc định ở chế độ đọc sạch (render tĩnh, không toolbar), click mới chuyển sang edit với nút Lưu/Hủy rõ ràng.

**Architecture:** Component `app-rich-text-viewer` mới (shared) render TiptapDoc JSON → HTML qua `generateHTML` + sanitize bằng DOMPurify. Component `app-task-description-section` mới đóng gói logic swap đọc/sửa, panel chỉ wire vào store. Design đầy đủ: `docs/plans/2026-06-11-task-read-mode-design.md` (đọc trước khi làm).

**Tech Stack:** Angular 21 (standalone, signals), TipTap v3 (`generateHTML` từ `@tiptap/core`), DOMPurify (đã có trong deps), PrimeNG v21, Jest + jest-preset-angular (jsdom).

**Lệnh test:** chạy từ `apps/frontend/`: `npx jest <đường-dẫn-spec>`. Toàn bộ: `npx jest`.

**Quy ước bắt buộc của repo (CLAUDE.md):** mọi class màu Tailwind phải có `dark:` variant; button fit nội dung không `flex-1`; KHÔNG hardcode hex indigo — dùng token primary.

---

## Task 1: Render helpers — `isDocEmpty`, `renderDocToHtml`, `flipTaskItemAt`

**Files:**
- Create: `apps/frontend/src/app/shared/components/rich-text-viewer/rte-render.ts`
- Test: `apps/frontend/src/app/shared/components/rich-text-viewer/rte-render.spec.ts`

Bối cảnh: `Task.description` là `TiptapDoc` (JSON ProseMirror, type tại `libs/shared-types/src/task.types.ts:3` — alias của `Record<string, any>`). `buildExtensions(features, placeholder, mentionSearch)` đã có sẵn tại `apps/frontend/src/app/shared/components/rich-text-editor/rte-extensions.ts:30`. Bộ extensions render phải dùng `RTE_FULL` + mention search giả (`async () => []`) — thiếu node mention trong schema thì `generateHTML` throw với doc chứa mention.

**Step 1: Viết test fail**

```typescript
// rte-render.spec.ts
import { isDocEmpty, renderDocToHtml, flipTaskItemAt } from './rte-render';
import type { TiptapDoc } from '@mpm/shared-types';

const doc = (content: unknown[]): TiptapDoc => ({ type: 'doc', content });

describe('isDocEmpty', () => {
  it('true với null/undefined', () => {
    expect(isDocEmpty(null)).toBe(true);
    expect(isDocEmpty(undefined)).toBe(true);
  });

  it('true với doc không có content hoặc content rỗng', () => {
    expect(isDocEmpty({ type: 'doc' })).toBe(true);
    expect(isDocEmpty(doc([]))).toBe(true);
  });

  it('true với doc chỉ chứa paragraph rỗng', () => {
    expect(isDocEmpty(doc([{ type: 'paragraph' }]))).toBe(true);
  });

  it('false khi có text', () => {
    expect(isDocEmpty(doc([{ type: 'paragraph', content: [{ type: 'text', text: 'a' }] }]))).toBe(false);
  });
});

describe('renderDocToHtml', () => {
  it('render đủ heading + text-align, màu chữ, taskList', () => {
    const html = renderDocToHtml(doc([
      { type: 'heading', attrs: { level: 1, textAlign: 'center' }, content: [{ type: 'text', text: 'Tiêu đề' }] },
      { type: 'paragraph', content: [{ type: 'text', text: 'màu', marks: [{ type: 'textStyle', attrs: { color: '#ff0000' } }] }] },
      { type: 'taskList', content: [{ type: 'taskItem', attrs: { checked: true }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'việc' }] }] }] },
    ]));
    expect(html).toContain('<h1');
    expect(html).toContain('text-align: center');
    expect(html).toContain('color: #ff0000');
    expect(html).toContain('data-checked="true"');
  });

  it('trả null với node lạ thay vì throw', () => {
    expect(renderDocToHtml(doc([{ type: 'node_khong_ton_tai' }]))).toBeNull();
  });
});

describe('flipTaskItemAt', () => {
  const threeItems = (): TiptapDoc => doc([
    { type: 'taskList', content: [
      { type: 'taskItem', attrs: { checked: false }, content: [] },
      { type: 'taskItem', attrs: { checked: true }, content: [] },
      { type: 'taskItem', attrs: { checked: false }, content: [] },
    ]},
  ]);

  it('flip đúng taskItem thứ N theo document-order', () => {
    const next = flipTaskItemAt(threeItems(), 1)!;
    const items = (next['content'] as any[])[0].content;
    expect(items[0].attrs.checked).toBe(false);
    expect(items[1].attrs.checked).toBe(false); // đã flip true→false
    expect(items[2].attrs.checked).toBe(false);
  });

  it('không mutate doc gốc', () => {
    const original = threeItems();
    flipTaskItemAt(original, 0);
    expect((original['content'] as any[])[0].content[0].attrs.checked).toBe(false);
  });

  it('trả null khi index ngoài phạm vi', () => {
    expect(flipTaskItemAt(threeItems(), 99)).toBeNull();
  });
});
```

**Step 2: Chạy test, xác nhận fail**

Run (từ `apps/frontend/`): `npx jest src/app/shared/components/rich-text-viewer/rte-render.spec.ts`
Expected: FAIL — "Cannot find module './rte-render'"

**Step 3: Implement**

```typescript
// rte-render.ts
import { generateHTML, type Extensions, type JSONContent } from '@tiptap/core';
import { buildExtensions } from '../rich-text-editor/rte-extensions';
import { RTE_FULL } from '../rich-text-editor/rte-features';
import type { TiptapDoc } from '@mpm/shared-types';

let renderExtensions: Extensions | null = null;

/**
 * Bộ extensions chỉ để render (schema RTE_FULL, mention search rỗng).
 * Lệch bộ extensions với editor = mất node/mark khi render — luôn đi qua buildExtensions.
 */
function getRenderExtensions(): Extensions {
  if (!renderExtensions) {
    renderExtensions = buildExtensions(RTE_FULL, '', async () => []) as unknown as Extensions;
  }
  return renderExtensions;
}

/** Doc rỗng khi null / không content / chỉ chứa paragraph không có text. */
export function isDocEmpty(d: TiptapDoc | null | undefined): boolean {
  if (!d || !Array.isArray(d['content']) || d['content'].length === 0) return true;
  return (d['content'] as JSONContent[]).every(
    (node) => node.type === 'paragraph' && !node.content?.length,
  );
}

/** Convert TiptapDoc → HTML. Trả null nếu doc chứa node ngoài schema (generateHTML throw). */
export function renderDocToHtml(d: TiptapDoc): string | null {
  try {
    return generateHTML(d as JSONContent, getRenderExtensions());
  } catch {
    return null;
  }
}

/** Flip attrs.checked của taskItem thứ `index` (document-order). Trả doc mới, null nếu không tìm thấy. */
export function flipTaskItemAt(d: TiptapDoc, index: number): TiptapDoc | null {
  const clone = structuredClone(d) as TiptapDoc;
  let counter = 0;
  let done = false;
  const visit = (node: Record<string, any>): void => {
    if (done) return;
    if (node['type'] === 'taskItem') {
      if (counter === index) {
        node['attrs'] = { ...(node['attrs'] ?? {}), checked: !node['attrs']?.['checked'] };
        done = true;
        return;
      }
      counter++;
    }
    (node['content'] as Record<string, any>[] | undefined)?.forEach(visit);
  };
  (clone['content'] as Record<string, any>[] | undefined)?.forEach(visit);
  return done ? clone : null;
}
```

**Step 4: Chạy test, xác nhận pass**

Run: `npx jest src/app/shared/components/rich-text-viewer/rte-render.spec.ts`
Expected: PASS (9 tests). Nếu test text-align fail: kiểm tra output thực của generateHTML (có thể là `text-align:center` không space) — sửa assertion theo output thực, KHÔNG sửa implementation.

**Step 5: Commit**

```bash
git add apps/frontend/src/app/shared/components/rich-text-viewer/
git commit -m "feat(rte-viewer): add render helpers for static tiptap doc rendering"
```

---

## Task 2: Sanitize — `sanitizeRteHtml` với DOMPurify

**Files:**
- Create: `apps/frontend/src/app/shared/components/rich-text-viewer/rte-sanitize.ts`
- Test: `apps/frontend/src/app/shared/components/rich-text-viewer/rte-sanitize.spec.ts`

Bối cảnh: KHÔNG dùng `DomSanitizer` của Angular (strip `style` → mất màu/căn lề/font). DOMPurify đã có trong `apps/frontend/package.json`. DOMPurify không tự lọc từng CSS property — phải làm qua hook. `target` không nằm trong allowlist mặc định của DOMPurify — phải `ADD_ATTR`.

**Step 1: Viết test fail**

```typescript
// rte-sanitize.spec.ts
import { sanitizeRteHtml } from './rte-sanitize';

describe('sanitizeRteHtml', () => {
  it('loại script, onerror, javascript: href', () => {
    expect(sanitizeRteHtml('<p>a</p><script>x()</script>')).not.toContain('script');
    expect(sanitizeRteHtml('<img src="x.png" onerror="x()">')).not.toContain('onerror');
    expect(sanitizeRteHtml('<a href="javascript:alert(1)">x</a>')).not.toContain('javascript:');
  });

  it('giữ style trong allowlist, loại property ngoài allowlist', () => {
    const out = sanitizeRteHtml('<p style="color: red; position: fixed; text-align: right; font-family: Arial">x</p>');
    expect(out).toContain('color: red');
    expect(out).toContain('text-align: right');
    expect(out).toContain('font-family: Arial');
    expect(out).not.toContain('position');
  });

  it('giữ mark (highlight), checked/data-checked (taskItem), width/height (ảnh resize)', () => {
    expect(sanitizeRteHtml('<mark style="background-color: yellow">x</mark>')).toContain('<mark');
    const task = sanitizeRteHtml('<li data-type="taskItem" data-checked="true"><input type="checkbox" checked></li>');
    expect(task).toContain('data-checked="true"');
    expect(task).toContain('checked');
    expect(sanitizeRteHtml('<img src="a.png" width="300" height="200">')).toContain('width="300"');
  });

  it('ép mọi <a> thành target=_blank rel=noopener noreferrer', () => {
    const out = sanitizeRteHtml('<a href="https://example.vn">x</a>');
    expect(out).toContain('target="_blank"');
    expect(out).toContain('noopener');
  });
});
```

**Step 2: Chạy test, xác nhận fail**

Run: `npx jest src/app/shared/components/rich-text-viewer/rte-sanitize.spec.ts`
Expected: FAIL — "Cannot find module './rte-sanitize'"

**Step 3: Implement**

```typescript
// rte-sanitize.ts
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
```

**Step 4: Chạy test, xác nhận pass**

Run: `npx jest src/app/shared/components/rich-text-viewer/rte-sanitize.spec.ts`
Expected: PASS. Nếu fail vì DOMPurify trả khác format style (`color:red` không space): chỉnh assertion theo output thực.

**Step 5: Commit**

```bash
git add apps/frontend/src/app/shared/components/rich-text-viewer/rte-sanitize.ts apps/frontend/src/app/shared/components/rich-text-viewer/rte-sanitize.spec.ts
git commit -m "feat(rte-viewer): add DOMPurify sanitizer matching tiptap schema"
```

---

## Task 3: `RichTextViewerComponent`

**Files:**
- Create: `apps/frontend/src/app/shared/components/rich-text-viewer/rich-text-viewer.component.ts`
- Test: `apps/frontend/src/app/shared/components/rich-text-viewer/rich-text-viewer.component.spec.ts`

Bối cảnh: nhận `[doc]` (TiptapDoc — mô tả) HOẶC `[html]` (string — comment sau này). CSS content của RTE nằm trong `rich-text-editor.component.css` dưới selector `:host ::ng-deep .tiptap` — viewer tham chiếu **cùng file CSS** đó qua `styleUrls` và đặt class `tiptap` lên container để hai chế độ giống hệt nhau.

**Step 1: Viết test fail**

```typescript
// rich-text-viewer.component.spec.ts
import { TestBed } from '@angular/core/testing';
import { RichTextViewerComponent } from './rich-text-viewer.component';
import type { TiptapDoc } from '@mpm/shared-types';

const textDoc: TiptapDoc = {
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'nội dung' }] }],
};

describe('RichTextViewerComponent', () => {
  async function setup(inputs: Partial<{ doc: TiptapDoc | null; html: string | null }>) {
    await TestBed.configureTestingModule({ imports: [RichTextViewerComponent] }).compileComponents();
    const fixture = TestBed.createComponent(RichTextViewerComponent);
    if (inputs.doc !== undefined) fixture.componentInstance.doc = inputs.doc;
    if (inputs.html !== undefined) fixture.componentInstance.html = inputs.html;
    fixture.detectChanges();
    return fixture;
  }

  it('render doc JSON thành HTML', async () => {
    const fixture = await setup({ doc: textDoc });
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('nội dung');
  });

  it('render html string trực tiếp (chế độ comment)', async () => {
    const fixture = await setup({ html: '<p>bình luận</p>' });
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('bình luận');
  });

  it('click text → emit editRequested', async () => {
    const fixture = await setup({ doc: textDoc });
    const emitted = jest.fn();
    fixture.componentInstance.editRequested.subscribe(emitted);
    (fixture.nativeElement as HTMLElement).querySelector('p')!.click();
    expect(emitted).toHaveBeenCalled();
  });

  it('click link → KHÔNG emit editRequested', async () => {
    const fixture = await setup({ html: '<p><a href="https://x.vn">link</a></p>' });
    const emitted = jest.fn();
    fixture.componentInstance.editRequested.subscribe(emitted);
    const a = (fixture.nativeElement as HTMLElement).querySelector('a')!;
    a.addEventListener('click', (e) => e.preventDefault()); // chặn jsdom navigate
    a.click();
    expect(emitted).not.toHaveBeenCalled();
  });

  it('đang bôi đen text → KHÔNG emit editRequested', async () => {
    const fixture = await setup({ doc: textDoc });
    const emitted = jest.fn();
    fixture.componentInstance.editRequested.subscribe(emitted);
    jest.spyOn(window, 'getSelection').mockReturnValue({ toString: () => 'nội' } as Selection);
    (fixture.nativeElement as HTMLElement).querySelector('p')!.click();
    expect(emitted).not.toHaveBeenCalled();
    jest.restoreAllMocks();
  });

  it('click checkbox → emit checkboxToggled với taskItem đã flip, KHÔNG emit editRequested', async () => {
    const taskDoc: TiptapDoc = {
      type: 'doc',
      content: [{ type: 'taskList', content: [
        { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'việc' }] }] },
      ]}],
    };
    const fixture = await setup({ doc: taskDoc });
    const toggled = jest.fn();
    const edited = jest.fn();
    fixture.componentInstance.checkboxToggled.subscribe(toggled);
    fixture.componentInstance.editRequested.subscribe(edited);
    (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('input[type="checkbox"]')!.click();
    expect(toggled).toHaveBeenCalledWith(expect.objectContaining({ type: 'doc' }));
    expect((toggled.mock.calls[0][0]['content'] as any[])[0].content[0].attrs.checked).toBe(true);
    expect(edited).not.toHaveBeenCalled();
  });

  it('doc chứa node lạ → hiện fallback, không vỡ', async () => {
    const fixture = await setup({ doc: { type: 'doc', content: [{ type: 'node_la' }] } });
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Không hiển thị được');
  });
});
```

**Step 2: Chạy test, xác nhận fail**

Run: `npx jest src/app/shared/components/rich-text-viewer/rich-text-viewer.component.spec.ts`
Expected: FAIL — "Cannot find module './rich-text-viewer.component'"

**Step 3: Implement**

```typescript
// rich-text-viewer.component.ts
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
```

**Step 4: Chạy test, xác nhận pass**

Run: `npx jest src/app/shared/components/rich-text-viewer/rich-text-viewer.component.spec.ts`
Expected: PASS (7 tests).

**Step 5: Commit**

```bash
git add apps/frontend/src/app/shared/components/rich-text-viewer/
git commit -m "feat(rte-viewer): add static rich text viewer component"
```

---

## Task 4: Thêm `autofocus` cho RichTextEditorComponent

**Files:**
- Modify: `apps/frontend/src/app/shared/components/rich-text-editor/rich-text-editor.component.ts`

Bối cảnh: design yêu cầu vào edit thì `focus('end')`. RTE hiện không có API focus. Editor được tạo trong `ngOnInit`/`ngAfterViewInit` (instance là `this.editor`, dòng ~51/90).

**Step 1: Thêm input và gọi focus**

Thêm cạnh các `@Input()` hiện có (dòng ~44-53):

```typescript
  /** Tự focus cuối nội dung sau khi editor khởi tạo (dùng cho click-to-edit). */
  @Input() autofocus = false;
```

Trong phương thức nơi `new Editor({...})` hoàn tất khởi tạo (sau khi gán `this.editor`), thêm:

```typescript
    if (this.autofocus) {
      setTimeout(() => this.editor?.commands.focus('end'));
    }
```

**Step 2: Chạy spec hiện có của RTE (nếu có) + lint**

Run: `npx jest src/app/shared/components/rich-text-editor/ 2>/dev/null; npx ng lint 2>&1 | tail -5`
Expected: không lỗi mới (nếu RTE chưa có spec thì chỉ cần lint sạch).

**Step 3: Commit**

```bash
git add apps/frontend/src/app/shared/components/rich-text-editor/rich-text-editor.component.ts
git commit -m "feat(rte): add autofocus input for click-to-edit flows"
```

---

## Task 5: `TaskDescriptionSectionComponent` — swap đọc/sửa + Lưu/Hủy

**Files:**
- Create: `apps/frontend/src/app/tasks/components/task-detail-panel/components/task-description-section/task-description-section.component.ts`
- Test: `apps/frontend/src/app/tasks/components/task-detail-panel/components/task-description-section/task-description-section.component.spec.ts`

Bối cảnh: đóng gói toàn bộ logic đọc/sửa để test được mà không cần TestBed panel 1370 dòng. `saveStatus` của store có giá trị `'idle' | 'saving' | 'saved' | 'error'` (xem `apps/frontend/src/app/tasks/state/task.store.ts:32`), tự reset về idle sau vài giây. Confirm dùng `ConfirmationService` — pattern mock xem `components/parent-navigation/parent-navigation.component.spec.ts`. Trong spec, stub RTE để không mount TipTap thật trong jsdom.

**Step 1: Viết test fail**

```typescript
// task-description-section.component.spec.ts
import { Component, EventEmitter, Input, Output, forwardRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';
import { ConfirmationService } from 'primeng/api';
import { TaskDescriptionSectionComponent } from './task-description-section.component';
import { RichTextEditorComponent } from '../../../../../shared/components/rich-text-editor/rich-text-editor.component';
import type { TiptapDoc } from '@mpm/shared-types';

// Stub RTE — TipTap thật không cần thiết cho logic swap/save/cancel
@Component({
  standalone: true,
  selector: 'app-rich-text-editor',
  template: '<div data-testid="stub-rte"></div>',
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => StubRteComponent), multi: true }],
})
class StubRteComponent implements ControlValueAccessor {
  @Input() placeholder = '';
  @Input() autofocus = false;
  @Output() blurEditor = new EventEmitter<void>();
  value: unknown = null;
  onChange: (v: unknown) => void = () => {};
  writeValue(v: unknown): void { this.value = v; }
  registerOnChange(fn: (v: unknown) => void): void { this.onChange = fn; }
  registerOnTouched(): void {}
}

const textDoc: TiptapDoc = {
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'mô tả' }] }],
};

describe('TaskDescriptionSectionComponent', () => {
  let confirmAccept: (() => void) | undefined;
  const mockConfirm = {
    confirm: jest.fn((opts: { accept?: () => void }) => { confirmAccept = opts.accept; }),
  };

  async function setup(doc: TiptapDoc | null) {
    mockConfirm.confirm.mockClear();
    confirmAccept = undefined;
    TestBed.configureTestingModule({
      imports: [TaskDescriptionSectionComponent],
      providers: [{ provide: ConfirmationService, useValue: mockConfirm }],
    });
    TestBed.overrideComponent(TaskDescriptionSectionComponent, {
      remove: { imports: [RichTextEditorComponent] },
      add: { imports: [StubRteComponent] },
    });
    await TestBed.compileComponents();
    const fixture = TestBed.createComponent(TaskDescriptionSectionComponent);
    fixture.componentInstance.doc = doc;
    fixture.detectChanges();
    return fixture;
  }

  const el = (f: ReturnType<typeof TestBed.createComponent>, id: string) =>
    (f.nativeElement as HTMLElement).querySelector<HTMLElement>(`[data-testid="${id}"]`);

  it('mặc định ở chế độ đọc', async () => {
    const fixture = await setup(textDoc);
    expect(el(fixture, 'description-read')).toBeTruthy();
    expect(el(fixture, 'description-edit')).toBeFalsy();
  });

  it('doc trống → hiện placeholder, click vào edit ngay', async () => {
    const fixture = await setup(null);
    expect(el(fixture, 'description-placeholder')!.textContent).toContain('Thêm mô tả');
    el(fixture, 'description-placeholder')!.click();
    fixture.detectChanges();
    expect(el(fixture, 'description-edit')).toBeTruthy();
  });

  it('bấm nút bút chì → vào edit', async () => {
    const fixture = await setup(textDoc);
    el(fixture, 'description-edit-btn')!.click();
    fixture.detectChanges();
    expect(el(fixture, 'description-edit')).toBeTruthy();
    expect(fixture.componentInstance.editing()).toBe(true);
  });

  it('Lưu → emit saveRequested với draft; saveStatus saved → quay về đọc', async () => {
    const fixture = await setup(textDoc);
    const saved = jest.fn();
    fixture.componentInstance.saveRequested.subscribe(saved);
    fixture.componentInstance.enterEdit();
    fixture.detectChanges();
    el(fixture, 'description-save')!.click();
    expect(saved).toHaveBeenCalledWith(textDoc);
    fixture.componentInstance.saveStatus = 'saved';
    fixture.detectChanges();
    expect(fixture.componentInstance.editing()).toBe(false);
  });

  it('saveStatus error → GIỮ chế độ edit và draft', async () => {
    const fixture = await setup(textDoc);
    fixture.componentInstance.enterEdit();
    fixture.detectChanges();
    el(fixture, 'description-save')!.click();
    fixture.componentInstance.saveStatus = 'error';
    fixture.detectChanges();
    expect(fixture.componentInstance.editing()).toBe(true);
  });

  it('Hủy khi không dirty → thoát edit không confirm', async () => {
    const fixture = await setup(textDoc);
    fixture.componentInstance.enterEdit();
    fixture.detectChanges();
    el(fixture, 'description-cancel')!.click();
    fixture.detectChanges();
    expect(mockConfirm.confirm).not.toHaveBeenCalled();
    expect(fixture.componentInstance.editing()).toBe(false);
  });

  it('Hủy khi dirty → confirm, accept thì thoát', async () => {
    const fixture = await setup(textDoc);
    fixture.componentInstance.enterEdit();
    fixture.componentInstance.draft.set({ type: 'doc', content: [] });
    fixture.detectChanges();
    el(fixture, 'description-cancel')!.click();
    expect(mockConfirm.confirm).toHaveBeenCalled();
    expect(fixture.componentInstance.editing()).toBe(true); // chưa thoát
    confirmAccept!();
    fixture.detectChanges();
    expect(fixture.componentInstance.editing()).toBe(false);
  });

  it('Esc trong edit → stopPropagation + xử lý như Hủy', async () => {
    const fixture = await setup(textDoc);
    fixture.componentInstance.enterEdit();
    fixture.detectChanges();
    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    const stopSpy = jest.spyOn(event, 'stopPropagation');
    el(fixture, 'description-edit')!.dispatchEvent(event);
    fixture.detectChanges();
    expect(stopSpy).toHaveBeenCalled();
    expect(fixture.componentInstance.editing()).toBe(false); // không dirty → thoát luôn
  });
});
```

**Step 2: Chạy test, xác nhận fail**

Run: `npx jest src/app/tasks/components/task-detail-panel/components/task-description-section/`
Expected: FAIL — "Cannot find module './task-description-section.component'"

**Step 3: Implement**

```typescript
// task-description-section.component.ts
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { ConfirmationService } from 'primeng/api';
import type { TiptapDoc } from '@mpm/shared-types';
import { RichTextViewerComponent } from '../../../../../shared/components/rich-text-viewer/rich-text-viewer.component';
import { RichTextEditorComponent } from '../../../../../shared/components/rich-text-editor/rich-text-editor.component';
import { isDocEmpty } from '../../../../../shared/components/rich-text-viewer/rte-render';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

/**
 * Mô tả task: mặc định chế độ đọc (viewer tĩnh), click/bút chì → edit với Lưu/Hủy.
 * Design: docs/plans/2026-06-11-task-read-mode-design.md
 */
@Component({
  standalone: true,
  selector: 'app-task-description-section',
  imports: [FormsModule, ButtonModule, RichTextViewerComponent, RichTextEditorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (!editing()) {
      <div
        data-testid="description-read"
        class="group relative -mx-2 px-2 py-1 rounded-lg cursor-text transition-colors hover:bg-gray-50 dark:hover:bg-surface-800"
      >
        <button
          pButton type="button" icon="pi pi-pencil" [text]="true" size="small"
          data-testid="description-edit-btn"
          class="!absolute top-1 right-1 z-10 opacity-0 group-hover:opacity-100"
          (click)="enterEdit()"
        ></button>
        @if (isEmpty()) {
          <p
            data-testid="description-placeholder"
            class="text-sm italic text-gray-400 dark:text-surface-500 min-h-[2.5rem] flex items-center"
            (click)="enterEdit()"
          >Thêm mô tả…</p>
        } @else {
          <app-rich-text-viewer
            [doc]="docSignal()"
            (editRequested)="enterEdit()"
            (checkboxToggled)="checkboxToggled.emit($event)"
          />
        }
      </div>
    } @else {
      <div data-testid="description-edit" (keydown.escape)="onEscape($event)" (keydown.control.enter)="save()">
        <app-rich-text-editor
          [ngModel]="draft()"
          (ngModelChange)="draft.set($event)"
          [autofocus]="true"
          placeholder="Thêm mô tả..."
        />
        <div class="flex justify-end gap-2 mt-2">
          <button pButton type="button" label="Hủy" [text]="true" size="small" severity="secondary"
                  data-testid="description-cancel" (click)="cancel()"></button>
          <button pButton type="button" label="Lưu" size="small" [loading]="statusSignal() === 'saving'"
                  data-testid="description-save" (click)="save()"></button>
        </div>
      </div>
    }
  `,
})
export class TaskDescriptionSectionComponent {
  private readonly confirmService = inject(ConfirmationService);

  protected readonly docSignal = signal<TiptapDoc | null>(null);
  protected readonly statusSignal = signal<SaveStatus>('idle');

  @Input() set doc(v: TiptapDoc | null | undefined) { this.docSignal.set(v ?? null); }
  @Input() set saveStatus(v: SaveStatus) { this.statusSignal.set(v); }

  @Output() saveRequested = new EventEmitter<TiptapDoc | null>();
  @Output() checkboxToggled = new EventEmitter<TiptapDoc>();
  @Output() editingChange = new EventEmitter<boolean>();

  readonly editing = signal(false);
  readonly draft = signal<TiptapDoc | null>(null);
  protected readonly isEmpty = computed(() => isDocEmpty(this.docSignal()));
  private awaitingSave = false;

  constructor() {
    // Lưu thành công → về chế độ đọc. Lỗi → giữ edit + draft (US-2).
    effect(() => {
      const status = this.statusSignal();
      if (!this.awaitingSave) return;
      if (status === 'saved') { this.awaitingSave = false; this.exitEdit(); }
      else if (status === 'error') { this.awaitingSave = false; }
    });
  }

  get dirty(): boolean {
    const draft = this.draft();
    const current = this.docSignal();
    if (isDocEmpty(draft) && isDocEmpty(current)) return false;
    return JSON.stringify(draft) !== JSON.stringify(current);
  }

  enterEdit(): void {
    this.draft.set(structuredClone(this.docSignal()));
    this.editing.set(true);
    this.editingChange.emit(true);
  }

  protected save(): void {
    this.awaitingSave = true;
    this.saveRequested.emit(this.draft());
  }

  protected cancel(): void {
    if (!this.dirty) { this.exitEdit(); return; }
    this.confirmService.confirm({
      message: 'Bỏ thay đổi chưa lưu?',
      header: 'Xác nhận',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Bỏ thay đổi',
      rejectLabel: 'Tiếp tục sửa',
      accept: () => this.exitEdit(),
    });
  }

  protected onEscape(event: Event): void {
    event.stopPropagation(); // không cho Esc lan lên drawer/dialog
    this.cancel();
  }

  private exitEdit(): void {
    this.editing.set(false);
    this.editingChange.emit(false);
  }
}
```

**Step 4: Chạy test, xác nhận pass**

Run: `npx jest src/app/tasks/components/task-detail-panel/components/task-description-section/`
Expected: PASS (8 tests). Lưu ý: nếu effect không chạy sau khi set saveStatus, thêm `fixture.detectChanges()` hoặc `TestBed.flushEffects()` sau bước set.

**Step 5: Commit**

```bash
git add apps/frontend/src/app/tasks/components/task-detail-panel/components/task-description-section/
git commit -m "feat(task-detail): add description section with read/edit modes"
```

---

## Task 6: Wire vào panel — thay editor luôn-active bằng section mới

**Files:**
- Modify: `apps/frontend/src/app/tasks/components/task-detail-panel/services/task-detail-state.service.ts` (~dòng 45, cạnh `sidebarExpanded`)
- Modify: `apps/frontend/src/app/tasks/components/task-detail-panel/task-detail-panel.component.ts`:
  - Template description block (dòng ~410-423)
  - p-dialog (dòng ~181-193), p-drawer (dòng ~199-212)
  - Handlers `onDescriptionChange`/`saveDescription`/`_pendingDescription` (dòng ~1177-1192)
  - Imports (dòng ~64, ~84-92)

**Step 1: Thêm state vào TaskDetailStateService**

Cạnh `readonly sidebarExpanded = signal(true);` thêm:

```typescript
  /** Vùng đang ở chế độ edit (read-mode design). null = tất cả đang ở chế độ đọc. */
  readonly editingSection = signal<'description' | null>(null);
```

**Step 2: Thay description block trong template**

Thay block dòng ~410-423 (giữ nguyên label và skeleton `@else`):

```html
            <!-- Description: đọc mặc định, click để sửa (read-mode design) -->
            <div class="px-4 pt-4 pb-3 border-b border-gray-100 dark:border-surface-700">
              <label class="text-xs font-semibold text-gray-400 dark:text-surface-500 uppercase tracking-wide mb-2 block">Mô tả</label>
              @if (showRte()) {
                <app-task-description-section
                  [doc]="task()?.description ?? null"
                  [saveStatus]="stateService.saveStatus()"
                  (saveRequested)="onDescriptionSave($event)"
                  (checkboxToggled)="onDescriptionSave($event)"
                  (editingChange)="stateService.editingSection.set($event ? 'description' : null)"
                />
              } @else {
                <div class="min-h-[4rem] rounded-lg border border-gray-200 dark:border-surface-700 bg-gray-50 dark:bg-surface-800"></div>
              }
            </div>
```

**Step 3: Chặn Esc/click-ngoài đóng panel khi đang edit**

p-dialog (dòng ~181): thêm 1 binding, đổi 1 binding:

```html
      [closeOnEscape]="stateService.editingSection() === null"
      [dismissableMask]="stateService.editingSection() === null"
```

p-drawer (dòng ~199): thêm/đổi tương tự:

```html
      [closeOnEscape]="stateService.editingSection() === null"
      [dismissible]="stateService.editingSection() === null"
```

**Step 4: Thay handlers + dọn imports**

Thay toàn bộ block `_pendingDescription`/`onDescriptionChange`/`saveDescription` (dòng ~1177-1192) bằng:

```typescript
  // ─── Description ────────────────────────────────────────────────────────

  protected onDescriptionSave(doc: TiptapDoc | null): void {
    const t = this.task();
    if (t) {
      this.taskStore.updateTask(this.projectId(), t.id, { description: doc });
    }
  }
```

- Xóa import `RichTextEditorComponent` khỏi panel (dòng 64 + mảng `imports`) — xác nhận bằng grep không còn `app-rich-text-editor` trong template panel.
- Thêm import `TaskDescriptionSectionComponent` vào file + mảng `imports`.
- Kiểm tra app đã có `<p-confirmdialog>` global chưa (grep `p-confirmdialog` trong `src/app/`): nếu chưa có ở scope panel, thêm `<p-confirmdialog />` + `ConfirmDialogModule` vào panel (ConfirmationService đã được parent-navigation dùng — xem cách nó render confirm để làm đồng nhất).

**Step 5: Chạy toàn bộ test + lint**

Run: `npx jest && npx ng lint 2>&1 | tail -5`
Expected: toàn bộ PASS (đặc biệt các spec có sẵn của panel components không vỡ), lint sạch.

**Step 6: Commit**

```bash
git add apps/frontend/src/app/tasks/components/task-detail-panel/
git commit -m "feat(task-detail): default description to read mode with explicit save"
```

---

## Task 7: Hover hint cho title (đồng bộ pattern)

**Files:**
- Modify: `apps/frontend/src/app/tasks/components/task-title-inline/...` — chính xác: `apps/frontend/src/app/tasks/components/task-detail-panel/components/task-title-inline/task-title-inline.component.ts`

**Step 1: Thêm hover hint**

Trên element display mode (có `(click)="enterEditMode()"`, dòng ~41), thêm class:

```
hover:bg-gray-50 dark:hover:bg-surface-800 rounded-lg cursor-text transition-colors
```

(Giữ nguyên mọi class hiện có. KHÔNG đổi hành vi.)

**Step 2: Chạy spec của title**

Run: `npx jest src/app/tasks/components/task-detail-panel/components/task-title-inline/ 2>/dev/null || npx jest -t "title"`
Expected: PASS (hoặc không có spec — lint sạch là đủ).

**Step 3: Commit**

```bash
git add apps/frontend/src/app/tasks/components/task-detail-panel/components/task-title-inline/
git commit -m "feat(task-detail): add hover hint to inline title for edit affordance"
```

---

## Task 8: Verify end-to-end thủ công + chốt

**Step 1: Chạy app**

```bash
# Terminal 1 (backend): cd apps/backend && npm run start:dev
# Terminal 2 (frontend): cd apps/frontend && npm start
```

**Step 2: Checklist theo User Stories (US-1 → US-3 trong design doc)**

- [ ] Mở task detail (cả 3 layout: popup, drawer, full-page) → mô tả dạng đọc, không toolbar.
- [ ] Định dạng giữ nguyên: tạo mô tả có màu chữ, highlight, căn giữa, font, ảnh resize, bảng, checklist → so sánh đọc vs edit. (Code block đen trắng khi đọc = ĐÚNG thiết kế.)
- [ ] Bôi đen copy không bật edit; click link mở tab mới; click ảnh mở tab mới.
- [ ] Hover hiện nút bút chì; click nội dung hoặc bút chì → editor + focus cuối.
- [ ] Lưu/Hủy hoạt động; `Ctrl+Enter`/`Esc`; **Esc không đóng panel**; click ra ngoài không lưu không thoát; click mask không đóng panel khi đang edit.
- [ ] Hủy khi dirty → confirm.
- [ ] Tắt backend (Ctrl+C terminal 1) → Lưu → toast lỗi + vẫn ở edit, nội dung còn nguyên.
- [ ] Tick checkbox ở chế độ đọc → lưu; tick khi backend tắt → revert (nếu chưa revert: kiểm tra store có rollback optimistic update không — nếu store không rollback, chấp nhận ghi nhận làm follow-up, KHÔNG tự chế cơ chế rollback mới trong PR này).
- [ ] Mô tả trống → "Thêm mô tả…" click vào edit.
- [ ] Kiểm tra dark mode toàn bộ các trạng thái trên.

**Step 3: Cập nhật design doc nếu có lệch**

Nếu thực tế buộc làm khác design (vd CSS `.tiptap` cần override thêm), cập nhật mục tương ứng trong `docs/plans/2026-06-11-task-read-mode-design.md` cùng commit.

**Step 4: Commit cuối + tổng kết**

```bash
git add -A && git commit -m "feat(task-detail): complete read-mode for task description"
```

Dùng skill superpowers:requesting-code-review để review trước khi merge.

---

## Ghi chú cho người thực hiện

- **KHÔNG** đụng vào activity panel, comment tab, properties sidebar — ngoài phạm vi.
- US-4 (comment dùng chung viewer) thuộc feature comment (design riêng), không làm ở đây.
- Nếu `generateHTML` hoặc DOMPurify hành xử khác kỳ vọng trong jsdom: sửa **assertion** theo output thực sau khi tự kiểm chứng output đó đúng về ngữ nghĩa — không nới lỏng sanitize.
- Mọi quyết định "tại sao" đã có trong design doc — đọc nó trước khi tự ý đổi approach.
