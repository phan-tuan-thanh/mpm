# Requirements Document: Project Management

## Introduction

Tài liệu này mô tả các yêu cầu cho tính năng **Project Management** của ứng dụng Agile PM. Đây là Epic A trong Phase 1 MVP, cung cấp khả năng tạo và quản lý project, mời/quản lý thành viên theo vai trò, cấu hình project settings, và điều hướng qua app shell có sidebar collapsible. Module này tách hoàn toàn khỏi Auth module.

> **Chuẩn hiển thị UI (format ngày/giờ/số, list page requirements, confirm dialog):** Xem [`/kiro/steering/ui-standards.md`](../../steering/ui-standards.md) — áp dụng toàn hệ thống, không đặc thù cho Epic A.

## Glossary

- **Project**: Đơn vị làm việc cấp cao nhất trong hệ thống, chứa các tasks, sprints, và thành viên
- **Project_Key**: Mã định danh ngắn của project, 2–5 chữ cái in hoa, unique toàn hệ thống, dùng làm prefix cho task ID (ví dụ: `MPM-1`)
- **Project_Service**: Module backend (NestJS) chịu trách nhiệm CRUD project và quản lý thành viên
- **Project_Client**: Module frontend (Angular) hiển thị danh sách project, form tạo/sửa, và settings
- **Task_Counter**: Bộ đếm tự tăng trong mỗi project, dùng để sinh task ID dạng `{KEY}-{N}`
- **Project_Status**: Trạng thái của project: `active` (đang hoạt động) hoặc `archived` (đã lưu trữ)
- **Project_Owner**: Người tạo project, được tự động gán vai trò Scrum_Master trong project đó
- **AppShell**: Component layout chính của ứng dụng sau khi đăng nhập, bao gồm sidebar và vùng nội dung
- **Sidebar**: Panel điều hướng bên trái của AppShell, có thể thu gọn (collapsed) về dạng chỉ hiển thị icon
- **Project_Switcher**: Dropdown trong sidebar cho phép chuyển nhanh giữa các project
- **Direct_Add**: Phương thức thêm thành viên bằng email — nếu user tồn tại trong hệ thống thì add ngay, không cần xác nhận qua email
- **Danger_Zone**: Khu vực trong project settings chứa các hành động không thể hoàn tác: archive và delete project

## Requirements

### Requirement 1: Tạo Project

**User Story:** Là một Scrum Master hoặc Admin, tôi muốn tạo project mới với các thông tin cơ bản, để nhóm có một không gian làm việc được cấu hình sẵn.

#### Acceptance Criteria

1. WHEN người dùng có System_Role Admin hoặc có quyền tạo project gửi yêu cầu tạo project với name hợp lệ và key hợp lệ, THE Project_Service SHALL tạo project với: name (1–100 ký tự), description (0–2000 ký tự, không bắt buộc), key (2–5 chữ cái in hoa), status mặc định là `active`, task_counter = 0, owner_id = user hiện tại
2. WHEN project được tạo thành công, THE Project_Service SHALL tự động thêm người tạo vào `project_members` với Project_Role là `Scrum_Master`
3. IF key đã tồn tại trong hệ thống, THEN THE Project_Service SHALL trả về HTTP 409 với error code `PROJECT_KEY_EXISTS` và message chỉ rõ key đó đã được sử dụng
4. IF name rỗng hoặc vượt quá 100 ký tự, hoặc key không khớp regex `/^[A-Z]{2,5}$/`, hoặc description vượt quá 2000 ký tự, THEN THE Project_Service SHALL trả về HTTP 400 với danh sách các trường không hợp lệ
5. WHEN project được tạo, THE Project_Service SHALL ghi audit log với event_type `project_created`, user_id của người tạo, project_id, và timestamp
6. WHEN project được tạo thành công, THE Project_Client SHALL chuyển hướng người dùng đến trang project workspace của project vừa tạo trong vòng 1 giây

### Requirement 2: Xem danh sách Project

**User Story:** Là một thành viên hệ thống, tôi muốn xem danh sách các project tôi tham gia, để nhanh chóng chọn và bắt đầu làm việc.

#### Acceptance Criteria

