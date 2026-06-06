# TipTap Rich Text Editor — Unified Content Editing Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace tất cả `<textarea>` cho nội dung dài bằng một `RichTextEditorComponent` dùng chung, hỗ trợ checklist, mention, bảng, ảnh và tìm kiếm toàn văn qua PostgreSQL FTS.

**Architecture:** Một shared Angular standalone component (`RichTextEditorComponent`) implement `ControlValueAccessor`, wraps TipTap qua `ngx-tiptap`. Backend lưu TipTap JSON vào cột `description` (jsonb) và extract plain text sang `description_plain` (text) để đánh GIN index cho PostgreSQL FTS. Data cũ (plain text) được migrate sang TipTap paragraph JSON.

**Tech Stack:** Angular 21 · `ngx-tiptap` · `@tiptap/starter-kit` + extensions · NestJS · TypeORM · PostgreSQL JSONB + GIN index

---

## Tổng quan các thay đổi

| Layer | Files bị ảnh hưởng |
|---|---|
| Frontend shared | `apps/frontend/src/app/shared/components/rich-text-editor/` (tạo mới) |
| Frontend pages | `task-overview-tab`, `general-tab`, `create-project`, `module-form` |
| Shared types | `libs/shared-types/src/task.types.ts`, `project.types.ts` |
| Backend entities | `task.entity.ts`, `project.entity.ts`, `module.entity.ts` |
| Backend services | `task-update.service.ts`, `project-update.service.ts`, `module.service.ts` |
| DB migration | 1 migration file mới |

---

## Task 1: Cài đặt TipTap dependencies (Frontend)

**Files:**
- Modify: `apps/frontend/package.json`

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
  @tiptap/extension-mention \
  @tiptap/extension-placeholder \
  @tiptap/extension-character-count \
  ngx-tiptap
