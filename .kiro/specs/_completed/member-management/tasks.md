---
specName: member-management
version: 1.0
status: completed
estimatedDays: 3
---

# Tasks: Member Management & System Admin Bootstrap (Epic D)

## Overview

Triển khai Epic D — phân quyền thành viên project và bootstrap System Admin đầu tiên. Backend đã hoàn chỉnh phần lớn. Còn lại: logic `INITIAL_ADMIN_EMAIL` trong `AuthService`, và giao diện Admin Panel quản lý user cấp hệ thống.

Stack: NestJS 11 + TypeORM + PostgreSQL 17 (backend), Angular 21 + Signals + PrimeNG 21 (frontend).

## Trạng thái hiện tại

### Đã hoàn thành ✅

| Thành phần | File | Trạng thái |
|-----------|------|-----------|
| `ProjectMember` entity | `auth/entities/project-member.entity.ts` | ✅ Done |
| `ProjectRolesGuard` | `auth/guards/project-roles.guard.ts` | ✅ Done |
| `@ProjectRoles()` decorator | `auth/decorators/project-roles.decorator.ts` | ✅ Done |
| `Permission_Matrix` + `hasPermission()` | `auth/constants/permission-matrix.ts` | ✅ Done |
| `ProjectMemberService` (CRUD + protections) | `project/members/project-member.service.ts` | ✅ Done |
| `ProjectMemberController` | `project/members/project-member.controller.ts` | ✅ Done |
| `AdminService` (listUsers, changeRole, disable) | `admin/admin.service.ts` | ✅ Done |
| `AdminController` | `admin/admin.controller.ts` | ✅ Done |
| `MembersTabComponent` | `projects/pages/project-settings/members-tab/` | ✅ Done |

### Còn thiếu ❌

| Thành phần | File cần tạo/sửa | Effort |
|-----------|-----------------|--------|
| `INITIAL_ADMIN_EMAIL` logic | `auth/auth.service.ts` | ~30 phút |
| `.env.example` update | `.env.example` | ~5 phút |
| `AdminModule` route + guard frontend | `admin/` (mới) | ~2 ngày |

---

## Tasks

- [x] 1. Backend — ProjectMember CRUD
  - [x] 1.1 Entity, Service, Controller cho `project_members`
  - [x] 1.2 `ProjectRolesGuard` — kiểm tra project role, Admin bypass, fallback DB query
  - [x] 1.3 `@ProjectRoles()` decorator
  - [x] 1.4 `Permission_Matrix` + `hasPermission()` helper
  - [x] 1.5 Last-Scrum-Master protection trong `changeRole()` và `removeMember()`
  - [x] 1.6 Force re-login sau mọi thay đổi member (revoke sessions + forced-logout)
  - [x] 1.7 Audit log cho `member_added`, `member_removed`, `member_role_changed`
  - _Requirements: 2.1–2.6, 3.1–3.6, 5.1–5.4_

- [x] 2. Backend — Admin Service
  - [x] 2.1 `AdminService.listUsers()`, `changeRole()`, `disableAccount()`
  - [x] 2.2 `AdminController` với `@Roles('Admin')` guard
  - [x] 2.3 Last-Admin protection trong `changeRole()` và `disableAccount()`
  - [x] 2.4 Audit log cho `system_role_changed`, `account_disabled`
  - _Requirements: 4.1–4.4_

- [x] 3. Frontend — Members Tab
  - [x] 3.1 `MembersTabComponent` — bảng thành viên, search, add/remove/change role
  - [x] 3.2 Read-only mode cho non-Scrum_Master
  - [x] 3.3 Confirmation dialog khi hạ cấp Scrum_Master hoặc xóa member
  - _Requirements: 6.1–6.6_

