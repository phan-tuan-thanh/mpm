# Task 10: Backend — Label Service cập nhật

## Task ID
10. Backend — Label Service cập nhật

## Approach
Cập nhật `LabelService` để hỗ trợ label scope (workspace/project):
1. `findAllForProject(projectId, workspaceId)`: UNION/OR query trả về merged workspace + project labels
2. `create(...)`: nhận `scope` parameter, route đến workspace hoặc project insert
3. `update(...)`: validate scope — workspace label chỉ Workspace Admin mới sửa (403 cho SM/PO)
4. `delete(...)`: tính `affectedTaskCount` trước khi xóa, trả về trong response

## Files sẽ sửa
- `apps/backend/src/task/label/label.service.ts` — rewrite methods

## Acceptance Criteria (từ Requirements 4.3–4.6)
- 4.3: GET /api/projects/:pid/labels returns merged list: workspace + project labels, sorted scope ASC then name ASC
- 4.4: DELETE workspace label cascades task_labels and reports affectedTaskCount
- 4.5: SM/PO cannot edit/delete workspace labels (403)
- 4.6: task_labels activity log unchanged

## Dependencies
- Task 8 (migration AddLabelScope) — ✅ done
- Task 9 (Label entity update) — ✅ done

## Notes
- `RequestUser.systemRole === 'Admin'` → Workspace Admin
- workspace label: scope='workspace', workspace_id not null, project_id IS NULL
- project label: scope='project', project_id not null
- `task_labels` join table used by TypeORM ManyToMany on Task entity
