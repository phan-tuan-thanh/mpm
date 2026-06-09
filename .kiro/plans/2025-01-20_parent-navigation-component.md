# Plan: Task 9.5 - Create ParentNavigationComponent

## Task ID: 9.5
## Task Name: Create `ParentNavigationComponent` standalone component

## Approach
Create a standalone Angular component that:
1. Displays parent task info (ID + title + type icon) as clickable link when parent exists
2. Shows "Không có" with "Thêm parent" link when no parent
3. Provides searchable dropdown filtered by hierarchy-valid tasks only
4. Emits events for parent navigation and parent change (including removal)
5. Uses PrimeNG ConfirmationService for remove confirmation

## Files to Create
- `apps/frontend/src/app/tasks/components/task-detail-panel/components/parent-navigation/parent-navigation.component.ts`
- `apps/frontend/src/app/tasks/components/task-detail-panel/components/parent-navigation/parent-navigation.helpers.ts`
- `apps/frontend/src/app/tasks/components/task-detail-panel/components/parent-navigation/parent-navigation.component.spec.ts`
- `apps/frontend/src/app/tasks/components/task-detail-panel/components/parent-navigation/index.ts`

## Files to Modify
- `apps/frontend/src/app/tasks/components/task-detail-panel/components/index.ts` (add export)

## Acceptance Criteria (from Requirements 10.1-10.6)
- 10.1: Display parent task ID + title + type icon as clickable link
- 10.2: Clicking parent navigates to parent task's detail view
- 10.3: "Không có" with "Thêm parent" link, searchable dropdown with hierarchy-valid tasks
- 10.4: Selecting parent → emit parentChanged event (success toast handled by container)
- 10.5: API error → revert field (handled by container, component just emits)
- 10.6: Remove action → confirm dialog → emit parentChanged(null)

## Dependencies
- No blocking task dependencies (standalone component)
