# Plan: Task 1.2 — Cập nhật Label interface thêm scope và workspaceId

## Task Info
- **Task ID:** 1.2
- **Spec:** backlog-enhancements
- **Requirement:** 4.1

## Approach
Thêm 3 optional fields vào interface `Label` trong `libs/shared-types/src/task.types.ts`:
- `scope?: 'workspace' | 'project'` — phạm vi label
- `workspaceId?: string` — UUID workspace sở hữu
- `projectId` — đổi từ required `string` → optional `string | null`

Tất cả fields mới đều optional (`?`) để backward compatible ở bước này.

## Files thay đổi
- `libs/shared-types/src/task.types.ts` — cập nhật interface `Label`

## Acceptance Criteria
- Fields mới optional, không break code hiện tại
- Build shared-types thành công (tsc --noEmit)
- Interface phản ánh đúng design: scope (workspace/project), workspaceId (UUID), projectId (nullable UUID)

## Dependencies
- Không có dependency trên task khác (wave 0 trong dependency graph)
