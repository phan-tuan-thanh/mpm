# Plan: Task 5.1 — Create TaskHeaderComponent

## Task
- **ID:** 5.1
- **Name:** Create `TaskHeaderComponent` standalone component
- **Requirements:** 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9

## Approach

Create a standalone Angular component that displays:
1. Task ID badge (monospace, clickable → clipboard copy)
2. State badge (colored dot + name from TaskStateRef.color)
3. Priority badge (colored by level)
4. Save status indicator with animations and timed auto-hide
5. Relative time "Chỉnh sửa lần cuối..." using RelativeTimePipe

## Files to Create/Modify
- **Create:** `apps/frontend/src/app/tasks/components/task-detail-panel/components/task-header/task-header.component.ts`
- **Create:** `apps/frontend/src/app/tasks/components/task-detail-panel/components/task-header/task-header.component.spec.ts`
- **Modify:** `apps/frontend/src/app/tasks/components/task-detail-panel/components/index.ts` (add export)

## Acceptance Criteria
- 1.1: Task ID displayed as clickable monospace badge, first element in header
- 1.2: Click copies to clipboard + success toast (1500ms, top-right)
- 1.3: Clipboard error → error toast
- 1.4: State badge with colored dot + state name (TaskStateRef.color)
- 1.5: Priority badge colored next to state badge
- 1.6: "Đang lưu..." with pulse animation while saving
- 1.7: "✓ Đã lưu" shown for 2000ms then hide
- 1.8: "✗ Lỗi lưu" shown for 3000ms then hide
- 1.9: "Chỉnh sửa lần cuối X" using RelativeTimePipe

## Dependencies
- Task 4.1 (RelativeTimePipe) ✅ Done
- Task 4.3 (TaskDetailStateService) ✅ Done
