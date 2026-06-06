# RTE Extensions Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Mở rộng `RichTextEditorComponent` với đầy đủ OSS extensions, 3 toolbar modes (bubble/full/overflow), feature flags per-instance, image upload và mention support.

**Architecture:** Tách logic thành 3 file mới (`rte-features.ts`, `rte-extensions.ts`, `rte-mention.ts`), refactor component để khởi tạo Editor trong `ngOnInit` (thay vì class field), dùng Angular signals cho BubbleMenu/FloatingMenu state. Toolbar render bằng `@switch (toolbarMode)` trong template.

**Tech Stack:** TipTap v3, ngx-tiptap v14, Angular 21 signals, PrimeNG v21, Tailwind CSS v4, lowlight (syntax highlighting)

**Design doc:** `docs/plans/2026-06-07-rte-extensions-design.md`

---

### Task 1: Install npm packages

**Files:**
- Modify: `package.json` (via npm install)

**Step 1: Install OSS extensions**

```bash
cd /Volumes/myssd/Working/github/mpm
npm install --legacy-peer-deps \
  @tiptap/extension-code-block-lowlight \
  @tiptap/extension-highlight \
  @tiptap/extension-text-align \
  @tiptap/extension-mention \
  @tiptap/extension-subscript \
  @tiptap/extension-superscript \
  @tiptap/extension-font-family \
  @tiptap/extension-character-count \
  @tiptap/extension-typography \
  lowlight
```

**Step 2: Verify install**

```bash
node -e "require('@tiptap/extension-highlight'); require('lowlight'); console.log('OK')"
```

Expected: `OK`

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install tiptap OSS extensions and lowlight"
```

---

### Task 2: Create `rte-features.ts`

**Files:**
- Create: `apps/frontend/src/app/shared/components/rich-text-editor/rte-features.ts`

**Step 1: Write the file**

```typescript
export type ToolbarMode = 'bubble' | 'full' | 'overflow';

export interface RteFeatures {
  // Text formatting
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  highlight?: boolean;
  color?: boolean;
  subscript?: boolean;
  superscript?: boolean;
  fontFamily?: boolean;
  textAlign?: boolean;

  // Structure
  headings?: boolean;
  bulletList?: boolean;
  orderedList?: boolean;
  taskList?: boolean;
  blockquote?: boolean;
  codeBlock?: boolean;
  table?: boolean;

  // Rich content
  link?: boolean;
  image?: boolean;
  mention?: boolean;

  // Meta
  characterCount?: number | false;
  typography?: boolean;
}

export const RTE_MINIMAL: RteFeatures = {
  bold: true,
  italic: true,
  underline: true,
  headings: true,
  bulletList: true,
  orderedList: true,
  link: true,
  characterCount: false,
};

export const RTE_STANDARD: RteFeatures = {
  ...RTE_MINIMAL,
  strike: true,
  highlight: true,
  color: true,
  taskList: true,
  blockquote: true,
  codeBlock: true,
  image: true,
  table: true,
};

export const RTE_FULL: RteFeatures = {
  ...RTE_STANDARD,
  subscript: true,
  superscript: true,
  fontFamily: true,
  textAlign: true,
  mention: true,
  typography: true,
};
```

**Step 2: Commit**

```bash
git add apps/frontend/src/app/shared/components/rich-text-editor/rte-features.ts
git commit -m "feat(rte): add RteFeatures interface, ToolbarMode type and presets"
```

---

### Task 3: Create `rte-extensions.ts`

**Files:**
- Create: `apps/frontend/src/app/shared/components/rich-text-editor/rte-extensions.ts`

**Step 1: Write the file**

```typescript
import { Extension } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Placeholder } from '@tiptap/extension-placeholder';
import { Link } from '@tiptap/extension-link';
import { Image } from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { TaskList } from '@tiptap/extension-task-list';
import { TaskItem } from '@tiptap/extension-task-item';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Underline } from '@tiptap/extension-underline';
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight';
import { Highlight } from '@tiptap/extension-highlight';
import { TextAlign } from '@tiptap/extension-text-align';
import { Subscript } from '@tiptap/extension-subscript';
import { Superscript } from '@tiptap/extension-superscript';
import { FontFamily } from '@tiptap/extension-font-family';
import { CharacterCount } from '@tiptap/extension-character-count';
import { Typography } from '@tiptap/extension-typography';
import { common, createLowlight } from 'lowlight';
import type { RteFeatures } from './rte-features';
import type { MentionItem } from './rte-mention';
import { buildMentionExtension } from './rte-mention';

const lowlight = createLowlight(common);

