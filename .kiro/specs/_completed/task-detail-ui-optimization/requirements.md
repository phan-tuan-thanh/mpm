# Requirements Document

## Introduction

Tối ưu hóa giao diện Task Detail UI theo mẫu tham khảo từ Plane — một ứng dụng quản lý dự án hiện đại. Mục tiêu là cải thiện trải nghiệm xem và chỉnh sửa chi tiết task với layout trực quan hơn, bổ sung các phần tử UI thiếu (sub-work items với progress indicator, activity history với state transition, collapsible properties sections), và cải thiện luồng tương tác cho chế độ full-page.

## Glossary

- **Task_Detail_Panel**: Component hiển thị chi tiết một task, hỗ trợ 3 chế độ xem (right-pane, popup, full-page)
- **Properties_Sidebar**: Panel bên phải trong chế độ full-page hiển thị các thuộc tính task (state, priority, assignees, labels, modules, dates)
- **Sub_Items_Section**: Khu vực hiển thị danh sách các task con dưới dạng cây phân cấp (tree)
- **Activity_Panel**: Khu vực hiển thị lịch sử hoạt động và bình luận của task
- **State_Transition**: Biểu diễn trực quan sự chuyển đổi trạng thái của task (ví dụ: "Backlog → Todo")
- **Progress_Indicator**: Vòng tròn hoặc thanh hiển thị tiến độ hoàn thành sub-items (ví dụ: "2/5 Done")
- **Collapsible_Section**: Nhóm thuộc tính có thể thu gọn/mở rộng bằng click vào header
- **Relative_Time**: Hiển thị thời gian dạng tương đối (ví dụ: "3 ngày trước", "2 giờ trước")
- **Task_Header**: Khu vực header của task detail chứa Task ID, trạng thái lưu, và các nút điều khiển
- **Inline_Edit**: Chỉnh sửa trực tiếp tại chỗ (in-place) mà không cần mở form riêng

## Requirements

### Requirement 1: Task Header Optimization

**User Story:** As a developer, I want to see the task ID prominently with quick-copy functionality and a status badge inline, so that I can quickly identify and reference the task.

#### Acceptance Criteria

1. THE Task_Header SHALL display the task ID (e.g., "PROJ-6") as a clickable badge with monospace font styling, positioned as the first element in the header row
2. WHEN the task ID badge is clicked, THE Task_Detail_Panel SHALL copy the task ID text to the system clipboard and display a success toast notification (severity: success, duration: 1500ms, position: top-right) confirming the copy
3. IF the clipboard write operation fails (e.g., browser permission denied), THEN THE Task_Detail_Panel SHALL display an error toast notification indicating the copy failed
4. THE Task_Header SHALL display the current task state as a colored badge using the color value from the project's state configuration (`TaskStateRef.color`), with a dot indicator preceding the state name, positioned next to the task ID
5. THE Task_Header SHALL display the task priority as a colored badge next to the state badge, using a distinct color per priority level (urgent, high, medium, low, none)
6. WHILE the task save status is "saving", THE Task_Header SHALL display a "Đang lưu..." text indicator with a pulse animation adjacent to the task ID badge
7. WHEN the task save status transitions to "saved", THE Task_Header SHALL display a "✓ Đã lưu" confirmation indicator for 2000ms before hiding
8. WHEN the task save status transitions to "error", THE Task_Header SHALL display a "✗ Lỗi lưu" error indicator for 3000ms before hiding
9. THE Task_Header SHALL display a "Last edited" timestamp in relative time format (e.g., "Chỉnh sửa lần cuối 3 ngày trước") based on the task's `updatedAt` field, using thresholds: "vài giây trước" for under 60 seconds, minutes/hours/days for up to 30 days, and absolute date format (dd/MM/yyyy) for older than 30 days

### Requirement 2: Task Title with Inline Editing

**User Story:** As a developer, I want to edit the task title inline with a large, prominent font, so that I can quickly update it without navigating away.

#### Acceptance Criteria

