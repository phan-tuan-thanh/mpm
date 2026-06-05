# Task 32: Frontend — Module picker trong Task Detail Panel

## Task ID: 32
## Mô tả: Thêm field "Modules" vào tab Overview trong Task Detail Panel

## Approach
- Inject `ModuleStore` vào component
- Load modules khi task panel mở (dùng project modules list)
- Tạo grouped options cho PrimeNG MultiSelect (Workspace Modules + Project Modules)
- Track selected module IDs, sync với `task.modules`
- Khi user chọn thêm module → call `addTasksToModule`
- Khi user bỏ chọn module → call `removeTaskFromModule`

## File sẽ sửa
- `apps/frontend/src/app/tasks/components/task-detail-panel/task-detail-panel.component.ts`

## Acceptance Criteria
- Requirements 6.10: Task detail panel hiển thị field "Modules" với multi-select picker
- Picker nhóm options theo scope (Workspace / Project)

## Dependencies
- Task 30 (ModuleStore + ModuleService) — đã hoàn thành ✓
- Task 25 (shared types TaskModuleRef) — đã hoàn thành ✓
