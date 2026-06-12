# Filter Orphan Sub-items Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** List view hiển thị các task match filter dù parent của chúng không match (orphan render phẳng làm root, kèm chip parent).

**Architecture:** Frontend-only. Pure helper `selectRootTasks` quyết định task nào render làm root (không có parent HOẶC parent vắng mặt trong kết quả); task-row tự render chip parent khi `depth === 0 && task.parentId && task.parent`. Backend đã lọc đúng — không sửa.

**Tech Stack:** Angular signals/computed, Jest (chạy từ `apps/frontend/` bằng `npx jest`).

**Spec:** `docs/superpowers/specs/2026-06-12-filter-orphan-subitems-design.md`
**Branch:** thực thi trên `feat/display-state-icon-sprint-filter` hiện tại.

---

## File Structure

| File | Trách nhiệm |
|------|-------------|
| `apps/frontend/src/app/tasks/pages/backlog/task-list/task-list.helpers.ts` | Create: pure helper `selectRootTasks` |
| `apps/frontend/src/app/tasks/pages/backlog/task-list/task-list.helpers.spec.ts` | Create: unit test helper |
| `apps/frontend/src/app/tasks/pages/backlog/task-list/task-list.component.ts:237` | Modify: dùng `selectRootTasks` |
| `apps/frontend/src/app/tasks/pages/backlog/task-list/task-row.component.ts:59` | Modify: chip parent cho orphan row |
| `apps/frontend/src/app/tasks/pages/backlog/display-fields.spec.ts` | Modify: structural assertion chip parent |

---

### Task 1: Helper `selectRootTasks` (TDD)

**Files:**
- Create: `apps/frontend/src/app/tasks/pages/backlog/task-list/task-list.helpers.ts`
- Test: `apps/frontend/src/app/tasks/pages/backlog/task-list/task-list.helpers.spec.ts`

- [ ] **Step 1: Viết test fail trước**

Tạo `task-list.helpers.spec.ts`:

```typescript
import { selectRootTasks } from './task-list.helpers';
import { TaskListItem } from '@mpm/shared-types';

const task = (over: Partial<TaskListItem>): TaskListItem =>
  ({ id: 'id', parentId: null, ...over }) as TaskListItem;

describe('selectRootTasks', () => {
  it('task không có parentId là root', () => {
    const t = task({ id: 'a' });
    expect(selectRootTasks([t])).toEqual([t]);
  });

  it('child có parent trong danh sách KHÔNG là root (render nested)', () => {
    const parent = task({ id: 'p' });
    const child = task({ id: 'c', parentId: 'p' });
    expect(selectRootTasks([parent, child])).toEqual([parent]);
  });

  it('orphan (parent vắng mặt trong kết quả filter) là root', () => {
    const orphan = task({ id: 'c', parentId: 'p-not-in-list' });
    expect(selectRootTasks([orphan])).toEqual([orphan]);
  });

  it('hỗn hợp: root + orphan giữ nguyên thứ tự, nested bị loại', () => {
    const root = task({ id: 'r' });
    const nested = task({ id: 'n', parentId: 'r' });
    const orphan = task({ id: 'o', parentId: 'ghost' });
    expect(selectRootTasks([root, nested, orphan]).map((t) => t.id)).toEqual(['r', 'o']);
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận fail**

Run (từ `apps/frontend/`): `npx jest src/app/tasks/pages/backlog/task-list/task-list.helpers.spec.ts`
Expected: FAIL — `Cannot find module './task-list.helpers'`.

- [ ] **Step 3: Implement helper**

Tạo `task-list.helpers.ts`:

```typescript
import { TaskListItem } from '@mpm/shared-types';

/**
 * Chọn các task render làm root trong List view.
 * Root = không có parent, HOẶC parent không nằm trong danh sách hiện tại
 * (vd: sub-item match filter nhưng parent không match — "orphan" phải render
 * phẳng thay vì biến mất).
 */
