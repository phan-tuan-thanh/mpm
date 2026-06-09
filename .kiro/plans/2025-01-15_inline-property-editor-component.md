# Plan: Task 9.1 — Create InlinePropertyEditorComponent

## Task ID: 9.1
## Task Name: Create `InlinePropertyEditorComponent` standalone component

## Approach

Create a configurable inline property editor component that renders the appropriate PrimeNG editor based on field type. The component encapsulates debounced auto-save logic (500ms), loading spinner per field, error handling with revert, and save queue for rapid edits.

## Files to Create

1. `apps/frontend/src/app/tasks/components/task-detail-panel/components/inline-property-editor/inline-property-editor.component.ts` — Main component
2. `apps/frontend/src/app/tasks/components/task-detail-panel/components/inline-property-editor/property-save-queue.ts` — Save queue utility class
3. `apps/frontend/src/app/tasks/components/task-detail-panel/components/inline-property-editor/index.ts` — Barrel export

## Files to Modify

1. `apps/frontend/src/app/tasks/components/task-detail-panel/components/index.ts` — Add export

## Acceptance Criteria (from Requirements 6.x)

- 6.1: Support field types: dropdown (State/Priority), multi-select (Assignees/Labels/Modules), date picker (Start/Due Date), number input (Estimate 0.5-100 step 0.5)
- 6.2: Persist change to server within 500ms of completing edit, without save button
- 6.3: Show loading spinner on specific field being saved, disable until complete/fail
- 6.4: On error: revert field to previous value and display error toast
- 6.5: Display "Created" and "Updated" timestamps at bottom in dd/MM/yyyy HH:mm (handled by MetadataFooter)
- 6.6: If user modifies field while save in progress, queue new value and send after current save completes

## Dependencies

- Task 4.3 (TaskDetailStateService) ✅ Done
- Task 4.4 (CollapsibleSectionComponent) ✅ Done
- PrimeNG: SelectModule, MultiSelectModule, DatePickerModule, InputNumberModule
