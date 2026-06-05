# Plan: Task 2 — Drag toàn row

## Task ID
2. Drag toàn row — task-list.component.ts

## Approach
- Bỏ directive `cdkDragHandle` khỏi icon hamburger (template row content)
- Thêm class `cursor-grab active:cursor-grabbing` lên `<div cdkDrag>` (thay thế `cursor-pointer`)
- Giữ nguyên icon `pi pi-bars` như visual hint
- CDK 5px threshold mặc định đảm bảo click vẫn hoạt động

## Files sẽ sửa
- `apps/frontend/src/app/tasks/pages/backlog/task-list/task-list.component.ts`

## Acceptance Criteria (Req 1.1–1.6)
1. Drag gesture từ bất kỳ vùng nào trên row
2. Cursor: grab khi hover, grabbing khi drag
3. Click ngắn (< 5px) vẫn mở Task Detail Panel
4. Optimistic update thứ tự giữ nguyên
5. Icon hamburger vẫn hiển thị khi hover (visual hint only)
6. Drag chỉ khả dụng với SM/PO khi orderBy = Manual Rank (giữ nguyên `[cdkDropListDisabled]`)

## Dependencies
- Task 1.1, 1.2 (shared types) — đã hoàn thành ✓
