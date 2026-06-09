# Plan: Task 4.4 — Create CollapsibleSectionComponent

## Task ID
4.4

## Description
Create a reusable `CollapsibleSectionComponent` standalone Angular component that provides expand/collapse functionality with chevron rotation animation, session storage persistence support, and keyboard accessibility.

## Approach
- Create a standalone Angular component with `@Input()` for title, sectionKey, expanded state
- Use `@Output()` expandedChange for two-way binding pattern with parent
- Implement chevron icon rotation using Tailwind CSS transition classes
- Add keyboard accessibility with tabindex, role="button", aria-expanded
- Support Enter/Space key toggling
- Content projection via `<ng-content>`

## Files to Create/Modify
- `apps/frontend/src/app/tasks/components/task-detail-panel/components/collapsible-section/collapsible-section.component.ts` (NEW)
- `apps/frontend/src/app/tasks/components/task-detail-panel/components/collapsible-section/index.ts` (NEW barrel)
- `apps/frontend/src/app/tasks/components/task-detail-panel/components/index.ts` (MODIFY - add export)

## Acceptance Criteria (from Requirements)
- 3.4: Toggle collapsed/expanded on header click, chevron rotates to indicate state
- 3.5: Support receiving persisted collapse state via `expanded` input
- 3.6: Default to expanded (handled by parent, component just respects input)
- 3.7: Emit expandedChange for parent to persist in session storage
- 3.8: Keyboard Enter/Space toggles section when header has focus

## Dependencies
- Task 4.3 (TaskDetailStateService) — completed ✓
- PrimeIcons for chevron icon
- Tailwind CSS 4 for styling and transitions
