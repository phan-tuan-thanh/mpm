# Plan: Task 12 — Frontend Label Store cập nhật

## Task ID
12. Frontend — Label Store cập nhật

## Approach
Thêm workspace label API methods vào `LabelService` và workspace label management methods vào `LabelStore`. Workspace routes sử dụng pattern `/api/workspaces/:workspaceId/labels`.

## Files sẽ sửa
1. `apps/frontend/src/app/tasks/services/label.service.ts` — thêm workspace label API methods
2. `apps/frontend/src/app/tasks/state/label.store.ts` — thêm workspace label CRUD methods

## Acceptance Criteria (từ Requirement 4.7)
- Label Manager UI có thể gọi workspace label CRUD operations
- Store quản lý labels array với scope field (Label interface đã có `scope`, `workspaceId`)
- Methods: `createWorkspaceLabel(dto)`, `updateWorkspaceLabel(id, dto)`, `deleteWorkspaceLabel(id)`

## Dependencies
- Task 1.2 (Label interface với scope field) — ✅ Done
- Task 10 (Backend Label Service cập nhật) — ✅ Done
- Task 11 (Backend Label Controller + routes mới) — In progress (song song theo dependency graph wave 7)

## API Endpoints cần gọi
- `GET /api/workspaces/:wid/labels` — list workspace labels
- `POST /api/workspaces/:wid/labels` — create { name, color }
- `PATCH /api/workspaces/:wid/labels/:labelId` — update { name?, color? }
- `DELETE /api/workspaces/:wid/labels/:labelId` — returns { deletedLabelId, affectedTaskCount }