- [x] 4. Backend — INITIAL_ADMIN_EMAIL Bootstrap
  - [x] 4.1 Cập nhật `AuthService.upsertUser()` trong `apps/backend/src/auth/auth.service.ts`
    - Đọc `INITIAL_ADMIN_EMAIL` từ `ConfigService` (không `getOrThrow` — optional)
    - So sánh case-insensitive với `claims.email` chỉ khi INSERT user mới
    - Set `systemRole: isInitialAdmin ? 'Admin' : 'User'`
    - Log `[BOOTSTRAP] Initial admin created` nếu kích hoạt (không log giá trị email của env)
    - Không thay đổi logic cho user đã tồn tại
    - _Requirements: 1.1–1.5_

  - [x] 4.2 Cập nhật `.env.example`
    - Thêm section `# Initial Admin Bootstrap`
    - Thêm `INITIAL_ADMIN_EMAIL=` với comment: "Email của user sẽ được cấp Admin khi đăng nhập lần đầu. Gỡ bỏ sau khi setup xong."
    - _Requirements: 1.6_

- [x] 5. Checkpoint — Verify INITIAL_ADMIN_EMAIL
  - Chạy backend local với `INITIAL_ADMIN_EMAIL=<email_test>`
  - Đăng nhập lần đầu với email đó → verify `users.system_role = 'Admin'` trong DB
  - Đăng nhập lần thứ hai → verify role không thay đổi (không cần re-trigger)
  - Đăng nhập với email khác → verify `system_role = 'User'`
  - Xóa `INITIAL_ADMIN_EMAIL` khỏi env → verify không có side effect
  - Hỏi user nếu có vấn đề

- [x] 6. Frontend — Admin Module
  - [x] 6.1 Tạo `AdminModule` và routing
    - `apps/frontend/src/app/admin/admin.module.ts` (hoặc standalone routes)
    - Route `/admin/users` protected bởi `AdminGuard`
    - Link "Admin" trong sidebar/topbar chỉ hiển thị khi `user.systemRole === 'Admin'`
    - _Requirements: 4.5_

  - [x] 6.2 Implement `AdminGuard`
    - `apps/frontend/src/app/admin/guards/admin.guard.ts`
    - `CanActivateFn`: kiểm tra `authService.currentUser()?.systemRole === 'Admin'`
    - Redirect về `/` với toast "Bạn không có quyền truy cập trang này" nếu không phải Admin
    - _Requirements: 4.5_

  - [x] 6.3 Implement `AdminService` (Angular)
    - `apps/frontend/src/app/admin/services/admin.service.ts`
    - `listUsers(): Observable<AdminUserResponse[]>` → `GET /api/admin/users`
    - `changeRole(userId, role): Observable<AdminUserResponse>` → `PATCH /api/admin/users/:id/role`
    - `disableUser(userId): Observable<AdminUserResponse>` → `PATCH /api/admin/users/:id/disable`
    - _Requirements: 4.1–4.3_

  - [x] 6.4 Implement `UserListComponent`
    - `apps/frontend/src/app/admin/pages/user-list/user-list.component.ts`
    - `p-table` với cột: Email, Tên, System Role (badge), Trạng thái (Active/Disabled chip), Ngày tạo, Hành động
    - Cột Hành động: button "Đổi role" (dropdown Admin/User) + button "Disable/Enable"
    - Load data khi init: `this.adminService.listUsers()`
    - _Requirements: 4.6_

  - [x] 6.5 Confirmation dialog trước khi đổi role/disable
    - Dùng `ConfirmationService` của PrimeNG (`p-confirmDialog`)
    - Khi đổi Admin → User: "Bạn có chắc muốn hạ quyền [tên]?"
    - Khi disable: "Bạn có chắc muốn vô hiệu hóa tài khoản [tên]? Họ sẽ bị đăng xuất ngay."
    - Cảnh báo đặc biệt nếu đang thao tác với Admin duy nhất
    - _Requirements: 4.7–4.8_

