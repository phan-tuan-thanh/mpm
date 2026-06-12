# Display Fields + State Icon + Sprint Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hiển thị Start date + State trên work item (List/Board), state icon cấu hình được như priority, fix bug priority emoji không render, sprint filter bổ sung nhóm completed có tìm kiếm + show more.

**Architecture:** Thêm cột `icon` vào `project_states` (icon đi cùng state ref đã embed trong API). Component presentational mới `app-state-dot` là điểm render duy nhất cho state (icon nếu có, fallback dot màu). Fix emoji bằng cách thay `<i [class]>` bằng `app-icon-display` sẵn có. Sprint filter dùng pure helper `buildSprintSections` (unit-test được) + computed `completedSprints` trong `SprintService`.

**Tech Stack:** Angular standalone components + signals, PrimeNG (popover, tooltip), TypeORM migrations (PostgreSQL), Jest (frontend: `apps/frontend`, chạy `npx jest`).

**Specs:** `docs/superpowers/specs/2026-06-12-display-startdate-state-design.md` và `docs/superpowers/specs/2026-06-12-state-icon-priority-emoji-sprint-filter-design.md`

**Quy ước chạy lệnh:** lệnh frontend chạy từ `apps/frontend/`, lệnh backend chạy từ `apps/backend/`, git chạy từ repo root.

---

## File Structure

| File | Trách nhiệm |
|------|-------------|
| `libs/shared-types/src/task.types.ts` | Modify: `TaskStateRef` thêm `icon` |
| `libs/shared-types/src/project.types.ts` | Modify: `ProjectState`, `CreateStateDto`, `UpdateStateDto` thêm `icon` |
| `migrations/1750001000000-AddIconToProjectStates.ts` | Create: cột `icon` trên `project_states` |
| `apps/backend/src/project/entities/project-state.entity.ts` | Modify: column `icon` |
| `apps/backend/src/project/state/project-state.service.ts` | Modify: create/update nhận `dto.icon` |
| `apps/backend/src/task/task-query.service.ts` | Modify: sub-items tree SQL select `ps.icon` |
| `apps/frontend/src/app/shared/components/state-dot/state-dot.component.ts` | Create: render state = icon hoặc dot, tooltip tên |
| `apps/frontend/src/app/shared/components/state-dot/state-dot.component.spec.ts` | Create: unit test logic |
| `apps/frontend/src/app/tasks/pages/backlog/task-list/task-row.component.ts` | Modify: start date, state dot, priority emoji fix |
| `apps/frontend/src/app/tasks/pages/backlog/task-list/task-list.component.ts` | Modify: group header dùng state-dot |
| `apps/frontend/src/app/tasks/pages/backlog/board/board-card.component.ts` | Modify: start date, state dot, priority emoji fix |
| `apps/frontend/src/app/tasks/pages/backlog/display-fields.spec.ts` | Create: structural test template (theo pattern `project-settings-tab-consistency.spec.ts`) |
| `apps/frontend/src/app/tasks/components/task-detail-panel/task-detail-panel.component.ts` | Modify: state pill/popover dùng state-dot, priority emoji fix |
| `apps/frontend/src/app/shared/components/icon-picker-panel/icon-picker.constants.ts` | Modify: context `'state'` |
| `apps/frontend/src/app/projects/pages/project-settings/states-tab/states-tab.component.{ts,html}` | Modify: icon picker cho state |
| `apps/frontend/src/app/projects/sprints/services/sprint.service.ts` | Modify: computed `completedSprints` |
| `apps/frontend/src/app/tasks/pages/backlog/backlog-toolbar/sprint-filter.helpers.ts` | Create: pure helpers build sections |
| `apps/frontend/src/app/tasks/pages/backlog/backlog-toolbar/sprint-filter.helpers.spec.ts` | Create: unit test helpers |
| `apps/frontend/src/app/tasks/pages/backlog/backlog-toolbar/backlog-toolbar.component.ts` | Modify: sprint popover mới |

---

### Task 1: Shared types — thêm `icon`

**Files:**
- Modify: `libs/shared-types/src/task.types.ts:111-116`
- Modify: `libs/shared-types/src/project.types.ts:91-102,164-176`

- [ ] **Step 1: Thêm `icon` vào `TaskStateRef`**

Trong `libs/shared-types/src/task.types.ts`:

```typescript
export interface TaskStateRef {
  id: string;
  name: string;
  color: string;
  group: string;
  icon?: string | null;
}
```

- [ ] **Step 2: Thêm `icon` vào `ProjectState`, `CreateStateDto`, `UpdateStateDto`**

Trong `libs/shared-types/src/project.types.ts`, interface `ProjectState` thêm dòng sau `group`:

```typescript
  icon?: string | null;
```

`CreateStateDto` và `UpdateStateDto`:

```typescript
export interface CreateStateDto {
  name: string;
  color: string;
  group: StateGroup;
  icon?: string;
}

export interface UpdateStateDto {
  name?: string;
  color?: string;
  group?: StateGroup;
  order?: number;
  isDefault?: boolean;
  icon?: string | null;
}
```

- [ ] **Step 3: Typecheck backend (backend dùng path `@mpm/shared-types` → src)**

Run (từ `apps/backend/`): `npm run build`
Expected: build thành công, không lỗi TS.

- [ ] **Step 4: Commit**

```bash
git add libs/shared-types/src/task.types.ts libs/shared-types/src/project.types.ts
git commit -m "feat(types): thêm icon vào TaskStateRef, ProjectState và state DTOs"
```

