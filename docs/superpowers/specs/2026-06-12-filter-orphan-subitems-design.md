# Design: Filter hiển thị sub-item "mồ côi" (sprint/label/assignee filter)

**Ngày:** 2026-06-12
**Trạng thái:** Approved

## Vấn đề

Filter theo Sprint (và mọi filter khác) ở Work Items List view không hiển thị các item match nếu parent của chúng không match filter.

Triệu chứng: filter "Sprint 1" → mọi nhóm state hiện 0 item dù DB có 55 task thuộc sprint; filter "Chưa có sprint" → hiện epic root kèm các con có sprint (con hiển thị do đã expand trước đó — `loadChildren` tải con không qua filter, là hành vi drill-down bình thường).

## Nguyên nhân

- Backend lọc đúng (xác minh SQL trực tiếp: 55 task có `sprint_id` = Sprint 1).
- `task-list.component.ts:237`: `rootTasks = this._tasks().filter((t) => !t.parentId)` — chỉ task không có parent được render làm root; task match filter nhưng parent vắng mặt trong kết quả ("mồ côi") không bao giờ được render.
- Board view không bị (dùng toàn bộ tasks, không lọc root).

## Giải pháp (frontend-only)

### 1. Pure helper `selectRootTasks`

File mới `apps/frontend/src/app/tasks/pages/backlog/task-list/task-list.helpers.ts`:

- `selectRootTasks(tasks: TaskListItem[]): TaskListItem[]` — root = task không có `parentId` **hoặc** `parentId` không nằm trong tập id của danh sách hiện tại.
- `sortedGroups` trong `task-list.component.ts` dùng hàm này thay filter cũ. `childrenByParent` giữ nguyên — orphan không render trùng vì parent của nó không có mặt để render nhánh con.

### 2. Chip parent trên row mồ côi

`task-row.component.ts`: row tự nhận biết orphan bằng `depth === 0 && task.parentId && task.parent`, render sau title: icon `pi pi-arrow-up` + `{taskId} · {title}` của parent, chữ `text-xs text-gray-400 dark:text-surface-500`, truncate (theo style parent ref ở board-card). Data `task.parent` đã có sẵn trong API list (`leftJoinAndSelect('t.parent')`).

### 3. Không đụng backend, không đụng Board view

## Test

- Unit test `selectRootTasks` (jest, hàm thuần): root thường; orphan child thành root; child có parent trong danh sách không thành root.
- Structural test: task-row có điều kiện render chip parent.

## Kiểm chứng

1. Filter Sprint 1 → các item của sprint hiện phẳng trong nhóm state, kèm chip parent.
2. Filter "Chưa có sprint" → chỉ các root không sprint.
3. Bỏ filter → cây hiển thị như cũ (orphan logic không kích hoạt vì parent luôn có mặt trong kết quả không filter).
4. Dark mode chip parent.
