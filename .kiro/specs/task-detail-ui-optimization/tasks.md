# Implementation Plan: Task Detail UI Optimization

## Overview

Tối ưu hóa Task Detail UI theo mẫu tham khảo Plane — refactor `TaskDetailPanelComponent` thành container + nhiều child components, bổ sung backend API endpoints cho sub-items tree và activity filtering, và implement các tính năng mới: inline title editing, collapsible properties, sub-items với progress indicator, enhanced activity panel, inline property editing, responsive layout modes, metadata footer, và parent task navigation.

## Tasks

- [x] 1. Define shared TypeScript interfaces and data models
  - [x] 1.1 Create shared interfaces for Sub-Item Tree, Activity Filter, and Section Collapse State
    - Add `SubItemTreeNode`, `ActivityFilteredResponse`, `ActivityFilterType`, `SectionCollapseState`, `PropertySaveQueueItem`, `CreateSubItemDto` interfaces to shared-types
    - File: `libs/shared-types/src/` (new file or extend existing task interfaces)
    - _Requirements: 4.1, 4.2, 4.3, 5.1, 5.2, 6.2, 7.4_

- [x] 2. Implement backend API endpoints
  - [x] 2.1 Implement GET `/api/projects/:projectId/tasks/:taskId/children` endpoint
    - Create controller method, service method, and recursive query for hierarchical sub-items
    - Return `SubItemsTreeResponse` with `items`, `totalCount`, `doneCount`
    - Support `depth` query param (default: 5, max: 5)
    - _Requirements: 4.1, 4.2, 4.3_

  - [x] 2.2 Implement GET `/api/projects/:projectId/tasks/:taskId/activity` with filter support
    - Add `type` query param filter: `all | activity | comments | history`
    - Add pagination with `page` and `limit` params (default: page=1, limit=30)
    - Return `ActivityFilteredResponse` with `data`, `total`, `page`, `hasMore`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ]* 2.3 Write unit tests for children tree endpoint
    - Test recursive query with varying depths
    - Test `doneCount` calculation accuracy
    - Test depth limit enforcement
    - _Requirements: 4.1, 4.2, 4.3_

  - [ ]* 2.4 Write unit tests for activity filter endpoint
    - Test each filter type returns correct entry types
    - Test pagination behavior and `hasMore` flag
    - Test reverse chronological ordering
    - _Requirements: 5.2, 5.3, 5.4, 5.5_

- [x] 3. Checkpoint - Backend APIs verified
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Create core utility components and services
  - [x] 4.1 Create `RelativeTimePipe` standalone pipe
    - Implement relative time calculation with Vietnamese locale thresholds
    - Thresholds: <60s → "vài giây trước", <60min → "X phút trước", <24h → "X giờ trước", <30d → "X ngày trước", ≥30d → "dd/MM/yyyy"
    - File: `apps/frontend/src/app/tasks/components/task-detail-panel/pipes/relative-time.pipe.ts`
    - _Requirements: 1.9, 5.6, 5.7_

  - [ ]* 4.2 Write property test for RelativeTimePipe
    - **Property 1: Relative Time Threshold Correctness**
    - **Validates: Requirements 1.9**

  - [x] 4.3 Create `TaskDetailStateService` signal-based state service
    - Implement signals for: subItemsTree, activity entries/filter/pagination, sidebarExpanded, sectionCollapseState, savingFields
    - Inject `TaskStore` for core task state delegation
    - File: `apps/frontend/src/app/tasks/components/task-detail-panel/services/task-detail-state.service.ts`
    - _Requirements: 3.5, 3.7, 5.1, 6.2, 8.7_

  - [x] 4.4 Create `CollapsibleSectionComponent` standalone component
    - Implement expand/collapse toggle with chevron rotation animation
    - Support `sectionKey` for session storage persistence
    - Handle keyboard Enter/Space for accessibility
    - File: `apps/frontend/src/app/tasks/components/task-detail-panel/components/collapsible-section/`
    - _Requirements: 3.4, 3.5, 3.6, 3.7, 3.8_

  - [ ]* 4.5 Write property test for section collapse state persistence
    - **Property 3: Section Collapse State Persistence Round-Trip**
    - **Validates: Requirements 3.5, 3.7, 8.7**

