# Plan: Task 6.5 — Create SubItemQuickToolbarComponent

## Task ID: 6.5
## Task Name: Create SubItemQuickToolbarComponent standalone component

## Approach
Create a standalone Angular component that provides a compact toolbar with:
- Assignee selector (popover with member list)
- Priority selector (popover with priority options and colored icons)
- Due date picker (popover with PrimeNG DatePicker)

The toolbar uses icon-based trigger buttons that open popovers for selection.
Selected values are shown as visual confirmations (avatar/initial for assignee, colored icon for priority).

## Files to Create
- `apps/frontend/src/app/tasks/components/task-detail-panel/components/sub-item-quick-toolbar/sub-item-quick-toolbar.component.ts`
- `apps/frontend/src/app/tasks/components/task-detail-panel/components/sub-item-quick-toolbar/index.ts`

## Files to Modify
- `apps/frontend/src/app/tasks/components/task-detail-panel/components/index.ts` (add barrel export)

## Acceptance Criteria (from Requirements 7.1, 7.2, 7.3)
- 7.1: Show toolbar with assignee selector, priority selector, due date picker
- 7.2: Display member's avatar/initial next to assignee icon when selected
- 7.3: Display priority icon with corresponding color when selected

## Dependencies
- Shared types: `TaskPriority`, `MemberResponse` from `@mpm/shared-types`
- PrimeNG: PopoverModule, DatePickerModule, ButtonModule, InputTextModule, TooltipModule
