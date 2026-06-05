# Plan: Task 18 — Backend StateTemplateService

## Task ID
18. Backend — StateTemplateService

## Approach
Tạo service mới trong thư mục `apps/backend/src/project/state-template/` theo pattern hiện có của `ProjectStateService`. Service sẽ inject `Repository<WorkspaceStateTemplate>` và `Repository<ProjectState>` để thực hiện CRUD và apply logic.

## Files tạo/sửa
- **Tạo**: `apps/backend/src/project/state-template/state-template.service.ts`

## Acceptance Criteria (từ Requirements 5.1, 5.6, 5.7)
- `findAll(workspaceId)`: trả về tất cả templates của workspace, ORDER BY order
- `create(workspaceId, userId, dto)`: INSERT, validate unique name trong workspace, max 20 templates
- `update(templateId, workspaceId, dto)`: UPDATE, validate name uniqueness nếu name thay đổi
- `delete(templateId, workspaceId)`: DELETE (CASCADE ON DELETE SET NULL trên project_states đã có trong schema)
- `applyToProject(workspaceId, projectId)`: merge logic — skip existing template_id, insert chỉ mới, handle name conflict với suffix "(template)"

## Dependencies
- Task 16 (migration) — done ✓
- Task 17 (entity + shared types) — done ✓