export function buildExtensions(
  f: RteFeatures,
  placeholder: string,
  mentionSearch?: (query: string) => Promise<MentionItem[]>,
): Extension[] {
  const exts: Extension[] = [
    StarterKit.configure({
      codeBlock: false,
      heading: f.headings !== false ? { levels: [1, 2, 3] } : false,
      bulletList: f.bulletList !== false,
      orderedList: f.orderedList !== false,
      blockquote: f.blockquote !== false,
      strike: f.strike !== false,
      bold: f.bold !== false,
      italic: f.italic !== false,
    }) as unknown as Extension,
    Placeholder.configure({ placeholder }) as unknown as Extension,
  ];

  if (f.underline !== false) exts.push(Underline as unknown as Extension);
  if (f.link !== false) exts.push(Link.configure({ openOnClick: false }) as unknown as Extension);
  if (f.image !== false) exts.push(Image as unknown as Extension);
  if (f.table !== false) {
    exts.push(
      Table.configure({ resizable: true }) as unknown as Extension,
      TableRow as unknown as Extension,
      TableCell as unknown as Extension,
      TableHeader as unknown as Extension,
    );
  }
  if (f.taskList !== false) {
    exts.push(
      TaskList as unknown as Extension,
      TaskItem.configure({ nested: true }) as unknown as Extension,
    );
  }
  if (f.color !== false) {
    exts.push(TextStyle as unknown as Extension, Color as unknown as Extension);
  } else if (f.fontFamily) {
    exts.push(TextStyle as unknown as Extension);
  }
  if (f.codeBlock !== false) {
    exts.push(CodeBlockLowlight.configure({ lowlight }) as unknown as Extension);
  }
  if (f.highlight) {
    exts.push(Highlight.configure({ multicolor: true }) as unknown as Extension);
  }
  if (f.textAlign) {
    exts.push(TextAlign.configure({ types: ['heading', 'paragraph'] }) as unknown as Extension);
  }
  if (f.subscript) exts.push(Subscript as unknown as Extension);
  if (f.superscript) exts.push(Superscript as unknown as Extension);
  if (f.fontFamily) exts.push(FontFamily as unknown as Extension);
  if (f.typography) exts.push(Typography as unknown as Extension);
  if (f.mention && mentionSearch) {
    exts.push(buildMentionExtension(mentionSearch) as unknown as Extension);
  }
  if (f.characterCount !== false) {
    exts.push(
      CharacterCount.configure({
        limit: typeof f.characterCount === 'number' ? f.characterCount : undefined,
      }) as unknown as Extension,
    );
  }

  return exts;
}
```

**Step 2: Commit**

```bash
git add apps/frontend/src/app/shared/components/rich-text-editor/rte-extensions.ts
git commit -m "feat(rte): add buildExtensions() pure function"
```

---

### Task 4: Create `rte-mention.ts`

**Files:**
- Create: `apps/frontend/src/app/shared/components/rich-text-editor/rte-mention.ts`

**Step 1: Write the file**

```typescript
import { Mention } from '@tiptap/extension-mention';

export interface MentionItem {
  id: string;
  label: string;
}

function positionEl(el: HTMLElement, rect: DOMRect): void {
  el.style.position = 'fixed';
  el.style.left = `${rect.left}px`;
  el.style.top = `${rect.bottom + 4}px`;
  el.style.zIndex = '9999';
}

function renderItems(el: HTMLUListElement, props: { items: MentionItem[]; command: (item: MentionItem) => void }): void {
  el.innerHTML = '';
  if (!props.items.length) {
    const li = document.createElement('li');
    li.className = 'rte-mention-empty';
    li.textContent = 'Không tìm thấy';
    el.appendChild(li);
    return;
  }
  props.items.forEach((item) => {
    const li = document.createElement('li');
    li.className = 'rte-mention-item';
    li.textContent = item.label;
    li.addEventListener('mousedown', (e) => {
      e.preventDefault();
      props.command(item);
    });
    el.appendChild(li);
  });
}

export function buildMentionExtension(search: (query: string) => Promise<MentionItem[]>) {
  return Mention.configure({
    HTMLAttributes: { class: 'rte-mention' },
    suggestion: {
      items: ({ query }: { query: string }) => search(query),
      render: () => {
        let el: HTMLUListElement;
        return {
          onStart: (props: any) => {
            el = document.createElement('ul');
            el.className = 'rte-mention-list';
            renderItems(el, props);
            document.body.appendChild(el);
            const rect = props.clientRect?.();
            if (rect) positionEl(el, rect);
          },
          onUpdate: (props: any) => {
            renderItems(el, props);
            const rect = props.clientRect?.();
            if (rect) positionEl(el, rect);
          },
          onKeyDown: ({ event }: { event: KeyboardEvent }) => {
            if (event.key === 'Escape') {
              el?.remove();
              return true;
            }
            return false;
          },
          onExit: () => el?.remove(),
        };
      },
    },
  });
}
```

**Step 2: Commit**

```bash
git add apps/frontend/src/app/shared/components/rich-text-editor/rte-mention.ts
git commit -m "feat(rte): add buildMentionExtension() with vanilla JS popup"
```

---

### Task 5: Refactor `rich-text-editor.component.ts`

**Files:**
- Modify: `apps/frontend/src/app/shared/components/rich-text-editor/rich-text-editor.component.ts`

**Step 1: Read current file first**

Read `apps/frontend/src/app/shared/components/rich-text-editor/rich-text-editor.component.ts` completely.

**Step 2: Replace entire file content**

The new component:

```typescript
import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  signal,
  forwardRef,
  NgZone,
  inject,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { NgxTiptapModule } from 'ngx-tiptap';
