# TipTap Rich Text Editor — Unified Content Editing Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace tất cả `<textarea>` cho nội dung dài bằng một `RichTextEditorComponent` dùng chung, hỗ trợ checklist, mention, bảng, ảnh và tìm kiếm toàn văn qua PostgreSQL FTS.

**Architecture:** Một shared Angular standalone component (`RichTextEditorComponent`) implement `ControlValueAccessor`, wraps TipTap qua `ngx-tiptap`. Backend lưu TipTap JSON vào cột `description` (đổi type sang `jsonb`) và extract plain text sang `description_plain` (text) để đánh GIN index cho PostgreSQL FTS. Field name `description` giữ nguyên trong toàn bộ API — chỉ value type thay đổi từ string sang JSON object.

**Tech Stack:** Angular 21 · `ngx-tiptap` · `@tiptap/starter-kit` + extensions · NestJS · TypeORM · PostgreSQL JSONB + GIN index

---

## Các file thay đổi

| Layer | File |
|---|---|
| Frontend shared | `apps/frontend/src/app/shared/components/rich-text-editor/` (tạo mới) |
| Frontend tasks | `task-overview-tab.component.ts`, `task-detail-panel.component.ts` |
| Frontend projects | `general-tab.component.ts`, `create-project.component.ts` |
| Frontend modules | `module-form.component.ts` |
| Shared types | `libs/shared-types/src/task.types.ts`, `project.types.ts` |
| Backend entities | `task.entity.ts`, `module.entity.ts`, `project.entity.ts` |
| Backend DTOs | `update-project.dto.ts`, `create-project.dto.ts`, `module.dto.ts` |
| Backend create | `task-create.service.ts`, `project-create.service.ts`, `module-create.utils.ts` |
| Backend update | `task-update.service.ts`, `project-update.service.ts`, `module-update.utils.ts` |
| Backend search | `task-query.service.ts` (extend existing FTS) |
| DB | `migrations/1749040000000-RichTextDescriptionColumns.ts` |

---

## Task 1: Cài đặt TipTap dependencies

**Files:** `apps/frontend/package.json`

**Step 1: Cài packages**

```bash
cd apps/frontend && npm install \
  @tiptap/core \
  @tiptap/starter-kit \
  @tiptap/extension-underline \
  @tiptap/extension-link \
  @tiptap/extension-image \
  @tiptap/extension-table \
  @tiptap/extension-table-row \
  @tiptap/extension-table-cell \
  @tiptap/extension-table-header \
  @tiptap/extension-color \
  @tiptap/extension-text-style \
  @tiptap/extension-task-list \
  @tiptap/extension-task-item \
  @tiptap/extension-placeholder \
  ngx-tiptap
```

**Step 2: Verify**

```bash
grep -E '"@tiptap|ngx-tiptap"' apps/frontend/package.json | wc -l
# Expected: 13
```

**Step 3: Commit**

```bash
git add apps/frontend/package.json apps/frontend/package-lock.json
git commit -m "chore: add tiptap and ngx-tiptap dependencies"
```

---

## Task 2: Tạo shared RichTextEditorComponent

**Files:**
- Create: `apps/frontend/src/app/shared/components/rich-text-editor/rich-text-editor.component.ts`
- Create: `apps/frontend/src/app/shared/components/rich-text-editor/rich-text-editor.component.css`

**Step 1: Tạo thư mục**

```bash
mkdir -p apps/frontend/src/app/shared/components/rich-text-editor
```

**Step 2: Tạo component**

File: `apps/frontend/src/app/shared/components/rich-text-editor/rich-text-editor.component.ts`

