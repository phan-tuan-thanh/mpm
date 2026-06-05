# Plan: Task 7 — Checkpoint Sprint 1

## Task ID
7. Checkpoint Sprint 1

## Approach
Build/compile verification checkpoint cho Sprint 1 (Backlog UI Improvements).
Không cần backend — chỉ verify frontend compiles và code đúng spec.

## Checklist

1. ✅ Verify file tồn tại:
   - `libs/shared-types/src/task.types.ts` — có `DisplayProperties`, `DEFAULT_DISPLAY_PROPS`, `LabelScope`, `Label.scope`
   - `task-list.component.ts` — có `cursor-grab`, không còn `cdkDragHandle`, label badges, conditional metadata
   - `display-properties-panel.component.ts` — tồn tại, có tất cả toggles
   - `backlog-toolbar.component.ts` — có nút Display + popover
   - `backlog.component.ts` — có `displayProps` signal + localStorage persistence

2. ✅ Angular build passes (`npx ng build --configuration=development`)
   - Build output: 2.25 MB initial, completed in 1.472s
   - Không có errors hay warnings

3. ⬜ Unit tests: Chưa có frontend spec files — không có test nào để chạy

## Kết quả

| Hạng mục | Kết quả |
|----------|---------|
| Build | ✅ Pass — không lỗi |
| shared-types | ✅ `DisplayProperties`, `DEFAULT_DISPLAY_PROPS`, `LabelScope`, `Label.scope` đều có |
| Drag toàn row | ✅ `cursor-grab active:cursor-grabbing` trên `cdkDrag`; không còn `cdkDragHandle` |
| Label badges | ✅ Badge mode + dot mode, overflow +N, `pi-globe` cho workspace, controlled bởi `displayProps` |
| Conditional metadata | ✅ `@if (displayProps.showX && ...)` cho tất cả fields |
| Display Properties Panel | ✅ Tồn tại, có ToggleSwitch cho tất cả properties + sub-options |
| Backlog toolbar integration | ✅ Nút "Display" + `p-popover` |
| Backlog persistence | ✅ Signal + localStorage (`display-props-{projectId}`) + fallback to DEFAULT |

## Lưu ý
- Runtime browser testing (drag behavior, click threshold 5px) không thể tự động — cần manual QA
- Chưa có unit tests cho frontend — không có regression test nào để chạy