```

**Step 2: Kiểm tra cài đặt**

```bash
cd apps/frontend && grep "@tiptap/core\|ngx-tiptap" package.json
```
Expected: 2 dòng xuất hiện với version numbers.

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
import {
  Component, forwardRef, OnDestroy, Input, OnInit, ChangeDetectionStrategy
} from '@angular/core';
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
         [class.opacity-50]="isDisabled" [class.pointer-events-none]="isDisabled">
      <!-- Toolbar -->
      <div class="rte-toolbar flex flex-wrap gap-1 p-2 border-b border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800">
        <button type="button" class="rte-btn" (click)="editor.chain().focus().toggleBold().run()"
                [class.active]="editor.isActive('bold')" title="Bold">
          <i class="pi pi-bold text-xs"></i>
        </button>
        <button type="button" class="rte-btn" (click)="editor.chain().focus().toggleItalic().run()"
                [class.active]="editor.isActive('italic')" title="Italic">
          <i class="pi pi-italic text-xs"></i>
        </button>
        <button type="button" class="rte-btn" (click)="editor.chain().focus().toggleUnderline().run()"
                [class.active]="editor.isActive('underline')" title="Underline">
          <i class="pi pi-underline text-xs"></i>
        </button>
        <div class="w-px bg-surface-300 dark:bg-surface-600 mx-1"></div>
        <button type="button" class="rte-btn" (click)="editor.chain().focus().toggleHeading({ level: 1 }).run()"
                [class.active]="editor.isActive('heading', { level: 1 })" title="Heading 1">H1</button>
        <button type="button" class="rte-btn" (click)="editor.chain().focus().toggleHeading({ level: 2 }).run()"
                [class.active]="editor.isActive('heading', { level: 2 })" title="Heading 2">H2</button>
        <button type="button" class="rte-btn" (click)="editor.chain().focus().toggleHeading({ level: 3 }).run()"
                [class.active]="editor.isActive('heading', { level: 3 })" title="Heading 3">H3</button>
        <div class="w-px bg-surface-300 dark:bg-surface-600 mx-1"></div>
        <button type="button" class="rte-btn" (click)="editor.chain().focus().toggleBulletList().run()"
                [class.active]="editor.isActive('bulletList')" title="Bullet List">
          <i class="pi pi-list text-xs"></i>
        </button>
        <button type="button" class="rte-btn" (click)="editor.chain().focus().toggleOrderedList().run()"
                [class.active]="editor.isActive('orderedList')" title="Ordered List">
          <i class="pi pi-sort-amount-down text-xs"></i>
        </button>
        <button type="button" class="rte-btn" (click)="editor.chain().focus().toggleTaskList().run()"
                [class.active]="editor.isActive('taskList')" title="Checklist">
          <i class="pi pi-check-square text-xs"></i>
        </button>
        <div class="w-px bg-surface-300 dark:bg-surface-600 mx-1"></div>
        <button type="button" class="rte-btn" (click)="editor.chain().focus().toggleBlockquote().run()"
                [class.active]="editor.isActive('blockquote')" title="Blockquote">
          <i class="pi pi-comment text-xs"></i>
        </button>
        <button type="button" class="rte-btn" (click)="editor.chain().focus().toggleCodeBlock().run()"
                [class.active]="editor.isActive('codeBlock')" title="Code Block">
          <i class="pi pi-code text-xs"></i>
        </button>
        <button type="button" class="rte-btn" (click)="insertTable()" title="Insert Table">
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
  @Input() minHeight = '120px';

  isDisabled = false;
  private onChange: (val: Record<string, any> | null) => void = () => {};
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
      const json = editor.isEmpty ? null : editor.getJSON();
      this.onChange(json);
    },
    onBlur: () => { this.onTouched(); },
  });

  writeValue(value: Record<string, any> | null): void {
    if (value && typeof value === 'object') {
      this.editor.commands.setContent(value, false);
    } else if (typeof value === 'string' && value) {
      // Backward compat: plain text từ DB cũ
      this.editor.commands.setContent(
        { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: value }] }] },
        false
      );
    } else {
      this.editor.commands.clearContent(false);
    }
  }

  registerOnChange(fn: (val: Record<string, any> | null) => void): void { this.onChange = fn; }
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
         border-0 bg-transparent font-medium;
}
.rte-btn.active {
  @apply bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300;
}
:host ::ng-deep .tiptap {
  outline: none;
}
:host ::ng-deep .tiptap p.is-editor-empty:first-child::before {
  color: #9ca3af;
  content: attr(data-placeholder);
  float: left;
  height: 0;
  pointer-events: none;
}
:host ::ng-deep .tiptap ul[data-type="taskList"] {
  list-style: none;
  padding: 0;
}
:host ::ng-deep .tiptap ul[data-type="taskList"] li {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
}
:host ::ng-deep .tiptap ul[data-type="taskList"] li > label {
  margin-top: 2px;
}
:host ::ng-deep .tiptap table {
  border-collapse: collapse;
  width: 100%;
  margin: 0.5rem 0;
}
:host ::ng-deep .tiptap table td,
:host ::ng-deep .tiptap table th {
  border: 1px solid #e5e7eb;
  padding: 4px 8px;
  min-width: 80px;
}
:host ::ng-deep .tiptap table th {
  background: #f9fafb;
  font-weight: 600;
}
```

**Step 4: Build check**

```bash
cd apps/frontend && npx ng build --configuration development 2>&1 | tail -20
```
Expected: Build thành công, không có lỗi TypeScript liên quan tới RichTextEditorComponent.

**Step 5: Commit**

```bash
git add apps/frontend/src/app/shared/
git commit -m "feat: add shared RichTextEditorComponent with TipTap"
```

---

## Task 3: DB Migration — Thêm description_plain + chuyển description sang jsonb

**Files:**
- Create: `migrations/1749040000000-RichTextDescriptionColumns.ts`

