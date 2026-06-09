---
specName: backlog-enhancements
version: 1.0
status: todo
estimatedDays: 22
---

# Tasks: Backlog Enhancements

## Overview

Triển khai Backlog Enhancements theo 4 sprint độc lập. Sprint 1 (UI Backlog) không phụ thuộc backend và có thể song song với Sprint 2 (Label Scope). Sprint 3 (State Templates) và Sprint 4 (Modules) cần workspace_id trên Project entity — verify trước.

Stack: NestJS 11 + TypeORM + PostgreSQL 17 (backend), Angular 21 + Signals + PrimeNG 21 (frontend).

---

## Sprint 1 — Backlog UI Improvements (3 ngày)

- [x] 1. Cập nhật shared types — DisplayProperties
  - [x] 1.1 Thêm interface `DisplayProperties` và const `DEFAULT_DISPLAY_PROPS` vào `libs/shared-types/src/task.types.ts`
    - Fields: showAssignee, showPriority, showDueDate, showStartDate, showLabels, showEstimate, showSubItemCount, showState, showModules, alwaysShowLabels, labelMode ('badge'|'dot'), maxLabels (1–4), maxModules (1–3)
    - Build lại shared-types library (`nx build shared-types`)
    - _Requirements: 3.8_

  - [x] 1.2 Cập nhật `Label` interface trong shared-types thêm `scope` và `workspaceId` (chuẩn bị cho Sprint 2)
    - `scope: 'workspace' | 'project'`; `workspaceId: string`; `projectId: string | null`
    - Backward compatible — field mới optional ở bước này
    - _Requirements: 4.1_

- [x] 2. Drag toàn row — task-list.component.ts
  - Bỏ directive `cdkDragHandle` khỏi icon hamburger tại line 165
  - Thêm class `cursor-grab active:cursor-grabbing` lên `<div cdkDrag>` tại line 115
  - Giữ nguyên icon `pi pi-bars` như visual hint (chỉ bỏ `cdkDragHandle`)
  - Verify click vẫn mở Task Detail Panel (CDK 5px threshold)
  - _Requirements: 1.1–1.6_

- [x] 3. Label badge style — task-list.component.ts
  - Thay thế block lines 207–210 bằng badge component inline:
    - Badge: `inline-flex`, dot màu, tên (truncate 80px), background + border bán trong suốt
    - Workspace label badge: icon `pi-globe` thay dot
    - Overflow indicator `+N` với tooltip liệt kê hidden labels
    - Dot mode: chỉ hiển thị `w-2 h-2 rounded-full` với tooltip
    - Controlled bởi `displayProps.labelMode`, `displayProps.maxLabels`, `displayProps.alwaysShowLabels`
    - Thêm `@if (displayProps.showLabels)` wrap toàn bộ block
  - _Requirements: 2.1–2.6_

- [x] 4. Conditional render tất cả metadata theo displayProps — task-list.component.ts
  - Thêm `@Input() displayProps: DisplayProperties = DEFAULT_DISPLAY_PROPS`
  - Wrap sub-item count: `@if (displayProps.showSubItemCount && childCount > 0)`
  - Wrap estimate: `@if (displayProps.showEstimate && task.estimateValue != null)`
  - Wrap due date: `@if (displayProps.showDueDate && task.dueDate)`
  - Wrap priority: `@if (displayProps.showPriority && task.priority !== 'none')`
  - Wrap assignees: `@if (displayProps.showAssignee && task.assignees?.length)`
  - _Requirements: 3.7_

- [x] 5. Display Properties Panel — component mới
  - Tạo `apps/frontend/src/app/tasks/pages/backlog/backlog-toolbar/display-properties-panel.component.ts`
  - UI: danh sách toggles với PrimeNG `p-toggleswitch` hoặc `p-checkbox`
  - Sub-options Labels: Mode (badge/dot radio), Max (number input 1–4), Always show (toggle)
  - Sub-options Modules: Max (number input 1–3) — disabled nếu showModules = false
  - Group by và Order by selectors (di chuyển hoặc bổ sung từ toolbar)
  - Output: `EventEmitter<Partial<DisplayProperties>>`
  - _Requirements: 3.1–3.5_

- [x] 6. Tích hợp Display Properties Panel vào Backlog
  - `backlog-toolbar.component.ts`: thêm nút "Display" → toggle popover
  - `backlog.component.ts`: thêm signal `displayProps`, method `updateDisplayProps()`, persist localStorage
  - Truyền `[displayProps]="displayProps()"` vào `<app-task-list>`
  - Lắng nghe `(displayPropsChange)` từ panel → gọi `updateDisplayProps()`
  - _Requirements: 3.6, 3.7_

