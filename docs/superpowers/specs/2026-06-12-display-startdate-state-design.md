# Design: Hiển thị Start date và State trên work item (List + Board)

**Ngày:** 2026-06-12
**Trạng thái:** Approved

## Vấn đề

Trong Display Properties (popover "Hiển thị" ở Backlog toolbar), hai toggle **Start date** (`showStartDate`) và **State** (`showState`) đã tồn tại nhưng bật lên không có gì thay đổi trên item.

Nguyên nhân: đây là tính năng chưa implement phần render, không phải bug logic.

- Toggle đã khai báo đủ ở `display-properties-panel.component.ts` (dòng 318, 320) và type `DisplayProperties` (`libs/shared-types/src/task.types.ts:343,348`).
- API list đã trả về `startDate` và `state` (`TaskStateRef`: id, name, color, group) trên mỗi `TaskListItem` — backend không cần sửa.
- Nhưng `task-row.component.ts` (List view) và `board-card.component.ts` (Board view) không có block render nào cho hai key này. Helper `isFilledState()` có sẵn trong task-row nhưng chưa được dùng (dấu vết của implementation dang dở).

## Quyết định thiết kế

- **State hiển thị dạng icon màu** (dot tròn theo màu state, tooltip tên state) — gọn, nhất quán với cách Priority render icon-only. Lý do từ user: sub-item có state khác item cha nên cần nhận biết được trên row.
- **Start date hiển thị riêng, giống due date** (icon calendar + dd/MM), không gộp range.
- **Áp dụng cả List view và Board view** để toggle nhất quán giữa hai view.

## Giải pháp

### 1. Component mới `app-state-dot`

Vị trí: `apps/frontend/src/app/shared/components/state-dot/state-dot.component.ts` (standalone, presentational).

- Input: `state: TaskStateRef` (required), `size: number` (px, default 14).
- Render: `<span>` `rounded-full border-2`, `border-color = state.color`; fill `background = state.color` khi `state.group ∈ {started, completed}` (logic `isFilledState` chuyển vào component này); tooltip = `state.name`.
- Màu lấy từ data state nên không cần `dark:` variant cho dot.
- Dùng ở 3 nơi: task-row, board-card, và group header của task-list (thay inline markup trùng lặp hiện tại).

### 2. List view — `task-row.component.ts`

- **Start date:** block `@if (displayProps.showStartDate && task.startDate)` đặt **trước** block due date hiện có (dòng 141). Markup giống due date: `pi pi-calendar text-[10px]` + `formatDate()`, class `text-gray-400 dark:text-surface-500`, tooltip "Start date". Không có logic overdue (chỉ due date mới đỏ).
- **State:** `@if (displayProps.showState && task.state)` render `<app-state-dot [state]="task.state" />` đặt **sau** Priority icon, **trước** Assignee.
- Xóa helper `isFilledState` không còn dùng trong task-row (dòng 186-188) sau khi chuyển vào state-dot.

### 3. Board view — `board-card.component.ts`

Trong meta row (dòng 110-146):

- **Start date:** span trước due date, style theo card (`text-[10px]`, icon 9px), tooltip "Start date", không overdue.
- **State:** `<app-state-dot [state]="task.state" [size]="12" />` đặt ngay **sau** Priority icon (trước Assignee, nhất quán với List view), guard `displayProps.showState && task.state`.
- Toggle áp dụng nhất quán: kể cả khi cột board đã group theo state, dot vẫn render theo toggle (hành vi đoán trước được; sub-item khác state vẫn nhận biết được).

### 4. Refactor nhẹ

Group header trong `task-list.component.ts:108` chuyển sang dùng `app-state-dot` (size 14) thay inline span, và bỏ helper `isFilledState` ở task-list nếu không còn nơi dùng.

### 5. Không đụng backend / types

`startDate`, `state` đã có trong API response; `DisplayProperties` đã có đủ key. Không sửa migration, entity, query.

## Kiểm chứng

Chạy app và xác nhận:

1. Bật/tắt từng toggle Start date, State ở Display Properties → element tương ứng xuất hiện/biến mất ở cả List và Board.
2. Item không có `startDate` hoặc không có `state` → không render gì (không lỗi).
3. State dot: state thuộc group `started`/`completed` fill đặc, các group khác chỉ viền.
4. Dark mode: text start date dùng `dark:text-surface-500`; dot dùng màu state nên không đổi.
5. Group by State: dot trên row vẫn hiển thị theo toggle, group header vẫn render đúng như trước (qua state-dot).
