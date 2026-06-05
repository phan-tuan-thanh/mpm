# Plan: Task 26 — Backend ModuleService

## Task ID
26. Backend — ModuleService

## Approach
Tạo `ModuleService` với các methods CRUD cho modules, hỗ trợ scope workspace/project, progress computation dựa trên project_states.group = 'completed' (thay vì hardcode state names), và quản lý task_modules relationship.

## Files sẽ tạo/sửa
- **Tạo**: `apps/backend/src/task/module/module.service.ts`

## Acceptance Criteria (Requirements 6.1–6.8)
- 6.1: Workspace Admin tạo workspace module → scope='workspace', project_id=NULL
- 6.2: SM/PO tạo project module → scope='project', project_id có giá trị
- 6.3: GET modules trả merged list workspace+project, sorted scope ASC → end_date ASC
- 6.4: Module có name, description, status, start_date, end_date, progress (computed)
- 6.5: Task gán vào module qua task_modules (many-to-many)
- 6.6: Progress = completedCount / taskCount * 100 (computed tại query time)
- 6.7: Xóa workspace module → cascade task_modules, task không bị xóa
- 6.8: SM/PO không được sửa/xóa workspace module → 403

## Dependencies
- Task 25 (Module entity + TaskModule entity) — ✅ Done

## Key Design Decisions
- Progress computation: JOIN project_states ON t.state_id = ps.id, filter ps.group = 'completed' (tương thích custom states)
- findAllForProject: OR condition cho workspace + project scope, aggregate COUNT
- addTasks: idempotent — ON CONFLICT DO NOTHING
- delete: trả về số task bị ảnh hưởng (affectedTaskCount)