- [x] 7. Checkpoint Sprint 1
  - Test drag toàn row: giữ chuột bất kỳ đâu trên row → drag; click ngắn → mở detail panel
  - Test label badge: badge style đúng, overflow +N, dot mode, workspace icon globe
  - Test Display Properties: toggle từng field, verify ẩn/hiện, persist qua F5
  - Test edge case: task không có label, không có assignee, priority = none

---

## Sprint 2 — Label Scope (4 ngày)

- [x] 8. Database migration — AddLabelScope
  - Tạo migration file `migrations/{timestamp}-AddLabelScope.ts`
  - `up()`:
    - `ALTER TABLE labels ADD COLUMN scope VARCHAR(10) NOT NULL DEFAULT 'project' CHECK (...)`
    - `ALTER TABLE labels ADD COLUMN workspace_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'`
    - `ALTER TABLE labels ALTER COLUMN project_id DROP NOT NULL`
    - Drop UNIQUE(project_id, name); thêm 2 partial UNIQUE indexes
    - Backfill: `UPDATE labels l SET workspace_id = p.workspace_id FROM projects p WHERE l.project_id = p.id`
    - Xóa placeholder default sau backfill: `ALTER TABLE labels ALTER COLUMN workspace_id DROP DEFAULT`
    - Thêm 2 partial indexes cho workspace và project scope
  - `down()`: đảo ngược — restore NOT NULL, UNIQUE cũ, drop cột mới
  - Chạy migration trên dev DB, verify schema và dữ liệu cũ còn nguyên
  - _Requirements: 4.1_

- [x] 9. Backend — Label entity cập nhật
  - `apps/backend/src/task/entities/label.entity.ts`: thêm `scope`, `workspaceId` (nullable FK), nullable `projectId`
  - _Requirements: 4.1_

- [x] 10. Backend — Label Service cập nhật
  - `findAllForProject(projectId, workspaceId)`: UNION/OR query trả về workspace + project labels
  - `create(...)`: nhận `scope` parameter, route đến workspace hoặc project insert
  - `update(...)`: validate scope — workspace label chỉ Workspace Admin mới sửa
  - `delete(...)`: tính `affectedTaskCount` trước khi xóa (cross-project cho workspace label), trả về trong response
  - _Requirements: 4.3–4.6_

- [x] 11. Backend — Label Controller cập nhật + routes mới
  - Cập nhật `GET /api/projects/:pid/labels`: gọi `findAllForProject` với cả `workspaceId`
  - Thêm controller/routes: `GET/POST/PATCH/DELETE /api/workspaces/:wid/labels`
  - Guard: `@Roles('admin')` hoặc workspace owner check cho workspace routes
  - _Requirements: 4.1–4.8_

- [x] 12. Frontend — Label Store cập nhật
  - `apps/frontend/src/app/tasks/state/label.store.ts`: labels array nhận `Label` với `scope` field
  - Method `createWorkspaceLabel(dto)`, `updateWorkspaceLabel(id, dto)`, `deleteWorkspaceLabel(id)`
  - `apps/frontend/src/app/tasks/services/label.service.ts`: thêm methods cho workspace routes
  - _Requirements: 4.7_

- [x] 13. Frontend — Label Manager UI 2 tab
  - `apps/frontend/src/app/tasks/components/label-manager/label-manager.component.ts`
  - Tab "Workspace Labels": danh sách với icon `pi-globe`, readonly cho non-admin, editable cho admin
  - Tab "Project Labels": giữ nguyên behavior hiện tại
  - Admin indicator: nút "+ Thêm workspace label" chỉ hiển thị với admin
  - Confirm dialog khi xóa workspace label: "Label này đang dùng trong X tasks. Xóa sẽ bỏ label khỏi tất cả."
  - _Requirements: 4.7_

- [x] 14. Checkpoint Sprint 2
  - Test: Admin tạo workspace label → visible trong tất cả project của workspace
  - Test: SM tạo project label → chỉ visible trong project đó
  - Test: SM cố xóa workspace label → 403
  - Test: Label Manager hiển thị đúng 2 tab, workspace label có icon globe trong badge
  - Test: backward compatible — labels cũ (scope='project') vẫn hoạt động bình thường

---

## Sprint 3 — State Templates (4 ngày)

- [x] 15. Verify workspace_id trên Project entity
  - Kiểm tra `projects` table có cột `workspace_id` chưa
  - Nếu chưa: tạo migration thêm `workspace_id` trước Sprint 3
  - _Blocker cho toàn Sprint 3_

