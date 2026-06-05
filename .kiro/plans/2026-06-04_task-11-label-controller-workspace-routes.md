# Plan: Task 11 — Backend Label Controller cập nhật + routes mới

## Task ID
11. Backend — Label Controller cập nhật + routes mới

## Approach
1. Add `workspaceId` column mapping to `Project` entity (column exists in DB from prior migration)
2. Update existing `LabelController.findAll()` to inject ProjectRepository, resolve `workspaceId` from project, and call `findAllForProject(projectId, workspaceId)`
3. Update existing `LabelController.create()` to resolve workspaceId from project
4. Create `WorkspaceLabelController` with CRUD routes for `/api/workspaces/:workspaceId/labels`
5. Wire the new controller + Project entity into TaskModule
6. Verify backend compiles

## Files to modify/create
- `apps/backend/src/project/entities/project.entity.ts` — Add workspaceId column
- `apps/backend/src/task/label/label.controller.ts` — Update findAll/create to resolve workspaceId
- `apps/backend/src/task/label/workspace-label.controller.ts` — New file with workspace CRUD routes
- `apps/backend/src/task/task.module.ts` — Register new controller + Project entity

## Acceptance Criteria (Requirements 4.1–4.8)
- GET /api/projects/:pid/labels returns merged workspace + project labels
- GET/POST/PATCH/DELETE /api/workspaces/:wid/labels routes exist with Admin guard
- Non-admin users get 403 on workspace routes

## Dependencies
- Task 10 (LabelService methods) — ✅ Done
- Task 9 (Label entity with scope) — ✅ Done
- Task 8 (Migration) — ✅ Done