**Step 1: Tạo migration file**

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class RichTextDescriptionColumns1749040000000 implements MigrationInterface {
  name = 'RichTextDescriptionColumns1749040000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Thêm cột description_plain (text) cho FTS
    await queryRunner.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS description_plain text`);
    await queryRunner.query(`ALTER TABLE modules ADD COLUMN IF NOT EXISTS description_plain text`);
    await queryRunner.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS description_plain text`);

    // 2. Thêm cột description_content (jsonb) — lưu TipTap JSON
    await queryRunner.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS description_content jsonb`);
    await queryRunner.query(`ALTER TABLE modules ADD COLUMN IF NOT EXISTS description_content jsonb`);
    await queryRunner.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS description_content jsonb`);

    // 3. Migrate plain text cũ sang TipTap paragraph JSON trong description_content
    //    và copy sang description_plain
    await queryRunner.query(`
      UPDATE tasks
      SET
        description_content = jsonb_build_object(
          'type', 'doc',
          'content', jsonb_build_array(
            jsonb_build_object(
              'type', 'paragraph',
              'content', jsonb_build_array(
                jsonb_build_object('type', 'text', 'text', description)
              )
            )
          )
        ),
        description_plain = description
      WHERE description IS NOT NULL AND description != ''
    `);

    await queryRunner.query(`
      UPDATE modules
      SET
        description_content = jsonb_build_object(
          'type', 'doc',
          'content', jsonb_build_array(
            jsonb_build_object(
              'type', 'paragraph',
              'content', jsonb_build_array(
                jsonb_build_object('type', 'text', 'text', description)
              )
            )
          )
        ),
        description_plain = description
      WHERE description IS NOT NULL AND description != ''
    `);

    await queryRunner.query(`
      UPDATE projects
      SET
        description_content = jsonb_build_object(
          'type', 'doc',
          'content', jsonb_build_array(
            jsonb_build_object(
              'type', 'paragraph',
              'content', jsonb_build_array(
                jsonb_build_object('type', 'text', 'text', description)
              )
            )
          )
        ),
        description_plain = description
      WHERE description IS NOT NULL AND description != ''
    `);

    // 4. GIN index cho FTS trên description_plain
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
    await queryRunner.query(`ALTER TABLE tasks DROP COLUMN IF EXISTS description_content`);
    await queryRunner.query(`ALTER TABLE tasks DROP COLUMN IF EXISTS description_plain`);
    await queryRunner.query(`ALTER TABLE modules DROP COLUMN IF EXISTS description_content`);
    await queryRunner.query(`ALTER TABLE modules DROP COLUMN IF EXISTS description_plain`);
    await queryRunner.query(`ALTER TABLE projects DROP COLUMN IF EXISTS description_content`);
    await queryRunner.query(`ALTER TABLE projects DROP COLUMN IF EXISTS description_plain`);
  }
}
```

**Step 2: Chạy migration**

```bash
cd apps/backend && npm run migration:run
```
Expected: `RichTextDescriptionColumns1749040000000 has been executed successfully.`

**Step 3: Verify**

```bash
cd apps/backend && npx ts-node -e "
const { DataSource } = require('typeorm');
// hoặc dùng psql trực tiếp
"
```

Hoặc kiểm tra qua psql:
```sql
\d tasks
-- Expected: thấy cột description_content (jsonb) và description_plain (text)
SELECT count(*) FROM tasks WHERE description_content IS NOT NULL;
-- Expected: bằng số task có description cũ
```

**Step 4: Commit**

```bash
git add migrations/1749040000000-RichTextDescriptionColumns.ts
git commit -m "feat: add description_content jsonb + description_plain FTS columns"
```

---

## Task 4: Cập nhật TypeORM entities

**Files:**
- Modify: `apps/backend/src/task/entities/task.entity.ts`
- Modify: `apps/backend/src/task/entities/module.entity.ts`
- Modify: `apps/backend/src/project/entities/project.entity.ts`

**Step 1: Cập nhật Task entity**

Trong `task.entity.ts`, thêm 2 cột mới sau cột `description` hiện có (giữ nguyên `description` để backward compat đọc DB cũ):

```typescript
// Sau dòng:  @Column({ type: 'text', nullable: true }) description!: string | null;

@Column({ name: 'description_content', type: 'jsonb', nullable: true })
descriptionContent!: Record<string, any> | null;

@Column({ name: 'description_plain', type: 'text', nullable: true })
descriptionPlain!: string | null;
```

**Step 2: Cập nhật Module entity**

Tương tự trong `module.entity.ts`, sau `description`:

```typescript
@Column({ name: 'description_content', type: 'jsonb', nullable: true })
descriptionContent!: Record<string, any> | null;