```typescript
import { Component, forwardRef, OnDestroy, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Editor } from '@tiptap/core';
import { StarterKit } from '@tiptap/starter-kit';
import { Underline } from '@tiptap/extension-underline';
import { Link } from '@tiptap/extension-link';
import { Image } from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import { TaskList } from '@tiptap/extension-task-list';
import { TaskItem } from '@tiptap/extension-task-item';
import { Placeholder } from '@tiptap/extension-placeholder';
import { NgxTiptapModule } from 'ngx-tiptap';

export type TiptapDoc = Record<string, any>;

@Component({
  selector: 'app-rich-text-editor',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, NgxTiptapModule],
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => RichTextEditorComponent),
    multi: true,
  }],
  styleUrls: ['./rich-text-editor.component.css'],
  template: `
    <div class="rte-wrapper border border-surface-200 dark:border-surface-700 rounded-lg overflow-hidden"
         [class.opacity-60]="isDisabled" [class.pointer-events-none]="isDisabled">
      <!-- Toolbar -->
      <div class="rte-toolbar flex flex-wrap gap-1 p-2 border-b border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800">
        <button type="button" class="rte-btn" (click)="editor.chain().focus().toggleBold().run()"
                [class.active]="editor.isActive('bold')" title="Bold"><b>B</b></button>
        <button type="button" class="rte-btn" (click)="editor.chain().focus().toggleItalic().run()"
                [class.active]="editor.isActive('italic')" title="Italic"><i>I</i></button>
        <button type="button" class="rte-btn" (click)="editor.chain().focus().toggleUnderline().run()"
                [class.active]="editor.isActive('underline')" title="Underline"><u>U</u></button>
        <div class="rte-sep"></div>
        <button type="button" class="rte-btn" (click)="editor.chain().focus().toggleHeading({ level: 1 }).run()"
                [class.active]="editor.isActive('heading', { level: 1 })">H1</button>
        <button type="button" class="rte-btn" (click)="editor.chain().focus().toggleHeading({ level: 2 }).run()"
                [class.active]="editor.isActive('heading', { level: 2 })">H2</button>
        <button type="button" class="rte-btn" (click)="editor.chain().focus().toggleHeading({ level: 3 }).run()"
                [class.active]="editor.isActive('heading', { level: 3 })">H3</button>
        <div class="rte-sep"></div>
        <button type="button" class="rte-btn" (click)="editor.chain().focus().toggleBulletList().run()"
                [class.active]="editor.isActive('bulletList')" title="Bullet list">
          <i class="pi pi-list text-xs"></i>
        </button>
        <button type="button" class="rte-btn" (click)="editor.chain().focus().toggleOrderedList().run()"
                [class.active]="editor.isActive('orderedList')" title="Ordered list">
          <i class="pi pi-sort-amount-down text-xs"></i>
        </button>
        <button type="button" class="rte-btn" (click)="editor.chain().focus().toggleTaskList().run()"
                [class.active]="editor.isActive('taskList')" title="Checklist">
          <i class="pi pi-check-square text-xs"></i>
        </button>
        <div class="rte-sep"></div>
        <button type="button" class="rte-btn" (click)="editor.chain().focus().toggleBlockquote().run()"
                [class.active]="editor.isActive('blockquote')" title="Blockquote">
          <i class="pi pi-comment text-xs"></i>
        </button>
        <button type="button" class="rte-btn" (click)="editor.chain().focus().toggleCodeBlock().run()"
                [class.active]="editor.isActive('codeBlock')" title="Code block">
          <i class="pi pi-code text-xs"></i>
        </button>
        <button type="button" class="rte-btn" (click)="insertTable()" title="Insert table">
          <i class="pi pi-table text-xs"></i>
        </button>
      </div>
      <!-- Editor area -->
      <tiptap-editor [editor]="editor" class="rte-content block min-h-[120px] p-3 text-sm"></tiptap-editor>
    </div>
  `,
})
export class RichTextEditorComponent implements ControlValueAccessor, OnDestroy {
  @Input() placeholder = 'Nhập nội dung...';

  isDisabled = false;
  private onChange: (val: TiptapDoc | null) => void = () => {};
  private onTouched: () => void = () => {};

  editor = new Editor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false }),
      Image,
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      TextStyle,
      Color,
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder: this.placeholder }),
    ],
    onUpdate: ({ editor }) => {
      this.onChange(editor.isEmpty ? null : editor.getJSON());
    },
    onBlur: () => { this.onTouched(); },
  });

  writeValue(value: TiptapDoc | string | null): void {
    if (value && typeof value === 'object') {
      this.editor.commands.setContent(value, false);
    } else if (typeof value === 'string' && value) {
      // Backward compat: plain text từ DB cũ chưa migrate
      this.editor.commands.setContent(
        { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: value }] }] },
        false,
      );
    } else {
      this.editor.commands.clearContent(false);
    }
  }

  registerOnChange(fn: (val: TiptapDoc | null) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(isDisabled: boolean): void { this.isDisabled = isDisabled; }

  insertTable(): void {
    this.editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  }

  ngOnDestroy(): void { this.editor.destroy(); }
}
```

**Step 3: Tạo CSS**

File: `apps/frontend/src/app/shared/components/rich-text-editor/rich-text-editor.component.css`