import { Editor } from '@tiptap/core';
import { Observable, take } from 'rxjs';
import type { TiptapDoc } from '@mpm/shared-types';
import { type RteFeatures, type ToolbarMode, RTE_FULL } from './rte-features';
import { buildExtensions } from './rte-extensions';
import type { MentionItem } from './rte-mention';

@Component({
  selector: 'app-rich-text-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, NgxTiptapModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => RichTextEditorComponent),
      multi: true,
    },
  ],
  templateUrl: './rich-text-editor.component.html',
  styleUrl: './rich-text-editor.component.css',
})
export class RichTextEditorComponent implements ControlValueAccessor, OnInit, OnDestroy {
  @Input() placeholder = '';
  @Input() toolbarMode: ToolbarMode = 'full';
  @Input() features: RteFeatures = RTE_FULL;
  @Input() uploadImage?: (file: File) => Observable<string>;
  @Input() mentionSearch?: (query: string) => Promise<MentionItem[]>;
  @Output() blurEditor = new EventEmitter<void>();

  editor!: Editor;

  protected readonly hasSelection = signal(false);
  protected readonly bubbleTop = signal(0);
  protected readonly bubbleLeft = signal(0);
  protected readonly showFloating = signal(false);
  protected readonly floatingTop = signal(0);
  protected readonly floatingLeft = signal(0);
  protected readonly showOverflow = signal(false);

  private onChange: (v: TiptapDoc | null) => void = () => {};
  protected onTouched: () => void = () => {};
  private pendingValue: TiptapDoc | null = null;

  private readonly zone = inject(NgZone);

  ngOnInit(): void {
    this.editor = new Editor({
      extensions: buildExtensions(this.features, this.placeholder, this.mentionSearch),
      editorProps: {
        handleDrop: this.features.image ? this.handleDrop.bind(this) : undefined,
        handlePaste: this.features.image ? this.handlePaste.bind(this) : undefined,
      },
      onUpdate: ({ editor }) => {
        const val = editor.isEmpty ? null : (editor.getJSON() as TiptapDoc);
        this.zone.run(() => this.onChange(val));
      },
      onBlur: () => {
        this.zone.run(() => {
          this.onTouched();
          this.blurEditor.emit();
        });
      },
      onSelectionUpdate: ({ editor }) => {
        const { from, to } = editor.state.selection;
        const sel = from !== to;
        this.zone.run(() => {
          this.hasSelection.set(sel);
          if (sel) {
            const dom = editor.view.dom.getBoundingClientRect();
            this.bubbleTop.set(dom.top - 44);
            this.bubbleLeft.set(dom.left);
          }
          // Floating menu: empty paragraph
          const node = editor.state.selection.$anchor.parent;
          const empty = node.childCount === 0 && node.type.name === 'paragraph';
          this.showFloating.set(empty);
          if (empty) {
            try {
              const coords = editor.view.coordsAtPos(editor.state.selection.from);
              this.floatingTop.set(coords.top);
              this.floatingLeft.set(coords.left);
            } catch {}
          }
        });
      },
    });

    if (this.pendingValue !== null) {
      this.editor.commands.setContent(this.pendingValue, false);
      this.pendingValue = null;
    }
  }

  ngOnDestroy(): void {
    this.editor?.destroy();
  }

  writeValue(value: TiptapDoc | null): void {
    if (!this.editor) {
      this.pendingValue = value;
      return;
    }
    const current = this.editor.isEmpty ? null : (this.editor.getJSON() as TiptapDoc);
    if (JSON.stringify(value) !== JSON.stringify(current)) {
      this.editor.commands.setContent(value ?? '', false);
    }
  }

