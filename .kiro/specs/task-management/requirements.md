---
specName: task-management
version: 2.0
status: draft
createdAt: 2026-06-02
---

# Requirements: Task Management (Epic B)

## Introduction

Tài liệu này mô tả các yêu cầu cho tính năng **Task Management** của ứng dụng Agile PM. Đây là **Epic B** trong Phase 1 MVP, cung cấp Work Item đầy đủ properties tương đương Plane.so — bao gồm: tạo và quản lý task theo hierarchy (Epic → Story → Task → Subtask), xem và sắp xếp Backlog, Task Detail Panel với auto-save, multiple assignees, attachments, external links, task relations và comments. Module này phụ thuộc vào Epic A (Project Management) và kế thừa hệ thống RBAC đã có.

> **Chuẩn hiển thị UI (format ngày/giờ/số, list page requirements, confirm dialog):** Xem [`/kiro/steering/ui-standards.md`](../../steering/ui-standards.md) — áp dụng toàn hệ thống.

## Glossary

- **Work_Item**: Đơn vị công việc trong hệ thống — tương đương "Issue" của Plane; bao gồm tất cả các loại: Epic, Story, Task, Subtask
- **Task_Type**: Loại của Work_Item: `epic` | `story` | `task` | `subtask`
- **Task_ID**: Định danh hiển thị dạng `{PROJECT_KEY}-{N}` (ví dụ: `MPM-1`), sinh từ `task_counter` của project — bất biến sau khi tạo
- **Task_State**: Trạng thái của work item trong workflow: `backlog` | `todo` | `in_progress` | `in_review` | `done` | `cancelled` (có thể mở rộng qua project settings ở epic sau)
- **Task_Priority**: Mức ưu tiên: `urgent` | `high` | `medium` | `low` | `none`
- **Estimate**: Ước lượng công sức của work item — hỗ trợ kiểu **Points** (Fibonacci: 0, 0.5, 1, 2, 3, 5, 8, 13, 21) hoặc **Categories** (XS/S/M/L/XL) tùy cấu hình project; Epic B mặc định dùng Points
- **Backlog**: Danh sách tất cả Work_Item chưa được gán vào Cycle, hiển thị theo thứ tự `backlog_order`
- **Task_Detail_Panel**: Slide-over panel hiển thị toàn bộ properties của Work_Item và cho phép chỉnh sửa inline với auto-save
- **Task_Relation**: Quan hệ giữa hai Work_Item: `blocking` (A chặn B), `blocked_by` (A bị chặn bởi B), `relates_to` (A liên quan B), `duplicate_of` (A là bản sao của B)
- **Task_Attachment**: File đính kèm vào Work_Item, lưu trên filesystem (roadmap: S3)
- **Task_Link**: URL bên ngoài gán vào Work_Item (ví dụ: Figma design, PR link, document)
- **Task_Comment**: Bình luận của thành viên trên Work_Item
- **Task_Activity**: Lịch sử thay đổi của Work_Item (ai thay đổi gì, khi nào)
- **Task_Counter**: Bộ đếm tự tăng trong mỗi project để sinh Task_ID — đã định nghĩa trong Epic A
- **Task_Service**: Module backend (NestJS) chịu trách nhiệm CRUD Work_Item và tất cả sub-resources
- **Task_Client**: Module frontend (Angular) hiển thị Backlog page và Task_Detail_Panel

## Requirements

### Requirement 1: Tạo Work Item

**User Story:** Là một Developer hoặc Product Owner, tôi muốn tạo work item mới trong project, để nhóm có thể theo dõi và phân công công việc.

#### Acceptance Criteria

