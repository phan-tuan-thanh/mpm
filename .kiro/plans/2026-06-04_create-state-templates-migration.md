# Plan: Task 16 — Database migration — CreateWorkspaceStateTemplates + AddTemplateId

## Task ID
16. Database migration — CreateWorkspaceStateTemplates + AddTemplateId

## Approach
Tạo TypeORM migration file theo pattern hiện có (QueryRunner), tạo bảng `workspace_state_templates` và thêm cột `template_id` vào `project_states`.

## Files tạo/sửa
- **Tạo mới**: `migrations/1749028000000-CreateStateTemplates.ts`

## Acceptance Criteria (from Requirements 5.1, 5.3)
- Bảng `workspace_state_templates` được tạo với UNIQUE(workspace_id, name)
- Cột `template_id` (UUID, nullable, FK → workspace_state_templates.id ON DELETE SET NULL) được thêm vào `project_states`
- Index `idx_project_states_template` được tạo (partial, WHERE template_id IS NOT NULL)
- Index `idx_state_templates_workspace` trên workspace_id
- `down()` hoàn chỉnh: drop column → drop table

## Dependencies
- Task 15 (Verify workspace_id trên Project entity) — ✅ đã hoàn thành (migration 1749020000000-AddWorkspaceIdToProjects.ts tồn tại)