---

### Task 2: Migration + entity cột `icon`

**Files:**
- Create: `migrations/1750001000000-AddIconToProjectStates.ts`
- Modify: `apps/backend/src/project/entities/project-state.entity.ts:27-35`

Lưu ý: dùng `VARCHAR(100)` đồng bộ với `project_priority.icon` (migration `1749046000000`); spec ghi 50 nhưng 100 là chuẩn đã có cho icon (pi class dài + emoji nhiều codepoint).

- [ ] **Step 1: Viết migration**

Tạo `migrations/1750001000000-AddIconToProjectStates.ts`:

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIconToProjectStates1750001000000 implements MigrationInterface {
  name = 'AddIconToProjectStates1750001000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "project_states" ADD COLUMN "icon" VARCHAR(100)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "project_states" DROP COLUMN "icon"
    `);
  }
}
```

- [ ] **Step 2: Thêm column vào entity**

Trong `project-state.entity.ts`, sau property `color`:

```typescript
  @Column({ type: 'varchar', length: 100, nullable: true })
  icon!: string | null;
```

- [ ] **Step 3: Chạy migration**

Run (từ `apps/backend/`): `npm run migration:run`
Expected: log `Migration AddIconToProjectStates1750001000000 has been executed successfully.`

- [ ] **Step 4: Commit**

```bash
git add migrations/1750001000000-AddIconToProjectStates.ts apps/backend/src/project/entities/project-state.entity.ts
git commit -m "feat(backend): thêm cột icon vào project_states"
```

---

### Task 3: Backend service + sub-items query

**Files:**
- Modify: `apps/backend/src/project/state/project-state.service.ts:108-115,173-176`
- Modify: `apps/backend/src/task/task-query.service.ts:185-242,287-313`

- [ ] **Step 1: `create()` nhận icon**

Trong `project-state.service.ts`, khối `stateRepository.create({...})` (dòng ~108) thêm `icon`:

```typescript
    const state = this.stateRepository.create({
      projectId,
      name: dto.name,
      color: dto.color,
      group: dto.group,
      icon: dto.icon ?? null,
      isDefault: false,
      order: nextOrder,
    });
```

- [ ] **Step 2: `update()` nhận icon**

Sau dòng `if (dto.color !== undefined) state.color = dto.color;` (dòng ~173) thêm:

```typescript
    if (dto.icon !== undefined) state.icon = dto.icon;
```

- [ ] **Step 3: Sub-items tree SQL select icon**

Trong `task-query.service.ts`:

a) Inline row type (dòng ~185-190, chỗ khai báo `state_name: string;`) thêm:

```typescript
      state_icon: string | null;
```

b) Final SELECT (dòng ~236-238) thêm sau `ps."group" AS state_group`:

```sql
        ps.icon AS state_icon
```

(nhớ thêm dấu phẩy sau `state_group`).

c) Chỗ build node (dòng ~297-299) thêm `icon`:

```typescript
        state: row.state_name
          ? { id: row.state_id, name: row.state_name, color: row.state_color, group: row.state_group, icon: row.state_icon }
          : undefined,
```

- [ ] **Step 4: Build backend**

Run (từ `apps/backend/`): `npm run build`
Expected: thành công.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/project/state/project-state.service.ts apps/backend/src/task/task-query.service.ts
git commit -m "feat(backend): state icon trong create/update và sub-items tree query"
```

---

### Task 4: Component `app-state-dot` (TDD)

**Files:**
- Create: `apps/frontend/src/app/shared/components/state-dot/state-dot.component.ts`
- Test: `apps/frontend/src/app/shared/components/state-dot/state-dot.component.spec.ts`

- [ ] **Step 1: Viết test fail trước**

Tạo `state-dot.component.spec.ts` (pattern instantiate trực tiếp, không TestBed — giống `collapsible-section.component.spec.ts`):

```typescript
import { StateDotComponent } from './state-dot.component';

