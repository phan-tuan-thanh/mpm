---
specName: backlog-enhancements
version: 1.0
status: draft
createdAt: 2026-06-03
---

# Requirements: Backlog Enhancements

## Introduction

Tài liệu này mô tả yêu cầu cho **Backlog Enhancements** — nhóm cải tiến trải nghiệm người dùng trên Backlog và mở rộng hệ thống tài nguyên (Labels, States, Modules) sang mô hình scope workspace/project. Epic này phụ thuộc vào Epic B (Task Management) và kế thừa toàn bộ RBAC hiện có.

> **Chuẩn UI (ngày/giờ/số, confirm dialog):** Xem [`/kiro/steering/ui-standards.md`](../../steering/ui-standards.md).

## Glossary

- **Backlog_Row**: Một hàng trong danh sách Backlog đại diện cho một Work Item
- **Display_Properties**: Tập hợp thuộc tính hiển thị trên Backlog_Row, do user bật/tắt per-project
- **Label_Scope**: Phạm vi áp dụng của Label — `workspace` (toàn workspace) hoặc `project` (chỉ trong project)
- **State_Template**: Tập hợp States do Workspace Admin định nghĩa, dùng làm mẫu khi tạo project mới
- **Module**: Container nhóm Work Items theo milestone hoặc deliverable, có scope `workspace` hoặc `project`
- **Module_Status**: Trạng thái của Module: `backlog` | `in_progress` | `paused` | `completed` | `cancelled`
- **Workspace_Admin**: System_Role `Admin` hoặc Workspace Owner — có quyền quản lý tài nguyên workspace-level
- **SM/PO**: Project_Role `Scrum_Master` hoặc `Product_Owner` — có quyền quản lý tài nguyên project-level

---

## Requirement 1: Drag & Drop toàn row

**User Story:** Là một Product Owner, tôi muốn kéo thả work item bằng cách giữ bất kỳ đâu trên hàng (thay vì phải chuẩn chính xác vào icon hamburger nhỏ), để sắp xếp backlog nhanh hơn và tự nhiên hơn.

### Acceptance Criteria

1. WHEN người dùng giữ chuột trên bất kỳ vùng nào của Backlog_Row (ngoại trừ các control tương tác: checkbox, button, link), THE Task_Client SHALL bắt đầu drag gesture
2. WHEN Backlog_Row được hover, cursor SHALL chuyển sang `grab`; WHEN đang drag, cursor SHALL chuyển sang `grabbing`
3. WHEN drag được kích hoạt và người dùng thả chuột mà không di chuyển quá 5px, THE Task_Client SHALL xử lý như một click bình thường (mở Task Detail Panel) — không coi là drag
4. WHEN drag hoàn thành, THE Task_Client SHALL thực hiện optimistic update thứ tự và gửi reorder request theo đúng logic hiện tại
5. Icon hamburger SHALL vẫn hiển thị khi hover như visual hint, nhưng không còn là vùng drag duy nhất
6. Drag & Drop chỉ khả dụng với Project_Role Scrum_Master và Product_Owner khi Order by = "Manual Rank" — constraint này giữ nguyên từ Requirement 6 của Epic B

---

## Requirement 2: Label hiển thị dạng badge

**User Story:** Là một thành viên project, tôi muốn labels trên Backlog_Row hiển thị rõ ràng dạng badge màu sắc (thay vì ẩn đi cho đến khi hover), để nhận diện phân loại work item ngay lập tức.

### Acceptance Criteria

1. WHEN Backlog_Row hiển thị labels, THE Task_Client SHALL render mỗi label dưới dạng badge với: dot màu (color của label), tên label (truncate tối đa 80px), border và background bán trong suốt theo màu label
2. WHEN task có nhiều hơn `maxLabels` labels (mặc định 2), THE Task_Client SHALL hiển thị tối đa `maxLabels` badges và một indicator `+N` cho phần còn lại; tooltip của `+N` SHALL liệt kê tên các labels bị ẩn
3. WHEN `labelMode = 'dot'` (compact mode), THE Task_Client SHALL chỉ hiển thị dots tròn nhỏ (8px) xếp cạnh nhau, không hiện tên; tooltip mỗi dot là tên label
4. WHEN label có `scope = 'workspace'`, badge SHALL hiển thị icon `pi-globe` nhỏ thay cho color dot, để phân biệt với project label
5. WHEN `alwaysShowLabels = true` trong Display_Properties, labels SHALL hiển thị dù row không được hover
6. WHEN `alwaysShowLabels = false` (mặc định), labels SHALL ẩn khi không hover (hành vi hiện tại giữ nguyên cho các thuộc tính khác)

