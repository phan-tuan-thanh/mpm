# Rich Text Editor — Extensions & Configuration Design

**Date:** 2026-06-07
**Goal:** Mở rộng `RichTextEditorComponent` với đầy đủ OSS extensions, hỗ trợ 3 toolbar modes và feature flags per-instance.

---

## Architecture Overview

Component nhận 2 input chính:
- `toolbarMode` — điều khiển UX layout của toolbar
- `features` — bật/tắt từng extension riêng lẻ

Editor instance được khởi tạo trong `ngOnInit` (không phải class field) để đọc được `@Input()` trước khi tạo.

---

## Component API

```typescript
type ToolbarMode = 'bubble' | 'full' | 'overflow';

interface RteFeatures {
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
  codeBlock?: boolean;        // CodeBlockLowlight (syntax highlighting)
  table?: boolean;

  // Rich content
  link?: boolean;
  image?: boolean;            // upload support via uploadImage callback
  mention?: boolean;

  // Meta
  characterCount?: number | false;  // false = tắt, number = giới hạn ký tự
  typography?: boolean;             // auto-correct -- → —, (c) → © ...
}

// Presets
export const RTE_MINIMAL: RteFeatures   // bold, italic, list, heading, link
export const RTE_STANDARD: RteFeatures  // + highlight, color, codeBlock, image
export const RTE_FULL: RteFeatures      // tất cả

// Component inputs
@Input() toolbarMode: ToolbarMode = 'full';
@Input() features: RteFeatures = RTE_FULL;
@Input() placeholder: string;
@Input() uploadImage?: (file: File) => Observable<string>;
@Input() mentionSearch?: (query: string) => Promise<{id: string; label: string}[]>;
@Output() blurEditor: EventEmitter<void>;
```

**Ví dụ sử dụng:**
```html
<!-- Task description: full features, bubble mode -->
<app-rich-text-editor
  toolbarMode="bubble"
  [features]="RTE_FULL"
  [uploadImage]="uploadFn"
  [mentionSearch]="mentionSearch"
  [(ngModel)]="description" />

<!-- Module description: standard, flat toolbar -->
<app-rich-text-editor
  toolbarMode="full"
  [features]="RTE_STANDARD"
  [(ngModel)]="description" />

<!-- Custom override -->
<app-rich-text-editor
  toolbarMode="overflow"
  [features]="{ ...RTE_STANDARD, mention: false, table: true }"
  [(ngModel)]="description" />
```

---

## Toolbar Modes

### Mode A — `bubble` (Notion-like)

**Static toolbar** (structural only):
```
[H1 H2 H3] | [BulletList OrderedList TaskList] | [Code Table Image] | [CharCount?]
```

**BubbleMenu** (hiện khi bôi chọn text):
```
[B I U S] | [Highlight Color] | [Link] | [Align L C R] | [Sub Sup]
```

**FloatingMenu** (hiện trên dòng trống):
```
[+] → H1 / H2 / BulletList / TaskList / CodeBlock / Table / Image
```

Implementation dùng `tiptap-bubble-menu` và `tiptap-floating-menu` directives từ `ngx-tiptap`.

### Mode B — `full` (Google Docs-like)

Flat toolbar, tất cả buttons, chia nhóm bằng separator:
```
[Undo Redo] | [FontFamily] | [H1 H2 H3] |
[B I U S] | [Sub Sup] | [Align] |
[Color Highlight] | [BulletList OrderedList TaskList] |
[Blockquote Code Table Image Link Mention] | [CharCount]
```

### Mode C — `overflow`

Giống B nhưng nhóm "secondary" (FontFamily, Sub/Sup, TextAlign, Mention) thu gọn vào menu `[···]` ở cuối toolbar.

Primary (luôn hiện): Bold, Italic, Underline, H1-H3, Lists, Link, Image, Code, Table
Secondary (vào `[···]`): FontFamily, Sub/Sup, TextAlign, Highlight, Color, Mention, Typography controls

---

## Internal Architecture

### buildExtensions()

Pure function, nhận `RteFeatures`, trả về `Extension[]`:

```typescript
function buildExtensions(f: RteFeatures, mentionSearch?: ...): Extension[] {
  const exts: Extension[] = [
    StarterKit.configure({
      codeBlock: false,          // disabled — dùng CodeBlockLowlight thay thế
      heading: f.headings !== false ? { levels: [1,2,3] } : false,
      bulletList: f.bulletList ?? true,
      orderedList: f.orderedList ?? true,
      blockquote: f.blockquote ?? true,
    }),
    Placeholder.configure({ placeholder }),
  ];

  if (f.underline !== false)  exts.push(Underline);
  if (f.link !== false)       exts.push(Link.configure({ openOnClick: false }));
  if (f.image !== false)      exts.push(Image);
  if (f.table !== false)      exts.push(Table.configure({ resizable: true }), TableRow, TableCell, TableHeader);
  if (f.taskList !== false)   exts.push(TaskList, TaskItem.configure({ nested: true }));
  if (f.color !== false)      exts.push(TextStyle, Color);

  // New extensions
  if (f.codeBlock !== false)  exts.push(CodeBlockLowlight.configure({ lowlight }));
  if (f.highlight)            exts.push(Highlight.configure({ multicolor: true }));
  if (f.textAlign)            exts.push(TextAlign.configure({ types: ['heading','paragraph'] }));
  if (f.subscript)            exts.push(Subscript);
  if (f.superscript)          exts.push(Superscript);
  if (f.fontFamily)           exts.push(FontFamily);
  if (f.typography)           exts.push(Typography);
  if (f.mention && mentionSearch) exts.push(buildMentionExtension(mentionSearch));
  if (f.characterCount !== false) exts.push(
    CharacterCount.configure({ limit: typeof f.characterCount === 'number' ? f.characterCount : undefined })
  );

  return exts;
}
```