  registerOnChange(fn: (v: TiptapDoc | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    disabled ? this.editor?.setEditable(false) : this.editor?.setEditable(true);
  }

  // ── Toolbar commands ──────────────────────────────────────────────

  toggleBold(): void { this.editor.chain().focus().toggleBold().run(); }
  toggleItalic(): void { this.editor.chain().focus().toggleItalic().run(); }
  toggleUnderline(): void { this.editor.chain().focus().toggleUnderline().run(); }
  toggleStrike(): void { this.editor.chain().focus().toggleStrike().run(); }
  toggleHighlight(): void { this.editor.chain().focus().toggleHighlight().run(); }
  toggleSubscript(): void { this.editor.chain().focus().toggleSubscript().run(); }
  toggleSuperscript(): void { this.editor.chain().focus().toggleSuperscript().run(); }
  setHeading(level: 1 | 2 | 3): void { this.editor.chain().focus().toggleHeading({ level }).run(); }
  toggleBulletList(): void { this.editor.chain().focus().toggleBulletList().run(); }
  toggleOrderedList(): void { this.editor.chain().focus().toggleOrderedList().run(); }
  toggleTaskList(): void { this.editor.chain().focus().toggleTaskList().run(); }
  toggleBlockquote(): void { this.editor.chain().focus().toggleBlockquote().run(); }
  toggleCodeBlock(): void { this.editor.chain().focus().toggleCodeBlock().run(); }
  setTextAlign(align: 'left' | 'center' | 'right' | 'justify'): void {
    this.editor.chain().focus().setTextAlign(align).run();
  }
  undo(): void { this.editor.chain().focus().undo().run(); }
  redo(): void { this.editor.chain().focus().redo().run(); }

  toggleOverflow(): void { this.showOverflow.update(v => !v); }

  onInsertImage(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) this.handleImageFile(file);
    };
    input.click();
  }

  // ── Image upload ──────────────────────────────────────────────────

  private handleDrop(view: any, event: DragEvent): boolean {
    const file = event.dataTransfer?.files?.[0];
    if (file?.type.startsWith('image/')) {
      event.preventDefault();
      this.handleImageFile(file);
      return true;
    }
    return false;
  }

  private handlePaste(view: any, event: ClipboardEvent): boolean {
    const item = Array.from(event.clipboardData?.items ?? []).find(i =>
      i.type.startsWith('image/'),
    );
    if (item) {
      const file = item.getAsFile();
      if (file) { this.handleImageFile(file); return true; }
    }
    return false;
  }

  private handleImageFile(file: File): void {
    if (this.uploadImage) {
      this.uploadImage(file)
        .pipe(take(1))
        .subscribe(url => this.editor.chain().focus().setImage({ src: url }).run());
    } else {
      const url = URL.createObjectURL(file);
      this.editor.chain().focus().setImage({ src: url }).run();
    }
  }
}
```

**Step 3: Commit**

```bash
git add apps/frontend/src/app/shared/components/rich-text-editor/rich-text-editor.component.ts
git commit -m "feat(rte): refactor component — ngOnInit editor, signals, image upload"
```

---

### Task 6: Write Mode B template (`full` toolbar)

**Files:**
- Modify: `apps/frontend/src/app/shared/components/rich-text-editor/rich-text-editor.component.html`

**Step 1: Read current template first.**

**Step 2: Replace with new template (full mode section)**

The template structure uses `@switch (toolbarMode)`. Mode `full` shows a flat toolbar with all groups. Below is the complete new template:

```html
<div class="rte-wrapper">
  @switch (toolbarMode) {

    @case ('full') {
      <div class="rte-toolbar rte-toolbar--full">
        <!-- History -->
        <button type="button" class="rte-btn" title="Hoàn tác" (click)="undo()">
          <i class="pi pi-undo"></i>
        </button>
        <button type="button" class="rte-btn" title="Làm lại" (click)="redo()">
          <i class="pi pi-refresh"></i>
        </button>
        <span class="rte-sep"></span>

        <!-- Headings -->
        @if (features.headings !== false) {
          <button type="button" class="rte-btn" [class.rte-btn--active]="editor.isActive('heading', { level: 1 })" (click)="setHeading(1)">H1</button>
          <button type="button" class="rte-btn" [class.rte-btn--active]="editor.isActive('heading', { level: 2 })" (click)="setHeading(2)">H2</button>
          <button type="button" class="rte-btn" [class.rte-btn--active]="editor.isActive('heading', { level: 3 })" (click)="setHeading(3)">H3</button>
          <span class="rte-sep"></span>
        }

        <!-- Formatting -->
        @if (features.bold !== false) {
          <button type="button" class="rte-btn" [class.rte-btn--active]="editor.isActive('bold')" title="Đậm" (click)="toggleBold()"><b>B</b></button>
        }
        @if (features.italic !== false) {
          <button type="button" class="rte-btn" [class.rte-btn--active]="editor.isActive('italic')" title="Nghiêng" (click)="toggleItalic()"><i>I</i></button>
        }
        @if (features.underline !== false) {
          <button type="button" class="rte-btn" [class.rte-btn--active]="editor.isActive('underline')" title="Gạch chân" (click)="toggleUnderline()"><u>U</u></button>
        }
        @if (features.strike !== false) {
          <button type="button" class="rte-btn" [class.rte-btn--active]="editor.isActive('strike')" title="Gạch ngang" (click)="toggleStrike()"><s>S</s></button>
        }
        @if (features.highlight) {
          <button type="button" class="rte-btn" [class.rte-btn--active]="editor.isActive('highlight')" title="Tô màu nền" (click)="toggleHighlight()">
            <i class="pi pi-pencil"></i>
          </button>
        }
        <span class="rte-sep"></span>

        <!-- Lists -->
        @if (features.bulletList !== false) {
          <button type="button" class="rte-btn" [class.rte-btn--active]="editor.isActive('bulletList')" title="Danh sách" (click)="toggleBulletList()">
            <i class="pi pi-list"></i>
          </button>
        }
        @if (features.orderedList !== false) {
          <button type="button" class="rte-btn" [class.rte-btn--active]="editor.isActive('orderedList')" title="Danh sách đánh số" (click)="toggleOrderedList()">
            <i class="pi pi-sort-amount-down"></i>
          </button>
        }
        @if (features.taskList !== false) {
          <button type="button" class="rte-btn" [class.rte-btn--active]="editor.isActive('taskList')" title="Danh sách việc" (click)="toggleTaskList()">
            <i class="pi pi-check-square"></i>
          </button>
        }
        <span class="rte-sep"></span>

        <!-- Block -->
        @if (features.blockquote !== false) {
          <button type="button" class="rte-btn" [class.rte-btn--active]="editor.isActive('blockquote')" title="Trích dẫn" (click)="toggleBlockquote()">
            <i class="pi pi-comment"></i>
          </button>
        }
        @if (features.codeBlock !== false) {
          <button type="button" class="rte-btn" [class.rte-btn--active]="editor.isActive('codeBlock')" title="Code block" (click)="toggleCodeBlock()">
            <i class="pi pi-code"></i>
          </button>
        }
        @if (features.image !== false) {
          <button type="button" class="rte-btn" title="Chèn ảnh" (click)="onInsertImage()">
            <i class="pi pi-image"></i>
          </button>
        }

        <!-- Sub/Sup -->
        @if (features.subscript) {
          <button type="button" class="rte-btn" [class.rte-btn--active]="editor.isActive('subscript')" title="Chỉ số dưới" (click)="toggleSubscript()">x₂</button>
        }
        @if (features.superscript) {
          <button type="button" class="rte-btn" [class.rte-btn--active]="editor.isActive('superscript')" title="Chỉ số trên" (click)="toggleSuperscript()">x²</button>
        }

        <!-- Text align -->
        @if (features.textAlign) {
          <span class="rte-sep"></span>
          <button type="button" class="rte-btn" title="Trái" (click)="setTextAlign('left')"><i class="pi pi-align-left"></i></button>
          <button type="button" class="rte-btn" title="Giữa" (click)="setTextAlign('center')"><i class="pi pi-align-center"></i></button>
          <button type="button" class="rte-btn" title="Phải" (click)="setTextAlign('right')"><i class="pi pi-align-right"></i></button>
          <button type="button" class="rte-btn" title="Đều hai bên" (click)="setTextAlign('justify')"><i class="pi pi-align-justify"></i></button>
        }
      </div>
    }

    @case ('bubble') {
      <!-- Static structural toolbar -->
      <div class="rte-toolbar rte-toolbar--bubble-static">
        @if (features.headings !== false) {
          <button type="button" class="rte-btn" [class.rte-btn--active]="editor.isActive('heading', { level: 1 })" (click)="setHeading(1)">H1</button>
          <button type="button" class="rte-btn" [class.rte-btn--active]="editor.isActive('heading', { level: 2 })" (click)="setHeading(2)">H2</button>
          <button type="button" class="rte-btn" [class.rte-btn--active]="editor.isActive('heading', { level: 3 })" (click)="setHeading(3)">H3</button>
          <span class="rte-sep"></span>
        }
        @if (features.bulletList !== false) {
          <button type="button" class="rte-btn" [class.rte-btn--active]="editor.isActive('bulletList')" (click)="toggleBulletList()"><i class="pi pi-list"></i></button>
        }
        @if (features.orderedList !== false) {
          <button type="button" class="rte-btn" [class.rte-btn--active]="editor.isActive('orderedList')" (click)="toggleOrderedList()"><i class="pi pi-sort-amount-down"></i></button>
        }
        @if (features.taskList !== false) {
          <button type="button" class="rte-btn" [class.rte-btn--active]="editor.isActive('taskList')" (click)="toggleTaskList()"><i class="pi pi-check-square"></i></button>
        }
        <span class="rte-sep"></span>
        @if (features.codeBlock !== false) {
          <button type="button" class="rte-btn" [class.rte-btn--active]="editor.isActive('codeBlock')" (click)="toggleCodeBlock()"><i class="pi pi-code"></i></button>
        }
        @if (features.image !== false) {
          <button type="button" class="rte-btn" (click)="onInsertImage()"><i class="pi pi-image"></i></button>
        }
      </div>

      <!-- Bubble menu (shown on text selection) -->
      @if (hasSelection()) {
        <div class="rte-bubble-menu" [style.top.px]="bubbleTop()" [style.left.px]="bubbleLeft()">
          @if (features.bold !== false) {
            <button type="button" class="rte-btn" [class.rte-btn--active]="editor.isActive('bold')" (click)="toggleBold()"><b>B</b></button>
          }
          @if (features.italic !== false) {
            <button type="button" class="rte-btn" [class.rte-btn--active]="editor.isActive('italic')" (click)="toggleItalic()"><i>I</i></button>
          }
          @if (features.underline !== false) {
            <button type="button" class="rte-btn" [class.rte-btn--active]="editor.isActive('underline')" (click)="toggleUnderline()"><u>U</u></button>
          }
          @if (features.strike !== false) {
            <button type="button" class="rte-btn" [class.rte-btn--active]="editor.isActive('strike')" (click)="toggleStrike()"><s>S</s></button>
          }
          @if (features.highlight) {
            <button type="button" class="rte-btn" [class.rte-btn--active]="editor.isActive('highlight')" (click)="toggleHighlight()"><i class="pi pi-pencil"></i></button>
          }
          @if (features.subscript) {
            <span class="rte-sep"></span>
            <button type="button" class="rte-btn" [class.rte-btn--active]="editor.isActive('subscript')" (click)="toggleSubscript()">x₂</button>
          }
          @if (features.superscript) {
            <button type="button" class="rte-btn" [class.rte-btn--active]="editor.isActive('superscript')" (click)="toggleSuperscript()">x²</button>
          }
          @if (features.textAlign) {
            <span class="rte-sep"></span>
            <button type="button" class="rte-btn" (click)="setTextAlign('left')"><i class="pi pi-align-left"></i></button>
            <button type="button" class="rte-btn" (click)="setTextAlign('center')"><i class="pi pi-align-center"></i></button>
            <button type="button" class="rte-btn" (click)="setTextAlign('right')"><i class="pi pi-align-right"></i></button>
          }
        </div>
      }

      <!-- Floating menu (shown on empty paragraph) -->
      @if (showFloating()) {
        <div class="rte-floating-menu" [style.top.px]="floatingTop()" [style.left.px]="floatingLeft()">
          <button type="button" class="rte-btn rte-btn--floating" title="Heading 1" (click)="setHeading(1)">H1</button>
          <button type="button" class="rte-btn rte-btn--floating" title="Heading 2" (click)="setHeading(2)">H2</button>
          <button type="button" class="rte-btn rte-btn--floating" title="Danh sách" (click)="toggleBulletList()"><i class="pi pi-list"></i></button>
          <button type="button" class="rte-btn rte-btn--floating" title="Danh sách việc" (click)="toggleTaskList()"><i class="pi pi-check-square"></i></button>
          @if (features.codeBlock !== false) {
            <button type="button" class="rte-btn rte-btn--floating" title="Code" (click)="toggleCodeBlock()"><i class="pi pi-code"></i></button>
          }
          @if (features.image !== false) {
            <button type="button" class="rte-btn rte-btn--floating" title="Ảnh" (click)="onInsertImage()"><i class="pi pi-image"></i></button>
          }
        </div>
      }
    }

    @case ('overflow') {
      <div class="rte-toolbar rte-toolbar--overflow">
        <!-- Primary buttons (always shown) -->
        @if (features.bold !== false) {
          <button type="button" class="rte-btn" [class.rte-btn--active]="editor.isActive('bold')" (click)="toggleBold()"><b>B</b></button>
        }
        @if (features.italic !== false) {
          <button type="button" class="rte-btn" [class.rte-btn--active]="editor.isActive('italic')" (click)="toggleItalic()"><i>I</i></button>
        }
        @if (features.underline !== false) {
          <button type="button" class="rte-btn" [class.rte-btn--active]="editor.isActive('underline')" (click)="toggleUnderline()"><u>U</u></button>
        }
        @if (features.headings !== false) {
          <span class="rte-sep"></span>
          <button type="button" class="rte-btn" [class.rte-btn--active]="editor.isActive('heading', { level: 1 })" (click)="setHeading(1)">H1</button>
          <button type="button" class="rte-btn" [class.rte-btn--active]="editor.isActive('heading', { level: 2 })" (click)="setHeading(2)">H2</button>
          <button type="button" class="rte-btn" [class.rte-btn--active]="editor.isActive('heading', { level: 3 })" (click)="setHeading(3)">H3</button>
        }
        @if (features.bulletList !== false) {
          <span class="rte-sep"></span>
          <button type="button" class="rte-btn" [class.rte-btn--active]="editor.isActive('bulletList')" (click)="toggleBulletList()"><i class="pi pi-list"></i></button>
        }
        @if (features.image !== false) {
          <button type="button" class="rte-btn" (click)="onInsertImage()"><i class="pi pi-image"></i></button>
        }
        @if (features.codeBlock !== false) {
          <button type="button" class="rte-btn" [class.rte-btn--active]="editor.isActive('codeBlock')" (click)="toggleCodeBlock()"><i class="pi pi-code"></i></button>
        }

        <!-- Overflow toggle -->
        <span class="rte-sep"></span>
        <div class="rte-overflow-wrapper">
          <button type="button" class="rte-btn" title="Thêm" (click)="toggleOverflow()">···</button>
          @if (showOverflow()) {
            <div class="rte-overflow-panel">
              @if (features.strike !== false) {
                <button type="button" class="rte-btn" [class.rte-btn--active]="editor.isActive('strike')" (click)="toggleStrike()"><s>S</s></button>
              }
              @if (features.highlight) {
                <button type="button" class="rte-btn" [class.rte-btn--active]="editor.isActive('highlight')" (click)="toggleHighlight()"><i class="pi pi-pencil"></i></button>
              }
              @if (features.subscript) {
                <button type="button" class="rte-btn" [class.rte-btn--active]="editor.isActive('subscript')" (click)="toggleSubscript()">x₂</button>
              }
              @if (features.superscript) {
                <button type="button" class="rte-btn" [class.rte-btn--active]="editor.isActive('superscript')" (click)="toggleSuperscript()">x²</button>
              }
              @if (features.textAlign) {
                <span class="rte-sep"></span>
                <button type="button" class="rte-btn" (click)="setTextAlign('left')"><i class="pi pi-align-left"></i></button>
                <button type="button" class="rte-btn" (click)="setTextAlign('center')"><i class="pi pi-align-center"></i></button>
                <button type="button" class="rte-btn" (click)="setTextAlign('right')"><i class="pi pi-align-right"></i></button>
              }
              @if (features.orderedList !== false) {
                <span class="rte-sep"></span>
                <button type="button" class="rte-btn" [class.rte-btn--active]="editor.isActive('orderedList')" (click)="toggleOrderedList()"><i class="pi pi-sort-amount-down"></i></button>
              }
              @if (features.taskList !== false) {
                <button type="button" class="rte-btn" [class.rte-btn--active]="editor.isActive('taskList')" (click)="toggleTaskList()"><i class="pi pi-check-square"></i></button>
              }
              @if (features.blockquote !== false) {
                <button type="button" class="rte-btn" [class.rte-btn--active]="editor.isActive('blockquote')" (click)="toggleBlockquote()"><i class="pi pi-comment"></i></button>
              }
            </div>
          }
        </div>
      </div>
    }
  }

  <!-- Editor content area -->
  <div class="rte-content">
    <tiptap-editor [editor]="editor"></tiptap-editor>
  </div>
