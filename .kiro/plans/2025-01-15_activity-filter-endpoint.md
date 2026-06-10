# Plan: Task 2.2 — Implement GET `/api/projects/:projectId/tasks/:taskId/activity` with filter support

## Task ID
2.2

## Description
Add `type` query param filter to the existing activity endpoint, supporting `all | activity | comments | history` filter types, with pagination (`page`, `limit`) and returning `ActivityFilteredResponse`.

## Approach
- Modify the existing `GET :taskId/activity` endpoint in `TaskQueryController` to accept a `type` query param
- Extend `ActivityService.getTimeline()` to support filtering by entry type category
- Add a DTO with class-validator for query param validation
- Update the response shape to match `ActivityFilteredResponse` (data, total, page, hasMore)
- Default: `type=all`, `page=1`, `limit=30`

## Files to Create/Modify
1. **Create** `apps/backend/src/task/activity/dto/get-activity.dto.ts` — Query param DTO with validation
2. **Modify** `apps/backend/src/task/activity/activity.service.ts` — Add filter logic to `getTimeline()`
3. **Modify** `apps/backend/src/task/task-query.controller.ts` — Update endpoint to use DTO and pass filter type

## Acceptance Criteria (from Requirements 5.1–5.5)
- "Tất cả" tab: all entries, newest first, max 30 per page
- "Hoạt động" tab: system-generated entries only (state_changed, priority_changed, type_changed, parent_changed, estimate_changed, start_date_changed, due_date_changed, assignee_added, assignee_removed, label_added, label_removed, created, completed, reopened)
- "Bình luận" tab: comment_added, comment_edited, comment_deleted only
- "Lịch sử" tab: state_changed entries only
- Response includes `hasMore` = true if `(page * limit) < total`
- Results sorted by `createdAt` DESC (newest first)

## Dependencies
- Task 1.1 (shared types) — already completed ✅
