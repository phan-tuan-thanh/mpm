# Plan: Task 8.1 — Create StateTransitionComponent

## Task
- **ID**: 8.1
- **Name**: Create `StateTransitionComponent` standalone component

## Approach
Create a simple standalone Angular component that displays a visual from→to state transition using color-coded badges with an arrow between them. This is a pure display component used in the Activity Panel's history tab.

## Files to Create
- `apps/frontend/src/app/tasks/components/task-detail-panel/components/state-transition/state-transition.component.ts`
- `apps/frontend/src/app/tasks/components/task-detail-panel/components/state-transition/state-transition.component.spec.ts`
- `apps/frontend/src/app/tasks/components/task-detail-panel/components/state-transition/index.ts`

## Files to Modify
- `apps/frontend/src/app/tasks/components/task-detail-panel/components/index.ts` — add export

## Acceptance Criteria (from Requirements 5.5, 5.6)
- Visual from→to state badges with arrow
- Color-coded badges matching project-defined state colors (TaskStateRef.color)
- Each badge shows colored dot + state name, background with 10% opacity of state color
- Arrow: "→" character between badges
- Compact design for fitting in activity entry rows

## Dependencies
- None (standalone display component)
