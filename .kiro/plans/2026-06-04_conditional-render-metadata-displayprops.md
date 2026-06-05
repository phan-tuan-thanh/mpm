# Plan: Task 4 — Conditional render tất cả metadata theo displayProps

## Task ID
4. Conditional render tất cả metadata theo displayProps — task-list.component.ts

## Approach
Wrap các metadata block còn lại trong template với `@if (displayProps.showXxx && ...)` conditions.
- `@Input() displayProps` và `DEFAULT_DISPLAY_PROPS` import đã tồn tại (từ task 1.1 và 3)
- Labels đã được wrap (task 3)
- Cần wrap: sub-item count, estimate, due date, priority, assignees

## File sẽ sửa
- `apps/frontend/src/app/tasks/pages/backlog/task-list/task-list.component.ts`

## Acceptance Criteria
- Requirements 3.7: WHEN Display_Properties thay đổi, THE Task_Client SHALL áp dụng ngay lập tức

## Changes

### Sub-item count
Before: `@if (childCount > 0)`
After: `@if (displayProps.showSubItemCount && childCount > 0)`

### Estimate
Before: `@if (task.estimateValue != null)`
After: `@if (displayProps.showEstimate && task.estimateValue != null)`

### Due date
Before: `@if (task.dueDate)`
After: `@if (displayProps.showDueDate && task.dueDate)`

### Priority
Before: `@if (task.priority !== 'none')`
After: `@if (displayProps.showPriority && task.priority !== 'none')`

### Assignees
Before: `@if (task.assignees?.length)`
After: `@if (displayProps.showAssignee && task.assignees?.length)`

## Dependencies
- Task 1.1 (shared types) — ✅ done
- Task 3 (label badge) — ✅ done
