# Kanban Board Design

> **Ngày:** 2026-06-07
> **Phạm vi:** `apps/frontend/src/app/tasks/pages/backlog/`

---

## Tổng quan

Thêm chế độ hiển thị **Kanban Board** cho trang Work Items, song song với List view hiện có. User chuyển đổi giữa hai chế độ qua toggle trên toolbar; chế độ đang chọn được phản ánh trên URL.

---

## 1. URL & View Mode Toggle

**Cơ chế:**
- Giữ nguyên route `/projects/:key/issues`, thêm query param `?view=list` (mặc định) hoặc `?view=board`.
- Route `/projects/:key/board` (hiện là `BoardPlaceholderComponent`) redirect sang `/projects/:key/issues?view=board`.
- `backlog.component.ts` thêm signal `viewMode = signal<'list' | 'board'>('list')`, đọc từ `ActivatedRoute.queryParams` khi init, cập nhật URL qua `router.navigate` khi user toggle.

**Toolbar:**
- Thêm 2 icon button góc phải toolbar: `pi-list` (List) và `pi-th-large` (Board).
- Button đang active được highlight.
- Toggle không reload trang — chỉ swap component bên dưới toolbar.

---

## 2. Kiến trúc Component

```
tasks/pages/backlog/
  backlog.component.ts              ← thêm viewMode signal, URL sync
  backlog-toolbar/
    backlog-toolbar.component.ts    ← thêm List/Board toggle buttons
    display-properties-panel.component.ts (hiện có)
  task-list/                        ← giữ nguyên (list view)
  board/                            ← MỚI
    board.component.ts              ← container, computed groupByState
    board-column.component.ts       ← 1 cột per state, cdkDropList
    board-card.component.ts         ← 1 card per task
```

**Luồng dữ liệu:**

```
backlog.component
  ├─ tasks()        ──┐
  ├─ states()       ──┤
  ├─ displayProps() ──┤
  └─ viewMode()       │
                      ↓
    @if viewMode='list'  → <app-task-list>
    @if viewMode='board' → <app-board>
                            ├─ computed: groupByState
                            ├─ <app-board-column> × N states
                            │    └─ <app-board-card> × M tasks
                            └─ drag event → taskStore.updateState()
```

`board.component` nhận `tasks`, `states`, `displayProps` làm `@Input`, tự group tasks theo state bằng `computed()`. Không cần thêm API call mới — dùng lại data đã có trong `TaskStore`.

**Group by mặc định:** State. Thiết kế sẵn để sau này mở rộng sang Priority / Assignee / Label qua `selectedGroupBy` prop.

---

## 3. Drag & Drop Cross-Column

Dùng Angular CDK `DragDrop` đã có trong dự án.

**Cấu trúc CDK:**
- Mỗi `board-column` là một `cdkDropList` với `id="col-{stateId}"`.
- `[cdkDropListConnectedTo]` nhận mảng tất cả column IDs — board.component tính sẵn và truyền xuống.
- `[cdkDropListData]` là mảng tasks của cột đó.
- Mỗi card là `cdkDrag`.

**Xử lý drop event:**
```
(cdkDropListDropped) → board.component.onCardDropped(event)
  ├─ Cùng cột: moveItemInArray (reorder)
  └─ Khác cột:
       transferArrayItem (CDK util)
       → taskStore.updateTask(taskId, { stateId: targetStateId })
       → optimistic update: UI cập nhật ngay, rollback nếu API lỗi
```

**Giới hạn:** Chỉ drag card, không drag cả cột.

---

## 4. Card Content & DisplayProperties

`board-card` nhận `task` và `displayProps` làm `@Input`, render có điều kiện:

```
┌─────────────────────────────────┐
│  TTEST-3                        │  ← identifier (luôn hiện)
│  Tên task đầy đủ ở đây          │  ← title (luôn hiện, wrap 2 dòng)
│                                 │
│  🔴 [backend] [ui-fix]          │  ← priority + labels (nếu bật)
│  👤 Thanh  📅 15/06             │  ← assignee + due date (nếu bật)
│  ↳ 3 sub-tasks                  │  ← sub-task count (nếu bật)
└─────────────────────────────────┘
```