- [x] 16. Database migration — CreateWorkspaceStateTemplates + AddTemplateId
  - Tạo migration `migrations/{timestamp}-CreateStateTemplates.ts`
  - `up()`:
    - Tạo bảng `workspace_state_templates` với UNIQUE(workspace_id, name)
    - `ALTER TABLE project_states ADD COLUMN template_id UUID REFERENCES workspace_state_templates(id) ON DELETE SET NULL`
    - Tạo index `idx_project_states_template`
  - `down()`: drop column, drop table
  - _Requirements: 5.1, 5.3_

- [x] 17. Backend — StateTemplate entity + shared types
  - Tạo `apps/backend/src/project/entities/workspace-state-template.entity.ts`
  - Cập nhật `libs/shared-types/src/project.types.ts`: thêm `WorkspaceStateTemplate`, `templateId` vào `ProjectState`
  - _Requirements: 5.2_

- [x] 18. Backend — StateTemplateService
  - Tạo `apps/backend/src/project/state-template/state-template.service.ts`
  - `findAll(workspaceId)`: SELECT * WHERE workspace_id = :wid ORDER BY order
  - `create(workspaceId, userId, dto)`: INSERT, validate unique name, max 20 templates
  - `update(templateId, workspaceId, dto)`: UPDATE, validate name uniqueness
  - `delete(templateId, workspaceId)`: DELETE (CASCADE ON DELETE SET NULL trên project_states)
  - `applyToProject(workspaceId, projectId)`: merge logic — skip existing template_id, insert chỉ mới, handle name conflict với suffix "(template)"
  - _Requirements: 5.1, 5.6, 5.7_

- [x] 19. Backend — StateTemplateController + routes
  - Tạo `apps/backend/src/project/state-template/state-template.controller.ts`
  - `GET /api/workspaces/:wid/state-templates` — member check
  - `POST /api/workspaces/:wid/state-templates` — Admin only
  - `PATCH /api/workspaces/:wid/state-templates/:id` — Admin only
  - `DELETE /api/workspaces/:wid/state-templates/:id` — Admin only
  - `POST /api/workspaces/:wid/state-templates/apply/:projectId` — Admin only
  - _Requirements: 5.1, 5.6_

- [x] 20. Backend — Project Service cập nhật — seed từ template khi tạo project
  - `project.service.ts → create()`: nhận `stateTemplate: 'blank' | 'workspace'`
  - IF `stateTemplate = 'workspace'`: gọi `stateTemplateService.applyToProject()` sau khi tạo project
  - IF `stateTemplate = 'blank'` hoặc không có template: seed 3 states mặc định (behavior hiện tại)
  - _Requirements: 5.3, 5.4_

- [x] 21. Frontend — States Tab cập nhật
  - `apps/frontend/src/app/projects/pages/project-settings/states-tab/states-tab.component.ts`
  - Thêm section "Workspace Template" (read-only) — fetch từ `GET /api/workspaces/:wid/state-templates`
  - States có `templateId != null` hiển thị icon `pi-link` nhỏ
  - Nút "Áp dụng lại template" cho admin
  - _Requirements: 5.8_

- [x] 22. Frontend — Create Project form cập nhật
  - `apps/frontend/src/app/projects/pages/create-project/create-project.component.ts`
  - Thêm step/option "Chọn State Template": Blank / Workspace Template (chỉ hiện nếu workspace có template)
  - _Requirements: 5.3, 5.4_

- [x] 23. Checkpoint Sprint 3
  - Test: Admin tạo 5 templates → tạo project mới với "workspace template" → project có đúng 5 states với templateId
  - Test: Tạo project với "blank" → 3 states mặc định
  - Test: SM sửa state trong project → độc lập, không ảnh hưởng template
  - Test: Admin apply template vào project cũ → chỉ thêm states chưa có; states cũ không bị xóa
  - Test: Xóa template → project_states.template_id = NULL (ON DELETE SET NULL)

---

## Sprint 4 — Modules (11 ngày)

- [x] 24. Database migration — CreateModules
  - Tạo migration `migrations/{timestamp}-CreateModules.ts`
  - `up()`:
    - `CREATE TYPE module_status_enum AS ENUM (...)`
    - Tạo bảng `modules` với CHECK constraint scope, partial UNIQUE indexes
    - Tạo bảng `task_modules`
    - Tạo tất cả indexes (workspace, project, end_date, task reverse lookup)
  - `down()`: drop indexes → task_modules → modules → enum
  - _Requirements: 6.1–6.2_