describe('StateDotComponent', () => {
  let component: StateDotComponent;

  beforeEach(() => {
    component = new StateDotComponent();
  });

  describe('isFilled — dot tô đặc theo group', () => {
    it.each(['started', 'completed'])('group %s → filled', (group) => {
      component.state = { name: 'X', color: '#10B981', group };
      expect(component.isFilled).toBe(true);
    });

    it.each(['backlog', 'unstarted', 'cancelled'])('group %s → chỉ viền', (group) => {
      component.state = { name: 'X', color: '#10B981', group };
      expect(component.isFilled).toBe(false);
    });
  });

  describe('iconColor — pi icon tô màu state, emoji giữ màu gốc', () => {
    it('pi icon → màu state', () => {
      component.state = { name: 'Done', color: '#10B981', group: 'completed', icon: 'pi pi-check-circle' };
      expect(component.iconColor).toBe('#10B981');
    });

    it('icon dạng "pi-..." (thiếu prefix "pi ") vẫn là pi icon', () => {
      component.state = { name: 'Done', color: '#10B981', group: 'completed', icon: 'pi-check-circle' };
      expect(component.iconColor).toBe('#10B981');
    });

    it('emoji → null (không override màu)', () => {
      component.state = { name: 'Done', color: '#10B981', group: 'completed', icon: '✅' };
      expect(component.iconColor).toBeNull();
    });

    it('không có icon → null', () => {
      component.state = { name: 'Todo', color: '#9CA3AF', group: 'unstarted' };
      expect(component.iconColor).toBeNull();
    });
  });

  it('size mặc định 14', () => {
    expect(component.size).toBe(14);
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận fail**

Run (từ `apps/frontend/`): `npx jest src/app/shared/components/state-dot/state-dot.component.spec.ts`
Expected: FAIL — `Cannot find module './state-dot.component'`.

- [ ] **Step 3: Implement component**

Tạo `state-dot.component.ts`:

```typescript
import { Component, Input } from '@angular/core';
import { TooltipModule } from 'primeng/tooltip';
import { IconDisplayComponent } from '../icon-display/icon-display.component';

/** Dữ liệu tối thiểu để render state — nhận được cả TaskStateRef lẫn ProjectState. */
export interface StateLike {
  name: string;
  color: string;
  group: string;
  icon?: string | null;
}

@Component({
  standalone: true,
  selector: 'app-state-dot',
  imports: [TooltipModule, IconDisplayComponent],
  template: `
    @if (state.icon) {
      <app-icon-display
        [icon]="state.icon"
        class="leading-none flex-shrink-0"
        [style.color]="iconColor"
        [style.font-size.px]="size - 2"
        [pTooltip]="state.name" />
    } @else {
      <span
        class="inline-block rounded-full border-2 flex-shrink-0"
        [style.width.px]="size"
        [style.height.px]="size"
        [style.border-color]="state.color"
        [style.background]="isFilled ? state.color : 'transparent'"
        [pTooltip]="state.name"></span>
    }
  `,
})
export class StateDotComponent {
  @Input({ required: true }) state!: StateLike;
  @Input() size = 14;

  get isFilled(): boolean {
    return this.state.group === 'started' || this.state.group === 'completed';
  }

  get iconColor(): string | null {
    const icon = this.state.icon;
    if (!icon) return null;
    const isPrime = icon.startsWith('pi ') || icon.startsWith('pi-');
    return isPrime ? this.state.color : null;
  }
}
```

- [ ] **Step 4: Chạy test, xác nhận pass**

Run (từ `apps/frontend/`): `npx jest src/app/shared/components/state-dot/state-dot.component.spec.ts`
Expected: PASS toàn bộ.

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/app/shared/components/state-dot/
git commit -m "feat(frontend): component app-state-dot render state icon/dot"
```

---

### Task 5: Start date + State trên List row, Board card, group header

**Files:**
- Create: `apps/frontend/src/app/tasks/pages/backlog/display-fields.spec.ts`
- Modify: `apps/frontend/src/app/tasks/pages/backlog/task-list/task-row.component.ts`
- Modify: `apps/frontend/src/app/tasks/pages/backlog/board/board-card.component.ts`
- Modify: `apps/frontend/src/app/tasks/pages/backlog/task-list/task-list.component.ts:108,304`

- [ ] **Step 1: Viết structural test fail trước**

Tạo `display-fields.spec.ts` (template inline trong `.ts`, assert bằng nội dung file — pattern đã dùng ở `project-settings-tab-consistency.spec.ts`):

```typescript
import * as fs from 'fs';
import * as path from 'path';

/**
 * Spec: docs/superpowers/specs/2026-06-12-display-startdate-state-design.md
 * Toggle showStartDate/showState trong Display Properties phải được
 * task-row (List) và board-card (Board) render.
 */
const read = (rel: string) =>
  fs.readFileSync(path.resolve(__dirname, rel), 'utf8');

describe('Display Properties: Start date và State được render', () => {
  const taskRow = read('./task-list/task-row.component.ts');
  const boardCard = read('./board/board-card.component.ts');
  const taskList = read('./task-list/task-list.component.ts');

  describe('task-row (List view)', () => {
    it('render start date theo toggle showStartDate', () => {
      expect(taskRow).toContain('displayProps.showStartDate && task.startDate');
    });
    it('render state qua app-state-dot theo toggle showState', () => {
      expect(taskRow).toContain('displayProps.showState && task.state');
      expect(taskRow).toContain('<app-state-dot');
    });
  });

  describe('board-card (Board view)', () => {
    it('render start date theo toggle showStartDate', () => {
      expect(boardCard).toContain('displayProps.showStartDate && task.startDate');
    });
    it('render state qua app-state-dot theo toggle showState', () => {
      expect(boardCard).toContain('displayProps.showState && task.state');
      expect(boardCard).toContain('<app-state-dot');
    });
  });

  describe('group header (task-list)', () => {
    it('dùng app-state-dot thay inline dot markup', () => {
      expect(taskList).toContain('<app-state-dot');
      expect(taskList).not.toContain('isFilledState');
    });
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận fail**

Run (từ `apps/frontend/`): `npx jest src/app/tasks/pages/backlog/display-fields.spec.ts`
Expected: FAIL toàn bộ assertion (code chưa render các field này).

- [ ] **Step 3: Sửa `task-row.component.ts`**

a) Import (đầu file, cạnh import `IconDisplayComponent` dòng 27):

```typescript
import { StateDotComponent } from '../../../../shared/components/state-dot/state-dot.component';
```

và thêm `StateDotComponent` vào mảng `imports` của `@Component`.

b) Thêm block start date **trước** block due date (trước `@if (displayProps.showDueDate && task.dueDate)` dòng ~141):

```html
    @if (displayProps.showStartDate && task.startDate) {
      <span class="flex items-center gap-0.5 text-xs text-gray-400 dark:text-surface-500 flex-shrink-0 mr-2" pTooltip="Start date"><i class="pi pi-calendar text-[10px]"></i>{{ formatDate(task.startDate) }}</span>
    }
```

c) Thêm block state **sau** block priority (sau `@if (displayProps.showPriority ...)` dòng ~144-146), trước block assignee:

```html
    @if (displayProps.showState && task.state) {
      <app-state-dot [state]="task.state" [size]="12" class="flex-shrink-0 mr-2" />
    }
```

d) Xóa helper không dùng `isFilledState` (dòng 186-188).

- [ ] **Step 4: Sửa `board-card.component.ts`**

a) Import `StateDotComponent` (đường dẫn `../../../../shared/components/state-dot/state-dot.component`) và thêm vào mảng `imports` của `@Component`.

b) Trong meta row (dòng ~110-146): thêm block state ngay **sau** block priority icon:

```html
        @if (displayProps.showState && task.state) {
          <app-state-dot [state]="task.state" [size]="12" />
        }
```

c) Thêm block start date ngay **trước** block due date (`@if (displayProps.showDueDate && task.dueDate)` dòng ~130):

```html
        @if (displayProps.showStartDate && task.startDate) {
          <span class="text-[10px] flex items-center gap-0.5 text-gray-400 dark:text-surface-500" pTooltip="Start date">
            <i class="pi pi-calendar" style="font-size: 9px"></i>
            {{ formatDate(task.startDate) }}
          </span>
        }
```

- [ ] **Step 5: Group header `task-list.component.ts` dùng state-dot**

a) Import `StateDotComponent` (đường dẫn `../../../../shared/components/state-dot/state-dot.component`) và thêm vào `imports`.