- **Luôn hiện:** identifier, title.
- **Theo `displayProps`:** priority, labels (badge mode), assignee avatar, due date — dùng **chính xác cùng điều kiện** với list view.
- **Display panel:** Board tự động phản ánh cùng `displayProps` signal. User mở panel "Display" trên toolbar là áp dụng cho cả list lẫn board.
- **Compact:** Card tối thiểu ~72px (chỉ title), tối đa ~120px khi đủ thuộc tính.

Header cột: màu state (dot), tên state, số lượng task trong cột.

---

## 5. Parent-Child Relationship Indicators

### 5a. Badge hai chiều

```
┌─────────────────────────────────┐
│  TTEST-3                        │
│  Tên task cha đầy đủ            │
│  🔴 [backend]  👤 Thanh         │
│  ↳ 3 sub-tasks                  │  ← controlled bởi displayProps.showSubItemCount
└─────────────────────────────────┘

┌─────────────────────────────────┐
│  TTEST-8                        │
│  Tên sub-task ở đây             │
│  🟡 [ui-fix]   📅 15/06         │
│  ↑ TTEST-3 · Tên task cha...    │  ← truncated, controlled bởi displayProps.showParent
└─────────────────────────────────┘
```

**Thay đổi API cần thiết:** Thêm `parent: TaskParentRef | null` vào `TaskListItem` (hiện chỉ có trong full `Task`). Backend cần JOIN parent khi query list.

### 5b. Hover Highlight — Cơ chế

`board.component` quản lý signal trung tâm:

```typescript
hoveredGroupId = signal<string | null>(null);
```

**Logic xác định group ID:**
- Card là parent: `groupId = task.id`
- Card là sub-task: `groupId = task.parentId`

Hover vào card → set `hoveredGroupId = groupId`. Rời khỏi card → set `null`.

**Mỗi card tự tính trạng thái:**
```typescript
isHighlighted = computed(() =>
  this.hoveredGroupId() !== null &&
  (this.task.id === this.hoveredGroupId() ||
   this.task.parentId === this.hoveredGroupId())
);

isDimmed = computed(() =>
  this.hoveredGroupId() !== null && !this.isHighlighted()
);
```

**Visual effect:**
- Highlighted: `ring-2 ring-indigo-400 scale-[1.01] shadow-md`
- Dimmed: `opacity-40`
- Transition: `duration-150 ease-in-out`

**Kết quả:** Hover lên task cha → tất cả sub-task (dù ở cột nào) sáng lên, phần còn lại mờ đi. Hover lên sub-task → task cha + các sibling sub-task cùng highlight.

---

## 6. Thay đổi cần thực hiện

| # | Layer | File / Thành phần | Loại thay đổi | Mức độ |
|---|-------|-------------------|---------------|--------|
| 1 | Shared | `task.types.ts` — `TaskListItem` | Thêm `parent: TaskParentRef \| null` | Nhỏ |
| 2 | Backend | `task.service.ts` / query | JOIN parent khi query list | Nhỏ |
| 3 | Frontend | `backlog.component.ts` | Thêm `viewMode` signal, URL sync | Nhỏ |
| 4 | Frontend | Routing | Redirect `/board` → `/issues?view=board` | Nhỏ |
| 5 | Frontend | `backlog-toolbar.component.ts` | Thêm List/Board toggle buttons | Nhỏ |
| 6 | Frontend | `board/board.component.ts` | Tạo mới — group by state, hover state | Lớn |
| 7 | Frontend | `board/board-column.component.ts` | Tạo mới — cdkDropList, column header | Vừa |
| 8 | Frontend | `board/board-card.component.ts` | Tạo mới — card UI, badges, highlight | Vừa |
| 9 | Shared | `task.types.ts` — `DisplayProperties` | Thêm `showParent: boolean` | Nhỏ |

**Thứ tự triển khai:**
```
1. Shared type: thêm parent vào TaskListItem, showParent vào DisplayProperties
2. Backend: JOIN parent trong task list query
3. Frontend routing: redirect + URL sync
4. Toolbar toggle buttons
5. board.component (container, grouping, drag-drop, hover signal)
6. board-column.component
7. board-card.component (badges + highlight)
```
