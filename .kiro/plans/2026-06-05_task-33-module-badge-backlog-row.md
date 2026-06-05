# Plan: Frontend — Module badge trong Backlog row

## Task ID: 33
## Mô tả
Thêm module badges vào Backlog row, hiển thị sau label badges và trước estimate block. Badges phân biệt workspace (indigo) và project (teal) modules qua màu sắc và icon.

## Files sẽ sửa
- `apps/frontend/src/app/tasks/pages/backlog/task-list/task-list.component.ts`

## Approach
1. Thêm block module badges sau label badges trong template `#rowContent`
2. Dùng `@if (displayProps.showModules && task.modules?.length)` để render có điều kiện
3. Hiển thị tối đa `displayProps.maxModules` badges
4. Badge workspace: border-indigo-300, bg-indigo-50, text-indigo-700, icon pi-globe
5. Badge project: border-teal-300, bg-teal-50, text-teal-700, icon pi-folder
6. Overflow `+N` với tooltip hiển thị tên các modules bị ẩn
7. Thêm helper method `hiddenModulesTooltip()` tương tự `hiddenLabelsTooltip()`

## Acceptance Criteria
- Module badges hiển thị khi `displayProps.showModules = true` và task có modules
- Tối đa `maxModules` badges được render
- Workspace modules có icon globe + màu indigo
- Project modules có icon folder + màu teal
- Overflow indicator +N hiển thị tooltip danh sách modules ẩn
- Frontend compile thành công

## Dependencies
- Task 25 (shared types TaskModuleRef) — ✓
- Task 28 (Backend include modules trong query) — ✓
