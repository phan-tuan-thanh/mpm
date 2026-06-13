import { Injectable, inject, computed, signal, effect } from '@angular/core';
import { ProjectStore } from '../../projects/state/project.store';

export interface TranslationKeyDefinition {
  key: string;
  category: string;
  description: string;
  defaultEn: string;
  defaultVi: string;
}

export const DEFAULT_TRANSLATIONS: TranslationKeyDefinition[] = [
  // General Tab
  { key: 'general-tab.title', category: 'Settings - General', description: 'Settings page header title', defaultEn: 'Project Settings', defaultVi: 'Cài đặt dự án' },
  { key: 'general-tab.subtitle', category: 'Settings - General', description: 'Settings page header description text', defaultEn: 'Manage general info, sprint configurations, workflow states, labels, and priorities.', defaultVi: 'Quản lý thông tin chung, cấu hình sprint, trạng thái công việc, nhãn và các mức ưu tiên.' },
  { key: 'general-tab.tab.info', category: 'Settings - General', description: 'Tab link for general information config', defaultEn: 'General Config', defaultVi: 'Cấu hình chung' },
  { key: 'general-tab.tab.sprints', category: 'Settings - General', description: 'Tab link for sprint settings', defaultEn: 'Sprint Config', defaultVi: 'Cấu hình Sprint' },
  { key: 'general-tab.tab.states', category: 'Settings - General', description: 'Tab link for workflow states settings', defaultEn: 'States', defaultVi: 'Trạng thái' },
  { key: 'general-tab.tab.priorities', category: 'Settings - General', description: 'Tab link for task priorities settings', defaultEn: 'Priorities', defaultVi: 'Mức ưu tiên' },
  { key: 'general-tab.tab.labels', category: 'Settings - General', description: 'Tab link for project labels settings', defaultEn: 'Labels', defaultVi: 'Nhãn' },
  { key: 'general-tab.tab.estimates', category: 'Settings - General', description: 'Tab link for task estimate settings', defaultEn: 'Estimates', defaultVi: 'Ước lượng' },
  { key: 'general-tab.tab.language', category: 'Settings - General', description: 'Tab link for language translations override settings', defaultEn: 'Language', defaultVi: 'Ngôn ngữ' },

  // Labels Tab
  { key: 'labels-tab.commonIconTitle', category: 'Settings - Labels', description: 'Header for the common label icon configuration section', defaultEn: 'Common Label Icon', defaultVi: 'Biểu tượng chung của Nhãn' },
  { key: 'labels-tab.commonIconDesc', category: 'Settings - Labels', description: 'Description for the common label icon configuration', defaultEn: 'This icon is displayed uniformly on every project label.', defaultVi: 'Biểu tượng này được hiển thị đồng bộ trên mọi nhãn của dự án.' },
  { key: 'labels-tab.commonIconTooltip', category: 'Settings - Labels', description: 'Tooltip for common icon picker button', defaultEn: 'Change common icon', defaultVi: 'Thay đổi biểu tượng chung' },
  { key: 'labels-tab.addNewTitle', category: 'Settings - Labels', description: 'Title of the form for creating new label', defaultEn: 'Add new label', defaultVi: 'Thêm nhãn mới' },
  { key: 'labels-tab.scopedLabelToggle', category: 'Settings - Labels', description: 'Label for the checkbox toggling scoped/hierarchical label mode', defaultEn: 'Scoped Label (group::value)', defaultVi: 'Nhãn Scoped (nhóm::giá trị)' },
  { key: 'labels-tab.scopedGroupPlaceholder', category: 'Settings - Labels', description: 'Placeholder for scoped group/prefix input field', defaultEn: 'Group (e.g. type)', defaultVi: 'Nhóm (ví dụ: type)' },
  { key: 'labels-tab.scopedValuePlaceholder', category: 'Settings - Labels', description: 'Placeholder for scoped value input field', defaultEn: 'Value (e.g. bug)', defaultVi: 'Giá trị (ví dụ: bug)' },
  { key: 'labels-tab.labelNamePlaceholder', category: 'Settings - Labels', description: 'Placeholder for standard label name input field', defaultEn: 'Label name', defaultVi: 'Tên nhãn' },
  { key: 'labels-tab.descPlaceholder', category: 'Settings - Labels', description: 'Placeholder for label description input field', defaultEn: 'Description (optional)', defaultVi: 'Mô tả (tuỳ chọn)' },
  { key: 'labels-tab.quickColorTitle', category: 'Settings - Labels', description: 'Label above preset colors grid', defaultEn: 'Quick Colors (Light / Dark)', defaultVi: 'Màu chọn nhanh (Light / Dark)' },
  { key: 'labels-tab.customColorBtn', category: 'Settings - Labels', description: 'Button text to show custom hex color pickers', defaultEn: 'Customize Light & Dark colors', defaultVi: 'Tự tùy chỉnh màu sắc Light & Dark' },
  { key: 'labels-tab.lightModeLabel', category: 'Settings - Labels', description: 'Label above light-mode hex color picker', defaultEn: 'Light mode color:', defaultVi: 'Màu Light mode:' },
  { key: 'labels-tab.darkModeLabel', category: 'Settings - Labels', description: 'Label above dark-mode hex color picker', defaultEn: 'Dark mode color:', defaultVi: 'Màu Dark mode:' },
  { key: 'labels-tab.colorTooltip', category: 'Settings - Labels', description: 'Tooltip for label color picker circle button', defaultEn: 'Choose color pair', defaultVi: 'Chọn cặp màu sắc' },
  { key: 'labels-tab.singleChoiceToggle', category: 'Settings - Labels', description: 'Checkbox label to enforce single-exclusive label choice per scope group', defaultEn: 'Single Choice (Each task can select at most 1 label)', defaultVi: 'Lựa chọn đơn (Mỗi task chỉ chọn tối đa 1 nhãn)' },
  { key: 'labels-tab.exclusiveLabel', category: 'Settings - Labels', description: 'Short badge indicating exclusive label properties', defaultEn: 'Exclusive', defaultVi: 'Lựa chọn đơn' },
  { key: 'labels-tab.addBtn', category: 'Settings - Labels', description: 'Button text to add label', defaultEn: 'Add', defaultVi: 'Thêm' },
  { key: 'labels-tab.cancelBtn', category: 'Settings - Labels', description: 'Button text to cancel adding/editing label', defaultEn: 'Cancel', defaultVi: 'Hủy' },
  { key: 'labels-tab.previewLabelTitle', category: 'Settings - Labels', description: 'Title text next to live badge preview', defaultEn: 'Label preview:', defaultVi: 'Xem trước nhãn:' },
  { key: 'labels-tab.searchPlaceholder', category: 'Settings - Labels', description: 'Placeholder for searching project labels', defaultEn: 'Search by name or description...', defaultVi: 'Tìm theo tên hoặc mô tả...' },
  { key: 'labels-tab.noMatchingFound', category: 'Settings - Labels', description: 'Text shown when filtering labels yields no results', defaultEn: 'No matching label found', defaultVi: 'Không tìm thấy nhãn khớp' },
  { key: 'labels-tab.emptyStateDesc', category: 'Settings - Labels', description: 'Empty state message when no labels exist in the project', defaultEn: 'No labels yet. Create the first label above.', defaultVi: 'Chưa có nhãn nào. Tạo nhãn đầu tiên bên trên.' },

  // Board
  { key: 'board.noTasks', category: 'Kanban Board', description: 'Message displayed in empty columns of the Kanban board', defaultEn: 'No tasks', defaultVi: 'Không có task' },

  // Backlog
  { key: 'backlog.closeWarningHeader', category: 'Backlog & Tasks', description: 'Header text for bulk-closing tasks warning dialog', defaultEn: 'Close Task Warning', defaultVi: 'Cảnh báo đóng task' },
  { key: 'backlog.closeWarningMsg', category: 'Backlog & Tasks', description: 'Warning message shown when closing tasks with incomplete subtasks', defaultEn: 'Selected task(s) have incomplete sub-tasks. Closing will leave them incomplete unless auto-closed.', defaultVi: 'Task được chọn có các sub-task chưa hoàn thành. Việc đóng các task này sẽ để lại các sub-task ở trạng thái chưa hoàn thành trừ khi bạn tự động đóng.' },
  { key: 'backlog.autoCloseSubtasksLabel', category: 'Backlog & Tasks', description: 'Label for subtasks auto-closure checkbox', defaultEn: 'Auto-close incomplete sub-tasks', defaultVi: 'Tự động đóng các task con chưa hoàn thành' },
  { key: 'backlog.confirmBtn', category: 'Backlog & Tasks', description: 'Confirm action button text in dialogs', defaultEn: 'Confirm', defaultVi: 'Đồng ý' },
  { key: 'backlog.cancelBtn', category: 'Backlog & Tasks', description: 'Cancel action button text in dialogs', defaultEn: 'Cancel', defaultVi: 'Hủy' },
  { key: 'backlog.selectedTasks', category: 'Backlog & Tasks', description: 'Label after count of selected tasks in bulk action bar', defaultEn: 'tasks selected', defaultVi: 'task đã chọn' },
  { key: 'backlog.deselect', category: 'Backlog & Tasks', description: 'Button to deselect all selected tasks', defaultEn: 'Deselect', defaultVi: 'Bỏ chọn' },
  { key: 'backlog.addToSprint', category: 'Backlog & Tasks', description: 'Bulk action button to add selected tasks to a sprint', defaultEn: 'Add to Sprint', defaultVi: 'Thêm vào Sprint' },
  { key: 'backlog.delete', category: 'Backlog & Tasks', description: 'Bulk action button to delete selected tasks', defaultEn: 'Delete', defaultVi: 'Xóa' },
  { key: 'backlog.cancel', category: 'Backlog & Tasks', description: 'Cancel button in bulk action bar', defaultEn: 'Cancel', defaultVi: 'Hủy' },
  { key: 'backlog.addSelectedTasksHeader', category: 'Backlog & Tasks', description: 'Header in sprint picker when adding selected tasks', defaultEn: 'Add selected tasks to sprint:', defaultVi: 'Thêm các task đã chọn vào sprint:' },
  { key: 'backlog.noSprintPlanningOrActive', category: 'Backlog & Tasks', description: 'Message when no sprint is available to add tasks to', defaultEn: 'No sprint in planning/active status. Create one first.', defaultVi: 'Chưa có sprint nào ở trạng thái planning/active. Tạo sprint trước.' },
  { key: 'backlog.sprintPlanned', category: 'Backlog & Tasks', description: 'Sprint status label: planned', defaultEn: 'Planned', defaultVi: 'Lên kế hoạch' },
  { key: 'backlog.sprintActive', category: 'Backlog & Tasks', description: 'Sprint status label: active', defaultEn: 'Active', defaultVi: 'Đang chạy' },
  { key: 'backlog.selectSprintPlaceholder', category: 'Backlog & Tasks', description: 'Placeholder for sprint selection dropdown', defaultEn: 'Select sprint...', defaultVi: 'Chọn sprint...' },
  { key: 'backlog.confirmDeleteHeader', category: 'Backlog & Tasks', description: 'Header for bulk delete confirmation dialog', defaultEn: 'Confirm Delete', defaultVi: 'Xác nhận xóa' },
  { key: 'backlog.success', category: 'Backlog & Tasks', description: 'Success toast summary in backlog actions', defaultEn: 'Success', defaultVi: 'Thành công' },
  { key: 'backlog.error', category: 'Backlog & Tasks', description: 'Error toast summary in backlog actions', defaultEn: 'Error', defaultVi: 'Lỗi' },
  { key: 'backlog.taskCreated', category: 'Backlog & Tasks', description: 'Toast message after creating a new task', defaultEn: 'Created new task', defaultVi: 'Đã tạo task mới' },
  { key: 'backlog.draftError', category: 'Backlog & Tasks', description: 'Toast message when draft task initialization fails', defaultEn: 'Could not initialize draft task', defaultVi: 'Không thể khởi tạo task nháp' },
  { key: 'backlog.addedToSprintError', category: 'Backlog & Tasks', description: 'Toast message when adding tasks to sprint fails', defaultEn: 'Could not add tasks to sprint', defaultVi: 'Không thể thêm task vào sprint' },
  { key: 'backlog.emptyState', category: 'Backlog & Tasks', description: 'Empty state message when no tasks exist in a group', defaultEn: 'Empty list', defaultVi: 'Danh sách trống' },
  { key: 'backlog.addTaskToGroup', category: 'Backlog & Tasks', description: 'Tooltip on add button inside a task group', defaultEn: 'Add task to this group', defaultVi: 'Thêm task vào nhóm này' },
  { key: 'backlog.newWorkItem', category: 'Backlog & Tasks', description: 'Footer button to create a new task in a group', defaultEn: 'New work item', defaultVi: 'Thêm công việc mới' },

  // Backlog Toolbar
  { key: 'toolbar.search', category: 'Backlog Toolbar', description: 'Search input placeholder in backlog toolbar', defaultEn: 'Search... (/)', defaultVi: 'Tìm kiếm... (/)' },
  { key: 'toolbar.listView', category: 'Backlog Toolbar', description: 'Tooltip/label for list view toggle button', defaultEn: 'List view', defaultVi: 'Giao diện danh sách' },
  { key: 'toolbar.boardView', category: 'Backlog Toolbar', description: 'Tooltip/label for board view toggle button', defaultEn: 'Board view', defaultVi: 'Giao diện bảng' },
  { key: 'toolbar.newTask', category: 'Backlog Toolbar', description: 'Button label to create a new task', defaultEn: 'Add task', defaultVi: 'Thêm task' },
  { key: 'toolbar.searchSprint', category: 'Backlog Toolbar', description: 'Placeholder for sprint filter search input', defaultEn: 'Search sprint...', defaultVi: 'Tìm sprint...' },
  { key: 'toolbar.noSprint', category: 'Backlog Toolbar', description: 'Option label for tasks with no sprint assigned', defaultEn: 'No sprint', defaultVi: 'Chưa có sprint' },
  { key: 'toolbar.sprintOpen', category: 'Backlog Toolbar', description: 'Sprint status badge: active/open', defaultEn: 'Active', defaultVi: 'Đang mở' },
  { key: 'toolbar.sprintCompleted', category: 'Backlog Toolbar', description: 'Sprint status badge: completed', defaultEn: 'Completed', defaultVi: 'Đã hoàn thành' },
  { key: 'toolbar.showMore', category: 'Backlog Toolbar', description: 'Show more sprints button in sprint filter', defaultEn: 'Show more', defaultVi: 'Xem thêm' },
  { key: 'toolbar.searchLabel', category: 'Backlog Toolbar', description: 'Placeholder for label filter search input', defaultEn: 'Search labels...', defaultVi: 'Tìm label...' },
  { key: 'toolbar.noLabelFound', category: 'Backlog Toolbar', description: 'Empty message when label search yields no results', defaultEn: 'No labels found', defaultVi: 'Không tìm thấy label' },
  { key: 'toolbar.clearFilters', category: 'Backlog Toolbar', description: 'Button to clear all active filters', defaultEn: 'Clear filters', defaultVi: 'Xóa bộ lọc' },
  { key: 'toolbar.filterType', category: 'Backlog Toolbar', description: 'Default label for task type filter button', defaultEn: 'Type', defaultVi: 'Loại' },
  { key: 'toolbar.filterPriority', category: 'Backlog Toolbar', description: 'Default label for priority filter button', defaultEn: 'Priority', defaultVi: 'Độ ưu tiên' },
  { key: 'toolbar.filterState', category: 'Backlog Toolbar', description: 'Default label for state filter button', defaultEn: 'State', defaultVi: 'Trạng thái' },

  // Task Detail - Activity (additional)
  { key: 'activity.loadingMore', category: 'Task Detail - Activity', description: 'Text shown while loading additional activity entries', defaultEn: 'Loading more...', defaultVi: 'Đang tải thêm...' },

  // Task Detail - Description (additional)
  { key: 'description.confirmHeader', category: 'Task Detail - Description', description: 'Header for the discard changes confirmation dialog', defaultEn: 'Confirm', defaultVi: 'Xác nhận' },

  // Task Detail Panel
  { key: 'task-detail.backToList', category: 'Task Detail', description: 'Back navigation button in task detail panel', defaultEn: 'Back to list', defaultVi: 'Quay lại danh sách' },
  { key: 'task-detail.close', category: 'Task Detail', description: 'Close button in task detail panel', defaultEn: 'Close', defaultVi: 'Đóng' },
  { key: 'task-detail.assigneePlaceholder', category: 'Task Detail', description: 'Placeholder text for assignee field when no one is assigned', defaultEn: 'Assignee', defaultVi: 'Người phụ trách' },
  { key: 'task-detail.noAssignee', category: 'Task Detail', description: 'Text shown when task has no assignee', defaultEn: 'No assignee', defaultVi: 'Chưa giao' },
  { key: 'task-detail.searchAssignee', category: 'Task Detail', description: 'Search placeholder in assignee picker dropdown', defaultEn: 'Search members...', defaultVi: 'Tìm thành viên...' },
  { key: 'task-detail.noMemberFound', category: 'Task Detail', description: 'Empty message when assignee search has no results', defaultEn: 'No members found', defaultVi: 'Không tìm thấy thành viên' },
  { key: 'task-detail.startDate', category: 'Task Detail', description: 'Start date field placeholder in task detail', defaultEn: 'Start date', defaultVi: 'Bắt đầu' },
  { key: 'task-detail.dueDate', category: 'Task Detail', description: 'Due date field placeholder in task detail', defaultEn: 'Due date', defaultVi: 'Hết hạn' },
  { key: 'task-detail.clearDate', category: 'Task Detail', description: 'Button to clear the selected date', defaultEn: 'Clear date', defaultVi: 'Xóa ngày' },
  { key: 'task-detail.descriptionLabel', category: 'Task Detail', description: 'Section label for task description area', defaultEn: 'Description', defaultVi: 'Mô tả' },
  { key: 'task-detail.labelsPlaceholder', category: 'Task Detail', description: 'Search placeholder in label picker', defaultEn: 'Search labels...', defaultVi: 'Tìm nhãn...' },
  { key: 'task-detail.noLabelFound', category: 'Task Detail', description: 'Empty message when label search has no results', defaultEn: 'No labels found', defaultVi: 'Không tìm thấy nhãn' },
  { key: 'task-detail.parentPlaceholder', category: 'Task Detail', description: 'Search placeholder for parent task picker', defaultEn: 'Search parent task...', defaultVi: 'Tìm parent task...' },
  { key: 'task-detail.noParent', category: 'Task Detail', description: 'Text when task has no parent task', defaultEn: 'No parent', defaultVi: 'Không có parent' },
  { key: 'task-detail.noParentFound', category: 'Task Detail', description: 'Empty message when parent task search has no results', defaultEn: 'No parent task found', defaultVi: 'Không tìm thấy parent' },
  { key: 'task-detail.estimateLabel', category: 'Task Detail', description: 'Label for estimate field in task detail', defaultEn: 'Estimate', defaultVi: 'Ước lượng' },
  { key: 'task-detail.deleteBtn', category: 'Task Detail', description: 'Delete task button label', defaultEn: 'Delete', defaultVi: 'Xóa' },
  { key: 'task-detail.noModule', category: 'Task Detail', description: 'Text when task has no module assigned', defaultEn: 'No module', defaultVi: 'Chưa có module' },
  { key: 'task-detail.noSprintPlanningOrActive', category: 'Task Detail', description: 'Text when no planning or active sprint exists', defaultEn: 'No sprint planning or active', defaultVi: 'Chưa có sprint planning/active' },
  { key: 'task-detail.removeFromSprint', category: 'Task Detail', description: 'Option to remove task from its current sprint', defaultEn: 'Remove from sprint', defaultVi: 'Gỡ khỏi sprint' },
  { key: 'task-detail.stateLabel', category: 'Task Detail', description: 'Label for state field section in task detail', defaultEn: 'State', defaultVi: 'Trạng thái' },
  { key: 'task-detail.success', category: 'Task Detail', description: 'Success toast summary in task detail actions', defaultEn: 'Success', defaultVi: 'Thành công' },
  { key: 'task-detail.error', category: 'Task Detail', description: 'Error toast summary in task detail actions', defaultEn: 'Error', defaultVi: 'Lỗi' },
  { key: 'task-detail.uploadFailed', category: 'Task Detail', description: 'Toast message when file upload fails', defaultEn: 'Upload failed', defaultVi: 'Upload thất bại' },
  { key: 'task-detail.genericError', category: 'Task Detail', description: 'Generic error message for unexpected failures', defaultEn: 'Error occurred', defaultVi: 'Đã xảy ra lỗi' },
  { key: 'task-detail.closeTaskBtn', category: 'Task Detail', description: 'Button to close/complete the current task', defaultEn: 'Close task', defaultVi: 'Đóng task' },
  { key: 'task-detail.reopenTaskBtn', category: 'Task Detail', description: 'Button to reopen a closed task', defaultEn: 'Reopen task', defaultVi: 'Mở lại task' },
  { key: 'task-detail.commentsHeader', category: 'Task Detail', description: 'Section header for task comments area', defaultEn: 'Comments', defaultVi: 'Bình luận' },
  { key: 'task-detail.modules', category: 'Task Detail', description: 'Label for modules section in task detail', defaultEn: 'Modules', defaultVi: 'Module' },

  // Task Detail - Attachments
  { key: 'attachments.title', category: 'Task Detail - Attachments', description: 'Section header for attachments panel', defaultEn: 'Attachments', defaultVi: 'Tài liệu đính kèm' },
  { key: 'attachments.addFileToGroup', category: 'Task Detail - Attachments', description: 'Tooltip for add-file button inside a group', defaultEn: 'Add file to group', defaultVi: 'Thêm file vào nhóm' },
  { key: 'attachments.deleteGroup', category: 'Task Detail - Attachments', description: 'Menu option to delete an attachment group', defaultEn: 'Delete group', defaultVi: 'Xóa nhóm' },
  { key: 'attachments.duplicateWarning', category: 'Task Detail - Attachments', description: 'Warning label when uploaded file has duplicate name', defaultEn: 'Duplicate file name', defaultVi: 'Trùng tên với file khác' },
  { key: 'attachments.addFileTip', category: 'Task Detail - Attachments', description: 'Tip shown to prompt user to add first file', defaultEn: 'Press + to add file', defaultVi: 'Nhấn + để thêm file' },
  { key: 'attachments.ungroup', category: 'Task Detail - Attachments', description: 'Menu option to remove file from its group', defaultEn: 'Ungroup', defaultVi: 'Bỏ khỏi nhóm' },
  { key: 'attachments.groupNamePlaceholder', category: 'Task Detail - Attachments', description: 'Placeholder for group name input when creating a group', defaultEn: 'Group name...', defaultVi: 'Tên nhóm...' },
  { key: 'attachments.fileAlreadyExists', category: 'Task Detail - Attachments', description: 'Error message when an identical file already exists', defaultEn: 'File already exists', defaultVi: 'File đã tồn tại' },
  { key: 'attachments.createGroup', category: 'Task Detail - Attachments', description: 'Button to create a new attachment group', defaultEn: 'Create group', defaultVi: 'Tạo nhóm' },
  { key: 'attachments.upload', category: 'Task Detail - Attachments', description: 'Button to upload a file attachment', defaultEn: 'Upload file', defaultVi: 'Upload file' },

  // Task Detail - Links
  { key: 'links.titlePlaceholder', category: 'Task Detail - Links', description: 'Placeholder for optional link title input', defaultEn: 'Title (optional)', defaultVi: 'Tiêu đề (tùy chọn)' },
  { key: 'links.addBtn', category: 'Task Detail - Links', description: 'Button to add a new link', defaultEn: 'Add', defaultVi: 'Thêm' },

  // Task Detail - Sub-items
  { key: 'sub-items.addBtn', category: 'Task Detail - Sub-items', description: 'Button label to open sub-item creation form', defaultEn: 'Add sub-item', defaultVi: 'Thêm sub-item' },
  { key: 'sub-items.addTooltip', category: 'Task Detail - Sub-items', description: 'Tooltip on add sub-item button', defaultEn: 'Add new sub-item', defaultVi: 'Thêm sub-item mới' },
  { key: 'sub-items.empty', category: 'Task Detail - Sub-items', description: 'Empty state message when task has no sub-items', defaultEn: 'No sub-items yet. Break down the work to track progress.', defaultVi: 'Chưa có sub-item nào. Chia nhỏ công việc để dễ theo dõi tiến độ.' },
  { key: 'sub-items.inputPlaceholder', category: 'Task Detail - Sub-items', description: 'Placeholder for new sub-item title input', defaultEn: 'Enter sub-item title...', defaultVi: 'Nhập tiêu đề sub-item...' },
  { key: 'sub-items.createBtn', category: 'Task Detail - Sub-items', description: 'Button to confirm creating a new sub-item', defaultEn: 'Create', defaultVi: 'Tạo' },
  { key: 'sub-items.cancelBtn', category: 'Task Detail - Sub-items', description: 'Button to cancel creating a sub-item', defaultEn: 'Cancel', defaultVi: 'Hủy' },

  // Task Detail - Comments
  { key: 'comments.confirmDelete', category: 'Task Detail - Comments', description: 'Confirmation message before deleting a comment', defaultEn: 'Are you sure you want to delete this comment?', defaultVi: 'Bạn có chắc chắn muốn xóa bình luận này không?' },
  { key: 'comments.authorDeleted', category: 'Task Detail - Comments', description: 'Placeholder name when comment author is deleted', defaultEn: 'Comment deleted', defaultVi: 'Bình luận đã bị xóa' },
  { key: 'comments.edited', category: 'Task Detail - Comments', description: 'Badge shown after edited comments', defaultEn: '(edited)', defaultVi: '(đã chỉnh sửa)' },
  { key: 'comments.editPlaceholder', category: 'Task Detail - Comments', description: 'Placeholder for comment edit textarea', defaultEn: 'Edit comment...', defaultVi: 'Chỉnh sửa bình luận...' },
  { key: 'comments.cancelBtn', category: 'Task Detail - Comments', description: 'Cancel editing button in comment editor', defaultEn: 'Cancel', defaultVi: 'Hủy' },
  { key: 'comments.saveBtn', category: 'Task Detail - Comments', description: 'Save edited comment button', defaultEn: 'Save', defaultVi: 'Lưu' },
  { key: 'comments.deletedText', category: 'Task Detail - Comments', description: 'Placeholder content for soft-deleted comments', defaultEn: 'Comment has been deleted', defaultVi: 'Bình luận đã bị xóa' },
  { key: 'comments.reactTooltip', category: 'Task Detail - Comments', description: 'Tooltip on emoji reaction button', defaultEn: 'Express reaction', defaultVi: 'Bày tỏ cảm xúc' },
  { key: 'comments.replyBtn', category: 'Task Detail - Comments', description: 'Button to reply to a comment', defaultEn: 'Reply', defaultVi: 'Trả lời' },
  { key: 'comments.replyPlaceholder', category: 'Task Detail - Comments', description: 'Placeholder for reply textarea', defaultEn: 'Write a reply...', defaultVi: 'Viết phản hồi...' },
  { key: 'comments.sendBtn', category: 'Task Detail - Comments', description: 'Send button in reply/comment form', defaultEn: 'Send', defaultVi: 'Gửi' },
  { key: 'comments.noComments', category: 'Task Detail - Comments', description: 'Empty state when task has no comments', defaultEn: 'No comments yet.', defaultVi: 'Chưa có bình luận nào.' },
  { key: 'comments.newCommentLabel', category: 'Task Detail - Comments', description: 'Section label above new comment input area', defaultEn: 'New comment', defaultVi: 'Bình luận mới' },
  { key: 'comments.newCommentPlaceholder', category: 'Task Detail - Comments', description: 'Placeholder for new comment textarea', defaultEn: 'Write a comment... type @ to mention someone', defaultVi: 'Viết bình luận… gõ @ để nhắc ai đó' },
  { key: 'comments.submitBtn', category: 'Task Detail - Comments', description: 'Button to submit a new comment', defaultEn: 'Send comment', defaultVi: 'Gửi bình luận' },
  { key: 'comments.editAction', category: 'Task Detail - Comments', description: 'Context menu option to edit a comment', defaultEn: 'Edit', defaultVi: 'Chỉnh sửa' },
  { key: 'comments.deleteAction', category: 'Task Detail - Comments', description: 'Context menu option to delete a comment', defaultEn: 'Delete', defaultVi: 'Xóa' },

  // Task Row (tooltips)
  { key: 'task-row.subItems', category: 'Task Row', description: 'Tooltip suffix showing sub-item count on task row', defaultEn: 'sub-items', defaultVi: 'việc con' },
  { key: 'task-row.estimate', category: 'Task Row', description: 'Tooltip for estimate chip on task row', defaultEn: 'Estimate', defaultVi: 'Ước lượng' },
  { key: 'task-row.startDate', category: 'Task Row', description: 'Tooltip for start date chip on task row', defaultEn: 'Start date', defaultVi: 'Ngày bắt đầu' },
  { key: 'task-row.dueDate', category: 'Task Row', description: 'Tooltip for due date chip on task row', defaultEn: 'Due date', defaultVi: 'Hạn chót' },
  { key: 'task-row.priority', category: 'Task Row', description: 'Tooltip prefix for priority icon on task row', defaultEn: 'Priority:', defaultVi: 'Ưu tiên:' },
  { key: 'task-row.workspaceModule', category: 'Task Row', description: 'Tooltip prefix for workspace module badge on task row', defaultEn: 'Workspace module:', defaultVi: 'Module workspace:' },
  { key: 'task-row.projectModule', category: 'Task Row', description: 'Tooltip prefix for project module badge on task row', defaultEn: 'Project module:', defaultVi: 'Module dự án:' },
  { key: 'task-row.sprint', category: 'Task Row', description: 'Tooltip prefix for sprint badge on task row', defaultEn: 'Sprint:', defaultVi: 'Sprint:' },

  // Task Activity Panel
  { key: 'activity.loading', category: 'Task Detail - Activity', description: 'Spinner text shown when loading activities', defaultEn: 'Loading activities...', defaultVi: 'Đang tải hoạt động...' },
  { key: 'activity.showMore', category: 'Task Detail - Activity', description: 'Show more activities button', defaultEn: 'Show more', defaultVi: 'Xem thêm' },
  { key: 'activity.showAll', category: 'Task Detail - Activity', description: 'Show all activities button', defaultEn: 'Show all', defaultVi: 'Xem hết' },

  // Task Description
  { key: 'description.placeholder', category: 'Task Detail - Description', description: 'Placeholder for empty description text editor', defaultEn: 'Add description...', defaultVi: 'Thêm mô tả...' },
  { key: 'description.cancel', category: 'Task Detail - Description', description: 'Cancel editing description button', defaultEn: 'Cancel', defaultVi: 'Hủy' },
  { key: 'description.save', category: 'Task Detail - Description', description: 'Save edited description button', defaultEn: 'Save', defaultVi: 'Lưu' },
  { key: 'description.discardTitle', category: 'Task Detail - Description', description: 'Header of discard confirmation dialog', defaultEn: 'Discard unsaved changes?', defaultVi: 'Bỏ thay đổi chưa lưu?' },
  { key: 'description.discardBtn', category: 'Task Detail - Description', description: 'Button text to discard changes', defaultEn: 'Discard changes', defaultVi: 'Bỏ thay đổi' },
  { key: 'description.continueBtn', category: 'Task Detail - Description', description: 'Button text to resume editing', defaultEn: 'Continue editing', defaultVi: 'Tiếp tục sửa' },

  // Properties Sidebar
  { key: 'properties.details', category: 'Task Detail - Properties', description: 'Header for Details properties collapsible group', defaultEn: 'Details', defaultVi: 'Chi tiết' },
  { key: 'properties.structure', category: 'Task Detail - Properties', description: 'Header for Structure properties collapsible group', defaultEn: 'Structure', defaultVi: 'Cấu trúc' },
  { key: 'properties.parent', category: 'Task Detail - Properties', description: 'Label of the parent task navigation row', defaultEn: 'Parent', defaultVi: 'Parent' },
  { key: 'properties.state', category: 'Task Detail - Properties', description: 'Label of the state field', defaultEn: 'State', defaultVi: 'Trạng thái' },
  { key: 'properties.priority', category: 'Task Detail - Properties', description: 'Label of the priority field', defaultEn: 'Priority', defaultVi: 'Độ ưu tiên' },
  { key: 'properties.assignees', category: 'Task Detail - Properties', description: 'Label of the assignees field', defaultEn: 'Assignees', defaultVi: 'Phân công' },
  { key: 'properties.startDate', category: 'Task Detail - Properties', description: 'Label of the start date field', defaultEn: 'Start date', defaultVi: 'Ngày bắt đầu' },
  { key: 'properties.dueDate', category: 'Task Detail - Properties', description: 'Label of the due date field', defaultEn: 'Due date', defaultVi: 'Hạn chót' },
  { key: 'properties.estimate', category: 'Task Detail - Properties', description: 'Label of the estimate field', defaultEn: 'Estimate', defaultVi: 'Ước lượng' },
  { key: 'properties.labels', category: 'Task Detail - Properties', description: 'Label of the labels field', defaultEn: 'Labels', defaultVi: 'Nhãn' },
  { key: 'properties.modules', category: 'Task Detail - Properties', description: 'Label of the modules field', defaultEn: 'Modules', defaultVi: 'Module' },
  { key: 'properties.sprint', category: 'Task Detail - Properties', description: 'Label of the sprint field', defaultEn: 'Sprint', defaultVi: 'Sprint' },

  // Inline Property Editor
  { key: 'property-editor.clear', category: 'Task Detail - Properties', description: 'Text for clear action in dropdown editor list', defaultEn: 'Clear', defaultVi: 'Bỏ chọn' },
  { key: 'property-editor.select', category: 'Task Detail - Properties', description: 'Generic multi-select placeholder', defaultEn: 'Select...', defaultVi: 'Chọn...' },
  { key: 'property-editor.error', category: 'Task Detail - Properties', description: 'Header for error update notification toast', defaultEn: 'Error', defaultVi: 'Lỗi' },

  // Display Properties Panel
  { key: 'display.title', category: 'Display Properties', description: 'Panel header title for display settings', defaultEn: 'Display Properties', defaultVi: 'Thuộc tính hiển thị' },
  { key: 'display.fields', category: 'Display Properties', description: 'Section header for task field toggles', defaultEn: 'Fields', defaultVi: 'Trường thông tin' },
  { key: 'display.field.assignee', category: 'Display Properties', description: 'Toggle label for showing assignee field on task cards', defaultEn: 'Assignee', defaultVi: 'Người phụ trách' },
  { key: 'display.field.priority', category: 'Display Properties', description: 'Toggle label for showing priority field on task cards', defaultEn: 'Priority', defaultVi: 'Độ ưu tiên' },
  { key: 'display.field.dueDate', category: 'Display Properties', description: 'Toggle label for showing due date field on task cards', defaultEn: 'Due date', defaultVi: 'Hạn chót' },
  { key: 'display.field.startDate', category: 'Display Properties', description: 'Toggle label for showing start date field on task cards', defaultEn: 'Start date', defaultVi: 'Ngày bắt đầu' },
  { key: 'display.field.estimate', category: 'Display Properties', description: 'Toggle label for showing estimate field on task cards', defaultEn: 'Estimate', defaultVi: 'Thời gian dự tính' },
  { key: 'display.field.state', category: 'Display Properties', description: 'Toggle label for showing state field on task cards', defaultEn: 'State', defaultVi: 'Trạng thái' },
  { key: 'display.field.sprint', category: 'Display Properties', description: 'Toggle label for showing sprint field on task cards', defaultEn: 'Sprint', defaultVi: 'Sprint' },
  { key: 'display.labels', category: 'Display Properties', description: 'Section header for labels display settings', defaultEn: 'Labels', defaultVi: 'Nhãn' },
  { key: 'display.labels.mode', category: 'Display Properties', description: 'Label for label display mode selector (badge vs dot)', defaultEn: 'Mode', defaultVi: 'Chế độ' },
  { key: 'display.labels.badge', category: 'Display Properties', description: 'Badge mode option for label display', defaultEn: 'Badge', defaultVi: 'Huy hiệu' },
  { key: 'display.labels.dot', category: 'Display Properties', description: 'Dot mode option for label display', defaultEn: 'Dot', defaultVi: 'Chấm màu' },
  { key: 'display.labels.maxShown', category: 'Display Properties', description: 'Slider label for maximum number of labels shown per task', defaultEn: 'Max shown', defaultVi: 'Hiển thị tối đa' },
  { key: 'display.labels.alwaysShow', category: 'Display Properties', description: 'Toggle label to always show labels regardless of task hover', defaultEn: 'Always show', defaultVi: 'Luôn hiển thị' },
  { key: 'display.subItems', category: 'Display Properties', description: 'Section header for sub-items display settings', defaultEn: 'Sub-items', defaultVi: 'Việc con' },
  { key: 'display.subItems.depth', category: 'Display Properties', description: 'Slider label for maximum sub-item depth to display (0 hides)', defaultEn: 'Depth (0=hide)', defaultVi: 'Độ sâu (0=ẩn)' },
  { key: 'display.modules', category: 'Display Properties', description: 'Section header for modules display settings', defaultEn: 'Modules', defaultVi: 'Module' },
  { key: 'display.modules.maxShown', category: 'Display Properties', description: 'Slider label for maximum number of modules shown per task', defaultEn: 'Max shown', defaultVi: 'Hiển thị tối đa' },
  { key: 'display.view', category: 'Display Properties', description: 'Section header for view/layout settings', defaultEn: 'View', defaultVi: 'Giao diện' },
  { key: 'display.view.group', category: 'Display Properties', description: 'Label for group-by dropdown in view settings', defaultEn: 'Group', defaultVi: 'Gom nhóm' },
  { key: 'display.view.order', category: 'Display Properties', description: 'Label for order-by dropdown in view settings', defaultEn: 'Order', defaultVi: 'Sắp xếp' },
  { key: 'display.view.kanbanColumn', category: 'Display Properties', description: 'Label for Kanban column width slider', defaultEn: 'Kanban Column', defaultVi: 'Cột Kanban' },
  { key: 'display.openTaskAs', category: 'Display Properties', description: 'Section header for task open mode settings', defaultEn: 'Open task as', defaultVi: 'Mở công việc bằng' },
  { key: 'display.openTaskAs.create', category: 'Display Properties', description: 'Label for task creation view mode dropdown', defaultEn: 'Create', defaultVi: 'Tạo mới' },
  { key: 'display.openTaskAs.detail', category: 'Display Properties', description: 'Label for task detail view mode dropdown', defaultEn: 'Detail', defaultVi: 'Chi tiết' },
  { key: 'display.groupBy.none', category: 'Display Properties', description: 'Group-by option: no grouping', defaultEn: 'None', defaultVi: 'Không gom nhóm' },
  { key: 'display.groupBy.state', category: 'Display Properties', description: 'Group-by option: group by state', defaultEn: 'State', defaultVi: 'Trạng thái' },
  { key: 'display.groupBy.priority', category: 'Display Properties', description: 'Group-by option: group by priority', defaultEn: 'Priority', defaultVi: 'Độ ưu tiên' },
  { key: 'display.groupBy.assignee', category: 'Display Properties', description: 'Group-by option: group by assignee', defaultEn: 'Assignee', defaultVi: 'Người phụ trách' },
  { key: 'display.orderBy.manualRank', category: 'Display Properties', description: 'Order-by option: manual drag rank', defaultEn: 'Manual Rank', defaultVi: 'Thứ tự thủ công' },
  { key: 'display.orderBy.createdDate', category: 'Display Properties', description: 'Order-by option: sort by creation date', defaultEn: 'Created date', defaultVi: 'Ngày tạo' },
  { key: 'display.orderBy.dueDate', category: 'Display Properties', description: 'Order-by option: sort by due date', defaultEn: 'Due date', defaultVi: 'Hạn chót' },
  { key: 'display.orderBy.priority', category: 'Display Properties', description: 'Order-by option: sort by priority', defaultEn: 'Priority', defaultVi: 'Độ ưu tiên' },
  { key: 'display.viewMode.popup', category: 'Display Properties', description: 'View mode option: open task in popup dialog', defaultEn: 'Popup', defaultVi: 'Hộp thoại' },
  { key: 'display.viewMode.rightPane', category: 'Display Properties', description: 'View mode option: open task in right side panel', defaultEn: 'Right Pane', defaultVi: 'Bảng bên phải' },
  { key: 'display.viewMode.fullPage', category: 'Display Properties', description: 'View mode option: open task in full page', defaultEn: 'Full Page', defaultVi: 'Toàn trang' },
];

