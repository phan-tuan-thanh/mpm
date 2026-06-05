# Plan: Task 9 — Backend — Label entity cập nhật

## Task ID: 9
## Mô tả
Cập nhật Label entity trong backend thêm `scope`, `workspaceId`, và làm `projectId` nullable để hỗ trợ Label Scope (workspace / project).

## Approach
- Thêm column `scope` (varchar(10), default 'project')
- Thêm column `workspace_id` (uuid, nullable — sẽ NOT NULL sau khi backfill migration chạy)
- Sửa `projectId` thành nullable (FK → Project, onDelete CASCADE)
- Cập nhật relation `project` thành nullable

## Files sẽ sửa
- `apps/backend/src/task/entities/label.entity.ts`

## Acceptance Criteria (từ Requirements 4.1)
- Label entity có column `scope` với giá trị 'workspace' | 'project'
- Label entity có column `workspace_id` (UUID)
- Label entity `projectId` là nullable (cho workspace-scoped labels)

## Dependencies
- Task 8 (migration) cùng wave — entity phải match schema mới