---

## Requirement 3: Display Properties — bật/tắt thuộc tính per-project

**User Story:** Là một Scrum Master, tôi muốn tùy chỉnh thuộc tính nào hiển thị trên Backlog_Row (như Plane.so), để Backlog phù hợp với workflow của từng project mà không bị rối thông tin.

### Acceptance Criteria

1. THE Task_Client SHALL cung cấp nút "Display" trên Backlog toolbar; click mở popover Display_Properties Panel
2. THE Display_Properties Panel SHALL cung cấp toggle bật/tắt cho từng thuộc tính: Assignee, Priority, Due date, Start date, Labels, Estimate, Sub-item count, State
3. WHEN Labels toggle bật, THE panel SHALL hiển thị thêm sub-options: Label Mode (badge / dot), Max labels (1–4), Always show (bật/tắt)
4. WHEN Modules toggle bật (sau khi Module feature triển khai), THE panel SHALL hiển thị sub-option: Max modules (1–3)
5. THE Display_Properties Panel SHALL cũng chứa Group by và Order by selectors (thay thế hoặc bổ sung toolbar hiện tại)
6. THE Task_Client SHALL persist Display_Properties settings vào `localStorage` với key `display-props-{projectId}` — settings tồn tại sau khi reload trang
7. WHEN Display_Properties thay đổi, THE Task_Client SHALL áp dụng ngay lập tức (không cần reload, không cần API call)
8. WHEN không có settings trong localStorage, THE Task_Client SHALL dùng giá trị mặc định: tất cả bật, labelMode='badge', maxLabels=2, alwaysShowLabels=false, maxModules=1

---

## Requirement 4: Label Scope (Workspace / Project)

**User Story:** Là một Workspace Admin, tôi muốn tạo labels dùng chung cho toàn workspace (như `bug`, `feature`, `hotfix`), để tất cả project sử dụng nhất quán mà không cần tạo lại trong từng project.

**User Story:** Là một Scrum Master, tôi muốn biết label nào là workspace-level và label nào là project-level, để hiểu phạm vi ảnh hưởng khi chỉnh sửa.

### Acceptance Criteria

1. WHEN Workspace Admin tạo label tại workspace level, THE Label_Service SHALL tạo record với `scope = 'workspace'`, `workspace_id` có giá trị, `project_id = NULL`
2. WHEN Scrum_Master hoặc Product_Owner tạo label tại project level, THE Label_Service SHALL tạo record với `scope = 'project'`, `project_id` có giá trị — hành vi này giữ nguyên từ Epic B
3. WHEN `GET /api/projects/:pid/labels` được gọi, THE Label_Service SHALL trả về merged list gồm: tất cả workspace labels + tất cả project labels của project đó, sắp xếp scope trước (workspace → project), sau đó theo tên
4. WHEN Workspace Admin xóa workspace label, THE Label_Service SHALL cascade xóa tất cả `task_labels` liên quan (task trong mọi project thuộc workspace) và cảnh báo số lượng task bị ảnh hưởng
5. IF Scrum_Master hoặc Product_Owner cố gắng sửa/xóa workspace label, THE Label_Service SHALL trả về HTTP 403
6. WHEN task được gán workspace label, THE Task_Service SHALL ghi activity `label_added` như bình thường — không phân biệt scope trong activity log
7. THE Label_Manager UI SHALL hiển thị 2 tab riêng biệt: "Workspace Labels" (readonly với non-admin, editable với admin) và "Project Labels" (editable với SM/PO)
8. WHEN project label trùng tên với workspace label, THE Label_Service SHALL cho phép tạo — tên không cần unique cross-scope; UNIQUE constraint chỉ áp dụng trong cùng scope + project hoặc cùng scope + workspace

---

## Requirement 5: State Templates (Workspace-level)

**User Story:** Là một Workspace Admin, tôi muốn định nghĩa một bộ states chuẩn cho workspace (state templates), để khi tạo project mới, team có thể chọn dùng template thay vì thiết lập từ đầu.

