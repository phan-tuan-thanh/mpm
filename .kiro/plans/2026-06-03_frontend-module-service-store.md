# Plan: Task 30 — Frontend Angular Module Service + Store

## Task ID
30. Frontend — Angular Module Service + Store

## Approach
Tạo Angular service và signal-based store cho Modules feature, theo đúng pattern đã có trong LabelService + LabelStore.

## Files tạo mới
1. `apps/frontend/src/app/tasks/services/module.service.ts`
2. `apps/frontend/src/app/tasks/state/module.store.ts`

## API Endpoints cần gọi
- `GET /api/projects/:pid/modules` — list modules with progress
- `POST /api/projects/:pid/modules` — create project module
- `PATCH /api/projects/:pid/modules/:mid` — update
- `DELETE /api/projects/:pid/modules/:mid` — delete
- `POST /api/projects/:pid/modules/:mid/tasks` — add tasks `{ taskIds }`
- `DELETE /api/projects/:pid/modules/:mid/tasks/:tid` — remove task
- `GET /api/workspaces/:wid/modules` — workspace modules
- `POST /api/workspaces/:wid/modules` — create workspace module

## Types from shared-types
- `ProjectModule` — full module with progress
- `ModuleStatus` — enum type
- `TaskModuleRef` — brief reference for task list

## Acceptance Criteria
- Requirements 6.3: GET /api/projects/:pid/modules trả về merged list (workspace + project)
- Requirements 6.5: POST /api/projects/:pid/modules/:mid/tasks gán tasks vào module

## Dependencies
- Task 25 (shared types) — ✅ done
- Task 27 (backend controller) — ✅ done
- Task 29 (wiring) — cùng wave, in progress
