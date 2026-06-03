---
specName: member-management
version: 1.0
status: draft
createdAt: 2026-06-02
---

# Requirements: Member Management & System Admin Bootstrap (Epic D)

## Introduction

Tài liệu này mô tả các yêu cầu cho **Epic D — Member Management & System Admin Bootstrap**. Epic này giải quyết hai vấn đề cốt lõi:

1. **Phân quyền thành viên trong project**: Ai được thêm, xóa, đổi vai trò thành viên; vai trò nào được làm gì trong project.
2. **Khởi tạo System Admin đầu tiên**: Khi triển khai lần đầu, không có Admin nào trong DB. Epic này định nghĩa cơ chế tạo Admin đầu tiên qua biến môi trường `INITIAL_ADMIN_EMAIL`, và cung cấp giao diện cho Admin quản lý system roles.

> **Trạng thái hiện tại**: Backend đã triển khai hoàn chỉnh (guard, service, controller). Frontend có `MembersTabComponent`. Còn thiếu: logic `INITIAL_ADMIN_EMAIL` trong `AuthService.upsertUser()` và giao diện Admin Panel quản lý user system-level.

> **Phụ thuộc**: Epic A (user-authentication) — JWT, session, `User` entity phải tồn tại trước. Epic A+ (project-settings) — `ProjectMember` entity, `ProjectRolesGuard` phải có trước.

## Glossary

- **System_Role**: Vai trò cấp hệ thống, gán cho user trong bảng `users.system_role`. Hai giá trị: `Admin` | `User`.
- **Project_Role**: Vai trò cấp project, lưu trong bảng `project_members.project_role`. Năm giá trị: `Scrum_Master` | `Product_Owner` | `Developer` | `QA` | `Stakeholder`.
- **Admin_Bypass**: Cơ chế cho phép user có `System_Role = Admin` bỏ qua mọi kiểm tra Project_Role.
- **INITIAL_ADMIN_EMAIL**: Biến môi trường khai báo email của user sẽ được tự động cấp `System_Role = Admin` khi đăng nhập lần đầu.
- **Last_Admin_Protection**: Ràng buộc đảm bảo hệ thống luôn có ít nhất một Admin đang hoạt động.
- **Last_Scrum_Master_Protection**: Ràng buộc đảm bảo mỗi project luôn có ít nhất một Scrum_Master.
- **Admin_Panel**: Trang quản trị dành cho System Admin để xem, đổi role, và vô hiệu hóa tài khoản user.
- **Permission_Matrix**: Bảng định nghĩa các hành động (create/read/update/delete) mà mỗi Project_Role được phép thực hiện trên từng loại resource (task, sprint, document, member).
- **Force_Logout**: Cơ chế buộc user re-login để cập nhật JWT claims khi role thay đổi.

## Requirements

### Requirement 1: Initial System Admin Bootstrap

**User Story:** Là một DevOps engineer, tôi muốn có cơ chế xác định Admin đầu tiên khi triển khai hệ thống lần đầu mà không cần truy cập trực tiếp vào database, để quá trình setup được tự động hóa và an toàn.

#### Acceptance Criteria

1. WHEN biến môi trường `INITIAL_ADMIN_EMAIL` được khai báo, THE Auth_Service SHALL tự động cấp `system_role = 'Admin'` cho user có email khớp khi user đó đăng nhập lần đầu (row chưa tồn tại trong DB).
2. WHEN `INITIAL_ADMIN_EMAIL` không được khai báo hoặc để trống, THE Auth_Service SHALL tạo user mới với `system_role = 'User'` như hành vi mặc định — không có side effect nào.
3. IF user có email khớp với `INITIAL_ADMIN_EMAIL` đã tồn tại trong DB trước đó (đăng nhập trước khi env được set), THE Auth_Service SHALL KHÔNG tự động nâng role — cơ chế này chỉ áp dụng khi INSERT user mới.
4. WHEN `INITIAL_ADMIN_EMAIL` đã tạo được ít nhất một Admin, THE system SHALL cho phép Admin đó nâng role các user khác thông qua Admin Panel — sau đó `INITIAL_ADMIN_EMAIL` có thể được gỡ bỏ khỏi env mà không ảnh hưởng đến hệ thống.
5. THE `INITIAL_ADMIN_EMAIL` SHALL không bao giờ được ghi vào database hay audit log dưới dạng plaintext — chỉ được dùng trong logic `upsertUser()` tại runtime.
6. THE `.env.example` SHALL được cập nhật để bao gồm comment hướng dẫn sử dụng `INITIAL_ADMIN_EMAIL`.