```css
.rte-btn {
  @apply px-2 py-1 text-xs rounded hover:bg-surface-200 dark:hover:bg-surface-600
         text-surface-600 dark:text-surface-300 transition-colors cursor-pointer
         border-0 bg-transparent font-medium min-w-[28px];
}
.rte-btn.active {
  @apply bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300;
}
.rte-sep {
  @apply w-px bg-surface-300 dark:bg-surface-600 mx-1 self-stretch;
}

:host ::ng-deep .tiptap { outline: none; }

:host ::ng-deep .tiptap p.is-editor-empty:first-child::before {
  color: #9ca3af;
  content: attr(data-placeholder);
  float: left;
  height: 0;
  pointer-events: none;
}

:host ::ng-deep .tiptap ul[data-type="taskList"] { list-style: none; padding: 0; }
:host ::ng-deep .tiptap ul[data-type="taskList"] li {
  display: flex; align-items: flex-start; gap: 0.5rem;
}
:host ::ng-deep .tiptap ul[data-type="taskList"] li > label { margin-top: 2px; }

:host ::ng-deep .tiptap h1 { @apply text-2xl font-bold mt-3 mb-1; }
:host ::ng-deep .tiptap h2 { @apply text-xl font-bold mt-3 mb-1; }
:host ::ng-deep .tiptap h3 { @apply text-lg font-semibold mt-2 mb-1; }
:host ::ng-deep .tiptap ul, :host ::ng-deep .tiptap ol { @apply pl-5 my-1; }
:host ::ng-deep .tiptap li { @apply my-0.5; }
:host ::ng-deep .tiptap blockquote { @apply border-l-4 border-surface-300 pl-3 text-surface-500 my-2; }
:host ::ng-deep .tiptap code { @apply bg-surface-100 dark:bg-surface-800 px-1 rounded text-xs font-mono; }
:host ::ng-deep .tiptap pre { @apply bg-surface-100 dark:bg-surface-800 p-3 rounded my-2; }

:host ::ng-deep .tiptap table {
  border-collapse: collapse; width: 100%; margin: 0.5rem 0;
}
:host ::ng-deep .tiptap table td,
:host ::ng-deep .tiptap table th {
  border: 1px solid #e5e7eb; padding: 4px 8px; min-width: 80px; vertical-align: top;
}
:host ::ng-deep .tiptap table th { background: #f9fafb; font-weight: 600; }
```

**Step 4: Build check**

```bash
cd apps/frontend && npx ng build --configuration development 2>&1 | grep -E "ERROR|error TS" | head -20
# Expected: không có lỗi
```

**Step 5: Commit**

```bash
git add apps/frontend/src/app/shared/
git commit -m "feat: add shared RichTextEditorComponent with TipTap"
```

---

## Task 3: DB Migration — Chuyển description sang jsonb + thêm description_plain

**Files:**
- Create: `migrations/1749040000000-RichTextDescriptionColumns.ts`

**Step 1: Tạo migration**

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class RichTextDescriptionColumns1749040000000 implements MigrationInterface {
  name = 'RichTextDescriptionColumns1749040000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Thêm cột description_plain (text) cho FTS — làm trước khi đổi type
    await queryRunner.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS description_plain text`);
    await queryRunner.query(`ALTER TABLE modules ADD COLUMN IF NOT EXISTS description_plain text`);
    await queryRunner.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS description_plain text`);

    // 2. Copy plain text cũ sang description_plain trước khi ALTER TYPE
    await queryRunner.query(`
      UPDATE tasks SET description_plain = description
      WHERE description IS NOT NULL AND description != ''
    `);
    await queryRunner.query(`
      UPDATE modules SET description_plain = description
      WHERE description IS NOT NULL AND description != ''
    `);
    await queryRunner.query(`
      UPDATE projects SET description_plain = description
      WHERE description IS NOT NULL AND description != ''
    `);

    // 3. Đổi description từ text/varchar → jsonb (wrap plain text trong TipTap paragraph JSON)
    const wrapToTiptap = `
      CASE
        WHEN description IS NULL OR description = '' THEN NULL
        ELSE jsonb_build_object(
          'type', 'doc',
          'content', jsonb_build_array(
            jsonb_build_object(
              'type', 'paragraph',
              'content', jsonb_build_array(
                jsonb_build_object('type', 'text', 'text', description)
              )
            )
          )
        )
      END
    `;
    await queryRunner.query(`
      ALTER TABLE tasks ALTER COLUMN description TYPE jsonb USING (${wrapToTiptap})
    `);
    await queryRunner.query(`
      ALTER TABLE modules ALTER COLUMN description TYPE jsonb USING (${wrapToTiptap})
    `);
    // projects.description là varchar(2000) — cần USING tương tự
    await queryRunner.query(`
      ALTER TABLE projects ALTER COLUMN description TYPE jsonb USING (${wrapToTiptap})
    `);

    // 4. GIN index trên description_plain để FTS
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_tasks_description_fts
      ON tasks USING GIN (to_tsvector('simple', coalesce(description_plain, '')))
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_modules_description_fts
      ON modules USING GIN (to_tsvector('simple', coalesce(description_plain, '')))
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_projects_description_fts
      ON projects USING GIN (to_tsvector('simple', coalesce(description_plain, '')))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_tasks_description_fts`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_modules_description_fts`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_projects_description_fts`);

    // Rollback description về text (lấy plain text từ description_plain)
    await queryRunner.query(`
      ALTER TABLE tasks ALTER COLUMN description TYPE text
      USING coalesce(description_plain, '')
    `);
    await queryRunner.query(`
      ALTER TABLE modules ALTER COLUMN description TYPE text
      USING coalesce(description_plain, '')
    `);
    await queryRunner.query(`
      ALTER TABLE projects ALTER COLUMN description TYPE varchar(2000)
      USING coalesce(description_plain, '')
    `);

    await queryRunner.query(`ALTER TABLE tasks DROP COLUMN IF EXISTS description_plain`);
    await queryRunner.query(`ALTER TABLE modules DROP COLUMN IF EXISTS description_plain`);
    await queryRunner.query(`ALTER TABLE projects DROP COLUMN IF EXISTS description_plain`);
  }
}
```