- [x] 25. Backend — Module entity + shared types
  - Tạo `apps/backend/src/task/entities/module.entity.ts` và `task-module.entity.ts`
  - Cập nhật `libs/shared-types/src/task.types.ts`:
    - Thêm `ModuleStatus` type, `ProjectModule` interface, `TaskModuleRef` (id, name, scope, status)
    - Cập nhật `TaskListItem`: thêm `modules?: TaskModuleRef[]`
  - Build lại shared-types
  - _Requirements: 6.4_

- [x] 26. Backend — ModuleService
  - Tạo `apps/backend/src/task/module/module.service.ts`
  - `findAllForProject(projectId, workspaceId, query)`: merge query với progress computation (aggregate JOIN)
  - `findAllForWorkspace(workspaceId)`: workspace-only modules
  - `create(scope, workspaceId, projectId, userId, dto)`: INSERT với CHECK constraint scope
  - `update(moduleId, userId, dto)`: validate quyền theo scope; partial update
  - `delete(moduleId, userId)`: DELETE (CASCADE task_modules); trả về số task ảnh hưởng
  - `addTasks(moduleId, taskIds)`: batch INSERT task_modules, idempotent
  - `removeTask(moduleId, taskId)`: DELETE từ task_modules
  - _Requirements: 6.1–6.8_

- [x] 27. Backend — ModuleController + routes
  - Tạo `apps/backend/src/task/module/module.controller.ts`
  - Project routes: `GET/POST/PATCH/DELETE /api/projects/:pid/modules`
  - Task assignment: `POST /api/projects/:pid/modules/:mid/tasks`, `DELETE /api/projects/:pid/modules/:mid/tasks/:tid`
  - Workspace routes: `GET/POST/PATCH/DELETE /api/workspaces/:wid/modules`
  - Guards: `@ProjectRoles(...)` cho project routes; `@Roles('admin')` cho workspace routes
  - _Requirements: 6.1–6.8_

- [x] 28. Backend — Task Service: include modules trong query
  - `task.service.ts → findAll()`: thêm LEFT JOIN `task_modules → modules` để include `modules: TaskModuleRef[]` trong response
  - Chỉ include modules visible trong project (workspace + project scope) — tránh leak cross-workspace
  - _Requirements: 6.11_

- [x] 29. Backend — Wire ModuleModule vào AppModule
  - Tạo `apps/backend/src/task/module/module.module.ts`
  - Import vào `task.module.ts` hoặc `app.module.ts`
  - _Requirements: 6.1_

- [x] 30. Frontend — Angular Module Service + Store
  - Tạo `apps/frontend/src/app/tasks/services/module.service.ts`:
    - `getModules(projectId)`, `createModule(projectId, dto)`, `updateModule(id, dto)`, `deleteModule(id)`
    - `addTasksToModule(moduleId, taskIds)`, `removeTaskFromModule(moduleId, taskId)`
    - Workspace: `getWorkspaceModules(wid)`, `createWorkspaceModule(wid, dto)`
  - Tạo `apps/frontend/src/app/tasks/state/module.store.ts`: signals `modules`, `isLoading`; methods tương ứng
  - _Requirements: 6.3, 6.5_

- [x] 31. Frontend — Trang Modules
  - Tạo thư mục `apps/frontend/src/app/tasks/pages/modules/`
  - `modules.component.ts`: container, fetch modules, hiển thị 2 nhóm (workspace / project)
  - `module-card.component.ts`: card với tên, status badge (màu theo status), progress bar, ngày, task count; icon globe (workspace) hoặc folder (project)
  - `module-form.component.ts`: dialog tạo/sửa module — name, description (markdown textarea), status, start_date, end_date
  - Thêm route `/projects/:key/modules` vào AppShell routing; route đã có ở sidebar nhưng component chưa tồn tại
  - _Requirements: 6.9_

- [x] 32. Frontend — Module picker trong Task Detail Panel
  - `apps/frontend/src/app/tasks/components/task-detail-panel/task-detail-panel.component.ts`
  - Thêm field "Modules" trong tab Overview (dưới Labels)
  - Multi-select với 2 nhóm trong dropdown: "Workspace Modules" (icon globe), "Project Modules" (icon folder)
  - Thêm/xóa module gọi `addTasksToModule` / `removeTaskFromModule`
  - _Requirements: 6.10_

- [x] 33. Frontend — Module badge trong Backlog row
  - `task-list.component.ts`: thêm block module badges sau label badges
  - `@if (displayProps.showModules && task.modules?.length)`: render tối đa `maxModules` badges
  - Badge workspace module: border indigo, background indigo-50, icon `pi-globe`
  - Badge project module: border teal, background teal-50, icon `pi-folder`
  - Overflow `+N` với tooltip
  - _Requirements: 6.11_