### Requirement 2: Project Member CRUD

**User Story:** Là một Scrum Master, tôi muốn thêm, đổi vai trò, và xóa thành viên trong project của mình để kiểm soát ai có quyền truy cập và làm gì trong project.

#### Acceptance Criteria

1. WHEN Scrum_Master gọi `POST /api/projects/:projectId/members` với body `{ email, projectRole }`, THE Project_Service SHALL:
   - Tra cứu user theo email trong bảng `users`
   - Nếu không tìm thấy → trả về HTTP 404 `USER_NOT_FOUND`
   - Nếu user đã là thành viên → trả về HTTP 409 `MEMBER_ALREADY_EXISTS`
   - Nếu hợp lệ → INSERT vào `project_members`, revoke tất cả sessions của user được thêm (force re-login), ghi audit `member_added`
2. WHEN Scrum_Master gọi `PATCH /api/projects/:projectId/members/:userId` với body `{ projectRole }`, THE Project_Service SHALL cập nhật role, revoke sessions của user bị đổi, ghi audit `member_role_changed`.
3. WHEN Scrum_Master gọi `DELETE /api/projects/:projectId/members/:userId`, THE Project_Service SHALL xóa member, revoke sessions của user bị xóa, ghi audit `member_removed`.
4. WHEN bất kỳ thành viên nào gọi `GET /api/projects/:projectId/members`, THE Project_Service SHALL trả về danh sách đầy đủ gồm `userId`, `displayName`, `email`, `avatarUrl`, `projectRole`, `joinedAt`; hỗ trợ filter theo tên/email qua query param `?filter=`.
5. IF Scrum_Master cố đổi role hoặc xóa Scrum_Master duy nhất của project, THE Project_Service SHALL từ chối với HTTP 422 `LAST_SCRUM_MASTER`.
6. IF user không phải Scrum_Master hoặc Admin cố gọi POST/PATCH/DELETE, THE Project_Service SHALL trả về HTTP 403 `INSUFFICIENT_PROJECT_ROLE`.

### Requirement 3: Permission Matrix

**User Story:** Là một developer, tôi muốn hệ thống tự động kiểm tra quyền dựa trên vai trò trong project, để không phải viết logic kiểm tra quyền thủ công ở mỗi endpoint.

#### Acceptance Criteria

1. THE system SHALL áp dụng Permission_Matrix sau cho mọi action trên resource:

| Role | task | sprint | document | member |
|---|---|---|---|---|
| **Scrum_Master** | CRUD | CRUD | CRUD | CRUD |
| **Product_Owner** | CRUD | CRUD | CRUD | Read |
| **Developer** | CRU | Read | CRU | Read |
| **QA** | CRU | Read | CRU | Read |
| **Stakeholder** | Read | Read | Read | Read |

2. THE `@ProjectRoles(...roles)` decorator SHALL được dùng trên mọi endpoint cần kiểm tra Project_Role; `ProjectRolesGuard` SHALL đọc decorator metadata và kiểm tra role của user trong project tương ứng (extract `projectId` từ route params hoặc request body).
3. WHEN user có `system_role = 'Admin'`, THE `ProjectRolesGuard` SHALL bypass toàn bộ kiểm tra Project_Role và cho phép truy cập.
4. IF `projectId` không tồn tại trong route params và request body, THE `ProjectRolesGuard` SHALL trả về HTTP 400 `MISSING_PROJECT_ID`.
5. WHEN token JWT của user không chứa role của project đó (token stale — user vừa được thêm vào project sau khi login), THE `ProjectRolesGuard` SHALL fallback query database `project_members` để lấy role thực tế.
6. WHEN access bị từ chối, THE system SHALL ghi log warning với format `[ACCESS_DENIED] userId denied access to projectId; required: [...], actual: none/role`.

### Requirement 4: System Admin Panel

**User Story:** Là một System Admin, tôi muốn xem danh sách tất cả users trong hệ thống, thay đổi system role và vô hiệu hóa tài khoản, để quản lý quyền hạn cấp hệ thống.