1. WHEN người dùng đã đăng nhập truy cập `/projects`, THE Project_Client SHALL hiển thị tất cả project mà người dùng là thành viên, với các columns: Tên project, Project Key, Status badge (active/archived), Vai trò của tôi trong project, Ngày tạo (định dạng dd/MM/yyyy)
2. THE Project_Client SHALL cung cấp filter đầy đủ: tìm kiếm theo tên (full-text search, debounced 300ms), lọc theo status (active/archived/all), lọc theo khoảng ngày tạo (date range picker)
3. THE Project_Client SHALL hỗ trợ multiple select để chọn nhiều project cùng lúc và thực hiện bulk delete
4. WHEN người dùng nhấn Delete sau khi chọn projects, THE Project_Client SHALL hiển thị confirm dialog ghi rõ số lượng project sẽ bị xóa và yêu cầu xác nhận trước khi thực hiện
5. IF Admin truy cập danh sách project, THEN THE Project_Service SHALL trả về tất cả project trong hệ thống (không giới hạn theo membership)
6. THE Project_Service SHALL trả về danh sách project trong vòng 200ms ở p95 dưới tải 500 concurrent users

### Requirement 3: Xem và Chỉnh sửa thông tin Project

**User Story:** Là một Scrum Master, tôi muốn xem chi tiết và chỉnh sửa thông tin project, để cập nhật mô tả và giữ thông tin project luôn chính xác.

#### Acceptance Criteria

1. WHEN người dùng là thành viên của project truy cập project detail, THE Project_Service SHALL trả về: id, name, description, key, status, owner, task_counter (tổng số tasks đã tạo), danh sách members với roles, created_at, updated_at
2. WHEN người dùng có Project_Role Scrum_Master hoặc System_Role Admin gửi yêu cầu update project, THE Project_Service SHALL cập nhật name và/hoặc description, ghi audit log `project_updated`, và trả về project đã cập nhật
3. THE Project_Service SHALL KHÔNG cho phép thay đổi Project_Key sau khi project đã được tạo; mọi request PATCH có trường `key` SHALL bị bỏ qua (key field read-only)
4. IF người dùng không có quyền (không phải Scrum_Master của project và không phải Admin), THEN THE Project_Service SHALL trả về HTTP 403
5. WHEN người dùng truy cập project bằng Project_Key (e.g., `/projects/MPM`), THE Project_Service SHALL resolve key thành project ID và trả về project tương ứng; IF key không tồn tại, trả về HTTP 404

### Requirement 4: Archive và Xóa Project

**User Story:** Là một Scrum Master, tôi muốn archive hoặc xóa project khi không còn cần thiết, để danh sách project luôn gọn gàng.

#### Acceptance Criteria

1. WHEN người dùng có Project_Role Scrum_Master hoặc System_Role Admin gửi yêu cầu archive project, THE Project_Service SHALL cập nhật `status = 'archived'`, lưu `archived_at = now()`, ghi audit log `project_archived`, và trả về project đã cập nhật
2. WHEN người dùng archive project, THE Project_Client SHALL hiển thị confirm dialog trước khi thực hiện; WHEN xác nhận, project chuyển sang trạng thái archived và vẫn xuất hiện trong danh sách với status badge "Archived"
3. WHEN người dùng có Project_Role Scrum_Master hoặc System_Role Admin gửi yêu cầu delete project, THE Project_Service SHALL xóa vĩnh viễn project cùng toàn bộ dữ liệu liên quan (project_members, cascade), và ghi audit log `project_deleted`
4. WHEN người dùng xóa project, THE Project_Client SHALL yêu cầu người dùng gõ chính xác Project_Key vào input field để xác nhận trước khi gửi request xóa
5. IF project là project duy nhất trong hệ thống mà người dùng có vai trò Scrum_Master, THEN THE Project_Service SHALL vẫn cho phép xóa (không block)
6. WHEN bulk delete nhiều projects từ trang danh sách, THE Project_Service SHALL xóa tất cả projects được chọn trong một transaction, hoặc rollback toàn bộ nếu có lỗi, và trả về danh sách projects đã xóa thành công/thất bại

### Requirement 5: Quản lý Project Member

**User Story:** Là một Scrum Master, tôi muốn thêm, đổi vai trò, và xóa thành viên trong project, để nhóm có đúng người với đúng quyền hạn.

#### Acceptance Criteria

