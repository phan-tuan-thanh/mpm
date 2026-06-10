# Plan: Task 6.1 — Create SubItemProgressComponent

## Task
- **ID:** 6.1
- **Name:** Create `SubItemProgressComponent` standalone component

## Approach
Create a lightweight SVG-based circular progress ring component that displays the done/total ratio of sub-items. The component takes `done` and `total` as direct inputs and renders:
- A gray background ring (remaining)
- A green filled arc proportional to the completion percentage
- Text showing "X/Y" ratio

## Files to Create/Modify
1. **CREATE** `apps/frontend/src/app/tasks/components/task-detail-panel/components/sub-item-progress/sub-item-progress.component.ts`
2. **CREATE** `apps/frontend/src/app/tasks/components/task-detail-panel/components/sub-item-progress/sub-item-progress.component.spec.ts`
3. **CREATE** `apps/frontend/src/app/tasks/components/task-detail-panel/components/sub-item-progress/index.ts`
4. **MODIFY** `apps/frontend/src/app/tasks/components/task-detail-panel/components/index.ts` (add export)

## Acceptance Criteria (from Requirement 4.2)
- Display a circular Progress_Indicator showing done/total ratio
- Colored ring whose filled arc is proportional to the completion percentage
- Show text like "2/5 Done" or "X/Y" near/in the ring

## Design Notes
- SVG `<circle>` with `stroke-dasharray` for the progress arc
- Rotate SVG -90deg to start arc from top
- Ring size: 24-32px diameter (small, fits in section headers)
- Colors: green (#22C55E) for filled, gray for remaining
- Handle edge case: total=0 → show empty ring

## Dependencies
- None (this is a leaf component with no dependencies on other tasks)
