# Plan: Task 23 — Checkpoint Sprint 3

## Task Info
- **Task ID**: 23
- **Sprint**: 3 — State Templates
- **Type**: Verification Checkpoint

## Mô tả
Kiểm tra toàn bộ Sprint 3 (tasks 15–22) đã hoàn thành, code build thành công, và các file cần thiết tồn tại đúng vị trí.

## Checklist Verification

### 1. Backend build (`tsc --noEmit`)
- ✅ PASS — Không có lỗi TypeScript

### 2. Frontend build (`ng build --configuration=development`)
- ✅ PASS — Build thành công trong ~1.7s, output tại `apps/frontend/dist`

### 3. Sprint 3 Files Verified

| # | File | Status |
|---|------|--------|
| 1 | `migrations/1749020000000-AddWorkspaceIdToProjects.ts` | ✅ Exists |
| 2 | `migrations/1749028000000-CreateStateTemplates.ts` | ✅ Exists |
| 3 | `apps/backend/src/project/entities/workspace-state-template.entity.ts` | ✅ Exists |
| 4 | `apps/backend/src/project/state-template/state-template.service.ts` | ✅ Exists |
| 5 | `apps/backend/src/project/state-template/state-template.controller.ts` | ✅ Exists |
| 6 | `apps/backend/src/project/project.service.ts` — `stateTemplate` handling in `create()` | ✅ Verified |
| 7 | `apps/frontend/src/app/projects/services/state-template.service.ts` | ✅ Exists |
| 8 | `apps/frontend/src/app/projects/pages/project-settings/states-tab/states-tab.component.ts` — workspace template section | ✅ Verified |
| 9 | `apps/frontend/src/app/projects/pages/create-project/create-project.component.ts` — template selection UI | ✅ Verified |

### 4. Functional Verification (Code Review)

| Test Scenario | Verified In Code |
|--------------|------------------|
| Admin tạo 5 templates → project mới "workspace template" → 5 states với templateId | `project.service.ts` calls `stateTemplateService.applyToProject()` when `dto.stateTemplate === 'workspace'` |
| Tạo project "blank" → 3 states mặc định | Fallback behavior in `project.service.ts` seeds Backlog, In Progress, Done |
| SM sửa state → độc lập template | States copied into `project_states` with own row; no sync back to template |
| Admin apply template vào project cũ → chỉ thêm chưa có | `applyToProject()` skips existing `template_id`, inserts only missing |
| Xóa template → `project_states.template_id = NULL` | FK with `ON DELETE SET NULL` in migration |

## Kết luận
Sprint 3 hoàn thành đầy đủ. Tất cả file tồn tại, cả backend và frontend build thành công không lỗi.
