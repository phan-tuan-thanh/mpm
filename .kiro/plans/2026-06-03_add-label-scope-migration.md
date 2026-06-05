# Plan: Task 8 — Database migration — AddLabelScope

## Task Info
- **Task ID**: 8
- **Sprint**: 2 — Label Scope
- **Requirement**: 4.1

## Approach
Tạo TypeORM migration file theo đúng style hiện có trong project:
- Timestamp: `1749024000000` (kế tiếp sau migration cuối `1748822400000`)
- Class naming: `AddLabelScope1749024000000`

## Thay đổi schema (up)
1. Thêm cột `scope` VARCHAR(10) NOT NULL DEFAULT 'project' với CHECK constraint
2. Thêm cột `workspace_id` UUID NOT NULL DEFAULT placeholder UUID
3. ALTER COLUMN `project_id` DROP NOT NULL
4. Drop UNIQUE constraint cũ `uq_label_name` (project_id, name)
5. Backfill `workspace_id` từ `projects.workspace_id`
6. Xóa placeholder default trên `workspace_id`
7. Tạo 2 partial UNIQUE indexes (workspace scope, project scope)
8. Tạo 2 partial indexes cho merge query

## Rollback (down)
1. Drop 4 indexes mới
2. Drop 2 cột mới (scope, workspace_id)
3. Restore NOT NULL trên project_id
4. Restore UNIQUE constraint cũ (project_id, name)

## Files
- **Tạo mới**: `migrations/1749024000000-AddLabelScope.ts`

## Dependencies
- Task 1.2 (shared types update) — đã hoàn thành ✓
- Cần `workspace_id` trên bảng `projects` — verify trong migration

## Acceptance Criteria
- Migration compile thành công (TypeScript)
- `up()` thực hiện đúng thứ tự: add columns → drop old constraint → backfill → drop default → create new indexes
- `down()` đảo ngược hoàn toàn