1. THE Task_Detail_Panel SHALL display the task title in a large font (text-2xl in full-page, text-lg in drawer/popup) with support for emoji characters
2. WHEN the user clicks on the title, THE Task_Detail_Panel SHALL switch to an inline editable input field that preserves the same font size and constrains input to a maximum of 255 characters
3. WHEN the user presses Enter or the title input loses focus and the trimmed title value differs from the original title and is not empty (whitespace-only is treated as empty), THE Task_Detail_Panel SHALL save the updated title to the server
4. IF the trimmed title is empty or contains only whitespace after editing, THEN THE Task_Detail_Panel SHALL revert to the previous title value without saving
5. WHEN the user presses the Escape key while the title input is focused, THE Task_Detail_Panel SHALL discard any changes and revert the input to the previous title value without saving
6. IF the server returns an error when saving the title, THEN THE Task_Detail_Panel SHALL display an error toast notification, revert the displayed title to the previous value, and preserve the previous title so the user can retry editing

### Requirement 3: Collapsible Properties Sections

**User Story:** As a developer, I want task properties organized in collapsible sections, so that I can focus on relevant information and reduce visual clutter.

#### Acceptance Criteria

1. THE Properties_Sidebar SHALL group properties into collapsible sections: "Chi tiết" (Details) and "Cấu trúc" (Structure)
2. THE "Chi tiết" Collapsible_Section SHALL contain: State, Priority, Assignees, Start Date, Due Date, Estimate fields
3. THE "Cấu trúc" Collapsible_Section SHALL contain: Parent task, Labels, Modules fields
4. WHEN a section header is clicked, THE Properties_Sidebar SHALL toggle the section between collapsed and expanded states, where collapsed hides all field content within the section while keeping the section header visible, and a directional chevron icon on the header SHALL rotate to indicate the current state
5. IF persisted collapse state exists for the current browser session, THEN THE Properties_Sidebar SHALL restore the persisted collapse states instead of the default expanded state
6. IF no persisted collapse state exists (first visit in the browser session or after session storage is cleared), THEN THE Properties_Sidebar SHALL display all sections expanded by default
7. THE Properties_Sidebar SHALL persist section collapse states in session storage, where "current session" is defined as the lifetime of the browser tab
8. WHEN a section header receives keyboard focus and the user presses Enter or Space, THE Properties_Sidebar SHALL toggle the section between collapsed and expanded states

### Requirement 4: Sub-Items Section with Progress Indicator

**User Story:** As a project manager, I want to see sub-work items with a clear progress indicator and tree hierarchy, so that I can track work breakdown completion at a glance.

#### Acceptance Criteria