b) Thay dòng 108:

```html
              <span class="w-3.5 h-3.5 rounded-full flex-shrink-0 border-2" [style.border-color]="group.state.color" [style.background]="isFilledState(group.state.group) ? group.state.color : 'transparent'"></span>
```

bằng:

```html
              <app-state-dot [state]="group.state" />
```

c) Xóa helper `isFilledState` (dòng ~304) — trước khi xóa chạy `grep -n "isFilledState" task-list.component.ts` xác nhận không còn chỗ dùng khác.

- [ ] **Step 6: Chạy test, xác nhận pass**

Run (từ `apps/frontend/`): `npx jest src/app/tasks/pages/backlog/display-fields.spec.ts src/app/shared/components/state-dot/state-dot.component.spec.ts`
Expected: PASS toàn bộ.

- [ ] **Step 7: Commit**

```bash
git add apps/frontend/src/app/tasks/pages/backlog/
git commit -m "feat(frontend): hiển thị Start date và State trên List row, Board card theo Display Properties"
```

---

### Task 6: Fix priority emoji không hiển thị (4 chỗ)

**Files:**
- Create: `apps/frontend/src/app/tasks/pages/backlog/priority-icon-emoji.spec.ts`
- Modify: `apps/frontend/src/app/tasks/pages/backlog/task-list/task-row.component.ts:144-146`
- Modify: `apps/frontend/src/app/tasks/pages/backlog/board/board-card.component.ts:111-113`
- Modify: `apps/frontend/src/app/tasks/components/task-detail-panel/task-detail-panel.component.ts:288,507`

- [ ] **Step 1: Viết structural test fail trước**

Tạo `priority-icon-emoji.spec.ts`:

```typescript
import * as fs from 'fs';
import * as path from 'path';

/**
 * Spec: 2026-06-12-state-icon-priority-emoji-sprint-filter-design.md — Phần 2.
 * Priority icon có thể là emoji (icon picker tab Emoji). Render bằng
 * `<i [class]="icon">` thì emoji bị nhét vào attribute class → không hiển thị.
 * Mọi nơi render priority icon phải dùng app-icon-display.
 */
const read = (rel: string) =>
  fs.readFileSync(path.resolve(__dirname, rel), 'utf8');

describe('Priority icon render được emoji (dùng app-icon-display)', () => {
  it('task-row không còn <i [class] cho priority', () => {
    const src = read('./task-list/task-row.component.ts');
    expect(src).not.toMatch(/<i[^>]*\[class\]="priorityIcon/);
    expect(src).toMatch(/app-icon-display[^>]*\[icon\]="priorityIcon/);
  });

  it('board-card không còn <i [class] cho priority', () => {
    const src = read('./board/board-card.component.ts');
    expect(src).not.toMatch(/<i[^>]*\[class\]="priorityIcon/);
    expect(src).toMatch(/app-icon-display[^>]*\[icon\]="priorityIcon/);
  });

  it('task-detail-panel (pill + popover) không còn <i [class] cho priority', () => {
    const src = read('../../components/task-detail-panel/task-detail-panel.component.ts');
    expect(src).not.toMatch(/<i[^>]*\[class\]="selectedPriorityConfig\(\)\.icon/);
    expect(src).not.toMatch(/<i[^>]*\[class\]="p\.icon/);
    expect(src).toMatch(/app-icon-display[^>]*\[icon\]="selectedPriorityConfig\(\)\.icon/);
    expect(src).toMatch(/app-icon-display[^>]*\[icon\]="p\.icon/);
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận fail**

Run (từ `apps/frontend/`): `npx jest src/app/tasks/pages/backlog/priority-icon-emoji.spec.ts`
Expected: FAIL toàn bộ.

- [ ] **Step 3: Sửa task-row**

Thay block priority (dòng ~144-146):

```html
    @if (displayProps.showPriority && task.priority !== 'none') {
      <app-icon-display [icon]="priorityIcon(task.priority)" class="flex-shrink-0 text-xs mr-2 leading-none" [style.color]="priorityColor(task.priority)" [pTooltip]="'Priority: ' + task.priority" />
    }