1. WHEN người dùng có Project_Role Developer, QA, Product_Owner, hoặc Scrum_Master gửi yêu cầu tạo Work_Item, THE Task_Service SHALL tạo work item với fields: title (1–255 ký tự, bắt buộc), description (0–50,000 ký tự Markdown), type (mặc định `task`), state (mặc định `backlog`), priority (mặc định `none`), assignee_ids (mảng UUID, tùy chọn), label_ids (mảng UUID, tùy chọn), estimate (số, tùy chọn), start_date (ISO date, tùy chọn), due_date (ISO date, tùy chọn), parent_id (UUID, tùy chọn)
2. WHEN Work_Item được tạo, THE Task_Service SHALL sinh Task_ID nguyên tử: `SELECT ... FOR UPDATE` lấy task_counter của project, tăng counter +1, tạo Task_ID = `{project.key}-{newCounter}` — tất cả trong một transaction
3. IF parent_id được cung cấp, THEN THE Task_Service SHALL kiểm tra parent tồn tại và thuộc cùng project; nếu không trả về HTTP 422 `INVALID_PARENT`
4. THE Task_Service SHALL enforce hierarchy: `subtask` → parent phải là `task`; `task` → parent phải là `story` hoặc NULL; `story` → parent phải là `epic`; `epic` → không có parent — vi phạm trả về HTTP 422 `INVALID_HIERARCHY`
5. IF assignee_ids chứa user không phải thành viên project, THEN trả về HTTP 422 `ASSIGNEE_NOT_MEMBER`
6. IF title rỗng hoặc vượt 255 ký tự, description vượt 50,000 ký tự, hoặc field enum không hợp lệ, THEN trả về HTTP 400 với danh sách trường không hợp lệ
7. WHEN Work_Item được tạo, THE Task_Service SHALL ghi Task_Activity với event `created` và audit log `task_created`
8. IF người dùng có Project_Role Stakeholder gửi request tạo, THEN trả về HTTP 403

### Requirement 2: Xem Backlog

**User Story:** Là một thành viên project, tôi muốn xem danh sách tất cả work items chưa được gán vào cycle, để có cái nhìn tổng thể về công việc tồn đọng.

#### Acceptance Criteria

1. WHEN người dùng là thành viên project truy cập `/projects/:key/backlog`, THE Task_Client SHALL hiển thị tất cả Work_Item có `cycle_id IS NULL` thuộc project, sắp xếp theo `backlog_order` (tăng dần)
2. THE Backlog SHALL hiển thị Work_Item theo cấu trúc phẳng (flat list) với indent visual thể hiện hierarchy: Epic (0px) → Story (24px) → Task (48px) → Subtask (72px)
3. Mỗi row SHALL hiển thị: drag handle, checkbox select, Task_ID (clickable), Type icon, Title, State badge, Priority icon, Assignee avatars (tối đa 3, sau đó "+N"), Estimate, Due date (nếu có), Label dots, Sub-work item count, Attachment count, Action menu
4. THE Task_Client SHALL cung cấp filter đầy đủ (state phản ánh vào URL query params): text search theo title/Task_ID (debounce 300ms), Type, State, Priority, Assignee (multi-select), Label (multi-select), có/không có Estimate, có/không có Due date
5. THE Task_Client SHALL hỗ trợ **Group by**: State, Priority, Label, Assignee, None — thay đổi cách nhóm danh sách mà không reload data
6. THE Task_Client SHALL hỗ trợ **Order by**: Manual Rank, Created at, Updated at, Start date, Due date, Priority — khi chọn khác Manual Rank thì drag & drop bị disable
7. THE Task_Client SHALL hỗ trợ multiple select để thực hiện bulk actions: Bulk assign cycle, Bulk change state, Bulk change priority, Bulk delete
8. WHEN bulk delete, THE Task_Client SHALL hiển thị confirm dialog ghi rõ số lượng trước khi thực hiện
9. THE Task_Service SHALL trả về danh sách Backlog trong 300ms ở p95 với tối đa 1,000 tasks/project
10. WHEN danh sách trống, THE Task_Client SHALL hiển thị empty state phân biệt "chưa có task" vs "filter không khớp"

### Requirement 3: Xem và Chỉnh sửa Work Item Detail