**Step 2: Chạy migration**

```bash
cd apps/backend && npm run migration:run
# Expected: RichTextDescriptionColumns1749040000000 has been executed successfully.
```

**Step 3: Verify trên DB**

```bash
# Dùng psql hoặc bất kỳ DB client nào
# Kiểm tra schema
# \d tasks → thấy description (jsonb), description_plain (text)
# Kiểm tra data migrate
# SELECT description, description_plain FROM tasks WHERE description IS NOT NULL LIMIT 2;
```

**Step 4: Commit**

```bash
git add migrations/1749040000000-RichTextDescriptionColumns.ts
git commit -m "feat: migrate description columns to jsonb + add description_plain for FTS"
```

---

## Task 4: Cập nhật TypeORM entities

**Files:**
- Modify: `apps/backend/src/task/entities/task.entity.ts`
- Modify: `apps/backend/src/task/entities/module.entity.ts`
- Modify: `apps/backend/src/project/entities/project.entity.ts`

**Step 1: task.entity.ts**

Tìm dòng (line 43-44):
```typescript
@Column({ type: 'text', nullable: true })
description!: string | null;
```

Thay bằng:
```typescript
@Column({ type: 'jsonb', nullable: true })
description!: Record<string, any> | null;

@Column({ name: 'description_plain', type: 'text', nullable: true })
descriptionPlain!: string | null;
```

**Step 2: module.entity.ts**

Tìm dòng (line 33-34):
```typescript
@Column({ type: 'text', nullable: true })
description!: string | null;
```

Thay bằng:
```typescript
@Column({ type: 'jsonb', nullable: true })
description!: Record<string, any> | null;

@Column({ name: 'description_plain', type: 'text', nullable: true })
descriptionPlain!: string | null;
```

**Step 3: project.entity.ts**

Tìm dòng (line 26-27):
```typescript
@Column({ type: 'varchar', length: 2000, nullable: true })
description!: string | null;
```

Thay bằng:
```typescript
@Column({ type: 'jsonb', nullable: true })
description!: Record<string, any> | null;

@Column({ name: 'description_plain', type: 'text', nullable: true })
descriptionPlain!: string | null;
```

**Step 4: Build check**

```bash
cd apps/backend && npx tsc --noEmit 2>&1 | head -30
# Expected: không có lỗi
```

**Step 5: Commit**

```bash
git add apps/backend/src/task/entities/task.entity.ts \
        apps/backend/src/task/entities/module.entity.ts \
        apps/backend/src/project/entities/project.entity.ts
git commit -m "feat: change description column type to jsonb in TypeORM entities"
```

---

## Task 5: Cập nhật Shared Types

**Files:**
- Modify: `libs/shared-types/src/task.types.ts`
- Modify: `libs/shared-types/src/project.types.ts`

**Step 1: task.types.ts — Thêm TiptapDoc type và cập nhật description fields**

Thêm ở đầu file (sau các `export type`):
```typescript
export type TiptapDoc = Record<string, any>;
```

Tìm interface `Task` (extends TaskListItem):
```typescript
export interface Task extends TaskListItem {
  description: string | null;
```
Thay `description: string | null` → `description: TiptapDoc | null`.

Tìm interface `ProjectModule`:
```typescript
description: string | null;
```
Thay → `description: TiptapDoc | null`.

Tìm `CreateTaskDto`:
```typescript
description?: string;
```
Thay → `description?: TiptapDoc`.

Tìm `UpdateTaskDto`:
```typescript
description?: string | null;
```
Thay → `description?: TiptapDoc | null`.

**Step 2: project.types.ts — Cập nhật Project description**

Tìm interface `Project`:
```typescript
description: string | null;
```
Thay → `description: TiptapDoc | null`.

Tìm `CreateProjectDto` và `UpdateProjectDto`:
```typescript
description?: string;
description?: string | null;
```
Thay lần lượt → `description?: TiptapDoc` và `description?: TiptapDoc | null`.

**Step 3: Build check**

```bash
cd libs/shared-types && npx tsc --noEmit 2>&1 | head -20
# Expected: không có lỗi
```

**Step 4: Commit**

```bash
git add libs/shared-types/src/
git commit -m "feat: add TiptapDoc type and update description fields in shared types"
```

---

## Task 6: Backend — Tạo TipTap plain text extractor

