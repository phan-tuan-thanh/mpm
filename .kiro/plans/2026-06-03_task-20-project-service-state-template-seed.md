# Task 20: Backend — Project Service cập nhật — seed từ template khi tạo project

## Task ID
20

## Mô tả approach
- Thêm `stateTemplate?: 'blank' | 'workspace'` vào `CreateProjectDto` (backend + shared-types)
- Inject `StateTemplateService` vào `ProjectService`
- Trong `create()`: 
  - IF `stateTemplate = 'workspace'` VÀ project có `workspaceId`: gọi `stateTemplateService.applyToProject()` thay vì seed defaults
  - IF apply trả về 0 templates (workspace không có template) → fallback seed defaults
  - IF `stateTemplate = 'blank'` hoặc undefined → seed defaults (behavior hiện tại)

## Files sẽ tạo/sửa
1. `libs/shared-types/src/project.types.ts` — thêm `stateTemplate` vào `CreateProjectDto`
2. `apps/backend/src/project/dto/create-project.dto.ts` — thêm validation cho `stateTemplate`
3. `apps/backend/src/project/project.service.ts` — inject StateTemplateService + modify create()
4. `apps/backend/src/project/project.module.ts` — import WorkspaceStateTemplate entity + provide StateTemplateService

## Acceptance criteria
- Req 5.3: WHEN tạo project với `stateTemplate = 'workspace'`, copy State Templates vào project_states
- Req 5.4: WHEN tạo project với `stateTemplate = 'blank'` (mặc định), seed 3 states cứng (hoặc 6 states mặc định hiện tại)

## Dependencies
- Task 18 (StateTemplateService) — đã hoàn thành ✓
- Task 16 (migration) — đã hoàn thành ✓