export function selectRootTasks(tasks: TaskListItem[]): TaskListItem[] {
  const ids = new Set(tasks.map((t) => t.id));
  return tasks.filter((t) => !t.parentId || !ids.has(t.parentId));
}
```

- [ ] **Step 4: Chạy test, xác nhận pass**

Run (từ `apps/frontend/`): `npx jest src/app/tasks/pages/backlog/task-list/task-list.helpers.spec.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/app/tasks/pages/backlog/task-list/task-list.helpers.ts apps/frontend/src/app/tasks/pages/backlog/task-list/task-list.helpers.spec.ts
git commit -m "feat(frontend): helper selectRootTasks cho orphan sub-items"
```

---

### Task 2: Nối vào task-list + chip parent trên task-row

**Files:**
- Modify: `apps/frontend/src/app/tasks/pages/backlog/task-list/task-list.component.ts:237`
- Modify: `apps/frontend/src/app/tasks/pages/backlog/task-list/task-row.component.ts:59`
- Modify: `apps/frontend/src/app/tasks/pages/backlog/display-fields.spec.ts`

- [ ] **Step 1: Bổ sung structural test fail trước**

Trong `display-fields.spec.ts`, thêm describe mới (cuối describe ngoài cùng, dùng biến `taskRow`, `taskList` đã có):

```typescript
  describe('orphan sub-items khi filter (spec 2026-06-12-filter-orphan-subitems)', () => {
    it('task-list dùng selectRootTasks thay filter !parentId', () => {
      expect(taskList).toContain('selectRootTasks(');
    });
    it('task-row render chip parent cho orphan row (depth 0 có parentId)', () => {
      expect(taskRow).toContain('depth === 0 && task.parentId && task.parent');
    });
  });
```

- [ ] **Step 2: Chạy test, xác nhận fail**

Run (từ `apps/frontend/`): `npx jest src/app/tasks/pages/backlog/display-fields.spec.ts`
Expected: FAIL 2 test mới.

- [ ] **Step 3: Sửa `task-list.component.ts`**

a) Thêm import (cạnh import `flattenTask`... `flattenTask` định nghĩa nội bộ — thêm cạnh import `TaskRowComponent`):

```typescript
import { selectRootTasks } from './task-list.helpers';
```

b) Trong `sortedGroups` (dòng ~237), thay:

```typescript
    const rootTasks = this._tasks().filter((t) => !t.parentId);
```

bằng:

```typescript
    const rootTasks = selectRootTasks(this._tasks());
```

- [ ] **Step 4: Chip parent trong `task-row.component.ts`**

Sau dòng title (dòng ~59 `<span class="flex-1 text-sm ...">{{ task.title }}</span>`), title đang chiếm `flex-1` — chip đặt NGAY SAU span title, trước block `showSubItemCount`:

```html
    @if (depth === 0 && task.parentId && task.parent) {
      <span class="flex items-center gap-1 text-xs text-gray-400 dark:text-surface-500 flex-shrink-0 mr-2 max-w-[200px]" [pTooltip]="task.parent.taskId + ' · ' + task.parent.title">
        <i class="pi pi-arrow-up text-[9px]"></i>
        <span class="truncate">{{ task.parent.taskId }} · {{ task.parent.title }}</span>
      </span>
    }
```

- [ ] **Step 5: Chạy test, xác nhận pass**

Run (từ `apps/frontend/`): `npx jest src/app/tasks/pages/backlog`
Expected: PASS toàn bộ (display-fields + priority-icon-emoji + sprint-filter.helpers + task-list.helpers).

- [ ] **Step 6: Build frontend**

Run (từ `apps/frontend/`): `npx ng build --configuration development`
Expected: build thành công.

- [ ] **Step 7: Commit**

```bash
git add apps/frontend/src/app/tasks/pages/backlog/
git commit -m "fix(frontend): filter hiển thị sub-item mồ côi phẳng kèm chip parent"
```

---

### Task 3: Verification

- [ ] **Step 1: Toàn bộ jest backlog + full suite**

Run (từ `apps/frontend/`): `npx jest`
Expected: chỉ còn 17 failure pre-existing đã ghi nhận (5 suite: sub-item-*, properties-sidebar, project-settings-tab-preservation). Không failure mới.

- [ ] **Step 2: Manual smoke test (app đang chạy)**

1. Filter Sprint 1 → các item của sprint hiện phẳng trong nhóm state, kèm chip parent `TM-1 · ...`.
2. Filter "Chưa có sprint" → chỉ các root không có sprint, không chip parent.
3. Bỏ filter → cây render như cũ, không chip parent (parent luôn có mặt).
4. Dark mode chip parent.
