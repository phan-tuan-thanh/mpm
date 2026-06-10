# Plan: Task 11.2 — Modify TaskStore to add sub-items signals and activity pagination signals

## Task ID
11.2

## Approach
Add methods to the existing `TaskStore` at `apps/frontend/src/app/tasks/state/task.store.ts` that:
1. `loadSubItemsTree(projectId, taskId)` — calls `taskService.getSubItemsTree()`, updates TaskDetailStateService signals
2. `loadActivity(projectId, taskId, filter, page)` — calls `taskService.getActivityFiltered()`, updates activity signals
3. `loadMoreActivity(projectId, taskId)` — appends next page to existing entries

The store delegates to the `TaskService` for HTTP calls and updates signals in the `TaskDetailStateService` (which is a component-level service). Since the TaskStore is root-level and TaskDetailStateService is component-level, the store methods will return observables/results that the caller can use to update signals, OR the store itself can accept a reference to update.

Looking at the existing pattern: the TaskStore directly updates its own signals. Since the sub-items and activity signals live in `TaskDetailStateService`, the store methods should update their own signals and the `TaskDetailStateService` can delegate to them via `computed()`.

**Better approach**: Add the sub-items and activity loading logic directly in the `TaskStore` with its own signals, since it's the global state manager. The `TaskDetailStateService` already delegates `task` and `saveStatus` from the store. We'll add sub-items and activity signals to the store, and the `TaskDetailStateService` will delegate via `computed()`.

## Files to modify
- `apps/frontend/src/app/tasks/state/task.store.ts` — Add methods and signals
- `apps/frontend/src/app/tasks/components/task-detail-panel/services/task-detail-state.service.ts` — Update to delegate from store

## Acceptance Criteria
- Requirements 4.1: Sub-items tree loaded hierarchically
- Requirements 4.2: Progress indicator data (totalCount, doneCount)
- Requirements 5.1: Activity loaded with filter support
- Requirements 5.2: Pagination with 30 entries/batch

## Dependencies
- Task 11.1 (TaskService methods) — ✅ Already completed