```

(`IconDisplayComponent` đã có trong imports của task-row.)

- [ ] **Step 4: Sửa board-card**

Thay block priority (dòng ~111-113):

```html
        @if (displayProps.showPriority && task.priority !== 'none') {
          <app-icon-display [icon]="priorityIcon" class="text-[11px] leading-none" [style.color]="priorityColor" [pTooltip]="task.priority" />
        }
```

Thêm import `IconDisplayComponent` (đường dẫn `../../../../shared/components/icon-display/icon-display.component`) vào file + mảng `imports` nếu chưa có.

- [ ] **Step 5: Sửa task-detail-panel**

a) Meta pill (dòng ~288), thay `<i [class]="selectedPriorityConfig().icon" ...></i>` bằng:

```html
                  <app-icon-display [icon]="selectedPriorityConfig().icon" [style.color]="selectedPriorityConfig().colorLight" style="font-size: 11px" class="leading-none" />
```

b) Priority popover (dòng ~507), thay `<i [class]="p.icon" ...></i>` bằng:

```html
                <app-icon-display [icon]="p.icon" [style.color]="p.colorLight" style="font-size: 11px" class="leading-none" />
```

(`IconDisplayComponent` đã được import sẵn ở file này — dòng 67.)

- [ ] **Step 6: Chạy test, xác nhận pass**

Run (từ `apps/frontend/`): `npx jest src/app/tasks/pages/backlog/priority-icon-emoji.spec.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/frontend/src/app/tasks/
git commit -m "fix(frontend): priority icon emoji hiển thị đúng qua app-icon-display"
```

---

### Task 7: Icon picker context `state` + States tab cấu hình icon

**Files:**
- Modify: `apps/frontend/src/app/shared/components/icon-picker-panel/icon-picker.constants.ts:1,77-87,99-109`
- Modify: `apps/frontend/src/app/projects/pages/project-settings/states-tab/states-tab.component.ts`
- Modify: `apps/frontend/src/app/projects/pages/project-settings/states-tab/states-tab.component.html`

- [ ] **Step 1: Thêm context `'state'` vào constants**

Trong `icon-picker.constants.ts`:

```typescript
export type IconContext = 'priority' | 'sprint' | 'project' | 'state';
```

Gán thêm `'state'` cho 2 nhóm phù hợp với trạng thái/tiến trình:
- Nhóm `Status` (dòng ~78): `contexts: ['priority', 'sprint', 'project', 'state'],`
- Nhóm `General` (dòng ~100): không có `contexts` → hiện ở mọi context, giữ nguyên.

Nhóm khác giữ nguyên (không hiện trong context state).

- [ ] **Step 2: States tab component TS**

Trong `states-tab.component.ts`:

a) Thêm import:

```typescript
import { IconPickerPanelComponent } from '../../../../shared/components/icon-picker-panel/icon-picker-panel.component';
import { StateDotComponent } from '../../../../shared/components/state-dot/state-dot.component';
```

và thêm cả hai vào mảng `imports` của `@Component`.

b) Thêm field cạnh `newNames`/`newColors`:

```typescript
  newIcons: Record<string, string> = {};
```

và trong `ngOnInit()` (vòng for dòng ~110-114) thêm:

```typescript
      this.newIcons[group] = '';
```

c) Thêm method (đặt ngay sau `onUpdateColor`, dòng ~334 — cùng pattern):

```typescript
  onUpdateIcon(state: ProjectState, icon: string): void {
    if (state.icon === icon || this.isReadOnly()) return;

    const project = this.projectStore.currentProject();
    if (!project) return;

    this.projectService.updateState(project.id, state.id, { icon }).subscribe({
      next: () => {
        this.projectStore.loadStates(project.id);
        this.messageService.add({
          severity: 'success',
          summary: 'Cập nhật thành công',
          detail: 'Icon trạng thái đã được lưu.',
        });
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Thất bại',
          detail: err.error?.message || 'Không thể đổi icon trạng thái.',
        });
      },
    });
  }
