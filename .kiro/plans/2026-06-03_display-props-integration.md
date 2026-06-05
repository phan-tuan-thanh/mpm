# Task 6: Tích hợp Display Properties Panel vào Backlog

## Task ID
6. Tích hợp Display Properties Panel vào Backlog

## Approach
1. **backlog-toolbar.component.ts**: Thêm nút "Display" với PrimeNG `Popover` chứa `DisplayPropertiesPanelComponent`. Thêm `@Input() displayProps` và `@Output() displayPropsChange` để bridge giữa panel và backlog.
2. **backlog.component.ts**: Thêm signal `displayProps` với localStorage persistence per-project. Method `updateDisplayProps()` merge patch vào signal và persist. Truyền `[displayProps]` xuống `<app-task-list>` và `<app-backlog-toolbar>`. Lắng nghe `(displayPropsChange)` từ toolbar.

## Files sẽ sửa
- `apps/frontend/src/app/tasks/pages/backlog/backlog-toolbar/backlog-toolbar.component.ts`
- `apps/frontend/src/app/tasks/pages/backlog/backlog.component.ts`

## Acceptance Criteria
- Req 3.6: Persist Display_Properties vào localStorage với key `display-props-{projectId}` — settings tồn tại sau khi reload trang
- Req 3.7: WHEN Display_Properties thay đổi, áp dụng ngay lập tức (không cần reload, không cần API call)

## Dependencies
- Task 4 (conditional render): ✅ done
- Task 5 (Display Properties Panel component): ✅ done