1. THE Sub_Items_Section SHALL display a header with the text "Sub-items" followed by a count badge showing the total number of direct children (not counting nested descendants)
2. THE Sub_Items_Section SHALL display a circular Progress_Indicator showing the ratio of sub-items in a "Done" state versus total direct children (e.g., "2/5 Done") with a colored ring whose filled arc is proportional to the completion percentage
3. THE Sub_Items_Section SHALL render sub-items as a hierarchical tree with consistent indentation per nesting level, supporting a maximum depth of 5 levels (parent → child → grandchild → etc.)
4. WHEN a sub-item has children, THE Sub_Items_Section SHALL display an expand/collapse toggle arrow before the item, with all nodes expanded by default on initial load
5. THE Sub_Items_Section SHALL display each sub-item row with: a state icon (colored dot matching the item's workflow state), task ID, title (truncated with ellipsis if exceeding the available row width), and inline action icons for assignee, priority, and due date
6. WHEN the "Thêm sub-item" button is clicked, THE Sub_Items_Section SHALL display an inline input field at the bottom of the list containing a title text input (maximum 255 characters) that submits on Enter key press and dismisses on Escape key press or blur without input
7. THE Sub_Items_Section SHALL support drag-and-drop reordering of sub-items within the same hierarchical level, displaying a visual drop-position indicator during the drag operation
8. IF the current work item has no sub-items, THEN THE Sub_Items_Section SHALL display an empty state with a descriptive message and the "Thêm sub-item" button as a call-to-action
9. IF the inline sub-item title input is submitted with an empty or whitespace-only value, THEN THE Sub_Items_Section SHALL dismiss the input field without creating a sub-item

### Requirement 5: Enhanced Activity Panel with Tabs and State Transitions

**User Story:** As a team member, I want to see task activity organized in tabs with visual state transitions, so that I can quickly understand the task's history and progression.

#### Acceptance Criteria

1. THE Activity_Panel SHALL display a tab bar with the following tabs: "Tất cả" (All), "Hoạt động" (Activity), "Bình luận" (Comments), "Lịch sử" (History), with the "Tất cả" tab selected by default when the panel is opened
2. THE "Tất cả" tab SHALL display all activity entries in reverse chronological order (newest first), loading a maximum of 30 entries initially and loading additional entries in batches of 30 as the user scrolls to the bottom
3. THE "Hoạt động" tab SHALL display only system-generated activity entries (state changes, field updates, assignments) in reverse chronological order
4. THE "Bình luận" tab SHALL display only user comments with inline editing and deletion capabilities; the user SHALL be able to edit and delete only their own comments, and users with Admin or Scrum_Master role SHALL be able to delete any comment
5. THE "Lịch sử" tab SHALL display state transition entries with visual indicators showing the from-state and to-state (e.g., "Backlog → Todo") using color-coded badges matching the project-defined state colors
6. WHEN a state transition is displayed, THE Activity_Panel SHALL show the transition as: user avatar (32px), username, "chuyển trạng thái sang [State]", Relative_Time, and a visual arrow from old state badge to new state badge with their respective project-defined colors
7. THE Activity_Panel SHALL display each entry with: user avatar (32px circular, or first letter of display name as fallback on colored background), username, action description, and Relative_Time
8. WHILE activity entries are being loaded, THE Activity_Panel SHALL display skeleton placeholders in place of the entry list
9. IF a tab contains no entries, THEN THE Activity_Panel SHALL display an empty state with an icon and a descriptive message indicating no activity exists for the selected filter

### Requirement 6: Inline Property Editing in Sidebar

**User Story:** As a developer, I want to edit task properties directly in the sidebar without opening separate dialogs, so that I can quickly update task attributes.

#### Acceptance Criteria

1. THE Properties_Sidebar SHALL allow Inline_Edit for all property fields: dropdown selection for State and Priority, multi-select for Assignees, Labels, and Modules, date picker for Start Date and Due Date, and number input for Estimate (accepting values from 0.5 to 100 in increments of 0.5)
2. WHEN a property value is changed, THE Properties_Sidebar SHALL persist the change to the server within 500 milliseconds of the user completing the edit, without requiring a save button
3. WHEN a property is being saved, THE Properties_Sidebar SHALL display a loading spinner on the specific field being saved and disable that field until the save completes or fails
4. IF the server returns an error during save, THEN THE Properties_Sidebar SHALL revert the field to its previous value and display an error toast notification
5. THE Properties_Sidebar SHALL display "Created" and "Updated" timestamps at the bottom in the format "dd/MM/yyyy HH:mm"
6. IF the user modifies a field while a previous save for that same field is still in progress, THEN THE Properties_Sidebar SHALL queue the new value and send it to the server after the current save completes or fails

### Requirement 7: Sub-Item Quick Actions Toolbar

**User Story:** As a developer, I want a quick-action toolbar when adding sub-items, so that I can set initial properties (assignee, priority) without opening the new item after creation.

#### Acceptance Criteria

1. WHEN the inline sub-item input field is displayed, THE Sub_Items_Section SHALL display a toolbar below the title input with action icons: assignee selector (showing project members), priority selector (with options: urgent, high, medium, low, none), and due date picker (in dd/MM/yyyy format)
2. WHEN an assignee is selected from the toolbar, THE Sub_Items_Section SHALL display the selected member's avatar or initial next to the assignee icon as visual confirmation, and assign that member to the new sub-item upon creation
3. WHEN a priority is selected from the toolbar, THE Sub_Items_Section SHALL display the selected priority icon with its corresponding color as visual confirmation, and set the selected priority on the new sub-item upon creation
4. WHEN the user submits the new sub-item (pressing Enter or clicking a create button) with a non-empty title (at least 1 non-whitespace character), THE Sub_Items_Section SHALL create the sub-item with all selected toolbar properties in a single API call, then clear the input field and reset toolbar selections to defaults (no assignee, priority "none", no due date)
5. IF the title input is empty or contains only whitespace when the user attempts to submit, THEN THE Sub_Items_Section SHALL not send a creation request and SHALL keep the toolbar and input field in their current state
6. IF the sub-item creation API call fails, THEN THE Sub_Items_Section SHALL display an error toast notification, preserve the entered title and all toolbar selections, and allow the user to retry submission

### Requirement 8: Responsive Layout Modes

**User Story:** As a developer, I want the task detail to adapt its layout based on the viewing mode (full-page, drawer, popup), so that I can use the optimal layout for my screen size and context.

#### Acceptance Criteria

1. WHILE in full-page mode, THE Task_Detail_Panel SHALL display a two-column layout with main content area (left) and Properties_Sidebar (right, fixed 320px width), where the main content area fills the remaining available width
2. WHILE in drawer mode (right-pane), THE Task_Detail_Panel SHALL display a single-column layout with a "Properties" tab added to the Activity_Panel tab bar, containing all property fields from the Properties_Sidebar
3. WHILE in popup mode, THE Task_Detail_Panel SHALL display a single-column layout with a "Properties" tab added to the Activity_Panel tab bar, containing all property fields from the Properties_Sidebar
4. WHILE in full-page mode, WHEN the sidebar toggle button is clicked, THE Task_Detail_Panel SHALL animate the Properties_Sidebar open/close over a duration of 200ms with the content area expanding to fill the space vacated by the sidebar
5. WHILE in full-page mode, THE Task_Detail_Panel SHALL display the Properties_Sidebar in the expanded (open) state by default
6. WHILE in drawer mode or popup mode, THE Task_Detail_Panel SHALL hide the sidebar toggle button
7. THE Task_Detail_Panel SHALL preserve the sidebar collapsed/expanded state across navigation within the same session

### Requirement 9: Metadata Footer Display

**User Story:** As a team member, I want to see creation and last-update metadata at the bottom of the properties panel, so that I can understand the task's lifecycle timeline.

#### Acceptance Criteria

1. THE Properties_Sidebar SHALL display a metadata footer section positioned below all property sections, containing "Tạo lúc" (Created at) with the creation timestamp in format "dd/MM/yyyy HH:mm" and the creator's display name (truncated to 30 characters with ellipsis if longer)
2. THE Properties_Sidebar SHALL display "Cập nhật lúc" (Updated at) with the last modification timestamp in format "dd/MM/yyyy HH:mm" in the metadata footer section
3. IF the task has never been modified after creation, THEN THE Properties_Sidebar SHALL display the "Cập nhật lúc" value equal to the "Tạo lúc" value
4. IF the creator account no longer exists, THEN THE Properties_Sidebar SHALL display "Người dùng không xác định" in place of the creator name
5. WHEN the task data is refreshed, THE Properties_Sidebar SHALL update the "Cập nhật lúc" timestamp to reflect the latest value from the server

### Requirement 10: Parent Task Navigation

**User Story:** As a developer, I want to see and navigate to the parent task from the detail view, so that I can understand the task hierarchy and move between related tasks.

#### Acceptance Criteria

1. THE Properties_Sidebar SHALL display a "Parent" field in the "Cấu trúc" section showing the parent task ID (e.g., "PROJ-6"), title, and type icon as a clickable link (if the task has a parent)
2. WHEN the parent task link is clicked, THE Task_Detail_Panel SHALL navigate to the parent task's detail view within the same view mode (full-page, drawer, or popup)
3. IF the task has no parent, THEN THE Properties_Sidebar SHALL display "Không có" (None) with a clickable "Thêm parent" link that opens a searchable dropdown listing only tasks with types valid as parents according to the hierarchy rules (Epic → Story → Task → Subtask)
4. WHEN the user selects a parent task from the dropdown, THE Task_Detail_Panel SHALL update the parent relationship via the API and display a success toast notification upon completion
5. IF the API returns an error when updating the parent relationship, THEN THE Task_Detail_Panel SHALL revert the field to its previous value and display an error toast notification
6. WHEN the user clicks the remove action on an existing parent field, THE Properties_Sidebar SHALL clear the parent relationship via the API after a confirm action and display "Không có" with the "Thêm parent" link
