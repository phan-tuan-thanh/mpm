# Plan: Task 25 — Backend Module entity + shared types

## Task ID: 25
## Mô tả
Tạo entity TypeORM cho bảng `modules` và `task_modules`, và cập nhật shared-types với `ModuleStatus`, `ProjectModule`, `TaskModuleRef`.

## Files sẽ tạo
- `apps/backend/src/task/entities/module.entity.ts`
- `apps/backend/src/task/entities/task-module.entity.ts`

## Files sẽ sửa
- `libs/shared-types/src/task.types.ts` — thêm types mới + update TaskListItem
- `libs/shared-types/src/index.ts` — export types mới

## Acceptance Criteria (từ Requirement 6.4)
- Module entity maps to `modules` table with all columns
- TaskModule entity maps to `task_modules` table (composite PK)
- Shared types: ModuleStatus, ProjectModule, TaskModuleRef
- TaskListItem updated with `modules?: TaskModuleRef[]`
- shared-types compiles successfully

## Dependencies
- Task 24 (CreateModules migration) — cùng wave 16, không block
- Task 1.1 (shared-types DisplayProperties) — done ✓