@Injectable({
  providedIn: 'root'
})
export class CustomTranslationService {
  private readonly projectStore = inject(ProjectStore);
  
  // Custom overrides loaded from localStorage. Structure: Record<lang, Record<key, value>>
  readonly overrides = signal<Record<string, Record<string, string>>>({});
  
  constructor() {
    // Watch current project changes
    effect(() => {
      const project = this.projectStore.currentProject();
      if (project) {
        this.loadTranslations(project.id);
      } else {
        this.overrides.set({});
      }
    });
  }
  
  // Load translations for a project
  loadTranslations(projectId: string) {
    const data = localStorage.getItem(`custom-translations-${projectId}`);
    if (data) {
      try {
        this.overrides.set(JSON.parse(data));
      } catch {
        this.overrides.set({});
      }
    } else {
      this.overrides.set({});
    }
  }
  
  // Save custom translation
  saveTranslation(projectId: string, lang: 'vi' | 'en', key: string, value: string) {
    const current = this.overrides();
    const next = {
      ...current,
      [lang]: {
        ...(current[lang] || {}),
        [key]: value
      }
    };
    this.overrides.set(next);
    localStorage.setItem(`custom-translations-${projectId}`, JSON.stringify(next));
  }
  
  // Reset translation to default
  resetTranslation(projectId: string, lang: 'vi' | 'en', key: string) {
    const current = this.overrides();
    if (current[lang] && current[lang][key] !== undefined) {
      const langOverrides = { ...current[lang] };
      delete langOverrides[key];
      const next = {
        ...current,
        [lang]: langOverrides
      };
      this.overrides.set(next);
      localStorage.setItem(`custom-translations-${projectId}`, JSON.stringify(next));
    }
  }

  // Reactive getter for a key
  t(key: string, defaultValue: string): string {
    const lang = this.projectStore.projectLanguage();
    const current = this.overrides();
    return current[lang]?.[key] ?? defaultValue;
  }
}