```

d) Trong `onCreateState` (dòng ~354), truyền icon:

```typescript
    const icon = this.newIcons[group] || undefined;
    this.projectService.createState(project.id, { name, color, group, icon }).subscribe({
```

và trong handler `next` reset: `this.newIcons[group] = '';`

- [ ] **Step 3: States tab HTML — icon picker trên row**

Trong `states-tab.component.html`, sau khối Color Picker (div `relative flex-shrink-0` dòng ~104-113), thêm:

```html
                <!-- Icon Picker -->
                <p-popover #stateIconPop styleClass="!p-0" appendTo="body">
                  <app-icon-picker-panel
                    context="state"
                    [value]="state.icon || ''"
                    (valueChange)="onUpdateIcon(state, $event); stateIconPop.hide()"
                  />
                </p-popover>
                <button
                  type="button"
                  class="w-7 h-7 flex items-center justify-center rounded border border-gray-200 dark:border-surface-600 hover:bg-gray-100 dark:hover:bg-surface-800 cursor-pointer flex-shrink-0"
                  [disabled]="isReadOnly()"
                  (pointerdown)="$event.stopPropagation()"
                  (click)="stateIconPop.toggle($event)"
                  pTooltip="Icon trạng thái"
                >
                  <app-state-dot [state]="state" [size]="12" />
                </button>
```

(Mỗi vòng `@for` có template ref `#stateIconPop` riêng nên không xung đột.)

- [ ] **Step 4: States tab HTML — icon picker trong form thêm**

Trong form Add State (dòng ~192-227), sau input color thêm:

```html
              <p-popover #addIconPop styleClass="!p-0" appendTo="body">
                <app-icon-picker-panel
                  context="state"
                  [value]="newIcons[group] || ''"
                  (valueChange)="newIcons[group] = $event; addIconPop.hide()"
                />
              </p-popover>
              <button
                type="button"
                class="w-7 h-7 flex items-center justify-center rounded border border-gray-200 dark:border-surface-600 hover:bg-gray-100 dark:hover:bg-surface-800 cursor-pointer flex-shrink-0"
                (click)="addIconPop.toggle($event)"
                pTooltip="Icon trạng thái"
              >
                <app-state-dot [state]="{ name: newNames[group] || 'State', color: newColors[group], group: group, icon: newIcons[group] || null }" [size]="12" />
              </button>
```

- [ ] **Step 5: Chạy toàn bộ jest, xác nhận không vỡ test cũ**

Run (từ `apps/frontend/`): `npx jest src/app/projects/pages/project-settings`
Expected: PASS (các structural spec của settings tab không đụng phần thêm mới).

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/src/app/shared/components/icon-picker-panel/icon-picker.constants.ts apps/frontend/src/app/projects/pages/project-settings/states-tab/
git commit -m "feat(frontend): cấu hình icon cho project state trong States tab"
```

---

### Task 8: Task detail panel dùng app-state-dot

**Files:**
- Modify: `apps/frontend/src/app/tasks/components/task-detail-panel/task-detail-panel.component.ts:278-282,483-498,~780-826`

- [ ] **Step 1: Import + computed**

a) Thêm import:

```typescript
import { StateDotComponent } from '../../../shared/components/state-dot/state-dot.component';
```

và thêm `StateDotComponent` vào mảng `imports` của `@Component`.

b) Thêm computed cạnh `selectedStateName` (dòng ~817):

```typescript
  protected readonly selectedStateRef = computed(() => {
    const t = this.task();
    if (!t) return null;
    return this.stateOptions().find((s) => s.id === t.stateId) ?? null;
  });
```

- [ ] **Step 2: Meta pill State**

Thay block dòng 278-282:

```html
                <button class="meta-pill" [class.active]="false" (click)="statePopover.toggle($event)">
                  @if (selectedStateRef(); as st) {
                    <app-state-dot [state]="st" [size]="10" />
                  } @else {
                    <span style="width: 10px; height: 10px; border-radius: 3px; flex-shrink: 0; display: inline-block; background: #9CA3AF"></span>
                  }
                  <span>{{ selectedStateName() }}</span>
                </button>
```

- [ ] **Step 3: State popover options**

Trong popover `#statePopover` (dòng ~483-498), thay span dot (dòng 489-490):

```html
                <app-state-dot [state]="s" [size]="10" />
```

- [ ] **Step 4: Dọn computed không còn dùng**

Chạy `grep -n "selectedStateColor" task-detail-panel.component.ts` — nếu chỉ còn định nghĩa (dòng ~823-826), xóa computed `selectedStateColor`. Nếu còn nơi dùng khác, giữ nguyên.

- [ ] **Step 5: Chạy jest detail panel**

Run (từ `apps/frontend/`): `npx jest src/app/tasks/components/task-detail-panel src/app/tasks/pages/backlog/priority-icon-emoji.spec.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/src/app/tasks/components/task-detail-panel/task-detail-panel.component.ts
git commit -m "feat(frontend): state icon hiển thị trong task detail panel qua app-state-dot"
```

---

### Task 9: Sprint filter — nhóm completed + tìm kiếm + show more (TDD)

**Files:**
- Create: `apps/frontend/src/app/tasks/pages/backlog/backlog-toolbar/sprint-filter.helpers.ts`
- Test: `apps/frontend/src/app/tasks/pages/backlog/backlog-toolbar/sprint-filter.helpers.spec.ts`
- Modify: `apps/frontend/src/app/projects/sprints/services/sprint.service.ts:46-48`
- Modify: `apps/frontend/src/app/tasks/pages/backlog/backlog-toolbar/backlog-toolbar.component.ts:202-214,309-315,~407`

- [ ] **Step 1: Viết test fail trước cho helpers**

Tạo `sprint-filter.helpers.spec.ts`:

```typescript
import { buildSprintSections, sortCompletedSprints } from './sprint-filter.helpers';
import { Sprint } from '../../../../projects/sprints/models/sprint.models';

const sprint = (over: Partial<Sprint>): Sprint => ({
  id: 'id', projectId: 'p', name: 'Sprint', goal: null,
  startDate: null, endDate: null, status: 'planning',
  targetCapacity: null, initialStoryPoints: null, initialTasksCount: null,
  completedAt: null, createdBy: 'u', createdAt: '', updatedAt: '', deletedAt: null,
  ...over,
});

describe('sortCompletedSprints', () => {
  it('lọc completed và sort completedAt giảm dần', () => {
    const result = sortCompletedSprints([
      sprint({ id: 'a', status: 'completed', completedAt: '2026-01-01' }),
      sprint({ id: 'b', status: 'active' }),
      sprint({ id: 'c', status: 'completed', completedAt: '2026-03-01' }),
    ]);
    expect(result.map((s) => s.id)).toEqual(['c', 'a']);
  });
});

describe('buildSprintSections', () => {
  const open = [
    sprint({ id: 'o1', name: 'Sprint 9', status: 'planning' }),
    sprint({ id: 'o2', name: 'Sprint 7', status: 'active' }),
  ];
  const completed = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7'].map((id, i) =>
    sprint({ id, name: `Sprint ${i + 1} done`, status: 'completed', completedAt: `2026-0${i + 1}-01` }),
  );

  it('open sprints: active có hậu tố (đang chạy)', () => {
    const s = buildSprintSections(open, [], '', false, null);
    expect(s.open).toEqual([
      { label: 'Sprint 9', value: 'o1' },
      { label: 'Sprint 7 (đang chạy)', value: 'o2' },
    ]);
  });

  it('completed: mặc định giới hạn 5, đếm số bị ẩn', () => {
    const s = buildSprintSections(open, completed, '', false, null);
    expect(s.completed).toHaveLength(5);
    expect(s.hiddenCompletedCount).toBe(2);
  });

  it('showAllCompleted=true → hiện tất cả, hidden=0', () => {
    const s = buildSprintSections(open, completed, '', true, null);
    expect(s.completed).toHaveLength(7);
    expect(s.hiddenCompletedCount).toBe(0);
  });

  it('sprint completed đang được chọn nằm ngoài giới hạn vẫn hiển thị', () => {
    const s = buildSprintSections(open, completed, '', false, 'c7');
    expect(s.completed.map((o) => o.value)).toContain('c7');
    expect(s.hiddenCompletedCount).toBe(1);
  });

  it('có query → lọc cả hai nhóm theo tên (case-insensitive), bỏ giới hạn', () => {
    const s = buildSprintSections(open, completed, 'DONE', false, null);
    expect(s.open).toHaveLength(0);
    expect(s.completed).toHaveLength(7);
    expect(s.hiddenCompletedCount).toBe(0);
  });
});
```

Lưu ý: nếu interface `Sprint` khai báo `createdAt`/`updatedAt` là kiểu khác `string`, chỉnh factory `sprint()` cho khớp kiểu thực tế (xem `sprint.models.ts`).

- [ ] **Step 2: Chạy test, xác nhận fail**

Run (từ `apps/frontend/`): `npx jest src/app/tasks/pages/backlog/backlog-toolbar/sprint-filter.helpers.spec.ts`
Expected: FAIL — module chưa tồn tại.

- [ ] **Step 3: Implement helpers**

Tạo `sprint-filter.helpers.ts`:

```typescript
import { Sprint } from '../../../../projects/sprints/models/sprint.models';

export interface SprintOption {
  label: string;
  value: string;
}

export interface SprintSections {
  open: SprintOption[];
  completed: SprintOption[];
  /** Số sprint completed bị ẩn bởi giới hạn — hiện nút "Xem thêm (n)" */
  hiddenCompletedCount: number;
}

export function sortCompletedSprints(sprints: Sprint[]): Sprint[] {
  return sprints
    .filter((s) => s.status === 'completed')
    .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''));
}

export function buildSprintSections(
  openSprints: Sprint[],
  completedSprints: Sprint[],
  query: string,
  showAllCompleted: boolean,
  selectedId: string | null,
  limit = 5,
): SprintSections {
  const q = query.trim().toLowerCase();
  const matches = (s: Sprint) => !q || s.name.toLowerCase().includes(q);

  const open = openSprints.filter(matches).map((s) => ({
    label: s.status === 'active' ? `${s.name} (đang chạy)` : s.name,
    value: s.id,
  }));

  const matched = completedSprints.filter(matches);
  let visible = matched;
  let hidden = 0;
  if (!q && !showAllCompleted) {
    visible = matched.slice(0, limit);
    // sprint đang được chọn làm filter luôn hiển thị dù ngoài giới hạn
    if (selectedId && !visible.some((s) => s.id === selectedId)) {
      const selected = matched.find((s) => s.id === selectedId);
      if (selected) visible = [...visible, selected];
    }
    hidden = matched.length - visible.length;
  }

  return {
    open,
    completed: visible.map((s) => ({ label: s.name, value: s.id })),
    hiddenCompletedCount: hidden,
  };
}
```

- [ ] **Step 4: Chạy test, xác nhận pass**

Run (từ `apps/frontend/`): `npx jest src/app/tasks/pages/backlog/backlog-toolbar/sprint-filter.helpers.spec.ts`
Expected: PASS.

- [ ] **Step 5: `SprintService.completedSprints`**

Trong `sprint.service.ts`, sau computed `openSprints` (dòng ~46-48):

```typescript
  /** Sprint đã hoàn thành — mới hoàn thành nhất lên trước */
  readonly completedSprints = computed(() =>
    sortCompletedSprints(this.projectSprints()),
  );
```

với import:

```typescript
import { sortCompletedSprints } from '../../../tasks/pages/backlog/backlog-toolbar/sprint-filter.helpers';
```

Nếu import path từ service sang tasks tạo cycle/lint warning, chuyển `sortCompletedSprints` vào `sprint.service.ts` (export từ đó) và helpers import lại từ service — giữ một định nghĩa duy nhất.

- [ ] **Step 6: Backlog toolbar — state + sections + label**

Trong `backlog-toolbar.component.ts`:

a) Thêm import:

```typescript
import { buildSprintSections } from './sprint-filter.helpers';
```

(Kiểm tra `FormsModule` và `InputTextModule` đã có trong mảng `imports` của component — nếu thiếu thì thêm, vì popover mới dùng `[(ngModel)]` + `pInputText`.)

b) Thêm fields cạnh `selectedSprintId`:

```typescript
  protected sprintSearch = '';
  protected showAllCompletedSprints = false;
```

c) Thay `sprintOptions` (dòng 309-315) bằng:

```typescript
  protected readonly sprintSections = () =>
    buildSprintSections(
      this.sprintService.openSprints(),
      this.sprintService.completedSprints(),
      this.sprintSearch,
      this.showAllCompletedSprints,
      this.selectedSprintId,
    );
```

d) Sửa `getSprintLabel()` (dòng ~405-410) — tra cứu mọi sprint kể cả completed:

```typescript
  protected getSprintLabel(): string {
    if (!this.selectedSprintId) return 'Sprint';
    if (this.selectedSprintId === 'none') return 'Chưa có sprint';
    const sprint = this.sprintService
      .projectSprints()
      .find((s) => s.id === this.selectedSprintId);
    return sprint?.name ?? 'Sprint';
  }
```

(Giữ nguyên chữ ký/hành vi cũ khi không chọn gì — xem code hiện tại dòng ~405 để khớp giá trị default.)

- [ ] **Step 7: Backlog toolbar — template popover mới**

Thay popover sprint (dòng 202-214) bằng:

```html
      <p-popover #sprintPop appendTo="body" styleClass="!p-0" (onHide)="sprintSearch = ''; showAllCompletedSprints = false">
        <div class="w-64">
          <div class="p-2 border-b border-surface-100 dark:border-surface-700">
            <input pInputText type="text" placeholder="Tìm sprint..."
              class="w-full !text-xs !py-1"
              [(ngModel)]="sprintSearch" />
          </div>
          <div class="pop-list max-h-72 overflow-y-auto">
            <div
              (click)="selectedSprintId = 'none'; emitFilter(); sprintPop.hide()"
              class="pop-item"
              [class.selected]="selectedSprintId === 'none'"
            >
              Chưa có sprint
            </div>
            @if (sprintSections().open.length) {
              <div class="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-surface-500">Đang mở</div>
              @for (opt of sprintSections().open; track opt.value) {
                <div
                  (click)="selectedSprintId = opt.value; emitFilter(); sprintPop.hide()"
                  class="pop-item"
                  [class.selected]="selectedSprintId === opt.value"
                >
                  {{ opt.label }}
                </div>
              }
            }
            @if (sprintSections().completed.length) {
              <div class="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-surface-500">Đã hoàn thành</div>
              @for (opt of sprintSections().completed; track opt.value) {
                <div
                  (click)="selectedSprintId = opt.value; emitFilter(); sprintPop.hide()"
                  class="pop-item"
                  [class.selected]="selectedSprintId === opt.value"
                >
                  {{ opt.label }}
                </div>
              }
              @if (sprintSections().hiddenCompletedCount > 0) {
                <div class="pop-item text-primary font-semibold" (click)="showAllCompletedSprints = true; $event.stopPropagation()">
                  Xem thêm ({{ sprintSections().hiddenCompletedCount }})
                </div>
              }
            }
          </div>
        </div>
      </p-popover>
```