**Files:**
- Create: `apps/backend/src/common/tiptap-extractor.ts`

**Step 1: Tạo utility**

```typescript
export type TiptapDoc = Record<string, any>;

export function extractPlainText(doc: TiptapDoc | null | undefined): string {
  if (!doc) return '';
  return collectText(doc).replace(/\s+/g, ' ').trim();
}

function collectText(node: Record<string, any>): string {
  if (node.type === 'text') return node.text ?? '';
  if (!Array.isArray(node.content)) return '';
  return node.content
    .map((child: Record<string, any>) => collectText(child))
    .join(' ');
}
```

**Step 2: Verify với ts-node**

```bash
cd apps/backend && npx ts-node --transpile-only -e "
const { extractPlainText } = require('./src/common/tiptap-extractor');
const doc = { type: 'doc', content: [
  { type: 'paragraph', content: [{ type: 'text', text: 'Hello world' }] },
  { type: 'taskList', content: [
    { type: 'taskItem', content: [
      { type: 'paragraph', content: [{ type: 'text', text: 'Checklist item' }] }
    ]}
  ]}
]};
const result = extractPlainText(doc);
console.assert(result.includes('Hello world'), 'FAIL: paragraph text missing');
console.assert(result.includes('Checklist item'), 'FAIL: task item text missing');
console.log('PASS:', result);
"
# Expected: PASS: Hello world Checklist item
```

**Step 3: Commit**

```bash
git add apps/backend/src/common/tiptap-extractor.ts
git commit -m "feat: add TipTap plain text extractor utility for FTS"
```

---

## Task 7: Backend — Cập nhật NestJS DTOs (validators)

**Files:**
- Modify: `apps/backend/src/project/dto/update-project.dto.ts`
- Modify: `apps/backend/src/project/dto/create-project.dto.ts`
- Modify: `apps/backend/src/task/module/module.dto.ts`

**Step 1: update-project.dto.ts**

Tìm block description:
```typescript
@IsOptional()
@IsString()
@MaxLength(2000)
description?: string | null;
```
Thay bằng (chấp nhận object JSON — không cần validator phức tạp vì frontend kiểm soát):
```typescript
@IsOptional()
description?: Record<string, any> | null;
```

Xóa `IsString` và `MaxLength` khỏi import nếu không còn dùng ở nơi khác.

**Step 2: create-project.dto.ts**

Tìm block description:
```typescript
@IsOptional()
@IsString()
@MaxLength(2000)
description?: string;
```
Thay bằng:
```typescript
@IsOptional()
description?: Record<string, any>;
```

**Step 3: module.dto.ts**

Tìm `CreateModuleDto`:
```typescript
description?: string | null;
```
Thay → `description?: Record<string, any> | null`.

Tìm `UpdateModuleDto`:
```typescript
description?: string | null;
```
Thay → `description?: Record<string, any> | null`.

Tìm `ModuleWithProgress`:
```typescript
description: string | null;
```
Thay → `description: Record<string, any> | null`.

**Step 4: Build check**

```bash
cd apps/backend && npx tsc --noEmit 2>&1 | head -30
```

**Step 5: Commit**

```bash
git add apps/backend/src/project/dto/ apps/backend/src/task/module/module.dto.ts
git commit -m "feat: update DTOs to accept TipTap JSON for description fields"
```

---

## Task 8: Backend — Cập nhật task create + update services

**Files:**
- Modify: `apps/backend/src/task/task-create.service.ts`
- Modify: `apps/backend/src/task/task-update.service.ts`

**Step 1: task-create.service.ts**

Thêm import ở đầu file:
```typescript
import { extractPlainText } from '../common/tiptap-extractor';
```

Đổi kiểu `dto.description` tại line 28:
```typescript
description?: Record<string, any>;
```

Tại line ~80, sau khi gán description, thêm `descriptionPlain`:
```typescript
description: dto.description ?? null,
descriptionPlain: extractPlainText(dto.description),
```

**Step 2: task-update.service.ts**

Thêm import:
```typescript
import { extractPlainText } from '../common/tiptap-extractor';
```

Đổi kiểu `dto.description` tại line 28:
```typescript
description?: Record<string, any> | null;
```

Tại line ~61, thêm `'descriptionPlain'` vào `fields` array KHÔNG làm được vì `descriptionPlain` cần được compute từ `description`. Thay vào đó, sau vòng lặp `for (const field of fields)`, thêm xử lý riêng:

Tìm đoạn trong vòng lặp fields (line ~64-69):
```typescript
for (const field of fields) {
  if (dto[field] !== undefined && dto[field] !== taskAny[field]) {
    changes.push({ field, oldValue: String(taskAny[field] ?? ''), newValue: String(dto[field] ?? '') });
    taskAny[field] = dto[field] === undefined ? null : dto[field];
  }
}
```

