# Plan: Task 2.1 — Implement GET `/api/projects/:projectId/tasks/:taskId/children`

## Task ID & Name
- **ID:** 2.1
- **Name:** Implement GET `/api/projects/:projectId/tasks/:taskId/children` endpoint

## Approach
Add a new endpoint to the existing `TaskQueryController` that returns hierarchical sub-items for a given task. The implementation follows the existing pattern of controller → TaskService (facade) → TaskQueryService (actual logic).

The recursive query will use a PostgreSQL recursive CTE to efficiently fetch all descendants up to the specified depth, then build the tree structure in-memory.

## Files to Create/Modify
1. **Modify:** `apps/backend/src/task/task-query.controller.ts` — Add `getChildren` endpoint
2. **Modify:** `apps/backend/src/task/task-query.service.ts` — Add `getChildrenTree` method with recursive query
3. **Modify:** `apps/backend/src/task/task.service.ts` — Add `getChildrenTree` delegation method

## Acceptance Criteria (from Requirements 4.1, 4.2, 4.3)
- Return `SubItemsTreeResponse` with `items`, `totalCount`, `doneCount`
- `totalCount` = number of direct children (not nested descendants)
- `doneCount` = direct children whose state.group === 'completed'
- Support `depth` query param (default: 5, max: 5)
- Each node includes: id, taskId, title, type, priority, stateId, state, assignees, dueDate, children, childrenCount, doneCount

## Dependencies
- Task 1.1 (shared types) — ✅ Already completed

## Implementation Details
- Use PostgreSQL recursive CTE for efficient depth-limited tree traversal
- Map raw SQL results to `SubItemTreeNode` interface
- Calculate `childrenCount` and `doneCount` per node based on descendants
- Limit depth at query level for performance
