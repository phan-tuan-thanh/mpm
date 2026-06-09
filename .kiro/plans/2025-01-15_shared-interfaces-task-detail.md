# Task Plan: 1.1 Create shared interfaces for Sub-Item Tree, Activity Filter, and Section Collapse State

## Task Description
Add `SubItemTreeNode`, `ActivityFilteredResponse`, `ActivityFilterType`, `SectionCollapseState`, `PropertySaveQueueItem`, `CreateSubItemDto` interfaces to shared-types library.

## Technical Approach
- Create a new file `libs/shared-types/src/task-detail.types.ts` to house the new interfaces
- Import existing types (`TaskType`, `TaskPriority`, `TaskStateRef`, `TaskAssignee`, `TaskActivity`) from `task.types.ts`
- Export all new types from the barrel file `index.ts`
- Keep interfaces aligned with the design document data models

## Files to Create/Modify
1. **CREATE**: `libs/shared-types/src/task-detail.types.ts` — New interfaces
2. **MODIFY**: `libs/shared-types/src/index.ts` — Add exports for new types

## Acceptance Criteria
- `SubItemTreeNode` interface with all fields from design (id, taskId, title, type, priority, stateId, state, assignees, dueDate, children, childrenCount, doneCount, expanded)
- `ActivityFilteredResponse` interface with data, total, page, hasMore
- `ActivityFilterType` type alias for 'all' | 'activity' | 'comments' | 'history'
- `SectionCollapseState` interface with string index signature mapping to boolean
- `PropertySaveQueueItem` interface with field, value (unknown), timestamp
- `CreateSubItemDto` interface with title, parentId, and optional assigneeIds, priority, dueDate
- All types exported from barrel file
- No `any` usage (use `unknown` where needed)
- Strict TypeScript compatible

## Dependencies
- Wave 0: No dependencies — this is the foundational task