#### Acceptance Criteria

1. WHEN Admin gọi `GET /api/admin/users`, THE Admin_Service SHALL trả về danh sách tất cả users gồm `id`, `email`, `displayName`, `systemRole`, `isActive`, `createdAt`; sắp xếp theo `createdAt DESC`.
2. WHEN Admin gọi `PATCH /api/admin/users/:userId/role` với body `{ systemRole: 'Admin' | 'User' }`, THE Admin_Service SHALL cập nhật role, revoke tất cả sessions của user bị đổi (buộc re-login với claims mới), ghi audit `system_role_changed`.
3. WHEN Admin gọi `PATCH /api/admin/users/:userId/disable`, THE Admin_Service SHALL set `isActive = false`, revoke tất cả sessions, thêm user vào forced-logout list, ghi audit `account_disabled`.
4. IF Admin cố hạ role hoặc disable chính mình là Admin duy nhất đang active, THE Admin_Service SHALL từ chối với HTTP 400 `LAST_ADMIN_PROTECTION`.
5. THE Admin Panel frontend SHALL là trang `/admin/users` chỉ hiển thị trong navigation khi user có `systemRole = 'Admin'`.
6. THE Admin Panel SHALL hiển thị bảng users với cột: Email, Tên, System Role (badge), Trạng thái (Active/Disabled), Ngày tạo, và cột Hành động (đổi role + disable/enable).
7. WHEN Admin đổi role hoặc disable một user, THE Admin Panel SHALL hiển thị confirmation dialog trước khi thực hiện.
8. THE Admin Panel SHALL cảnh báo rõ ràng nếu Admin đang cố hạ role/disable Admin cuối cùng trước khi gọi API.

### Requirement 5: Force Re-Login Sau Khi Role Thay Đổi

**User Story:** Là một System Admin hoặc Scrum Master, tôi muốn thay đổi quyền có hiệu lực ngay lập tức, để user không thể tiếp tục dùng role cũ sau khi bị đổi quyền.

#### Acceptance Criteria

1. WHEN Project_Role của một user thay đổi (thêm vào project, đổi role, xóa khỏi project), THE system SHALL revoke tất cả Redis sessions của user đó và thêm vào forced-logout list.
2. WHEN System_Role của một user thay đổi, THE system SHALL revoke tất cả Redis sessions của user đó; forced-logout list sẽ trigger re-login trong vòng 5 giây tại client.
3. WHEN user bị disable, THE system SHALL revoke tất cả sessions và thêm vào forced-logout list — JWT guard sẽ từ chối khi thấy `isActive = false` hoặc forced-logout flag.
4. WHEN Access_Token của user bị revoke expire và client gọi refresh endpoint, THE Auth_Service SHALL kiểm tra forced-logout flag trước khi cấp token mới; nếu flag tồn tại → trả về HTTP 401 `SESSION_REVOKED`.

### Requirement 6: Members Tab trong Project Settings

**User Story:** Là một Scrum Master, tôi muốn quản lý thành viên project trực tiếp từ trang Settings của project, không phải dùng API thủ công.

#### Acceptance Criteria

1. THE Project_Client SHALL hiển thị tab **Members** trong trang `/projects/:key/settings` với danh sách thành viên (avatar, tên, email, vai trò, ngày tham gia).
2. WHEN Scrum_Master hoặc Admin xem tab Members, THE Members_Tab SHALL hiển thị button **"Thêm thành viên"** và dropdown đổi vai trò và nút xóa cho từng member (trừ chính mình).
3. WHEN user không phải Scrum_Master hoặc Admin xem tab Members, THE Members_Tab SHALL ẩn button thêm, ẩn nút xóa, và hiển thị badge vai trò (không phải dropdown).
4. WHEN Scrum_Master cố đổi role của Scrum_Master khác, THE Members_Tab SHALL hiển thị confirmation dialog cảnh báo trước khi gọi API.
5. WHEN Scrum_Master cố xóa một thành viên, THE Members_Tab SHALL hiển thị confirmation dialog với tên và vai trò thành viên đó.
6. THE Members_Tab SHALL hỗ trợ tìm kiếm client-side theo tên hoặc email.