- [x] 5. Implement Task Header and Title components
  - [x] 5.1 Create `TaskHeaderComponent` standalone component
    - Display task ID badge (monospace), state badge (colored dot + name), priority badge (colored)
    - Implement save status indicator: "Đang lưu..." (pulse), "✓ Đã lưu" (2000ms), "✗ Lỗi lưu" (3000ms)
    - Display relative time "Chỉnh sửa lần cuối..." using RelativeTimePipe
    - Implement clipboard copy on task ID click with success/error toast
    - File: `apps/frontend/src/app/tasks/components/task-detail-panel/components/task-header/`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9_

  - [x] 5.2 Create `TaskTitleInlineComponent` standalone component
    - Display title in text-2xl (full-page) / text-lg (drawer/popup) with emoji support
    - Switch to editable input on click, max 255 characters
    - Save on Enter/blur (if changed and non-empty), revert on Escape or empty
    - Handle server error with toast and revert
    - File: `apps/frontend/src/app/tasks/components/task-detail-panel/components/task-title-inline/`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [ ]* 5.3 Write property test for title save validation
    - **Property 2: Title Save Validation**
    - **Validates: Requirements 2.3, 2.4**

- [x] 6. Implement Sub-Items Section components
  - [x] 6.1 Create `SubItemProgressComponent` standalone component
    - SVG circular progress ring showing done/total ratio
    - Calculate percentage from direct children with state.group === 'completed'
    - File: `apps/frontend/src/app/tasks/components/task-detail-panel/components/sub-item-progress/`
    - _Requirements: 4.2_

  - [ ]* 6.2 Write property test for sub-item progress calculation
    - **Property 4: Sub-Item Progress Calculation**
    - **Validates: Requirements 4.2**

  - [x] 6.3 Create `SubItemTreeComponent` standalone component
    - Render hierarchical tree with indentation per nesting level (max depth 5)
    - Display each row: state icon, task ID, title (truncated), action icons
    - Support expand/collapse toggles per node (all expanded by default)
    - Implement drag-and-drop reordering within same level
    - File: `apps/frontend/src/app/tasks/components/task-detail-panel/components/sub-item-tree/`
    - _Requirements: 4.3, 4.4, 4.5, 4.7_

  - [ ]* 6.4 Write property test for tree depth constraint
    - **Property 5: Tree Depth Constraint**
    - **Validates: Requirements 4.3**

  - [x] 6.5 Create `SubItemQuickToolbarComponent` standalone component
    - Display toolbar with assignee selector, priority selector, due date picker
    - Show visual confirmation for selected values (avatar/initial, priority icon color)
    - File: `apps/frontend/src/app/tasks/components/task-detail-panel/components/sub-item-quick-toolbar/`
    - _Requirements: 7.1, 7.2, 7.3_

  - [x] 6.6 Create `SubItemsSectionComponent` container component
    - Header with "Sub-items" text + count badge + circular progress
    - Integrate SubItemTreeComponent and SubItemQuickToolbarComponent
    - Inline input for adding new sub-items (Enter to submit, Escape to dismiss)
    - Handle empty state with CTA
    - Wire creation API with toolbar selections
    - File: `apps/frontend/src/app/tasks/components/task-detail-panel/components/sub-items-section/`
    - _Requirements: 4.1, 4.6, 4.8, 4.9, 7.4, 7.5, 7.6_

  - [ ]* 6.7 Write property test for sub-item creation payload
    - **Property 8: Sub-Item Creation Payload Completeness**
    - **Validates: Requirements 7.4**

- [x] 7. Checkpoint - Sub-Items section verified
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement Activity Panel components
  - [x] 8.1 Create `StateTransitionComponent` standalone component
    - Visual from→to state badges with arrow, using project-defined colors
    - File: `apps/frontend/src/app/tasks/components/task-detail-panel/components/state-transition/`
    - _Requirements: 5.5, 5.6_

  - [x] 8.2 Create `ActivityEntryComponent` standalone component
    - Display: avatar (32px, initials fallback), username, action description, relative time
    - Integrate StateTransitionComponent for state_changed entries
    - File: `apps/frontend/src/app/tasks/components/task-detail-panel/components/activity-entry/`
    - _Requirements: 5.6, 5.7_

  - [x] 8.3 Create `ActivityPanelComponent` container component
    - Tab bar: "Tất cả", "Hoạt động", "Bình luận", "Lịch sử" (default: "Tất cả")
    - Infinite scroll loading (30 entries/batch)
    - Filter entries based on active tab
    - Show skeleton placeholders while loading, empty state per tab
    - Support "Properties" tab in drawer/popup mode
    - File: `apps/frontend/src/app/tasks/components/task-detail-panel/components/activity-panel/`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 8.2, 8.3_

  - [ ]* 8.4 Write property test for activity filter correctness
    - **Property 6: Activity Filter Correctness**
    - **Validates: Requirements 5.2, 5.3, 5.4, 5.5**

