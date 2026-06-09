# Plan: Task 8.2 — Create ActivityEntryComponent

## Task ID & Name
8.2 — Create `ActivityEntryComponent` standalone component

## Approach
Create a standalone Angular component that renders a single activity entry row with:
- Avatar (32px circular with initials fallback on colored background)
- Username (bold)
- Action description (varies by entry type)
- Relative time using RelativeTimePipe

For `state_changed` entries, integrate `StateTransitionComponent` to show from→to badges.

Since StateTransitionComponent (task 8.1) is also in progress but no files exist, I'll create it as a dependency.

## Files to Create/Modify
1. **CREATE** `apps/frontend/src/app/tasks/components/task-detail-panel/components/state-transition/state-transition.component.ts`
2. **CREATE** `apps/frontend/src/app/tasks/components/task-detail-panel/components/state-transition/index.ts`
3. **CREATE** `apps/frontend/src/app/tasks/components/task-detail-panel/components/activity-entry/activity-entry.component.ts`
4. **CREATE** `apps/frontend/src/app/tasks/components/task-detail-panel/components/activity-entry/index.ts`
5. **MODIFY** `apps/frontend/src/app/tasks/components/task-detail-panel/components/index.ts` — add exports

## Acceptance Criteria (from Requirements 5.6, 5.7)
- 5.6: State transition display with avatar (32px), username, "chuyển trạng thái sang [State]", Relative_Time, arrow from old→new state badges
- 5.7: Each entry shows user avatar (32px circular, first letter fallback), username, action description, Relative_Time

## Dependencies
- Task 4.1 (RelativeTimePipe) ✓ — already exists
- Task 8.1 (StateTransitionComponent) — will be created as part of this task
