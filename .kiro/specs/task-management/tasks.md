---
specName: task-management
version: 2.0
status: todo
estimatedDays: 18
---

# Tasks: Task Management (Epic B)

## Overview

Triển khai Epic B — Task Management cho Agile PM với full Plane-like Work Item properties: hierarchy CRUD, Backlog (drag & drop, Group by, Order by), Task Detail Panel (auto-save, multiple assignees, estimate, start/due date), Attachments, External Links, Task Relations (blocking/related/duplicate), Comments, và Activity Timeline.

Stack: NestJS 11 + TypeORM + PostgreSQL 17 (backend), Angular 21 + Signals + Angular CDK + PrimeNG 21 (frontend).

## Tasks

- [ ] 1. Database migration và shared types
  - [ ] 1.1 Tạo migration `CreateTaskManagementTables`
    - Tạo 5 enums: `task_type_enum`, `task_state_enum`, `task_priority_enum`, `task_relation_type_enum`, `task_activity_type_enum`
    - Tạo bảng `tasks` với CHECK constraint `start_date <= due_date`; cột `cycle_id` không có FK (thêm ở Epic C)
    - Tạo bảng `task_assignees` (join table task↔user)
    - Tạo bảng `labels` với UNIQUE(project_id, name)
    - Tạo bảng `task_labels` (join table task↔label)
    - Tạo bảng `task_attachments`
    - Tạo bảng `task_links`
    - Tạo bảng `task_relations` với UNIQUE(source_task_id, target_task_id, relation_type)
    - Tạo bảng `task_activity` (kết hợp activity log + comments)
    - Tạo tất cả indexes theo design (partial index cho backlog, GIN cho search)
    - Implement `down()` rollback theo thứ tự ngược
    - _Requirements: 1.1, 1.2, 8.1, 9.1, 10.1, 11.1, 12.1, 13.1_

  - [ ] 1.2 Cập nhật audit event enum
    - Thêm 6 events: `task_created`, `task_updated`, `task_deleted`, `task_reordered`, `label_created`, `label_deleted`
    - Cập nhật `apps/backend/src/auth/constants/auth-events.ts`
    - _Requirements: 1.7, 5.1, 6.1_

  - [ ] 1.3 Cập nhật shared types
    - Thêm interfaces: `Task`, `TaskListItem`, `TaskDetailItem`, `TaskActivity`, `TaskAttachment`, `TaskLink`, `TaskRelation`, `TaskComment`, `Label`
    - Thêm enums: `TaskType`, `TaskState`, `TaskPriority`, `TaskRelationType`, `TaskActivityType`
    - Thêm DTOs: `CreateTaskDto`, `UpdateTaskDto`, `ReorderTasksDto`, `CreateLabelDto`, `CreateLinkDto`, `CreateRelationDto`, `CreateCommentDto`
    - Build lại shared-types library
    - _Requirements: 1.1_

- [ ] 2. Checkpoint — Verify migration và shared types
  - Chạy migration, kiểm tra schema và tất cả indexes
  - Verify shared types compile không lỗi
  - Hỏi user nếu có vấn đề

- [ ] 3. Backend — Task entities và TypeORM
  - [ ] 3.1 Tạo Task entity
    - Tạo `apps/backend/src/task/entities/task.entity.ts`
    - Self-referencing relations: `@ManyToOne(() => Task, t => t.children)` cho parent, `@OneToMany(() => Task, t => t.parent)` cho children
    - Relations: `@ManyToMany(() => User, ...)` qua `task_assignees`, `@ManyToMany(() => Label, ...)` qua `task_labels`
    - Relations: `@OneToMany(() => TaskAttachment, ...)`, `@OneToMany(() => TaskLink, ...)`, `@OneToMany(() => TaskRelation, ...)`
    - _Requirements: 1.1_

  - [ ] 3.2 Tạo các entities còn lại
    - `label.entity.ts`, `task-attachment.entity.ts`, `task-link.entity.ts`, `task-relation.entity.ts`, `task-activity.entity.ts`
    - _Requirements: 7.1, 8.1, 9.1, 10.1, 11.1, 12.1_

