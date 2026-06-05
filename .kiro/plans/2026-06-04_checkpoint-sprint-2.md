# Plan: Checkpoint Sprint 2

## Task Info
- **Task ID:** 14
- **Sprint:** 2 — Label Scope
- **Type:** Verification Checkpoint (build/compile)

## Approach
Verify all Sprint 2 components exist and compile correctly:
1. Check migration file exists with up/down methods
2. Check label.entity.ts has scope, workspaceId, nullable projectId
3. Check label.service.ts has findAllForProject, findAllForWorkspace, scope-aware CRUD
4. Check label.controller.ts resolves workspaceId for merged query
5. Check workspace-label.controller.ts exists with CRUD routes + @Roles('Admin')
6. Check frontend label.service.ts has workspace methods
7. Check frontend label.store.ts has workspace methods
8. Check label-manager.component.ts has 2 tabs
9. Run `tsc --noEmit` for backend
10. Run `ng build --configuration=development` for frontend

## Files to Verify
- `migrations/1749024000000-AddLabelScope.ts`
- `apps/backend/src/task/entities/label.entity.ts`
- `apps/backend/src/task/label.service.ts` (or equivalent path)
- `apps/backend/src/task/label.controller.ts` (or equivalent path)
- `apps/backend/src/task/workspace-label.controller.ts` (or equivalent path)
- `apps/frontend/src/app/tasks/services/label.service.ts`
- `apps/frontend/src/app/tasks/state/label.store.ts`
- `apps/frontend/src/app/tasks/components/label-manager/label-manager.component.ts`

## Dependencies
- Tasks 8–13 must be completed (they are marked [x] in tasks.md)

## Acceptance Criteria
- All files exist with expected methods/structure
- Backend compiles without errors
- Frontend compiles without errors

---

## Verification Results ✅

### 1. Migration file
- ✅ `migrations/1749024000000-AddLabelScope.ts` — exists with proper `up()` and `down()` methods
- `up()`: adds scope, workspace_id columns; makes project_id nullable; drops old UNIQUE; backfills; creates partial indexes
- `down()`: drops indexes, deletes workspace labels, restores NOT NULL, restores UNIQUE

### 2. label.entity.ts
- ✅ Has `scope: 'workspace' | 'project'` field
- ✅ Has `workspaceId: string | null` (nullable)
- ✅ Has `projectId: string | null` (nullable)

### 3. label.service.ts (backend)
- ✅ `findAllForProject(projectId, workspaceId)` — UNION/OR query for workspace + project labels
- ✅ `findAllForWorkspace(workspaceId)` — workspace-only labels
- ✅ `create(dto, opts)` — scope-aware create with uniqueness validation
- ✅ `update(labelId, dto, opts)` — scope validation (workspace = Admin only)
- ✅ `delete(labelId, opts)` — affectedTaskCount calculation, scope validation
- ✅ `findAll(projectId)` — backward-compatible fallback

### 4. label.controller.ts
- ✅ Routes: `GET/POST/PATCH/DELETE /api/projects/:projectId/labels`
- ✅ `resolveWorkspaceId()` — resolves workspaceId from project entity
- ✅ GET calls `findAllForProject` with both projectId and workspaceId

### 5. workspace-label.controller.ts
- ✅ Routes: `GET/POST/PATCH/DELETE /api/workspaces/:workspaceId/labels`
- ✅ `@Roles('Admin')` at controller level
- ✅ Full CRUD with proper scope='workspace' handling

### 6. Frontend label.service.ts
- ✅ `getWorkspaceLabels(workspaceId)`
- ✅ `createWorkspaceLabel(workspaceId, dto)`
- ✅ `updateWorkspaceLabel(workspaceId, labelId, dto)`
- ✅ `deleteWorkspaceLabel(workspaceId, labelId)`

### 7. Frontend label.store.ts
- ✅ `loadWorkspaceLabels(workspaceId)`
- ✅ `createWorkspaceLabel(workspaceId, dto)`
- ✅ `updateWorkspaceLabel(workspaceId, labelId, dto)`
- ✅ `deleteWorkspaceLabel(workspaceId, labelId)`

### 8. label-manager.component.ts
- ✅ 2 tabs: "Workspace Labels" (pi-globe icon) / "Project Labels" (pi-folder icon)
- ✅ Admin check via `authStore.isAdmin`
- ✅ Workspace tab: readonly for non-admin, editable (edit/delete buttons) for admin
- ✅ Create workspace label form only visible to admin
- ✅ Confirm dialog on workspace label delete with affectedTaskCount

### 9. Compilation
- ✅ Backend `tsc --noEmit`: Exit code 0 (no errors)
- ✅ Frontend `ng build --configuration=development`: Build success in 1.753s