- [x] 9. Implement Properties Sidebar components
  - [x] 9.1 Create `InlinePropertyEditorComponent` standalone component
    - Support field types: dropdown (State, Priority), multi-select (Assignees, Labels, Modules), date picker (Start Date, Due Date), number input (Estimate: 0.5-100, step 0.5)
    - Implement debounced auto-save (500ms) with loading spinner per field
    - Handle error with revert and toast
    - Implement save queue for rapid edits on same field
    - File: `apps/frontend/src/app/tasks/components/task-detail-panel/components/inline-property-editor/`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [ ]* 9.2 Write property test for property save queue idempotence
    - **Property 7: Property Save Queue Idempotence**
    - **Validates: Requirements 6.2, 6.6**

  - [x] 9.3 Create `MetadataFooterComponent` standalone component
    - Display "Tạo lúc" (dd/MM/yyyy HH:mm) with creator name (truncated to 30 chars + ellipsis)
    - Display "Cập nhật lúc" (dd/MM/yyyy HH:mm)
    - Handle missing creator with "Người dùng không xác định"
    - File: `apps/frontend/src/app/tasks/components/task-detail-panel/components/metadata-footer/`
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [ ]* 9.4 Write property test for display name truncation
    - **Property 9: Display Name Truncation**
    - **Validates: Requirements 9.1**

  - [x] 9.5 Create `ParentNavigationComponent` standalone component
    - Display parent task ID + title + type icon as clickable link
    - "Không có" with "Thêm parent" link when no parent
    - Searchable dropdown with hierarchy-valid tasks only
    - Handle update API with success/error toast, revert on error
    - Support remove parent with confirm dialog
    - File: `apps/frontend/src/app/tasks/components/task-detail-panel/components/parent-navigation/`
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

  - [ ]* 9.6 Write property test for task hierarchy validation
    - **Property 10: Task Hierarchy Validation**
    - **Validates: Requirements 10.3**

  - [x] 9.7 Create `PropertiesSidebarComponent` container component
    - Group properties into "Chi tiết" and "Cấu trúc" collapsible sections
    - Integrate CollapsibleSectionComponent, InlinePropertyEditorComponent, MetadataFooterComponent, ParentNavigationComponent
    - Wire session storage persistence for collapse states
    - File: `apps/frontend/src/app/tasks/components/task-detail-panel/components/properties-sidebar/`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 6.5, 9.1, 10.1_

- [x] 10. Checkpoint - All child components verified
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Integrate into TaskDetailPanelComponent and implement layout modes
  - [x] 11.1 Modify `TaskService` to add `getSubItemsTree()` and `getActivityFiltered()` methods
    - Add HTTP methods calling the new backend endpoints
    - File: `apps/frontend/src/app/tasks/services/task.service.ts`
    - _Requirements: 4.1, 5.1_

  - [x] 11.2 Modify `TaskStore` to add sub-items signals and activity pagination signals
    - Add computed signals and effect for loading sub-items tree and activity data
    - File: `apps/frontend/src/app/tasks/store/task.store.ts`
    - _Requirements: 4.1, 4.2, 5.1, 5.2_

  - [x] 11.3 Refactor `TaskDetailPanelComponent` as orchestrating container
    - Wire all child components with proper Input/Output bindings
    - Implement two-column layout (full-page): main content left + sidebar right (320px fixed)
    - Implement single-column layout (drawer/popup): activity panel includes "Properties" tab
    - Implement sidebar toggle with 200ms animation
    - Preserve sidebar state across navigation within session
    - File: `apps/frontend/src/app/tasks/components/task-detail-panel/task-detail-panel.component.ts`
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_

  - [ ]* 11.4 Write integration tests for full layout flow
    - Test two-column layout rendering in full-page mode
    - Test single-column with Properties tab in drawer/popup mode
    - Test sidebar toggle animation and state persistence
    - Test inline property edit → API call → state update cycle
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_

- [x] 12. Final checkpoint - Full integration verified
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document (fast-check library, minimum 100 iterations)
- Unit tests validate specific examples and edge cases
- All components are standalone Angular components using Signals
- PrimeNG components used where applicable (p-tree, p-select, p-datePicker, etc.)
- Tailwind CSS 4 for layout and utility styling
- Vietnamese locale for all user-facing text

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "2.2", "4.1", "4.3"] },
    { "id": 2, "tasks": ["2.3", "2.4", "4.2", "4.4"] },
    { "id": 3, "tasks": ["4.5", "5.1", "5.2"] },
    { "id": 4, "tasks": ["5.3", "6.1", "6.3", "6.5"] },
    { "id": 5, "tasks": ["6.2", "6.4", "6.6"] },
    { "id": 6, "tasks": ["6.7", "8.1", "8.2"] },
    { "id": 7, "tasks": ["8.3", "9.1"] },
    { "id": 8, "tasks": ["8.4", "9.2", "9.3", "9.5"] },
    { "id": 9, "tasks": ["9.4", "9.6", "9.7"] },
    { "id": 10, "tasks": ["11.1", "11.2"] },
    { "id": 11, "tasks": ["11.3"] },
    { "id": 12, "tasks": ["11.4"] }
  ]
}
```
