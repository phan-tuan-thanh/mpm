# Task 17: Backend — StateTemplate entity + shared types

## Task ID
17

## Mô tả
Tạo TypeORM entity cho bảng `workspace_state_templates` và cập nhật shared-types để thêm interface `WorkspaceStateTemplate` + `templateId` vào `ProjectState`.

## Approach
1. Tạo entity `workspace-state-template.entity.ts` theo pattern từ `project-state.entity.ts`
2. Cập nhật `libs/shared-types/src/project.types.ts`:
   - Thêm interface `WorkspaceStateTemplate`
   - Thêm `templateId?: string | null` vào `ProjectState`
3. Cập nhật `libs/shared-types/src/index.ts`: export `WorkspaceStateTemplate`
4. Verify compilation

## Files tạo/sửa
- **Tạo:** `apps/backend/src/project/entities/workspace-state-template.entity.ts`
- **Sửa:** `libs/shared-types/src/project.types.ts`
- **Sửa:** `libs/shared-types/src/index.ts`

## Acceptance Criteria
- Entity maps to `workspace_state_templates` table with correct columns and types
- `WorkspaceStateTemplate` interface available in shared-types
- `ProjectState` has optional `templateId` field
- Both backend and shared-types compile successfully

## Dependencies
- Task 15 (verify workspace_id) ✅
- Task 16 (migration) — in progress, but entity can be created independently
