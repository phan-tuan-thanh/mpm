# Plan: Task 19 — StateTemplateController + Routes

## Task ID: 19
## Mô tả
Tạo StateTemplateController cho workspace state templates với đầy đủ CRUD + apply routes.

## Approach
- Tạo controller theo cùng pattern với `WorkspaceLabelController`
- Route prefix: `api/workspaces/:workspaceId/state-templates`
- GET: any workspace member (JwtAuth only, không @Roles)
- POST/PATCH/DELETE/apply: `@Roles('Admin')` cho Workspace Admin only
- Register controller + service + entity vào `ProjectModule`

## Files tạo/sửa
- [CREATE] `apps/backend/src/project/state-template/state-template.controller.ts`
- [UPDATE] `apps/backend/src/project/project.module.ts` — import StateTemplateService, WorkspaceStateTemplate entity, StateTemplateController

## Acceptance Criteria
- Requirements 5.1: CRUD State Templates at workspace level
- Requirements 5.6: Apply template vào existing project

## Dependencies
- Task 17 (entity) ✅ done
- Task 18 (service) ✅ done