1. WHEN người dùng có Project_Role Scrum_Master hoặc System_Role Admin gửi yêu cầu thêm member với email, THE Project_Service SHALL tra cứu user theo email trong bảng `users`; IF user tồn tại, add ngay vào project với Project_Role được chỉ định, và ghi audit log `member_added`
2. IF email không tồn tại trong hệ thống, THEN THE Project_Service SHALL trả về HTTP 404 với error code `USER_NOT_FOUND` và message chỉ rõ không tìm thấy user với email đó
3. IF user đã là thành viên của project, THEN THE Project_Service SHALL trả về HTTP 409 với error code `MEMBER_ALREADY_EXISTS`
4. WHEN người dùng có Project_Role Scrum_Master hoặc System_Role Admin gửi yêu cầu thay đổi Project_Role của một member, THE Project_Service SHALL cập nhật role, ghi audit log `member_role_changed`, và thu hồi Access_Token hiện tại của member đó để buộc refresh
5. IF request thay đổi role sẽ khiến project không còn Scrum_Master nào (chuyển Scrum_Master duy nhất sang role khác), THEN THE Project_Service SHALL trả về HTTP 422 với error code `LAST_SCRUM_MASTER` và message chỉ rõ project phải có ít nhất một Scrum_Master
6. WHEN người dùng có Project_Role Scrum_Master hoặc System_Role Admin xóa member khỏi project, THE Project_Service SHALL xóa record trong `project_members`, ghi audit log `member_removed`, và thu hồi Access_Token của member bị xóa
7. IF xóa member sẽ khiến project không còn Scrum_Master nào, THEN THE Project_Service SHALL trả về HTTP 422 với error code `LAST_SCRUM_MASTER`
8. WHEN người dùng xem danh sách members, THE Project_Service SHALL trả về: user_id, display_name, email, avatar_url, project_role, joined_at (định dạng dd/MM/yyyy trong UI), và cho phép filter theo tên/email
9. WHEN người dùng xóa member, THE Project_Client SHALL hiển thị confirm dialog ghi rõ tên member và project role trước khi thực hiện

### Requirement 6: App Shell và Điều hướng

**User Story:** Là một người dùng, tôi muốn có giao diện điều hướng nhất quán sau khi đăng nhập, để tôi có thể chuyển giữa các project và các tính năng một cách trực quan.

#### Acceptance Criteria

1. WHEN người dùng đăng nhập thành công, THE Project_Client SHALL điều hướng đến `/projects` và hiển thị AppShell với sidebar bên trái
2. THE Sidebar SHALL có Project_Switcher ở trên cùng hiển thị tên project đang được chọn; WHEN người dùng click, hiển thị dropdown danh sách tất cả projects của họ để chuyển nhanh
3. THE Sidebar SHALL hiển thị các navigation links của project hiện tại: Board, Backlog, Settings
4. THE Sidebar SHALL hỗ trợ collapse/expand: WHEN collapsed, chỉ hiển thị icons (width 64px); WHEN expanded, hiển thị icons và labels (width 240px); trạng thái được lưu vào `localStorage` với key `sidebar_collapsed`
5. WHEN người dùng chuyển sang project khác qua Project_Switcher, THE Project_Client SHALL cập nhật sidebar navigation links và URL path sang project mới mà không reload toàn trang
6. WHEN người dùng truy cập `/projects/:key/*` mà họ không phải thành viên (và không phải Admin), THE Project_Client SHALL hiển thị trang 403 Forbidden

### Requirement 7: Project Settings UI

**User Story:** Là một Scrum Master, tôi muốn có trang settings tập trung để cấu hình project, quản lý thành viên, và thực hiện các thao tác nguy hiểm.

#### Acceptance Criteria

1. WHEN người dùng truy cập `/projects/:key/settings`, THE Project_Client SHALL hiển thị trang settings với ba tabs: General, Members, Danger Zone
2. Tab General SHALL hiển thị form cho phép sửa name (1–100 ký tự) và description (0–2000 ký tự); Project Key hiển thị dạng read-only với tooltip "Không thể thay đổi sau khi tạo"
3. Tab Members SHALL hiển thị bảng members với columns: Avatar, Tên, Email, Vai trò (p-select editable), Ngày tham gia (dd/MM/yyyy); có search box filter theo tên/email; có nút "Thêm thành viên" mở dialog nhập email và chọn role
4. Tab Danger Zone SHALL có hai hành động riêng biệt: (a) Archive Project — nút "Archive" với confirm dialog; (b) Delete Project — nút "Delete Project" màu đỏ với confirm dialog yêu cầu gõ Project Key để xác nhận
5. IF người dùng không có quyền Scrum_Master hoặc Admin, THEN THE Project_Client SHALL vẫn cho phép xem trang settings nhưng ẩn các control chỉnh sửa (read-only mode)