Sau vòng lặp này, thêm:
```typescript
// Khi description thay đổi, cập nhật description_plain cho FTS
if (dto.description !== undefined) {
  task.descriptionPlain = extractPlainText(dto.description ?? undefined);
}
```

**Step 3: Build check**

```bash
cd apps/backend && npx tsc --noEmit 2>&1 | head -20
```

**Step 4: Commit**

```bash
git add apps/backend/src/task/task-create.service.ts \
        apps/backend/src/task/task-update.service.ts
git commit -m "feat: extract description_plain from TipTap JSON in task create/update"
```

---

## Task 9: Backend — Cập nhật project create + update services

**Files:**
- Modify: `apps/backend/src/project/project-create.service.ts`
- Modify: `apps/backend/src/project/project-update.service.ts`

**Step 1: project-create.service.ts**

Thêm import:
```typescript
import { extractPlainText } from '../common/tiptap-extractor';
```

Tại line ~56, tìm:
```typescript
name: dto.name, key, description: dto.description ?? null, status: 'active',
```
Thêm `descriptionPlain`:
```typescript
name: dto.name, key, description: dto.description ?? null,
descriptionPlain: extractPlainText(dto.description),
status: 'active',
```

**Step 2: project-update.service.ts**

Thêm import:
```typescript
import { extractPlainText } from '../common/tiptap-extractor';
```

Tại line ~33, tìm:
```typescript
if (dto.description !== undefined) project.description = dto.description ?? null;
```
Thay bằng:
```typescript
if (dto.description !== undefined) {
  project.description = dto.description ?? null;
  project.descriptionPlain = extractPlainText(dto.description ?? undefined);
}
```

**Step 3: Build check**

```bash
cd apps/backend && npx tsc --noEmit 2>&1 | head -20
```

**Step 4: Commit**

```bash
git add apps/backend/src/project/project-create.service.ts \
        apps/backend/src/project/project-update.service.ts
git commit -m "feat: extract description_plain from TipTap JSON in project create/update"
```

---

## Task 10: Backend — Cập nhật module create + update utils

**Files:**
- Modify: `apps/backend/src/task/module/module-create.utils.ts`
- Modify: `apps/backend/src/task/module/module-update.utils.ts`

**Step 1: module-create.utils.ts**

Thêm import:
```typescript
import { extractPlainText } from '../../common/tiptap-extractor';
```

Tìm phần `moduleRepo.create({...})`, thêm `descriptionPlain` bên cạnh `description`:
```typescript
description: dto.description ?? null,
descriptionPlain: extractPlainText(dto.description ?? undefined),
```

**Step 2: module-update.utils.ts**

Thêm import:
```typescript
import { extractPlainText } from '../../common/tiptap-extractor';
```

Tìm dòng:
```typescript
if (dto.description !== undefined) module.description = dto.description;
```
Thay bằng:
```typescript
if (dto.description !== undefined) {
  module.description = dto.description ?? null;
  module.descriptionPlain = extractPlainText(dto.description ?? undefined);
}
```

**Step 3: Build check**

```bash
cd apps/backend && npx tsc --noEmit 2>&1 | head -20
```

**Step 4: Commit**

```bash
git add apps/backend/src/task/module/module-create.utils.ts \
        apps/backend/src/task/module/module-update.utils.ts
git commit -m "feat: extract description_plain from TipTap JSON in module create/update"
```

---

## Task 11: Backend — Mở rộng FTS trong task-query.service.ts

**Files:**
- Modify: `apps/backend/src/task/task-query.service.ts`

**Step 1: Mở rộng `findAll` search filter (line ~89-93)**

Tìm:
```typescript
if (query.search?.trim()) {
  qb.andWhere(
    `(to_tsvector('simple', t.title) @@ plainto_tsquery('simple', :search) OR t.taskId ILIKE :taskIdSearch)`,
    { search: query.search.trim(), taskIdSearch: `%${query.search.trim()}%` },
  );
}
```
Thay bằng (thêm `description_plain` vào FTS):
```typescript
if (query.search?.trim()) {
  qb.andWhere(
    `(
      to_tsvector('simple', t.title) @@ plainto_tsquery('simple', :search)
      OR to_tsvector('simple', coalesce(t.description_plain, '')) @@ plainto_tsquery('simple', :search)
      OR t.taskId ILIKE :taskIdSearch
    )`,
    { search: query.search.trim(), taskIdSearch: `%${query.search.trim()}%` },
  );
}
```

**Step 2: Mở rộng `search()` method (line ~130-148)**

Tìm:
```typescript
.andWhere(
  `(to_tsvector('simple', t.title) @@ plainto_tsquery('simple', :q) OR t.taskId ILIKE :like)`,
  { q: query, like: `%${query}%` },
)
```
Thay bằng:
```typescript
.andWhere(
  `(
    to_tsvector('simple', t.title) @@ plainto_tsquery('simple', :q)
    OR to_tsvector('simple', coalesce(t.description_plain, '')) @@ plainto_tsquery('simple', :q)
    OR t.taskId ILIKE :like
  )`,
  { q: query, like: `%${query}%` },
)
```

