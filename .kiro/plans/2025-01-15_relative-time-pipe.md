# Plan: Task 4.1 — Create `RelativeTimePipe` standalone pipe

## Task ID
4.1

## Description
Implement a standalone Angular pipe `relativeTime` that converts a date to a Vietnamese locale relative time string, following specific thresholds defined in the design document.

## Approach
- Create a pure standalone pipe at the specified path
- Accept `Date | string | null | undefined` input
- Implement threshold-based relative time logic:
  - < 60s → "vài giây trước"
  - < 60min → "X phút trước"
  - < 24h → "X giờ trước"
  - < 30d → "X ngày trước"
  - ≥ 30d → "dd/MM/yyyy" absolute format
- Use Angular's built-in `formatDate` from `@angular/common` for absolute date (dd/MM/yyyy)
- Handle null/undefined gracefully (return empty string)

## Files to Create
- `apps/frontend/src/app/tasks/components/task-detail-panel/pipes/relative-time.pipe.ts`

## Acceptance Criteria (from Requirements 1.9, 5.6, 5.7)
- Relative time display with Vietnamese locale thresholds
- Correct threshold boundaries
- Graceful handling of null/undefined input
- Pure pipe (recalculated on input change)

## Dependencies
- None (no prior task dependencies for this task)