- [x] 7. Checkpoint — Verify Admin Panel
  - Login với tài khoản Admin → thấy link "Admin" trong navigation
  - Login với tài khoản User → không thấy link "Admin", truy cập `/admin/users` bị redirect
  - Đổi role User → Admin → verify badge cập nhật, user bị re-login
  - Disable tài khoản → verify user không login được
  - Cố disable Admin duy nhất → verify warning và API trả về 400
  - Hỏi user nếu có vấn đề

- [x] 8. Viết property tests
  - **P1: INITIAL_ADMIN_EMAIL — new user** — user mới với email khớp → `system_role = 'Admin'`
  - **P2: INITIAL_ADMIN_EMAIL — existing user** — user đã có trong DB → role không đổi
  - **P3: INITIAL_ADMIN_EMAIL — case insensitive** — `ADMIN@CO.COM` khớp với `admin@co.com`
  - **P4: INITIAL_ADMIN_EMAIL — not set** — không set env → user mới là `system_role = 'User'`
  - **P5: Add member — valid** — thêm user hợp lệ → row xuất hiện trong `project_members`
  - **P6: Add member — email not found** — email không tồn tại → 404
  - **P7: Add member — duplicate** — thêm lần 2 → 409
  - **P8: Change role — last scrum master** — hạ role SM duy nhất → 422
  - **P9: Remove member — last scrum master** — xóa SM duy nhất → 422
  - **P10: Force re-login** — đổi role → sessions bị revoke → user tiếp theo bị 401
  - **P11: Admin bypass** — Admin không có project role vẫn call được member endpoints
  - **P12: Last admin protection** — hạ role Admin duy nhất → 400
  - _Validates: Req 1–5_

- [x] 9. Final checkpoint
  - Chạy `npm test` backend — P1–P12 pass
  - Chạy `ng build` frontend — zero compile errors
  - Full E2E flow: deploy fresh → set INITIAL_ADMIN_EMAIL → login → verify Admin → vào Admin Panel → promote user khác → gỡ INITIAL_ADMIN_EMAIL → hệ thống vẫn hoạt động
  - Hỏi user nếu có vấn đề

## Phân công

| Task | Người làm | Deadline | Trạng thái |
|------|-----------|---------|-----------|
| 1–3 (Backend + Members Tab) | — | — | ✅ Done |
| 4 (INITIAL_ADMIN_EMAIL) | — | — | ✅ Done |
| 5 (Checkpoint bootstrap) | — | — | ✅ Done |
| 6 (Admin Panel frontend) | — | — | ✅ Done |
| 7 (Checkpoint admin panel) | — | — | ✅ Done |
| 8–9 (Tests + Final) | — | — | ✅ Done |

## Ghi chú implementation

- **`INITIAL_ADMIN_EMAIL` là optional**: Dùng `configService.get()` thay vì `getOrThrow()` — nếu không set thì bỏ qua, không throw error khi start.
- **Không log giá trị của env var**: Log rằng "initial admin was bootstrapped" nhưng không log giá trị `INITIAL_ADMIN_EMAIL` để tránh lộ email trong log aggregator.
- **Admin Panel chỉ cần cho Phase 1**: Không cần pagination hay search phức tạp — số lượng user lúc đầu nhỏ; thêm sau nếu cần.
- **Re-enable user**: `AdminService.disableAccount()` cần thêm method `enableAccount()` symmetric; nhớ xóa forced-logout flag khi re-enable.
- **Navigation guard**: Kiểm tra role từ `AuthStore` signal (không gọi API thêm); nếu AuthStore chưa có signal `currentUser`, cần thêm trước khi implement AdminGuard.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1", "2", "3"],      "note": "Đã hoàn thành" },
    { "id": 1, "tasks": ["4.1", "4.2"] },
    { "id": 2, "tasks": ["5"] },
    { "id": 3, "tasks": ["6.1", "6.2", "6.3"] },
    { "id": 4, "tasks": ["6.4"] },
    { "id": 5, "tasks": ["6.5"] },
    { "id": 6, "tasks": ["7"] },
    { "id": 7, "tasks": ["8"] },
    { "id": 8, "tasks": ["9"] }
  ]
}
```
