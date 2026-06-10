# Plan: Task 6.6 — Create SubItemsSectionComponent container component

## Task ID & Name
6.6 — Create `SubItemsSectionComponent` container component

## Approach
Create a container component that integrates SubItemProgressComponent, SubItemTreeComponent, and SubItemQuickToolbarComponent. The component manages:
1. Header with "Sub-items" text + count badge + circular progress ring
2. Tree rendering of sub-items
3. Inline input for adding new sub-items with toolbar
4. Empty state with CTA
5. Creation logic: gather title + toolbar selections → emit CreateSubItemDto

## Files to Create/Modify
- **Create**: `apps/frontend/src/app/tasks/components/task-detail-panel/components/sub-items-section/sub-items-section.component.ts`
- **Create**: `apps/frontend/src/app/tasks/components/task-detail-panel/components/sub-items-section/index.ts`
- **Modify**: `apps/frontend/src/app/tasks/components/task-detail-panel/components/index.ts` (add export)

## Acceptance Criteria (from requirements)
- 4.1: Header with "Sub-items" + count badge (total direct children)
- 4.6: "Thêm sub-item" button → inline input, Enter submits, Escape dismisses
- 4.8: Empty state with descriptive message and CTA button
- 4.9: Empty/whitespace title → dismiss without creating
- 7.4: Submit creates with all toolbar properties in single API call, then clears input/resets toolbar
- 7.5: Empty title → no creation request, keep toolbar state
- 7.6: API failure → error toast, preserve title and toolbar selections for retry

## Dependencies
- Task 6.3 (SubItemProgressComponent) ✓ exists
- Task 6.4 (SubItemTreeComponent) ✓ exists
- Task 6.5 (SubItemQuickToolbarComponent) ✓ exists

## Implementation Details
- Component inputs: items, totalCount, doneCount, members, projectId, taskId
- Component outputs: createSubItem (CreateSubItemDto), subItemClicked (string), reordered ({taskId, newIndex})
- Internal signals: isAddingMode, newTitle
- Tracks toolbar selections via event handlers from SubItemQuickToolbarComponent
- On Enter with valid title: builds CreateSubItemDto with toolbar values, emits, resets
- On Escape/blur-without-input: dismiss adding mode
- ViewChild reference to toolbar for reset()