</div>
```

**Step 3: Commit**

```bash
git add apps/frontend/src/app/shared/components/rich-text-editor/rich-text-editor.component.html
git commit -m "feat(rte): add 3 toolbar modes — full, bubble, overflow templates"
```

---

### Task 7: Update CSS

**Files:**
- Modify: `apps/frontend/src/app/shared/components/rich-text-editor/rich-text-editor.component.css`

**Step 1: Read current CSS first.**

**Step 2: Append new styles** (add to end of existing file):

```css
/* ── Toolbar base ───────────────────────────────────────── */
.rte-wrapper { position: relative; }

.rte-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 2px;
  padding: 4px 6px;
  border-bottom: 1px solid var(--p-surface-200);
  background: var(--p-surface-0);
}

.rte-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 28px;
  padding: 0 4px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--p-surface-600);
  font-size: 13px;
  cursor: pointer;
  transition: background 0.15s;
}

.rte-btn:hover { background: var(--p-surface-100); }
.rte-btn--active { background: var(--p-primary-50); color: var(--p-primary-600); }

.rte-sep {
  width: 1px;
  height: 18px;
  background: var(--p-surface-200);
  margin: 0 2px;
}

/* ── Bubble menu ────────────────────────────────────────── */
.rte-bubble-menu {
  position: fixed;
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 4px 6px;
  background: var(--p-surface-0);
  border: 1px solid var(--p-surface-200);
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.12);
  z-index: 1000;
  pointer-events: auto;
}