@Column({ name: 'description_plain', type: 'text', nullable: true })
descriptionPlain!: string | null;
```

**Step 3: Cập nhật Project entity**

Tương tự trong `project.entity.ts`, sau `description`:

```typescript
@Column({ name: 'description_content', type: 'jsonb', nullable: true })
descriptionContent!: Record<string, any> | null;

@Column({ name: 'description_plain', type: 'text', nullable: true })
descriptionPlain!: string | null;
```

**Step 4: Build check**

```bash
cd apps/backend && npx tsc --noEmit 2>&1 | head -20
```
Expected: Không có lỗi TypeScript.

**Step 5: Commit**

```bash
git add apps/backend/src/task/entities/task.entity.ts \
        apps/backend/src/task/entities/module.entity.ts \
        apps/backend/src/project/entities/project.entity.ts
git commit -m "feat: add descriptionContent and descriptionPlain fields to entities"
```

---

## Task 5: Cập nhật Shared Types

**Files:**
- Modify: `libs/shared-types/src/task.types.ts`
- Modify: `libs/shared-types/src/project.types.ts`

**Step 1: Thêm TiptapDocument type và cập nhật description fields**

Trong `libs/shared-types/src/task.types.ts`, thêm ở đầu file:

```typescript
export type TiptapDocument = Record<string, any>;
```

Sau đó tìm tất cả interface có `description: string | null` hoặc `description?: string` và thêm field mới bên cạnh (giữ nguyên `description` string cho backward compat):

```typescript
// Thêm vào interface Task, TaskDetail, v.v.:
descriptionContent?: TiptapDocument | null;
descriptionPlain?: string | null;
```

Tương tự với DTOs cho create/update — thêm:
```typescript
// CreateTaskDto, UpdateTaskDto:
descriptionContent?: TiptapDocument | null;
```

**Step 2: Cập nhật project.types.ts**

Thêm `TiptapDocument` import hoặc khai báo lại, và thêm field tương tự vào `Project`, `CreateProjectDto`, `UpdateProjectDto`.

Thêm vào `Module` interface:
```typescript
descriptionContent?: TiptapDocument | null;
```

**Step 3: Build check shared types**

```bash
cd libs/shared-types && npx tsc --noEmit 2>&1 | head -20
```

**Step 4: Commit**

```bash
git add libs/shared-types/src/
git commit -m "feat: add TiptapDocument type and descriptionContent fields to shared types"
```

---

## Task 6: Backend — TipTap plain text extractor utility

**Files:**
- Create: `apps/backend/src/common/tiptap-extractor.ts`

**Step 1: Tạo utility**

```typescript
/**
 * Recursively extract plain text from a TipTap JSON document.
 * Used to populate description_plain for full-text search.
 */
export function extractPlainText(doc: Record<string, any> | null | undefined): string {
  if (!doc) return '';
  return extractFromNode(doc).trim();
}

function extractFromNode(node: Record<string, any>): string {
  if (node.type === 'text') return node.text ?? '';
  if (!node.content || !Array.isArray(node.content)) return '';
  return node.content.map((child: Record<string, any>) => extractFromNode(child)).join(' ');
}
```

**Step 2: Unit test (không dùng framework, chạy với ts-node)**

Tạo test inline để verify:
```bash
cd apps/backend && npx ts-node -e "
const { extractPlainText } = require('./src/common/tiptap-extractor');
const doc = {
  type: 'doc',
  content: [{
    type: 'paragraph',
    content: [{ type: 'text', text: 'Hello world' }]
  }, {
    type: 'taskList',
    content: [{ type: 'taskItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Checklist item' }] }] }]
  }]
};
const result = extractPlainText(doc);
console.assert(result.includes('Hello world'), 'Should extract paragraph text');
console.assert(result.includes('Checklist item'), 'Should extract task list text');
console.log('PASS:', result);
"
```
Expected: `PASS: Hello world Checklist item`

**Step 3: Commit**

```bash
git add apps/backend/src/common/tiptap-extractor.ts
git commit -m "feat: add TipTap plain text extractor for FTS"
```

---

## Task 7: Backend — Cập nhật save services để populate description_plain

**Files:**
- Modify: `apps/backend/src/task/task-update.service.ts` (line 28, 61)
- Modify: `apps/backend/src/project/project-update.service.ts` (line 33)
- Modify: `apps/backend/src/task/module/module.service.ts` (line 126, 202)

**Step 1: Cập nhật task-update.service.ts**

Import extractor ở đầu file:
```typescript
import { extractPlainText } from '../common/tiptap-extractor';
```

Trong DTO type (line 28), thêm:
```typescript
descriptionContent?: Record<string, any> | null;
```

Trong fields array (line 61), thêm `descriptionContent` vào list. Sau đó thêm logic sau vòng lặp fields, trước khi save:

```typescript
// Sau phần xử lý fields thông thường
if (dto.descriptionContent !== undefined) {
  task.descriptionContent = dto.descriptionContent;
  task.descriptionPlain = extractPlainText(dto.descriptionContent);
}
```

**Step 2: Cập nhật project-update.service.ts**

Import extractor. Tại line 33, thêm bên cạnh xử lý description:

```typescript
if (dto.descriptionContent !== undefined) {
  project.descriptionContent = dto.descriptionContent ?? null;
  project.descriptionPlain = extractPlainText(dto.descriptionContent);
}
```

**Step 3: Cập nhật module.service.ts**

Import extractor. Tại line 126 (create) và 202 (update):

```typescript
// Create (line ~126):
description_content: dto.descriptionContent ?? null,
description_plain: extractPlainText(dto.descriptionContent),