**User Story:** Là một thành viên project, tôi muốn xem toàn bộ thông tin của một work item và chỉnh sửa inline, để cập nhật trạng thái mà không rời trang hiện tại.

#### Acceptance Criteria

1. WHEN người dùng click vào Task_ID hoặc title trên Backlog, THE Task_Client SHALL mở Task_Detail_Panel dạng slide-over từ bên phải; URL cập nhật sang `?taskId={TASK_ID}` để có thể bookmark/share
2. THE Task_Detail_Panel SHALL hiển thị đầy đủ các properties sau:
   - **Header**: Task_ID (read-only, copy-on-click), Type icon, breadcrumb hierarchy
   - **Title**: editable inline (auto-save onBlur)
   - **Description**: Markdown editor với toggle Edit/Preview (auto-save 1000ms debounce)
   - **State**: p-select với color-coded options
   - **Priority**: p-select với icon (Urgent/High/Medium/Low/None)
   - **Assignees**: multi-select với avatar (tất cả members của project)
   - **Labels**: multi-select tag với color dot
   - **Start date**: date picker
   - **Due date**: date picker
   - **Estimate**: number input (Points Fibonacci) hoặc select (Categories) tùy config project
   - **Parent**: link + editable (search & select parent)
   - **Cycle**: read-only badge (gán cycle từ Backlog hoặc Cycle view — Epic C)
   - **Reporter**: read-only avatar + name
   - **Created at / Updated at**: read-only, format dd/MM/yyyy HH:mm
3. WHEN người dùng thay đổi bất kỳ field nào và rời field (onBlur/Enter/picker close), THE Task_Service SHALL tự động lưu (auto-save) mà không cần nút Save; hiển thị saving indicator
4. IF auto-save thất bại, THE Task_Client SHALL hiển thị toast error và khôi phục giá trị cũ
5. THE Task_Detail_Panel SHALL có 4 tabs phụ: **Overview** (properties), **Sub-items** (work items con), **Relations** (blocking/related), **Activity** (lịch sử thay đổi)
6. WHEN mở panel, THE Task_Client SHALL load task detail trong vòng 200ms; hiển thị skeleton trong khi load
7. IF người dùng có Project_Role Stakeholder, THE Task_Client SHALL hiển thị toàn bộ thông tin nhưng tất cả fields ở chế độ read-only
8. WHEN người dùng nhấn Escape hoặc click outside, nếu Description đang edit chưa lưu, THE Task_Client SHALL hỏi confirm trước khi đóng

### Requirement 4: Cập nhật Work Item

**User Story:** Là một thành viên project, tôi muốn cập nhật các thuộc tính của work item, để phản ánh trạng thái thực tế của công việc.

#### Acceptance Criteria

1. WHEN người dùng có Project_Role Developer, QA, Product_Owner, hoặc Scrum_Master gửi yêu cầu cập nhật, THE Task_Service SHALL cập nhật các fields: title, description, type, state, priority, assignee_ids, estimate, label_ids, parent_id, start_date, due_date — và ghi Task_Activity với danh sách `{field, old_value, new_value}`
2. IF cập nhật parent_id vi phạm hierarchy rules, trả về HTTP 422 `INVALID_HIERARCHY`
3. IF cập nhật type của task đang có children vi phạm hierarchy của children, trả về HTTP 422 `TYPE_CHANGE_BREAKS_HIERARCHY`
4. WHEN state thay đổi thành `done`, THE Task_Service SHALL ghi `completed_at = now()`; WHEN state thay đổi từ `done` sang khác, set `completed_at = NULL`
5. WHEN start_date hoặc due_date thay đổi, IF start_date > due_date THEN trả về HTTP 422 `INVALID_DATE_RANGE`
6. IF người dùng Stakeholder hoặc không phải member gửi request update, trả về HTTP 403

### Requirement 5: Xóa Work Item

**User Story:** Là một Scrum Master hoặc Product Owner, tôi muốn xóa work item không cần thiết, để Backlog luôn gọn gàng.