### Editor khởi tạo trong ngOnInit

```typescript
ngOnInit(): void {
  this.editor = new Editor({
    extensions: buildExtensions(this.features, this.mentionSearch),
    editorProps: {
      handleDrop: this.features.image ? this.handleDrop.bind(this) : undefined,
      handlePaste: this.features.image ? this.handlePaste.bind(this) : undefined,
    },
    onUpdate: ({ editor }) => this.onChange(editor.isEmpty ? null : editor.getJSON()),
    onBlur: () => { this.onTouched(); this.blurEditor.emit(); },
  });
}
```

---

## Image Upload

### 3 Workflow

**① Toolbar button → file picker:**
```typescript
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
```

**② Paste ảnh (Ctrl+V):**
```typescript
handlePaste: (view, event) => {
  const item = Array.from(event.clipboardData?.items ?? [])
    .find(i => i.type.startsWith('image/'));
  if (item) { this.handleImageFile(item.getAsFile()!); return true; }
  return false;
}
```

**③ Drag & drop ảnh:**
```typescript
handleDrop: (view, event) => {
  const file = event.dataTransfer?.files?.[0];
  if (file?.type.startsWith('image/')) {
    event.preventDefault();
    this.handleImageFile(file);
    return true;
  }
  return false;
}
```

**handleImageFile helper:**
```typescript
private handleImageFile(file: File): void {
  if (this.uploadImage) {
    this.uploadImage(file).pipe(take(1))
      .subscribe(url => this.editor.chain().focus().setImage({ src: url }).run());
  } else {
    // Fallback: ObjectURL local (không persist sau reload)
    const url = URL.createObjectURL(file);
    this.editor.chain().focus().setImage({ src: url }).run();
  }
}
```

---

## Mention

**Input:** `mentionSearch?: (query: string) => Promise<{id: string; label: string}[]>`

**Parent usage:**
```typescript
mentionSearch = (q: string) => Promise.resolve(
  this.memberOptions()
    .filter(m => m.displayName.toLowerCase().includes(q.toLowerCase()))
    .map(m => ({ id: m.userId, label: m.displayName }))
);
```

**Suggestion popup** — vanilla JS (không cần Angular CDK):
```typescript
function buildMentionExtension(search: (q: string) => Promise<...>) {
  return Mention.configure({
    HTMLAttributes: { class: 'rte-mention' },
    suggestion: {
      items: ({ query }) => search(query),
      render: () => {
        let el: HTMLUListElement;
        return {
          onStart: (props) => {
            el = document.createElement('ul');
            el.className = 'rte-mention-list';
            renderItems(el, props);
            document.body.appendChild(el);
            positionEl(el, props.clientRect!());
          },
          onUpdate: (props) => { renderItems(el, props); positionEl(el, props.clientRect!()); },
          onKeyDown: ({ event }) => handleKey(el, event),
          onExit: () => el?.remove(),
        };
      },
    },
  });
}
```

Popup styled bằng CSS thuần, match PrimeNG surface colors.

---

## OSS Extensions cần cài thêm

```bash
npm install \
  @tiptap/extension-codelowlight \
  @tiptap/extension-highlight \
  @tiptap/extension-text-align \
  @tiptap/extension-mention \
  @tiptap/extension-subscript \
  @tiptap/extension-superscript \
  @tiptap/extension-font-family \
  @tiptap/extension-character-count \
  @tiptap/extension-typography \
  lowlight \
  --legacy-peer-deps
```

## Extensions bị loại (Pro / trả phí)

- `UniqueID` — Pro
- `Mathematics` — Pro
- `TableOfContents` — Pro
- `FileHandler` — Pro (thay bằng custom handleDrop/handlePaste)
- `Details/DetailsSummary/DetailsContent` — Pro
- `Emoji` — Pro (TipTap official)

---

## Files cần tạo / sửa

| File | Action |
|---|---|
| `rich-text-editor/rich-text-editor.component.ts` | Refactor toàn bộ |
| `rich-text-editor/rich-text-editor.component.css` | Thêm styles cho BubbleMenu, FloatingMenu, Mention popup |
| `rich-text-editor/rte-features.ts` | Mới — types + presets |
| `rich-text-editor/rte-extensions.ts` | Mới — buildExtensions() |
| `rich-text-editor/rte-mention.ts` | Mới — buildMentionExtension() |
| `task-overview-tab.component.ts` | Truyền uploadImage + mentionSearch |
| `general-tab.component.ts` | Truyền uploadImage nếu cần |