/* ── Floating menu ──────────────────────────────────────── */
.rte-floating-menu {
  position: fixed;
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 2px 4px;
  background: var(--p-surface-0);
  border: 1px solid var(--p-surface-200);
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  z-index: 999;
}

.rte-btn--floating { min-width: 24px; height: 24px; font-size: 12px; }

/* ── Overflow panel ─────────────────────────────────────── */
.rte-overflow-wrapper { position: relative; }

.rte-overflow-panel {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  padding: 6px;
  background: var(--p-surface-0);
  border: 1px solid var(--p-surface-200);
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.12);
  z-index: 1000;
  min-width: 160px;
}

/* ── Mention popup ──────────────────────────────────────── */
.rte-mention-list {
  list-style: none;
  margin: 0;
  padding: 4px;
  background: var(--p-surface-0);
  border: 1px solid var(--p-surface-200);
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.12);
  min-width: 160px;
  max-height: 220px;
  overflow-y: auto;
}

.rte-mention-item {
  padding: 6px 10px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  color: var(--p-surface-700);
}
.rte-mention-item:hover { background: var(--p-surface-100); }
.rte-mention-empty { padding: 8px 10px; font-size: 13px; color: var(--p-surface-400); }

/* ── Mention inline ─────────────────────────────────────── */
.rte-mention {
  background: var(--p-primary-50);
  color: var(--p-primary-600);
  border-radius: 4px;
  padding: 0 3px;
  font-weight: 500;
}