- [ ] **Step 8: Chạy jest liên quan**

Run (từ `apps/frontend/`): `npx jest src/app/tasks/pages/backlog`
Expected: PASS toàn bộ (helpers + display-fields + priority-icon-emoji).

- [ ] **Step 9: Commit**

```bash
git add apps/frontend/src/app/tasks/pages/backlog/backlog-toolbar/ apps/frontend/src/app/projects/sprints/services/sprint.service.ts
git commit -m "feat(frontend): sprint filter phân nhóm completed, tìm kiếm và xem thêm"
```

---

### Task 10: Verification cuối

- [ ] **Step 1: Toàn bộ frontend test**

Run (từ `apps/frontend/`): `npx jest`
Expected: PASS. Nếu có test fail **không liên quan** các file đã sửa (pre-existing), ghi nhận và báo lại — không tự sửa ngoài scope.

- [ ] **Step 2: Build frontend**

Run (từ `apps/frontend/`): `npx ng build --configuration development`
Expected: build thành công, không lỗi template/type.

- [ ] **Step 3: Build backend**

Run (từ `apps/backend/`): `npm run build`
Expected: thành công.

- [ ] **Step 4: Manual smoke test (cần app chạy: backend + `ng serve`)**

1. Backlog List: bật/tắt toggle Start date, State trong Display Properties → cột tương ứng xuất hiện/biến mất; item không có startDate/state không render gì.
2. Board: tương tự trên card; state dot hiện cạnh priority.
3. Project Settings → States: gán pi icon và emoji cho 2 state khác nhau → List/Board/Detail panel/group header cập nhật; state không icon vẫn là dot (started/completed tô đặc, nhóm khác chỉ viền).
4. Priority với icon emoji → hiện đúng ở List row, Board card, Detail panel pill + popover.
5. Sprint filter: thấy section "Đang mở"/"Đã hoàn thành", search lọc cả hai nhóm, "Xem thêm (n)" mở hết, chọn sprint completed → filter đúng và nút hiển thị đúng tên; mở lại popover thì search/show-more đã reset.
6. Dark mode: kiểm tra các phần trên.

- [ ] **Step 5: Commit cuối (nếu có sửa nhỏ phát sinh từ smoke test)**

```bash
git add -A && git commit -m "chore: hoàn thiện display fields, state icon, sprint filter"
```