**User Story:** Là một Scrum Master, tôi muốn xem template nào đã được áp dụng cho project của mình, để hiểu nguồn gốc của các states hiện tại.

### Acceptance Criteria

1. THE Workspace_Admin SHALL có thể CRUD State Templates tại `GET/POST/PATCH/DELETE /api/workspaces/:wid/state-templates`
2. Mỗi State Template gồm: name, color, group (backlog/unstarted/started/completed/cancelled), isDefault, order — cùng cấu trúc với ProjectState
3. WHEN tạo project mới với `stateTemplate = 'workspace'`, THE Project_Service SHALL copy toàn bộ State Templates vào `project_states` với `template_id` trỏ về source template
4. WHEN tạo project mới với `stateTemplate = 'blank'` (mặc định hiện tại), THE Project_Service SHALL seed 3 states cứng: Backlog (backlog, #6B7280), In Progress (started, #3B82F6), Done (completed, #10B981)
5. Sau khi project được tạo, states của project **hoàn toàn độc lập** với template — thay đổi template KHÔNG tự động ảnh hưởng project đã tạo
6. THE Workspace_Admin SHALL có thể apply lại template vào project đang tồn tại qua `POST /api/workspaces/:wid/state-templates/apply/:projectId` — chỉ **thêm** states còn thiếu (so sánh theo template_id), **không xóa** states project đã tùy biến
7. WHEN `apply` được thực thi, nếu template state đã tồn tại trong project (cùng `template_id`), THE service SHALL skip — không tạo duplicate
8. WHEN SM/PO xem Settings > States, THE Task_Client SHALL hiển thị 2 section: "Workspace Template" (read-only, để tham khảo) và "Project States" (editable); state nào có `template_id` không null SHALL hiển thị icon "từ template"

---

## Requirement 6: Modules — Feature đầy đủ với Scope

**User Story:** Là một Scrum Master, tôi muốn tạo modules để nhóm work items theo milestone hoặc sprint, giúp team hiểu rõ phạm vi công việc trong từng giai đoạn.

**User Story:** Là một Workspace Admin, tôi muốn tạo workspace-level modules đại diện cho Releases hoặc Program Increments, để theo dõi tiến độ tổng thể xuyên nhiều project.

### Acceptance Criteria

1. WHEN Workspace Admin tạo module tại workspace level, THE Module_Service SHALL tạo record với `scope = 'workspace'`, `workspace_id` có giá trị, `project_id = NULL`
2. WHEN SM/PO tạo module tại project level, THE Module_Service SHALL tạo record với `scope = 'project'`, `project_id` có giá trị, `workspace_id` không null
3. WHEN `GET /api/projects/:pid/modules` được gọi, THE Module_Service SHALL trả về merged list: workspace modules + project modules, sắp xếp scope (workspace trước), sau đó end_date tăng dần
4. Module SHALL có các trường: name (1–100 ký tự), description (optional, Markdown), status (`backlog`|`in_progress`|`paused`|`completed`|`cancelled`), start_date (optional), end_date (optional), progress (computed: số task completed / tổng task * 100)
5. WHEN SM/PO thêm task vào module qua `POST /api/projects/:pid/modules/:mid/tasks`, THE Module_Service SHALL tạo record trong `task_modules`; một task có thể thuộc nhiều modules (cả workspace lẫn project-level)
6. WHEN task được thêm/hoàn thành, THE Module_Service SHALL cập nhật `progress` của module (tính lại từ task_modules)
7. WHEN Workspace Admin xóa workspace module, THE Module_Service SHALL xóa tất cả `task_modules` liên quan; task không bị xóa
8. IF SM/PO cố gắng sửa/xóa workspace module, THE Module_Service SHALL trả về HTTP 403
9. THE Task_Client SHALL cung cấp trang Modules tại `/projects/:key/modules` — hiển thị 2 nhóm: workspace modules (icon globe) và project modules (icon folder); mỗi card hiển thị: tên, status badge, progress bar, số tasks, start/end date
10. WHEN task detail panel mở, THE Task_Client SHALL hiển thị field "Modules" với multi-select picker; picker nhóm options theo scope (Workspace / Project)
11. WHEN Display_Properties `showModules = true`, Backlog_Row SHALL hiển thị module badges (tương tự label badges) với màu phân biệt scope

---

## Functional Requirements Summary

| ID | Yêu cầu | Ưu tiên | Requirement |
|----|---------|---------|-------------|
| FR-01 | Drag toàn Backlog_Row (không cần cdkDragHandle) | Must Have | Req 1 |
| FR-02 | Label badge style với dot màu, border, overflow +N | Must Have | Req 2 |
| FR-03 | Display Properties Panel — toggle thuộc tính per-project | Must Have | Req 3 |
| FR-04 | Persist Display_Properties vào localStorage | Must Have | Req 3 |
| FR-05 | Label scope = workspace | scope = project | Must Have | Req 4 |
| FR-06 | Label Manager UI 2 tab (Workspace / Project) | Must Have | Req 4 |
| FR-07 | Workspace State Templates CRUD | Should Have | Req 5 |
| FR-08 | Seed project states từ template khi tạo mới | Should Have | Req 5 |
| FR-09 | Apply template vào project đang tồn tại | Should Have | Req 5 |
| FR-10 | Module entity với scope workspace/project | Must Have | Req 6 |
| FR-11 | Module CRUD API (workspace + project) | Must Have | Req 6 |
| FR-12 | Task ↔ Module many-to-many assignment | Must Have | Req 6 |
| FR-13 | Module progress computed từ task completion | Should Have | Req 6 |
| FR-14 | Trang Modules UI với 2 nhóm scope | Must Have | Req 6 |
| FR-15 | Module picker trong Task Detail Panel | Must Have | Req 6 |
| FR-16 | Module badge trong Backlog_Row | Nice to Have | Req 6 |

---

## Non-Functional Requirements

| Loại | Yêu cầu cụ thể |
|------|---------------|
| Performance | Display_Properties apply ngay lập tức (không có network call); Backlog load không chậm hơn 50ms so với baseline Epic B |
| Performance | `GET /projects/:pid/labels` và `GET /projects/:pid/modules` trả về trong 200ms với tối đa 500 records |
| Security | Chỉ Workspace Admin mới CRUD workspace labels, templates, workspace modules — validate tại guard level |
| Security | Workspace label/module không được truy cập bởi project ngoài workspace |
| Scalability | Merged label query dùng UNION hoặc OR condition có index — không full scan |
| UX | Display_Properties persist qua reload; không mất cài đặt khi clear session |
| UX | Workspace resource badges có visual indicator rõ ràng (icon globe) để phân biệt với project resource |

---

## Out of Scope

- **Notification** khi workspace template thay đổi (Epic E — Notifications)
- **Sync live**: Thay đổi workspace label/module không push realtime đến browser của user khác (Phase 2)
- **Module Gantt view / Calendar view** (Phase 2)
- **Module template**: Template cho module (chỉ State có template ở epic này)
- **Cross-workspace resource sharing**: Label, State, Module chỉ trong phạm vi 1 workspace

---

## Phụ thuộc

- **Epic B (task-management)**: `tasks`, `labels`, `task_labels`, `project_states`, RBAC guards — phải hoàn thành trước
- **Epic A (project-management)**: `Project`, `Workspace`, `AuditModule` — cần workspace_id trên Project entity
- **Display_Properties** (Req 3): Độc lập, chỉ cần Angular CDK đã có từ Epic B

---

## Rủi ro & Giả định

| Rủi ro | Xác suất | Ảnh hưởng | Biện pháp |
|--------|---------|-----------|---------|
| `workspace_id` chưa có trên các entity hiện tại | Cao | Cao | Kiểm tra và thêm migration trước tiên |
| Label merge query N+1 khi nhiều project join cùng lúc | Trung bình | Trung bình | Dùng UNION với index trên (scope, workspace_id) và (scope, project_id) |
| User nhầm xóa workspace label → cascade mất toàn bộ task_labels | Thấp | Cao | Hiển thị confirm dialog với số lượng task bị ảnh hưởng; soft-delete trong 7 ngày |
| Module progress không sync khi task xóa khỏi project | Trung bình | Thấp | Trigger hoặc event sau khi delete task |
| State template apply tạo duplicate state names trong project | Thấp | Thấp | Check UNIQUE(project_id, name) trước khi insert; skip nếu đã tồn tại |