- [ ] 4. Backend — Activity Service
  - Tạo `apps/backend/src/task/activity/activity.service.ts`
  - `log(taskId, actorId, eventType, options: {field?, oldValue?, newValue?, comment?})` — INSERT vào `task_activity`
  - `getTimeline(taskId, page, limit)` — SELECT ORDER BY created_at DESC; kết hợp activities + comments
  - `addComment(taskId, actorId, content)` — INSERT với `entry_type = 'comment_added'`
  - `editComment(commentId, actorId, content)` — UPDATE + validate ownership
  - `deleteComment(commentId, actorId, callerRole)` — DELETE + kiểm tra quyền (own hoặc SM/Admin)
  - _Requirements: 11.1–11.5, 12.1–12.4_

- [ ] 5. Backend — Task Service (CRUD core)
  - Tạo `apps/backend/src/task/task.service.ts`
  - `create(projectId, userId, dto)` — validate hierarchy, validate assignees là members, atomic Task_ID generation trong transaction, INSERT task + INSERT task_assignees + INSERT task_labels, log activity `created`, ghi audit `task_created`
  - `findAll(projectId, userId, query: TaskQueryDto)` — JOIN assignees + labels + counts (sub_item, attachment, link), filter đầy đủ, pagination, sort theo `orderBy`, GROUP BY logic trả về grouped response khi groupBy ≠ none
  - `findById(projectId, taskIdOrUuid, userId)` — resolve UUID hoặc "MPM-42", JOIN đầy đủ tất cả relations
  - `update(projectId, taskId, userId, dto)` — partial update, validate hierarchy nếu parent/type đổi, validate date range, diff tracking (ghi activity cho từng field thay đổi), set/clear `completed_at`
  - `delete(projectId, taskId, userId)` — cascade delete (ON DELETE CASCADE xử lý DB level), đếm deleted children, ghi audit
  - `bulkDelete(projectId, taskIds, userId)` — transaction, collect succeeded/failed
  - `reorder(projectId, items, userId)` — bulk UPDATE `backlog_order` trong transaction; detect gap < 0.001 → queue rebalance async
  - `search(projectId, query)` — GIN tsvector search trên title + exact match task_id
  - _Requirements: 1.1–1.8, 2.1–2.10, 3.1–3.8, 4.1–4.6, 5.1–5.4, 6.1–6.5, 13.1–13.4, 14.1–14.3, 15.1–15.4_

- [ ] 6. Backend — Label Service
  - Tạo `apps/backend/src/task/label/label.service.ts`
  - `findAll(projectId)` — SELECT labels + COUNT(task_labels) per label
  - `create(projectId, userId, dto)` — validate color hex regex, INSERT, ghi audit `label_created`
  - `update(labelId, dto)` — UPDATE name/color, validate unique name
  - `delete(labelId, userId)` — DELETE (cascade task_labels), ghi audit `label_deleted`
  - _Requirements: 7.1–7.4_

- [ ] 7. Backend — Attachment Service
  - Tạo `apps/backend/src/task/attachment/attachment.service.ts`
  - `upload(taskId, userId, file: Express.Multer.File)` — validate magic bytes bằng `file-type`, check 20 attachment limit, check file size ≤ 20MB, tính tổng size ≤ 100MB, lưu file vào `uploads/projects/{pid}/tasks/{tid}/{uuid}_{originalname}`, INSERT record, log activity `attachment_added`
  - `getFile(attachmentId, userId)` — trả về `{storagePath, mimeType, fileName}` để controller stream
  - `delete(attachmentId, userId, callerRole)` — validate ownership (hoặc SM/Admin), DELETE file khỏi filesystem, DELETE record, log activity `attachment_removed`
  - _Requirements: 8.1–8.7_

- [ ] 8. Backend — Task Controller
  - Tạo `apps/backend/src/task/task.controller.ts`
  - `POST /api/projects/:projectId/tasks` — `@ProjectRoles('Scrum_Master','Product_Owner','Developer','QA')`
  - `GET /api/projects/:projectId/tasks` — `@JwtAuth` + member check; parse query params
  - `GET /api/projects/:projectId/tasks/:taskId` — `@JwtAuth` + member check
  - `PATCH /api/projects/:projectId/tasks/reorder` — `@ProjectRoles('Scrum_Master','Product_Owner')`
  - `PATCH /api/projects/:projectId/tasks/:taskId` — `@ProjectRoles('Scrum_Master','Product_Owner','Developer','QA')`
  - `DELETE /api/projects/:projectId/tasks` (bulk) — `@ProjectRoles('Scrum_Master','Product_Owner')`
  - `DELETE /api/projects/:projectId/tasks/:taskId` — `@ProjectRoles('Scrum_Master','Product_Owner')`
  - `GET /api/projects/:projectId/tasks/:taskId/activity` — `@JwtAuth` + member check
  - _Requirements: 14.1–14.3_