**Step 3: Build check**

```bash
cd apps/backend && npx tsc --noEmit 2>&1 | head -20
```

**Step 4: Commit**

```bash
git add apps/backend/src/task/task-query.service.ts
git commit -m "feat: extend task FTS to include description_plain"
```

---

## Task 12: Frontend — Thay textarea task description

**Files:**
- Modify: `apps/frontend/src/app/tasks/components/task-detail-panel/components/task-overview-tab.component.ts`
- Modify: `apps/frontend/src/app/tasks/components/task-detail-panel/task-detail-panel.component.ts`

**Step 1: task-overview-tab.component.ts**

Thêm import `RichTextEditorComponent`:
```typescript
import { RichTextEditorComponent } from '../../../../shared/components/rich-text-editor/rich-text-editor.component';
import type { TiptapDoc } from '../../../../shared/components/rich-text-editor/rich-text-editor.component';
```

Trong `imports` array: xóa `TextareaModule`, thêm `RichTextEditorComponent`.

Đổi kiểu `editDescription` (line ~232):
```typescript
protected editDescription: TiptapDoc | null = null;
```

Trong `set task()` setter, đổi line ~196:
```typescript
this.editDescription = v.description ?? null;
```
(không cần thay đổi gì vì `v.description` giờ đã là `TiptapDoc | null`)

Đổi `saveDescription` EventEmitter type (line ~218):
```typescript
@Output() saveDescription = new EventEmitter<TiptapDoc | null>();
```

Đổi `onBlurDescription()` thành `onDescriptionChange()`:
```typescript
protected onDescriptionChange(value: TiptapDoc | null): void {
  if (this.taskVal && JSON.stringify(value) !== JSON.stringify(this.taskVal.description)) {
    this.saveDescription.emit(value);
  }
}
```

Trong template, thay (line ~163-164):
```html
<textarea pTextarea class="w-full text-sm resize-none" rows="6" placeholder="Thêm mô tả..."
  [(ngModel)]="editDescription" (blur)="onBlurDescription()"></textarea>
```
Bằng:
```html
<app-rich-text-editor
  [(ngModel)]="editDescription"
  placeholder="Thêm mô tả..."
  (ngModelChange)="onDescriptionChange($event)">
</app-rich-text-editor>
```

**Step 2: task-detail-panel.component.ts**

Tìm line ~134:
```typescript
protected saveDescription(desc: string): void { const t = this.task(); if (t) this.taskStore.updateTask(this.projectId(), t.id, { description: desc }); }
```
Thay bằng:
```typescript
protected saveDescription(desc: Record<string, any> | null): void {
  const t = this.task();
  if (t) this.taskStore.updateTask(this.projectId(), t.id, { description: desc });
}
```

**Step 3: Build + manual test**

```bash
cd apps/frontend && npx ng serve --port 4200
```
Mở browser → task detail panel → kiểm tra:
- Editor hiển thị thay vì textarea
- Có thể tạo checklist (click icon ✓)
- Bold/Italic hoạt động
- Nội dung tự lưu khi chỉnh sửa

**Step 4: Commit**

```bash
git add apps/frontend/src/app/tasks/components/task-detail-panel/
git commit -m "feat: replace task description textarea with TipTap editor"
```

---

## Task 13: Frontend — Thay textarea project description (2 forms)

**Files:**
- Modify: `apps/frontend/src/app/projects/pages/project-settings/general-tab/general-tab.component.ts`
- Modify: `apps/frontend/src/app/projects/pages/create-project/create-project.component.ts`

**Step 1: general-tab.component.ts**

Thêm import:
```typescript
import { RichTextEditorComponent } from '../../../../shared/components/rich-text-editor/rich-text-editor.component';
import type { TiptapDoc } from '../../../../shared/components/rich-text-editor/rich-text-editor.component';
```

Trong `imports` array: xóa `TextareaModule`, thêm `RichTextEditorComponent`.

Đổi `description = ''` (line ~262) → `description: TiptapDoc | null = null`.

Tại line ~318, đổi:
```typescript
this.description = project.description || '';
```
Thành:
```typescript
this.description = project.description ?? null;
```

Tại line ~412 trong `onSubmit()`, đổi:
```typescript
description: this.description || null,
```
Thành:
```typescript
description: this.description,
```

Trong template, thay block textarea (line ~151-160):
```html
<textarea id="description" name="description" [rows]="4" pTextarea
  [(ngModel)]="description" [disabled]="isReadOnly() || isSubmitting()"
  maxlength="2000" placeholder="Không có mô tả cho dự án này."></textarea>
```
Bằng:
```html
<app-rich-text-editor
  [(ngModel)]="description"
  placeholder="Không có mô tả cho dự án này."
  [class.opacity-60]="isReadOnly() || isSubmitting()">
</app-rich-text-editor>
```

