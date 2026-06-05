# Plan: Task 37 — Performance Check

## Task ID
37. Performance check

## Approach
Đánh giá performance qua code review và index analysis (không chạy load test thực tế vì cần running server + seeded data).

## Checklist đánh giá

1. **Labels query (`GET /api/projects/:pid/labels`)** — ≤ 200ms target
   - Verify partial indexes `idx_labels_workspace` và `idx_labels_project_scope` trên migration
   - Verify OR-condition query pattern trong `LabelService.findAllForProject()`
   - Verify `idx_task_labels_label` (từ Epic B) hỗ trợ COUNT aggregation

2. **Modules query (`GET /api/projects/:pid/modules`)** — ≤ 200ms target
   - Verify partial indexes `idx_modules_workspace` và `idx_modules_project`
   - Verify progress computation bằng JOIN + FILTER aggregate (không stale cache)
   - Verify `idx_task_modules_module` hỗ trợ JOIN pattern

3. **Backlog load 200 tasks + modules JOIN** — ≤ 350ms target
   - Verify LEFT JOIN pattern `task_modules → modules` trong `TaskService.findAll()`
   - Verify `idx_task_modules_task` ngăn seq scan trên task_modules
   - Verify pagination (LIMIT 200) giới hạn result set

4. **Display Properties toggle** — instant (no network)
   - Verify localStorage + Angular Signals implementation
   - Verify không có API call khi toggle

5. **Angular build output** — reasonable bundle size
   - Check total JS size, number of lazy chunks
   - Verify no new external dependencies added beyond spec requirements

## Files đánh giá
- `migrations/1749024000000-AddLabelScope.ts` — indexes
- `migrations/1749032000000-CreateModules.ts` — indexes
- `migrations/1748822400000-CreateTaskManagementTables.ts` — `idx_task_labels_label`
- `apps/backend/src/task/label/label.service.ts` — merge query
- `apps/backend/src/task/module/module.service.ts` — progress query
- `apps/backend/src/task/task.service.ts` — LEFT JOIN modules in task list
- `apps/frontend/src/app/tasks/pages/backlog/backlog.component.ts` — Display Properties
- `apps/frontend/dist/browser/` — build output

## Dependencies
- Task 36 (Regression test) — cùng wave 23

## Acceptance Criteria
- Performance assessment report với pass/fail cho mỗi target
- Identify potential bottlenecks nếu có