- [ ] 9. Backend — Attachment, Link, Relation, Comment Controllers
  - `apps/backend/src/task/attachment/attachment.controller.ts`
    - `POST .../attachments` — Multer interceptor `@UseInterceptors(FileInterceptor('file'))`
    - `GET .../attachments/:id` — `res.sendFile()` để stream file
    - `DELETE .../attachments/:id`
  - `apps/backend/src/task/link/link.controller.ts` + `link.service.ts`
    - `POST .../links`, `DELETE .../links/:id` — validate URL scheme
  - `apps/backend/src/task/relation/relation.controller.ts` + `relation.service.ts`
    - `POST .../relations` — tạo bidirectional pair khi cần, detect circular dependency
    - `DELETE .../relations/:id` — xóa cả relation ngược
  - `apps/backend/src/task/comment/comment.controller.ts`
    - `POST .../comments`, `PATCH .../comments/:id`, `DELETE .../comments/:id`
  - _Requirements: 8.1–8.7, 9.1–9.5, 10.1–10.6, 11.1–11.5_

- [ ] 10. Wire TaskModule vào AppModule
  - Tạo `apps/backend/src/task/task.module.ts` — register tất cả controllers, services, entities
  - Import `TaskModule` vào `apps/backend/src/app.module.ts`
  - Cấu hình Multer: `dest = 'uploads/'`, `limits: { fileSize: 20 * 1024 * 1024 }`
  - _Requirements: 1.1_

- [ ] 11. Viết property tests cho Task Service
  - **P1: Atomic Task Counter** — 10 concurrent creates không tạo duplicate task_id
  - **P2: Hierarchy Enforcement** — subtask với parent là epic → 422
  - **P3: Task_ID Immutability** — PATCH với taskId field → task_id trong DB không đổi
  - **P4: Cascade Delete** — delete story → tất cả task và subtask bên dưới bị xóa
  - **P5: Permission Matrix** — Developer DELETE → 403; Stakeholder PATCH → 403; Stakeholder POST comment → 200
  - **P6: Date Range Validation** — start_date > due_date → 422
  - **P7: Bidirectional Relation** — thêm `blocking` → tự tạo `blocked_by` ngược; xóa một → xóa cả hai
  - **P8: Circular Dependency** — A blocks B, B blocks A → 422 CIRCULAR_DEPENDENCY
  - **P9: Assignee Validation** — assign non-member → 422
  - **P10: Attachment Limits** — upload file thứ 21 → 422; file > 20MB → 413
  - **P11: Backlog Order** — reorder trigger rebalance khi gap < 0.001; sau rebalance order vẫn đúng thứ tự
  - **P12: Activity Log** — mọi mutating operation ghi đúng activity entry
  - _Validates: Req 1–14_

- [ ] 12. Checkpoint — Verify backend hoàn toàn
  - Chạy tất cả property tests
  - Test manual: tạo epic → story → task → subtask; upload file; thêm link; thêm relation; comment
  - Test concurrent task creation (task counter không duplicate)
  - Hỏi user nếu có vấn đề