/* ── Code block ─────────────────────────────────────────── */
.rte-content pre {
  background: var(--p-surface-900);
  color: var(--p-surface-0);
  border-radius: 6px;
  padding: 12px 16px;
  overflow-x: auto;
  font-size: 13px;
}
.rte-content pre code { background: none; padding: 0; }

/* Dark mode adjustments */
@media (prefers-color-scheme: dark) {
  .rte-bubble-menu,
  .rte-floating-menu,
  .rte-overflow-panel,
  .rte-mention-list {
    background: var(--p-surface-800);
    border-color: var(--p-surface-600);
  }
  .rte-btn { color: var(--p-surface-300); }
  .rte-btn:hover { background: var(--p-surface-700); }
}
```

**Step 3: Commit**

```bash
git add apps/frontend/src/app/shared/components/rich-text-editor/rich-text-editor.component.css
git commit -m "feat(rte): add CSS for bubble menu, floating menu, overflow panel, mention popup"
```

---

### Task 8: TypeScript build check

**Files:** None (verification only)

**Step 1: Run build check**

```bash
cd /Volumes/myssd/Working/github/mpm
npx nx run frontend:build --skip-nx-cache 2>&1 | tail -50
```

OR if faster:

```bash
npx tsc -p apps/frontend/tsconfig.app.json --noEmit 2>&1 | head -60
```

**Step 2: Fix any import errors**

Common issues:
- Missing `@angular/core` imports in component
- TipTap extension type cast (`as unknown as Extension`) may need adjustment
- `editor.isActive(...)` might need `this.editor?.isActive(...)` guards in template

If `editor` is undefined before `ngOnInit`, add a null guard in template:
```html
@if (editor) {
  <!-- toolbar content -->
}
```

**Step 3: Commit fixes**

```bash
git add -p
git commit -m "fix(rte): resolve TypeScript errors from extensions refactor"
```

---

### Task 9: Update callers

**Files:**
- Modify: `apps/frontend/src/app/tasks/components/task-detail-panel/components/task-overview-tab.component.ts`
- Modify: `apps/frontend/src/app/projects/pages/project-settings/general-tab/general-tab.component.ts`
- Modify: `apps/frontend/src/app/tasks/pages/modules/module-form.component.ts`

**Step 1: Update task-overview-tab** — add `toolbarMode="bubble"` and `[features]="RTE_FULL"` inputs to the `<app-rich-text-editor>` there. Also import `RTE_FULL` from the rte-features file if needed for template binding.

In `task-overview-tab.component.ts`, add to template:
```html
<app-rich-text-editor
  toolbarMode="bubble"
  [(ngModel)]="editDescription"
  placeholder="Thêm mô tả..."
  (blurEditor)="onBlurDescription()">
