# Plan: Task 4.3 — Create TaskDetailStateService

## Task ID
4.3

## Description
Create a signal-based state service scoped to the task detail panel that manages:
- Sub-items tree state (items, loading, counts)
- Activity state (entries, filter, pagination)
- Sidebar state (expanded, section collapse)
- Property saving state (savingFields)

Delegates core task state (currentTask, saveStatus) to the existing `TaskStore`.

## Approach
- Create a new `TaskDetailStateService` as an `@Injectable()` without `providedIn: 'root'`
- Use Angular Signals for reactive state management
- Inject the existing `TaskStore` (providedIn: 'root') for delegation
- Implement utility methods for toggling sidebar, sections, activity filter, and managing save fields
- Persist/restore collapse state from session storage

## Files to Create
- `apps/frontend/src/app/tasks/components/task-detail-panel/services/task-detail-state.service.ts`

## Acceptance Criteria (from Requirements)
- 3.5: Persist section collapse states in session storage
- 3.7: Restore persisted collapse states on initialization
- 5.1: Activity panel with tab/filter support
- 6.2: Property save within 500ms with loading state per field
- 8.7: Preserve sidebar state across navigation

## Dependencies
- Task 1.1 (shared types) — ✅ Done
- `TaskStore` exists at `apps/frontend/src/app/tasks/state/task.store.ts`