- [ ] 13. Frontend — Angular Services và Signal Stores
  - [ ] 13.1 Implement Task Angular Service
    - `apps/frontend/src/app/tasks/services/task.service.ts`
    - Methods: `getTasks`, `getTask`, `createTask`, `updateTask`, `deleteTask`, `bulkDeleteTasks`, `reorderTasks`, `searchTasks`, `getActivity`, `addComment`, `editComment`, `deleteComment`
    - _Requirements: 2.1, 3.1_

  - [ ] 13.2 Implement Attachment và Link Angular Services
    - `apps/frontend/src/app/tasks/services/attachment.service.ts` — `upload(taskId, file)`, `delete(taskId, attachmentId)`, `getDownloadUrl(attachmentId)`
    - `apps/frontend/src/app/tasks/services/link.service.ts` — `addLink(taskId, dto)`, `deleteLink(taskId, linkId)`
    - _Requirements: 8.1, 9.1_

  - [ ] 13.3 Implement Relation Service và Label Service
    - `relation.service.ts` — `addRelation`, `deleteRelation`
    - `label.service.ts` — `getLabels`, `createLabel`, `updateLabel`, `deleteLabel`
    - _Requirements: 7.1, 10.1_

  - [ ] 13.4 Implement Task Signal Store
    - `apps/frontend/src/app/tasks/state/task.store.ts`
    - Signals: `tasks`, `groupedTasks`, `currentTask`, `isLoading`, `isSaving`, `saveStatus`, `error`, `filter`, `groupBy`, `orderBy`, `selectedTaskIds`
    - Methods: `loadBacklog`, `loadTask`, `createTask`, `updateTask`, `deleteTask`, `bulkDelete`, `reorder`, `setFilter`, `setGroupBy`, `setOrderBy`, `toggleSelect`, `clearSelection`
    - _Requirements: 2.1, 3.3_

  - [ ] 13.5 Implement Label Store
    - `label.store.ts` — `labels`, `loadLabels`, `createLabel`, `updateLabel`, `deleteLabel`

- [ ] 14. Frontend — Backlog Page
  - [ ] 14.1 BacklogPage container
    - `apps/frontend/src/app/tasks/pages/backlog/backlog.component.ts`
    - Route: `/projects/:key/backlog` — thêm vào AppShell routing (Epic A)
    - Sync filter state ↔ URL query params khi load và khi filter thay đổi
    - _Requirements: 2.1, 2.10_

  - [ ] 14.2 Backlog Toolbar (Filter + Group/Order)
    - `backlog-toolbar/backlog-toolbar.component.ts`
    - Search box (shortcut `/` focus, debounce 300ms)
    - Type, State, Priority, Assignee, Label filters (`p-multiSelect`)
    - **Group by** dropdown: State / Priority / Label / Assignee / None
    - **Order by** dropdown: Manual Rank / Created at / Updated at / Start date / Due date / Priority
    - Clear filters button
    - "Quản lý Labels" button (chỉ SM/PO)
    - _Requirements: 2.4–2.6_

  - [ ] 14.3 Backlog Task List với Drag & Drop
    - `task-list/task-list.component.ts` — Angular CDK `DragDropModule`
    - Mỗi row: drag handle (chỉ SM/PO, disabled khi orderBy ≠ rank), checkbox, Task_ID badge, Type icon, Title, State `p-tag`, Priority icon, Assignee avatars (max 3 + "+N"), Estimate chip, Due date (highlight đỏ nếu overdue), Label color dots, sub-item count icon, attachment count icon, Action menu (Edit inline / Open detail / Delete)
    - Hierarchy indent: margin-left `(level * 24)px`
    - `(cdkDropListDropped)` → midpoint calculation → optimistic update → `reorder()`
    - Khi `orderBy ≠ rank`: disable drag handles, hiển thị tooltip "Chuyển sang Manual Rank để sắp xếp"
    - Group by: render section headers (ví dụ: "In Progress · 5") với collapse/expand
    - Multiple select → bulk action toolbar: "X items đã chọn" + bulk state/priority/delete buttons
    - _Requirements: 2.2, 2.3, 2.5–2.8, 6.1–6.5_

  - [ ] 14.4 Quick Create Bar
    - `quick-create/quick-create.component.ts` — thanh nhập nhanh cuối backlog
    - Input "Nhập title..." + Enter → create với default state/priority; Type selector; Parent selector (tùy chọn)
    - _Requirements: 1.1_