**Step 2: create-project.component.ts**

Thêm import (tương tự). Trong `imports` array thay `TextareaModule` bằng `RichTextEditorComponent`.

Đổi `description = ''` (line ~295) → `description: TiptapDoc | null = null`.

Tại line ~400 trong submit payload:
```typescript
description: this.description || undefined,
```
Thành:
```typescript
description: this.description ?? undefined,
```

Trong template, thay textarea bằng:
```html
<app-rich-text-editor [(ngModel)]="description" placeholder="Mô tả dự án (không bắt buộc)...">
</app-rich-text-editor>
```

**Step 3: Build + manual test**

Kiểm tra create project form và project settings general tab hoạt động đúng.

**Step 4: Commit**

```bash
git add apps/frontend/src/app/projects/
git commit -m "feat: replace project description textarea with TipTap editor"
```

---

## Task 14: Frontend — Thay textarea module description

**Files:**
- Modify: `apps/frontend/src/app/tasks/pages/modules/module-form.component.ts`

**Step 1: module-form.component.ts**

Thêm import:
```typescript
import { RichTextEditorComponent } from '../../../shared/components/rich-text-editor/rich-text-editor.component';
import type { TiptapDoc } from '../../../shared/components/rich-text-editor/rich-text-editor.component';
```

Trong `imports` array: xóa `TextareaModule`, thêm `RichTextEditorComponent`.

Đổi `ModuleFormData` interface:
```typescript
export interface ModuleFormData {
  name: string;
  description: TiptapDoc | null;   // đổi từ string | null
  status: ModuleStatus;
  startDate: string | null;
  endDate: string | null;
}
```

Tại line ~139 (initial formData):
```typescript
formData: ModuleFormData = {
  name: '',
  description: null,   // giữ nguyên null
  ...
```

Tại line ~165 (load editModule):
```typescript
description: this.editModule.description,   // giờ đã là TiptapDoc | null
```

Trong template, thay (line ~66-73):
```html
<textarea id="module-desc" pTextarea [(ngModel)]="formData.description"
  [rows]="4" [autoResize]="true" placeholder="Mô tả ngắn gọn cho module..."></textarea>
```
Bằng:
```html
<app-rich-text-editor
  [(ngModel)]="formData.description"
  placeholder="Mô tả ngắn gọn cho module...">
</app-rich-text-editor>
```

Label của module-desc cũng cần cập nhật từ `"Mô tả (Markdown)"` → `"Mô tả"`.

**Step 2: Build + manual test**

Kiểm tra module create/edit dialog.

**Step 3: Commit**

```bash
git add apps/frontend/src/app/tasks/pages/modules/module-form.component.ts
git commit -m "feat: replace module description textarea with TipTap editor"
```

---

## Checklist hoàn thành

- [ ] Task 1: TipTap packages installed
- [ ] Task 2: RichTextEditorComponent created (component + CSS)
- [ ] Task 3: Migration ran — `description` (jsonb) + `description_plain` (text) + GIN index
- [ ] Task 4: TypeORM entities updated (description: jsonb, descriptionPlain: text)
- [ ] Task 5: Shared types updated (TiptapDoc type + description fields)
- [ ] Task 6: tiptap-extractor utility created + tested
- [ ] Task 7: Backend DTOs updated (validators removed/changed)
- [ ] Task 8: task-create.service + task-update.service populate descriptionPlain
- [ ] Task 9: project-create.service + project-update.service populate descriptionPlain
- [ ] Task 10: module-create.utils + module-update.utils populate descriptionPlain
- [ ] Task 11: task-query.service FTS extended to include description_plain
- [ ] Task 12: task-overview-tab + task-detail-panel updated
- [ ] Task 13: general-tab + create-project updated
- [ ] Task 14: module-form updated

---

## Lưu ý quan trọng

1. **Không drop cột `description` cũ**: Migration đổi type in-place với USING clause. Rollback khả dụng.

2. **Empty TipTap doc**: `editor.isEmpty` trả về `true` khi chỉ có `<p></p>`. Component đã xử lý: emit `null` khi empty thay vì emit JSON rỗng.

3. **`task-detail-panel.component.ts` line 134**: Hàm `saveDescription` nhận `Record<string, any> | null` thay vì `string`. Đây là điểm duy nhất trong parent component cần cập nhật.

4. **Search hoạt động thông qua `description_plain`**: Sau migration, dữ liệu cũ đã được copy vào `description_plain`. Dữ liệu mới sẽ được extract qua `extractPlainText()` trong backend services. FTS trên jsonb column không hoạt động — phải dùng `description_plain`.

5. **Không cần SearchModule mới**: Tích hợp FTS vào `task-query.service.ts` sẵn có — tránh tạo infra thừa.