#### Acceptance Criteria

1. WHEN người dùng có Project_Role Product_Owner hoặc Scrum_Master gửi yêu cầu xóa, THE Task_Service SHALL xóa task và tất cả children/sub-resources (cascade: assignees, labels, attachments, links, relations, comments, activity) và ghi audit log `task_deleted`
2. WHEN xóa từ Backlog, THE Task_Client SHALL hiển thị confirm dialog: title task + cảnh báo "sẽ xóa N work items con liên quan"
3. IF Developer hoặc QA gửi request delete, trả về HTTP 403
4. WHEN bulk delete, THE Task_Service SHALL xóa trong một transaction; nếu bất kỳ task thất bại, rollback toàn bộ

### Requirement 6: Sắp xếp Backlog (Drag & Drop)

**User Story:** Là một Product Owner hoặc Scrum Master, tôi muốn sắp xếp thứ tự ưu tiên trong Backlog bằng drag & drop.

#### Acceptance Criteria

1. WHEN người dùng có quyền kéo thả Work_Item, THE Task_Client SHALL optimistic-update thứ tự ngay lập tức và gửi `PATCH /reorder` với danh sách `{taskId, backlogOrder}` mới
2. THE Task_Service SHALL bulk UPDATE `backlog_order` trong một transaction
3. IF reorder thất bại, THE Task_Client SHALL khôi phục thứ tự cũ và hiển thị toast error
4. Drag & drop chỉ khả dụng khi Order by = "Manual Rank"; Developer, QA, Stakeholder không được kéo thả
5. `backlog_order` dùng giá trị float (midpoint strategy) để tránh renumber toàn bộ khi insert

### Requirement 7: Quản lý Label

**User Story:** Là một Scrum Master hoặc Product Owner, tôi muốn tạo và quản lý labels để phân loại work items linh hoạt.

#### Acceptance Criteria

1. WHEN người dùng có quyền tạo label, THE Task_Service SHALL tạo label với name (1–50 ký tự, unique trong project) và color (hex `#RRGGBB`)
2. Mỗi Work_Item có thể gán tối đa 10 labels
3. WHEN xóa label, THE Task_Service SHALL xóa label và cascade `task_labels` trong một transaction
4. IF name label trùng trong cùng project, trả về HTTP 409 `LABEL_NAME_EXISTS`

### Requirement 8: Attachments

**User Story:** Là một thành viên project, tôi muốn đính kèm file vào work item để lưu trữ tài liệu liên quan.

#### Acceptance Criteria

1. WHEN người dùng có Project_Role Developer, QA, Product_Owner, hoặc Scrum_Master upload file vào work item, THE Task_Service SHALL lưu file vào filesystem với path có cấu trúc `uploads/projects/{projectId}/tasks/{taskId}/{uuid}_{filename}` và tạo record trong `task_attachments`
2. Mỗi Work_Item hỗ trợ tối đa **20 attachments**, mỗi file tối đa **20MB**, tổng dung lượng tối đa **100MB** trên một work item
3. THE Task_Service SHALL chấp nhận các file types: image (jpg, png, gif, webp), document (pdf, doc, docx, xls, xlsx, ppt, pptx, txt, md), archive (zip, rar), và video (mp4, mov) — từ chối các type khác với HTTP 415
4. WHEN người dùng xem work item, THE Task_Client SHALL hiển thị thumbnail cho image attachments và icon phù hợp cho các loại file khác; hiển thị attachment count trên Backlog row
5. WHEN người dùng xóa attachment, THE Task_Service SHALL xóa file khỏi filesystem và record trong `task_attachments`; ghi Task_Activity `attachment_removed`
6. WHEN attachment được upload hoặc xóa, THE Task_Service SHALL ghi Task_Activity `attachment_added` / `attachment_removed`
7. IF người dùng Stakeholder gửi request upload/delete attachment, trả về HTTP 403

