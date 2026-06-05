# Plan: Task 27 — Backend ModuleController + Routes

## Task Info
- **ID:** 27
- **Sprint:** 4 (Modules)
- **Requirements:** 6.1–6.8

## Approach

Tạo 2 controllers cho Module:
1. **ModuleController** — project-scoped routes tại `/api/projects/:projectId/modules`
2. **WorkspaceModuleController** — workspace-scoped routes tại `/api/workspaces/:workspaceId/modules`

Theo pattern đã dùng cho Label (LabelController + WorkspaceLabelController).

## Files tạo/sửa

| File | Hành động |
|------|-----------|
| `apps/backend/src/task/module/module.controller.ts` | Tạo mới |

## Routes

### Project Routes (ModuleController)
- `GET /api/projects/:projectId/modules` — @ProjectRoles(all members)
- `POST /api/projects/:projectId/modules` — @ProjectRoles('Scrum_Master', 'Product_Owner')
- `PATCH /api/projects/:projectId/modules/:moduleId` — @ProjectRoles('Scrum_Master', 'Product_Owner')
- `DELETE /api/projects/:projectId/modules/:moduleId` — @ProjectRoles('Scrum_Master', 'Product_Owner')
- `POST /api/projects/:projectId/modules/:moduleId/tasks` — @ProjectRoles('Scrum_Master', 'Product_Owner')
- `DELETE /api/projects/:projectId/modules/:moduleId/tasks/:taskId` — @ProjectRoles('Scrum_Master', 'Product_Owner')

### Workspace Routes (WorkspaceModuleController)
- `GET /api/workspaces/:workspaceId/modules` — @Roles('Admin')
- `POST /api/workspaces/:workspaceId/modules` — @Roles('Admin')
- `PATCH /api/workspaces/:workspaceId/modules/:moduleId` — @Roles('Admin')
- `DELETE /api/workspaces/:workspaceId/modules/:moduleId` — @Roles('Admin')

## Dependencies
- Task 26 (ModuleService) — ✅ done
- Task 25 (Module entity) — ✅ done

## Acceptance Criteria
- Module controller compiles
- All routes match API contracts in design.md
- Guards correctly applied
- resolveWorkspaceId pattern used for project routes