- [ ] 15. Frontend — Task Detail Panel
  - [ ] 15.1 TaskDetailPanel container (slide-over)
    - `apps/frontend/src/app/tasks/components/task-detail-panel/task-detail-panel.component.ts`
    - Dùng PrimeNG `<p-drawer>` position="right" width="680px"
    - Mở: cập nhật URL `?taskId=MPM-42`; WHEN close: remove query param
    - Keyboard: Escape đóng; confirm dialog nếu description đang edit
    - Tabs: Overview / Sub-items / Relations / Activity
    - _Requirements: 3.1, 3.5–3.8_

  - [ ] 15.2 Task Header + Breadcrumb
    - Task_ID badge (copy-on-click với toast "Đã sao chép")
    - Breadcrumb: `Project / Epic / Story / Task` — mỗi cấp là link clickable
    - Title `<p-inplace>` — auto-save onBlur 500ms
    - Saving indicator: spinner khi saving, checkmark khi saved, error icon khi failed
    - _Requirements: 3.2, 3.3, 3.7_

  - [ ] 15.3 Task Properties Panel (auto-save)
    - Grid 2 cột với các property fields:
    - **State**: `p-select` với color dot + label
    - **Priority**: `p-select` với icon (🔴 Urgent / 🟠 High / 🟡 Medium / 🔵 Low / ⚪ None)
    - **Assignees**: `p-multiSelect` với avatar, filter theo project members
    - **Labels**: `p-multiSelect` với color dot
    - **Estimate**: `p-inputNumber` (Fibonacci values) hoặc `p-select` (XS/S/M/L/XL) tùy project config
    - **Start date**: `p-datepicker`
    - **Due date**: `p-datepicker` (highlight đỏ nếu overdue)
    - **Parent**: link + "Đổi parent" button (search & select dialog)
    - **Cycle**: read-only badge (Epic C)
    - **Reporter**: avatar + name (read-only)
    - **Created / Updated**: read-only format dd/MM/yyyy HH:mm
    - Mỗi field: `onChange` → debounced PATCH → saving indicator
    - _Requirements: 3.2, 3.3, 4.1_

  - [ ] 15.4 Description Markdown Editor
    - Toggle Edit / Preview button
    - Edit mode: `<textarea>` auto-resize
    - Preview mode: `ngx-markdown` render; sanitize bằng DOMPurify
    - Auto-save sau 1000ms debounce; "Đang lưu..." indicator
    - Khi có unsaved: dấu chấm vàng trên tab Overview
    - _Requirements: 3.2, 3.3, 3.8_

  - [ ] 15.5 Tab Sub-items
    - Danh sách direct children với Type icon, Task_ID, Title, State badge
    - Quick-add child: input inline + Enter
    - Click → mở Task_Detail_Panel của child (panel mới replace hiện tại hoặc push navigation stack)
    - _Requirements: 3.5_

  - [ ] 15.6 Tab Relations
    - Nhóm theo loại: **Blocking** / **Blocked by** / **Relates to** / **Duplicate of**
    - Mỗi item: Task_ID, Title, State badge, nút xóa relation + confirm
    - Add relation button: dialog search task + chọn loại relation
    - _Requirements: 10.1–10.6_

  - [ ] 15.7 Tab Activity (Timeline)
    - Timeline kết hợp activities + comments, sort mới nhất trên cùng
    - Activity entry: avatar, tên, thời gian tương đối, mô tả thay đổi (ví dụ: "đổi State từ **Todo** sang **In Progress**")
    - Comment entry: avatar, tên, timestamp, content (rendered Markdown + DOMPurify), nút Edit/Delete (nếu own)
    - Comment input box cuối timeline: textarea + "Gửi" button; hỗ trợ `@username` highlight
    - Pagination: "Xem thêm" khi có > 50 entries
    - _Requirements: 11.1–11.5, 12.1–12.4_

- [ ] 16. Frontend — Attachments UI (trong Task Detail Panel)
  - Tab Overview section "Attachments":
    - Grid thumbnail cho images; icon + tên cho files khác
    - Upload button: PrimeNG `<p-fileUpload>` mode="basic" với drag & drop zone; progress bar
    - Validate phía client: size ≤ 20MB, supported types trước khi upload
    - Attachment card: thumbnail/icon, file name, file size, uploader name, nút download, nút xóa + confirm
    - Attachment count hiển thị trên Backlog row
  - _Requirements: 8.1–8.7_

- [ ] 17. Frontend — Links UI (trong Task Detail Panel)
  - Tab Overview section "Links":
    - Danh sách links: favicon (tải từ `${domain}/favicon.ico`), title, URL truncated, nút copy, nút xóa + confirm
    - Add link: inline form (URL input + Title input + "Thêm" button)
    - Validate URL format phía client
  - _Requirements: 9.1–9.5_