### Requirement 9: External Links

**User Story:** Là một thành viên project, tôi muốn thêm external links (Figma, GitHub PR, Confluence) vào work item để tập trung mọi tài nguyên liên quan.

#### Acceptance Criteria

1. WHEN người dùng có quyền thêm link, THE Task_Service SHALL tạo record `task_links` với: url (valid URL, scheme http/https, tối đa 2048 ký tự), title (tùy chọn, tối đa 255 ký tự), và ghi Task_Activity `link_added`
2. Mỗi Work_Item hỗ trợ tối đa **20 links**
3. THE Task_Client SHALL hiển thị danh sách links trong Task_Detail_Panel với favicon (favicon.ico của domain), title, URL truncated; icon copy URL; nút xóa
4. WHEN người dùng xóa link, THE Task_Service SHALL xóa record và ghi Task_Activity `link_removed`
5. IF url không hợp lệ hoặc scheme không phải http/https, trả về HTTP 400

### Requirement 10: Task Relations (Blocking / Related / Duplicate)

**User Story:** Là một thành viên project, tôi muốn định nghĩa quan hệ giữa các work items để quản lý dependencies và tránh công việc trùng lặp.

#### Acceptance Criteria

1. THE Task_Service SHALL hỗ trợ 4 loại relation:
   - `blocking`: Work_Item A đang chặn B (B không thể bắt đầu cho đến khi A hoàn thành)
   - `blocked_by`: Work_Item A bị chặn bởi B (nghĩa đảo của `blocking`)
   - `relates_to`: A liên quan đến B (không có dependency cứng)
   - `duplicate_of`: A là bản sao của B
2. WHEN thêm relation `blocking` (A blocks B), THE Task_Service SHALL tự động tạo relation ngược `blocked_by` (B blocked_by A) — hai relation này là cặp đôi, khi xóa một thì xóa cả hai
3. WHEN thêm relation `duplicate_of` (A duplicate_of B), THE Task_Service SHALL tự động tạo relation ngược `duplicate_of` (B duplicate_of A)
4. IF thêm relation tạo ra vòng lặp (A blocks B, B blocks A), THE Task_Service SHALL từ chối và trả về HTTP 422 `CIRCULAR_DEPENDENCY`
5. THE Task_Client SHALL hiển thị relations trong tab "Relations" của Task_Detail_Panel, nhóm theo loại relation; mỗi item hiển thị Task_ID, title, state badge, nút xóa
6. WHEN Work_Item bị xóa, tất cả relations của nó đều bị cascade xóa

### Requirement 11: Comments

**User Story:** Là một thành viên project, tôi muốn bình luận trên work item để thảo luận và đặt câu hỏi ngay trong context của task.

#### Acceptance Criteria

1. WHEN người dùng đã đăng nhập (mọi Project_Role kể cả Stakeholder) gửi comment, THE Task_Service SHALL tạo record với: content (1–10,000 ký tự Markdown, bắt buộc), user_id, task_id, created_at
2. THE Task_Client SHALL hiển thị comments trong tab "Activity" (chung với activity log) hoặc tab riêng, mỗi comment hiển thị: avatar, display name, thời gian tương đối (ví dụ: "2 giờ trước"), content rendered Markdown, nút Edit và Delete (chỉ của chính mình)
3. WHEN người dùng sửa comment của chính mình, THE Task_Service SHALL cập nhật content và `updated_at`; hiển thị badge "(đã chỉnh sửa)" bên cạnh timestamp
4. WHEN người dùng xóa comment của chính mình, THE Task_Service SHALL xóa hard và ghi activity `comment_deleted`; Admin và Scrum_Master có thể xóa comment của bất kỳ ai
5. THE Task_Client SHALL hỗ trợ mention `@username` trong comment — resolve username thành display name; **Phase 1**: chỉ highlight, không gửi notification (notification là Epic E)

### Requirement 12: Activity Log per Work Item