// Update (line ~202):
if (dto.descriptionContent !== undefined) {
  module.descriptionContent = dto.descriptionContent ?? null;
  module.descriptionPlain = extractPlainText(dto.descriptionContent);
}
```

**Step 4: Đảm bảo API response trả về descriptionContent**

Kiểm tra các query service / controller để đảm bảo `descriptionContent` được select và trả về trong response. Tìm các `select` hoặc `findOne` trong:
- `apps/backend/src/task/task-query.service.ts`
- `apps/backend/src/project/project-query.service.ts` (nếu tồn tại)
- `apps/backend/src/task/module/module-query.service.ts`

Nếu dùng `getRepository().find({ select: [...] })`, thêm `descriptionContent` vào select list.

**Step 5: Build check**

```bash
cd apps/backend && npx tsc --noEmit 2>&1 | head -30
```
Expected: Không có lỗi.

**Step 6: Commit**

```bash
git add apps/backend/src/task/task-update.service.ts \
        apps/backend/src/project/project-update.service.ts \
        apps/backend/src/task/module/module.service.ts
git commit -m "feat: populate description_plain from tiptap JSON in save services"
```

---

## Task 8: Frontend — Thay textarea task description

**Files:**
- Modify: `apps/frontend/src/app/tasks/components/task-detail-panel/components/task-overview-tab.component.ts`

**Step 1: Xác định vị trí thay thế**

Hiện tại tại line 163-164:
```html
<textarea pTextarea class="w-full text-sm resize-none" rows="6" placeholder="Thêm mô tả..."
  [(ngModel)]="editDescription" (blur)="onBlurDescription()"></textarea>
```

**Step 2: Thay bằng RichTextEditorComponent**

Trong imports array, thay `TextareaModule` bằng:
```typescript
import { RichTextEditorComponent } from '../../../../shared/components/rich-text-editor/rich-text-editor.component';
```

Xóa `TextareaModule` khỏi imports array (nếu không dùng ở nơi khác trong file). Thêm `RichTextEditorComponent`.

Trong template, thay textarea bằng:
```html
<app-rich-text-editor [(ngModel)]="editDescription"
  placeholder="Thêm mô tả..." (ngModelChange)="onDescriptionChange($event)">