- [x] 34. Frontend — Display Properties Panel: thêm Modules toggle
  - `display-properties-panel.component.ts`: thêm toggle "Modules" + sub-option "Max" (1–3)
  - Disabled state của sub-option khi `showModules = false`
  - _Requirements: 3.4_

- [x] 35. Checkpoint Sprint 4
  - Test: Admin tạo workspace module → visible khi SM mở `/projects/:key/modules`
  - Test: SM tạo project module → chỉ visible trong project đó
  - Test: Gán 3 tasks vào module → progress = 0%; complete 2 tasks → progress = 67%
  - Test: Module picker trong task detail hiển thị 2 nhóm; thêm/xóa module cho task
  - Test: Module badge trên backlog row; Display Properties toggle modules ẩn/hiện
  - Test: SM cố xóa workspace module → 403
  - Test: Xóa module → task_modules bị xóa; task không bị ảnh hưởng

---

## Final Checkpoint

- [x] 36. Regression test toàn bộ
  - Backlog load bình thường với labels và modules mới trong response
  - Drag & drop vẫn hoạt động sau khi bỏ cdkDragHandle
  - Label Manager vẫn hoạt động cho project labels (backward compatible)
  - Create project vẫn hoạt động với `stateTemplate = 'blank'`
  - `GET /api/projects/:pid/labels` trả về merged list đúng (không duplicate, đúng order)

- [x] 37. Performance check
  - `GET /api/projects/:pid/labels`: ≤ 200ms với 100 workspace labels + 50 project labels
  - `GET /api/projects/:pid/modules`: ≤ 200ms với progress computed
  - Backlog load 200 tasks + modules JOIN: ≤ 350ms
  - Display Properties toggle: instant (no network)

---

## Phân công

| Sprint | Task group | Người làm | Deadline | Trạng thái |
|--------|-----------|-----------|---------|-----------|
| 1 | 1–7 (Backlog UI) | — | — | ⬜ Todo |
| 2 | 8–14 (Label Scope) | — | — | ⬜ Todo |
| 3 | 15–23 (State Templates) | — | — | ⬜ Todo |
| 4 | 24–35 (Modules) | — | — | ⬜ Todo |
| Final | 36–37 (Regression + Perf) | — | — | ⬜ Todo |

---

## Ghi chú implementation

- **workspace_id**: Cần verify `projects` table có cột `workspace_id` trước Sprint 3 và 4 — đây là blocker quan trọng
- **Label scope backfill**: Migration backfill `workspace_id` từ `projects.workspace_id` — chạy trong transaction; verify count trước/sau
- **Module progress**: Tính tại query time với task state filter — dùng task state category "completed" group (group = 'completed') thay vì hardcode state name để tương thích với state customization
- **Drag threshold**: Angular CDK default drag threshold = 5px — không cần config thêm; click vẫn hoạt động bình thường
- **Display Properties fallback**: Nếu localStorage parse lỗi (JSON corrupt), catch exception và dùng DEFAULT_DISPLAY_PROPS; log warning
- **Sprint 1 độc lập**: Không cần backend changes — có thể merge vào main ngay sau khi test
- **Sprint 4 phụ thuộc Sprint 1**: Cần `displayProps.showModules` và `maxModules` từ Sprint 1 — merge Sprint 1 trước

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0,  "tasks": ["1.1", "1.2"] },
    { "id": 1,  "tasks": ["2", "3"] },
    { "id": 2,  "tasks": ["4", "5"] },
    { "id": 3,  "tasks": ["6"] },
    { "id": 4,  "tasks": ["7"] },
    { "id": 5,  "tasks": ["8", "9"] },
    { "id": 6,  "tasks": ["10"] },
    { "id": 7,  "tasks": ["11", "12"] },
    { "id": 8,  "tasks": ["13"] },
    { "id": 9,  "tasks": ["14"] },
    { "id": 10, "tasks": ["15"] },
    { "id": 11, "tasks": ["16", "17"] },
    { "id": 12, "tasks": ["18"] },
    { "id": 13, "tasks": ["19", "20"] },
    { "id": 14, "tasks": ["21", "22"] },
    { "id": 15, "tasks": ["23"] },
    { "id": 16, "tasks": ["24", "25"] },
    { "id": 17, "tasks": ["26"] },
    { "id": 18, "tasks": ["27", "28"] },
    { "id": 19, "tasks": ["29", "30"] },
    { "id": 20, "tasks": ["31", "32"] },
    { "id": 21, "tasks": ["33", "34"] },
    { "id": 22, "tasks": ["35"] },
    { "id": 23, "tasks": ["36", "37"] }
  ]
}
```
