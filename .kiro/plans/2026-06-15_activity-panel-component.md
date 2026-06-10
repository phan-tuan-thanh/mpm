# Task 8.3: Create ActivityPanelComponent container component

## Task ID: 8.3
## Description
Create the `ActivityPanelComponent` — a container component that integrates ActivityEntryComponent with a tabbed interface, infinite scroll loading, skeleton placeholders, and empty states.

## Approach
- Create standalone Angular component with tab bar using simple button tabs
- Implement IntersectionObserver for infinite scroll (sentinel element at bottom)
- Filter entries based on active tab using ActivityFilterType
- Show skeleton placeholders while loading (3-5 rows using p-skeleton)
- Show empty state with icon + message per tab
- Support "Properties" tab in drawer/popup mode (content projected via ng-content)

## Files to Create
- `apps/frontend/src/app/tasks/components/task-detail-panel/components/activity-panel/activity-panel.component.ts`
- `apps/frontend/src/app/tasks/components/task-detail-panel/components/activity-panel/index.ts`

## Files to Modify
- `apps/frontend/src/app/tasks/components/task-detail-panel/components/index.ts` (add export)

## Acceptance Criteria (from requirements)
- 5.1: Tab bar with "Tất cả", "Hoạt động", "Bình luận", "Lịch sử" — "Tất cả" default
- 5.2: "Tất cả" tab shows all entries reverse chronological, 30 entries initially, load more on scroll
- 5.3: "Hoạt động" tab shows system-generated only
- 5.4: "Bình luận" tab shows comments with edit/delete
- 5.5: "Lịch sử" tab shows state transitions
- 5.8: Skeleton placeholders while loading
- 5.9: Empty state with icon + message per tab
- 8.2: In drawer/popup mode, add "Properties" tab
- 8.3: In popup mode, same as drawer — single-column with "Properties" tab

## Dependencies
- Task 8.1: StateTransitionComponent ✅
- Task 8.2: ActivityEntryComponent ✅
- Task 4.1: RelativeTimePipe ✅
- Task 4.3: TaskDetailStateService ✅