</app-rich-text-editor>
```

**Step 3: Cập nhật TypeScript logic**

Đổi kiểu `editDescription` từ `string` sang `Record<string, any> | null`:
```typescript
protected editDescription: Record<string, any> | null = null;
```

Cập nhật `set task()` input setter (line 196):
```typescript
this.editDescription = v.descriptionContent ?? null;
```

Cập nhật `onBlurDescription()` → đổi thành `onDescriptionChange()`:
```typescript
protected onDescriptionChange(value: Record<string, any> | null): void {
  if (this.taskVal) {
    this.saveDescription.emit(value);
  }
}
```

Cập nhật `saveDescription` EventEmitter type:
```typescript
@Output() saveDescription = new EventEmitter<Record<string, any> | null>();
```

**Step 4: Cập nhật parent component (task-detail-panel) để gửi đúng field**

Tìm trong `task-detail-panel.component.ts` chỗ handle `saveDescription` emit và đảm bảo gửi `descriptionContent` thay vì `description`.

**Step 5: Build + manual test**

```bash
cd apps/frontend && npx ng serve --port 4200
```
Mở trình duyệt, mở task detail panel, kiểm tra:
- Editor hiển thị đúng
- Có thể tạo checklist (click icon ✓)
- Bold/Italic/Heading hoạt động
- Nội dung save được khi navigate đi và quay lại

**Step 6: Commit**

```bash
git add apps/frontend/src/app/tasks/components/task-detail-panel/
git commit -m "feat: replace task description textarea with RichTextEditor"
```

---

## Task 9: Frontend — Thay textarea project description

**Files:**
- Modify: `apps/frontend/src/app/projects/pages/project-settings/general-tab/general-tab.component.ts`
- Modify: `apps/frontend/src/app/projects/pages/create-project/create-project.component.ts`

**Step 1: general-tab.component.ts**

Import `RichTextEditorComponent`. Xóa `TextareaModule` import nếu chỉ dùng cho description.

Đổi kiểu `description` property từ `string` sang `Record<string, any> | null`:
```typescript
description: Record<string, any> | null = null;
```

Tìm chỗ load dữ liệu (line ~318: `this.description = project.description || ''`) và đổi thành:
```typescript
this.description = project.descriptionContent ?? null;
```

Tìm chỗ save (line ~412: `description: this.description || null`) và đổi thành:
```typescript
descriptionContent: this.description,
```

Trong template, thay `<textarea ... [(ngModel)]="description">` bằng:
```html
<app-rich-text-editor [(ngModel)]="description" placeholder="Mô tả dự án...">
</app-rich-text-editor>
```

**Step 2: create-project.component.ts**

Tương tự general-tab:
- Đổi `description = ''` → `description: Record<string, any> | null = null`
- Thay textarea bằng `<app-rich-text-editor>`
- Đổi payload: `description: this.description || undefined` → `descriptionContent: this.description`

**Step 3: Build + manual test**

Kiểm tra create project form và project settings general tab.

**Step 4: Commit**

```bash
git add apps/frontend/src/app/projects/
git commit -m "feat: replace project description textarea with RichTextEditor"
```

---

## Task 10: Frontend — Thay textarea module description

**Files:**
- Modify: `apps/frontend/src/app/tasks/pages/modules/module-form.component.ts`

**Step 1: Xác định vị trí**

Hiện tại line 14: `description: string | null` trong formData, line 66-73: textarea trong template.

**Step 2: Thay thế**

Import `RichTextEditorComponent`. Đổi `formData.description` type sang `Record<string, any> | null`.

Tìm chỗ load edit data (line ~165: `description: this.editModule.description`) và đổi thành:
```typescript
description: this.editModule.descriptionContent ?? null,
```

Tìm chỗ submit (payload đi kèm formData), đảm bảo gửi `descriptionContent: this.formData.description`.

Trong template, thay `<textarea ... [(ngModel)]="formData.description">` bằng:
```html
<app-rich-text-editor [(ngModel)]="formData.description" placeholder="Mô tả module...">
</app-rich-text-editor>
```

**Step 3: Build + manual test**

Kiểm tra module create/edit form.

**Step 4: Commit**

```bash
git add apps/frontend/src/app/tasks/pages/modules/module-form.component.ts
git commit -m "feat: replace module description textarea with RichTextEditor"
```

---

## Task 11: Backend — Search endpoint dùng PostgreSQL FTS

**Files:**
- Create: `apps/backend/src/search/search.controller.ts`
- Create: `apps/backend/src/search/search.service.ts`
- Create: `apps/backend/src/search/search.module.ts`
- Modify: `apps/backend/src/app.module.ts`

**Step 1: Tạo SearchService**

```typescript
// apps/backend/src/search/search.service.ts
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class SearchService {
  constructor(private readonly dataSource: DataSource) {}

  async search(query: string, projectId?: string): Promise<{
    tasks: any[];
    projects: any[];
    modules: any[];
  }> {
    const q = query.trim();
    if (!q) return { tasks: [], projects: [], modules: [] };

    // Tìm kiếm cả title/name lẫn description_plain
    const [tasks, projects, modules] = await Promise.all([
      this.dataSource.query(`
        SELECT id, task_id as "taskId", title, description_plain as "descriptionPlain", project_id as "projectId"
        FROM tasks
        WHERE (
          to_tsvector('simple', coalesce(title, '')) ||
          to_tsvector('simple', coalesce(description_plain, ''))
        ) @@ plainto_tsquery('simple', $1)
        ${projectId ? "AND project_id = $2" : ""}
        LIMIT 20
      `, projectId ? [q, projectId] : [q]),

      this.dataSource.query(`
        SELECT id, name, description_plain as "descriptionPlain"
        FROM projects
        WHERE (
          to_tsvector('simple', coalesce(name, '')) ||
          to_tsvector('simple', coalesce(description_plain, ''))
        ) @@ plainto_tsquery('simple', $1)
        LIMIT 10
      `, [q]),

      this.dataSource.query(`
        SELECT id, name, description_plain as "descriptionPlain", project_id as "projectId"
        FROM modules
        WHERE (
          to_tsvector('simple', coalesce(name, '')) ||
          to_tsvector('simple', coalesce(description_plain, ''))
        ) @@ plainto_tsquery('simple', $1)
        ${projectId ? "AND project_id = $2" : ""}
        LIMIT 10
      `, projectId ? [q, projectId] : [q]),
    ]);

    return { tasks, projects, modules };
  }
}
```

**Step 2: Tạo SearchController**

```typescript
// apps/backend/src/search/search.controller.ts
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { SearchService } from './search.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('search')
@UseGuards(JwtAuthGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  search(@Query('q') q: string, @Query('projectId') projectId?: string) {
    return this.searchService.search(q, projectId);
  }
}
```

**Step 3: Tạo SearchModule và đăng ký vào AppModule**

```typescript
// apps/backend/src/search/search.module.ts
import { Module } from '@nestjs/common';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';