- [ ] 18. Frontend — Label Manager Dialog
  - `apps/frontend/src/app/tasks/components/label-manager/label-manager.component.ts`
  - Mở từ toolbar (chỉ SM/PO): danh sách labels + color preview + task count
  - Tạo label mới: text input + `p-colorPicker` + "Thêm" button
  - Sửa label: inline edit name/color
  - Xóa: confirm "sẽ bỏ label khỏi N tasks"
  - _Requirements: 7.1–7.4_

- [ ] 19. Checkpoint — Verify toàn bộ frontend
  - Chạy `ng build` — zero compile errors
  - Test toàn bộ Plane-like flow: tạo epic → story → task → subtask; drag & drop; group by state; open detail; auto-save mọi field; upload attachment; thêm link; thêm relation blocking; viết comment; xem activity timeline
  - Test keyboard: `/` focus search, Escape đóng panel
  - Test URL param: `?taskId=MPM-5` mở đúng panel khi load trang
  - Test overdue highlight, relation circular detection
  - Hỏi user nếu có vấn đề

- [ ] 20. Final checkpoint
  - Chạy `npm test` backend — tất cả property tests pass
  - Chạy `ng test` frontend
  - Verify performance: Backlog 200 tasks load < 300ms; attachment upload < 3s cho 5MB; search < 200ms
  - Hỏi user nếu có vấn đề

## Phân công

| Task group | Người làm | Deadline | Trạng thái |
|-----------|-----------|---------|-----------|
| 1–2 (Migration + Types) | | | todo |
| 3–6 (Backend core) | | | todo |
| 7–9 (Attachment/Link/Relation/Comment) | | | todo |
| 10–12 (Wire + Tests + Checkpoint) | | | todo |
| 13 (Angular Services + Stores) | | | todo |
| 14 (Backlog Page) | | | todo |
| 15 (Task Detail Panel) | | | todo |
| 16–18 (Attachment/Link/Label UI) | | | todo |
| 19–20 (Checkpoints) | | | todo |

## Ghi chú implementation

- **Priority naming**: `urgent` (không phải `critical`) để align với Plane — enum đã cập nhật
- **Multiple assignees**: `task_assignees` join table thay vì single `assignee_id` — impact lên Backlog JOIN query (ARRAY_AGG để tránh row duplication)
- **File upload security**: Validate magic bytes bằng `file-type` package, KHÔNG chỉ dựa vào Content-Type header hoặc file extension
- **Attachment streaming**: Dùng `res.sendFile()` hoặc pipe stream, không load toàn bộ file vào RAM
- **DOMPurify**: Install ở frontend — `npm install dompurify @types/dompurify` trong `apps/frontend`
- **ngx-markdown**: `npm install ngx-markdown marked` trong `apps/frontend`
- **file-type**: `npm install file-type` trong `apps/backend` (ESM package — dùng dynamic import hoặc `require()` với workaround)
- **cycle_id**: Cột tồn tại trong schema nhưng chưa có FK constraint; thêm ở Epic C (Sprint/Cycle Management)
- **Comment @mention**: Phase 1 chỉ highlight, không gửi notification (notification = Epic E)
- **Activity old/new values**: Lưu dạng string (serialize nếu cần) — đủ cho display, không cần structured JSON ở Phase 1

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0,  "tasks": ["1.1", "1.2", "1.3"] },
    { "id": 1,  "tasks": ["2"] },
    { "id": 2,  "tasks": ["3.1", "3.2"] },
    { "id": 3,  "tasks": ["4"] },
    { "id": 4,  "tasks": ["5"] },
    { "id": 5,  "tasks": ["6", "7"] },
    { "id": 6,  "tasks": ["8"] },
    { "id": 7,  "tasks": ["9"] },
    { "id": 8,  "tasks": ["10"] },
    { "id": 9,  "tasks": ["11"] },
    { "id": 10, "tasks": ["12"] },
    { "id": 11, "tasks": ["13.1", "13.2", "13.3"] },
    { "id": 12, "tasks": ["13.4", "13.5"] },
    { "id": 13, "tasks": ["14.1", "14.2"] },
    { "id": 14, "tasks": ["14.3", "14.4", "15.1"] },
    { "id": 15, "tasks": ["15.2", "15.3", "15.4"] },
    { "id": 16, "tasks": ["15.5", "15.6", "15.7"] },
    { "id": 17, "tasks": ["16", "17", "18"] },
    { "id": 18, "tasks": ["19"] },
    { "id": 19, "tasks": ["20"] }
  ]
}
```
