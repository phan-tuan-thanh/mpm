# Plan: Task 34 — Display Properties Panel: thêm Modules toggle

## Task ID
34. Frontend — Display Properties Panel: thêm Modules toggle

## Approach
Component `display-properties-panel.component.ts` đã có Modules toggle + sub-option Max (1–3) từ Task 5. Tuy nhiên, hiện tại sub-options bị ẩn hoàn toàn khi `showModules = false` (dùng `@if`). Task này yêu cầu sub-options hiển thị luôn nhưng ở trạng thái **disabled** khi toggle tắt.

## Changes
- `apps/frontend/src/app/tasks/pages/backlog/backlog-toolbar/display-properties-panel.component.ts`:
  - Thay `@if (displayProps.showModules)` bằng hiển thị luôn sub-options
  - Thêm `[disabled]="!displayProps.showModules"` vào `p-inputnumber`
  - Thêm `opacity-50` class khi disabled để visual cue

## Acceptance Criteria (from Requirement 3.4)
- Toggle "Modules" bật/tắt `showModules`
- Sub-option "Max" (1–3) hiển thị luôn
- Sub-option disabled khi `showModules = false`

## Dependencies
- Task 5 (Display Properties Panel creation) — ✅ đã hoàn thành