@Module({
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
```

Thêm `SearchModule` vào `imports` của `AppModule`.

**Step 4: Test endpoint**

```bash
# Start server
cd apps/backend && npm run start:dev

# Test (thay TOKEN bằng JWT hợp lệ)
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:3000/search?q=checklist"
```
Expected: JSON response có `{ tasks: [...], projects: [...], modules: [...] }`.

**Step 5: Commit**

```bash
git add apps/backend/src/search/ apps/backend/src/app.module.ts
git commit -m "feat: add full-text search endpoint using PostgreSQL FTS"
```

---

## Checklist hoàn thành

- [ ] Task 1: TipTap packages installed
- [ ] Task 2: RichTextEditorComponent created
- [ ] Task 3: DB migration ran, columns và GIN index tồn tại
- [ ] Task 4: TypeORM entities updated
- [ ] Task 5: Shared types updated
- [ ] Task 6: tiptap-extractor utility created và tested
- [ ] Task 7: Backend save services updated
- [ ] Task 8: Task description replaced
- [ ] Task 9: Project description replaced (2 forms)
- [ ] Task 10: Module description replaced
- [ ] Task 11: Search endpoint working

## Lưu ý quan trọng

1. **Backward compat**: Giữ nguyên cột `description` (text/varchar) trong DB — không drop. Các endpoint cũ vẫn đọc được. Frontend mới sẽ ưu tiên `descriptionContent`.

2. **Empty check**: TipTap empty document vẫn có `{ type: 'doc', content: [{ type: 'paragraph' }] }`. Backend cần check `editor.isEmpty` phía frontend hoặc check `descriptionPlain === ''` phía backend trước khi lưu — save `null` nếu rỗng.

3. **Auth Guard**: `SearchController` phải dùng cùng guard với các controller khác trong project. Kiểm tra tên guard trong `apps/backend/src/auth/guards/`.

4. **ngx-tiptap version**: Đảm bảo cài đúng version tương thích với `@tiptap/core` đang dùng. Kiểm tra `ngx-tiptap` changelog nếu gặp lỗi peer dependency.