**User Story:** Là một thành viên project, tôi muốn xem lịch sử thay đổi của work item, để biết ai đã thay đổi gì và khi nào.

#### Acceptance Criteria

1. THE Task_Service SHALL ghi Task_Activity cho mọi sự kiện: tạo task, thay đổi bất kỳ field nào, thêm/xóa assignee, thêm/xóa label, upload/xóa attachment, thêm/xóa link, thêm/xóa relation, thêm/xóa/sửa comment
2. Mỗi activity record SHALL chứa: event_type, actor_id (user thực hiện), task_id, field (tên field thay đổi), old_value, new_value, created_at
3. THE Task_Client SHALL hiển thị activity stream theo thứ tự thời gian ngược (mới nhất trên cùng); kết hợp comments và activities trong cùng một timeline
4. THE Task_Service SHALL giữ activity log vô thời hạn trong phạm vi project (không TTL)

### Requirement 13: Task Counter và Task ID

**User Story:** Là một thành viên project, tôi muốn mỗi work item có ID duy nhất dạng `{KEY}-{N}` để tham chiếu nhanh.

#### Acceptance Criteria

1. Task_ID được sinh nguyên tử trong transaction (SELECT FOR UPDATE → increment → INSERT)
2. Task_ID là string bất biến sau khi tạo — không thể thay đổi kể cả khi update
3. WHEN người dùng gõ Task_ID chính xác vào search box, THE Task_Service SHALL resolve đúng Work_Item tương ứng trong vòng 100ms
4. Task_ID không được tái sử dụng sau khi task bị xóa (counter chỉ tăng)

### Requirement 14: Phân quyền Task Management

**User Story:** Là một Scrum Master, tôi muốn kiểm soát quyền thao tác theo Project_Role.

#### Acceptance Criteria

1. THE Task_Service SHALL áp dụng permission matrix:

| Action | Scrum_Master | Product_Owner | Developer | QA | Stakeholder |
|--------|:---:|:---:|:---:|:---:|:---:|
| Create work item | ✓ | ✓ | ✓ | ✓ | ✗ |
| Read work item | ✓ | ✓ | ✓ | ✓ | ✓ |
| Update work item | ✓ | ✓ | ✓ | ✓ | ✗ |
| Delete work item | ✓ | ✓ | ✗ | ✗ | ✗ |
| Reorder backlog | ✓ | ✓ | ✗ | ✗ | ✗ |
| Manage labels | ✓ | ✓ | ✗ | ✗ | ✗ |
| Upload attachment | ✓ | ✓ | ✓ | ✓ | ✗ |
| Delete attachment | ✓ | ✓ | ✓ (own) | ✓ (own) | ✗ |
| Add/remove link | ✓ | ✓ | ✓ | ✓ | ✗ |
| Manage relations | ✓ | ✓ | ✓ | ✓ | ✗ |
| Add comment | ✓ | ✓ | ✓ | ✓ | ✓ |
| Edit own comment | ✓ | ✓ | ✓ | ✓ | ✓ |
| Delete any comment | ✓ | ✗ | ✗ | ✗ | ✗ |

2. System_Role Admin có toàn quyền trên mọi work item trong mọi project
3. IF người dùng không có quyền, trả về HTTP 403 và ghi audit log

### Requirement 15: Tìm kiếm Work Item

**User Story:** Là một thành viên project, tôi muốn tìm kiếm work item nhanh theo tên hoặc Task_ID.

#### Acceptance Criteria

1. THE Task_Client SHALL có global search box trên Backlog (shortcut `/` để focus), tìm theo: Task_ID chính xác, title (full-text, case-insensitive), debounce 300ms
2. Kết quả hiển thị tối đa 20 items: Task_ID, Title, Type icon, State badge
3. WHEN chọn kết quả, THE Task_Client SHALL mở Task_Detail_Panel
4. THE Task_Service SHALL trả về kết quả trong vòng 200ms cho project có tối đa 5,000 tasks
