# Plan: Task 24 — Database migration CreateModules

## Task ID
24. Database migration — CreateModules

## Approach
Tạo migration TypeORM với QueryRunner pattern (giống các migrations hiện có) để tạo enum, bảng modules, bảng task_modules và tất cả indexes cần thiết.

## Files tạo/sửa
- `migrations/1749032000000-CreateModules.ts` — **tạo mới**

## Acceptance Criteria (từ Requirements 6.1–6.2)
- Module entity có scope workspace/project
- CHECK constraint đảm bảo scope consistency (workspace → project_id IS NULL, project → project_id IS NOT NULL)
- Partial UNIQUE indexes cho name uniqueness per scope
- Bảng task_modules cho many-to-many relationship
- down() đảo ngược hoàn toàn

## Dependencies
- Task 15 (verify workspace_id trên projects) — ✅ đã hoàn thành
- Task 16 (CreateStateTemplates) — ✅ đã hoàn thành
- Bảng `projects`, `users`, `tasks` phải tồn tại

## Implementation Details
### up()
1. CREATE TYPE module_status_enum
2. CREATE TABLE modules (với FK đến projects, users; CHECK constraint scope)
3. CREATE UNIQUE INDEX idx_modules_unique_workspace (partial)
4. CREATE UNIQUE INDEX idx_modules_unique_project (partial)
5. CREATE INDEX idx_modules_workspace (partial)
6. CREATE INDEX idx_modules_project (partial)
7. CREATE INDEX idx_modules_end_date (partial)
8. CREATE TABLE task_modules (composite PK)
9. CREATE INDEX idx_task_modules_module
10. CREATE INDEX idx_task_modules_task

### down()
1. DROP INDEX idx_task_modules_task
2. DROP INDEX idx_task_modules_module
3. DROP TABLE task_modules
4. DROP INDEX idx_modules_end_date
5. DROP INDEX idx_modules_project
6. DROP INDEX idx_modules_workspace
7. DROP INDEX idx_modules_unique_project
8. DROP INDEX idx_modules_unique_workspace
9. DROP TABLE modules
10. DROP TYPE module_status_enum
