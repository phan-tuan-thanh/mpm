# Plan: Task 5.2 — Create TaskTitleInlineComponent

## Task ID & Name
- **ID:** 5.2
- **Name:** Create `TaskTitleInlineComponent` standalone component

## Approach
Create a standalone Angular component that displays a task title with two modes:
1. **Display mode**: Shows title as text with appropriate font size based on viewMode
2. **Edit mode**: Shows an input field activated on click, with Enter/blur to save, Escape to revert

## Files to Create
- `apps/frontend/src/app/tasks/components/task-detail-panel/components/task-title-inline/task-title-inline.component.ts`
- `apps/frontend/src/app/tasks/components/task-detail-panel/components/task-title-inline/task-title-inline.component.spec.ts`
- `apps/frontend/src/app/tasks/components/task-detail-panel/components/task-title-inline/index.ts`

## Files to Modify
- `apps/frontend/src/app/tasks/components/task-detail-panel/components/index.ts` (add export)

## Acceptance Criteria (from Requirements 2.1–2.6)
- 2.1: Display title in text-2xl (full-page) / text-lg (drawer/popup) with emoji support
- 2.2: On click, switch to inline editable input preserving font size, max 255 characters
- 2.3: On Enter or blur, if trimmed value differs from original and is non-empty, save
- 2.4: If trimmed title is empty/whitespace-only after editing, revert without saving
- 2.5: On Escape, discard changes and revert without saving
- 2.6: Component emits titleSaved — parent handles API call and error

## Dependencies
- None (first component in this wave)
