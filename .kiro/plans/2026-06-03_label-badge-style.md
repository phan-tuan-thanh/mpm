# Task 3: Label Badge Style — task-list.component.ts

## Task ID
3. Label badge style — task-list.component.ts

## Approach
Thay thế block label rendering hiện tại (4 dòng: @for + span) bằng một block mới hỗ trợ:
- Badge mode: inline-flex, dot màu, tên (truncate 80px), border + background bán trong suốt
- Workspace label: icon pi-globe thay dot
- Overflow +N với tooltip
- Dot mode: chỉ 8px dots (w-2 h-2 rounded-full) với tooltip
- Controlled bởi displayProps.labelMode, maxLabels, alwaysShowLabels
- Wrap toàn bộ bằng @if (displayProps.showLabels)

## Files sẽ sửa
- `apps/frontend/src/app/tasks/pages/backlog/task-list/task-list.component.ts`
  - Thêm `@Input() displayProps` (import DisplayProperties, DEFAULT_DISPLAY_PROPS)
  - Thay thế label block trong template
  - Thêm helper methods cho label rendering

## Acceptance Criteria (từ Requirements 2.1–2.6)
- [x] 2.1: Badge với dot màu, tên truncate 80px, border + bg bán trong suốt
- [x] 2.2: +N indicator khi labels > maxLabels, tooltip liệt kê hidden labels
- [x] 2.3: Dot mode (8px dots, no name, tooltip = label name)
- [x] 2.4: Workspace label (scope='workspace') hiển thị pi-globe thay dot
- [x] 2.5: alwaysShowLabels=true → always visible
- [x] 2.6: alwaysShowLabels=false → ẩn khi không hover (show-on-hover)

## Dependencies
- Task 1.1 (DisplayProperties interface) — ✅ completed
- Task 1.2 (Label scope field) — ✅ completed