</app-rich-text-editor>
```

**Step 2: Update general-tab** — use `toolbarMode="full"`:
```html
<app-rich-text-editor
  toolbarMode="full"
  [(ngModel)]="description"
  placeholder="Không có mô tả cho dự án này.">
</app-rich-text-editor>
```

**Step 3: Update module-form** — use `toolbarMode="overflow"`:
```html
<app-rich-text-editor
  toolbarMode="overflow"
  [(ngModel)]="formData.description"
  placeholder="Mô tả ngắn gọn cho module...">
</app-rich-text-editor>
```

**Step 4: Commit**

```bash
git add apps/frontend/src/app/tasks/components/task-detail-panel/components/task-overview-tab.component.ts
git add apps/frontend/src/app/projects/pages/project-settings/general-tab/general-tab.component.ts
git add apps/frontend/src/app/tasks/pages/modules/module-form.component.ts
git commit -m "feat(rte): update callers with toolbarMode inputs"
```

---

### Task 10: Final build verification + commit

**Step 1: Full TypeScript check**

```bash
npx tsc -p apps/frontend/tsconfig.app.json --noEmit 2>&1
```

Expected: no errors.

**Step 2: If errors remain, fix them**

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat(rte): complete RTE extensions — 3 toolbar modes, feature flags, image upload, mention"
```

---

## Notes for Implementer

- The `editor!` non-null assertion in the component is safe because `ngOnInit` always runs before any template is rendered. However, if a toolbar button fires before `ngOnInit` (impossible in Angular), it would throw — so guard with `this.editor?.` in methods if needed.
- `handleDrop` and `handlePaste` signatures must match TipTap's expected types exactly. If TS complains, cast with `(view: any, event: any)`.
- BubbleMenu position (`bubbleTop/bubbleLeft`) uses `editor.view.dom.getBoundingClientRect()` as a rough approximation. For precision, use `editor.view.coordsAtPos(from)` and `coordsAtPos(to)`, then take the midpoint.
- The `lowlight` instance uses `common` language set. Add more grammars with `lowlight.register({ python, ruby })` if needed.
- CSS variables (`--p-surface-*`, `--p-primary-*`) come from PrimeNG Aura preset and are available globally.
