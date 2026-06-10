# Plan: Task 11.1 — Modify TaskService to add getSubItemsTree() and getActivityFiltered()

## Task ID
11.1

## Approach
Add two new HTTP methods to the existing `TaskService` in the frontend that call the new backend endpoints:
1. `getSubItemsTree()` — calls `GET /api/projects/:projectId/tasks/:taskId/children?depth=X`
2. `getActivityFiltered()` — calls `GET /api/projects/:projectId/tasks/:taskId/activity?type=X&page=X&limit=X`

## Files to Modify
- `apps/frontend/src/app/tasks/services/task.service.ts` — add 2 new methods + imports

## Acceptance Criteria (from requirements)
- **4.1**: Sub-items tree data is fetched from backend via proper API call
- **5.1**: Activity panel data is fetched with filter support from backend

## Dependencies
- Task 1.1 (shared types) ✅ done
- Task 2.1 (children endpoint) ✅ done
- Task 2.2 (activity endpoint) ✅ done

## Implementation Details
- Import `SubItemsTreeResponse`, `ActivityFilteredResponse`, `ActivityFilterType` from `@mpm/shared-types`
- Use existing `HttpParams` pattern for query parameters
- Return `Observable<T>` (Angular convention)
- `getSubItemsTree`: optional `depth` param (default handled by backend)
- `getActivityFiltered`: optional `type`, `page`, `limit` params
