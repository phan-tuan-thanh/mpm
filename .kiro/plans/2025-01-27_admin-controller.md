# Plan: Task 11.1 — Implement Admin Controller

## Task ID
11.1 Implement Admin Controller

## Approach
Tạo separate admin module (`apps/backend/src/admin/`) với controller, service, DTO. Module sẽ import TypeORM User entity, SessionService, và AuditService.

## Files sẽ tạo
1. `apps/backend/src/admin/admin.module.ts` — NestJS module registration
2. `apps/backend/src/admin/admin.controller.ts` — REST endpoints
3. `apps/backend/src/admin/admin.service.ts` — Business logic
4. `apps/backend/src/admin/dto/change-role.dto.ts` — DTO cho PATCH role endpoint

## Endpoints
- `GET /api/admin/users` — @Roles('Admin'), list all users (id, email, displayName, systemRole, isActive, createdAt)
- `PATCH /api/admin/users/:id/role` — @Roles('Admin'), change system role, revoke all tokens, audit log
- `POST /api/admin/users/:id/disable` — @Roles('Admin'), disable account, full session invalidation

## Acceptance Criteria (from Requirements)
- Req 4.1: Admin có quyền truy cập tất cả endpoint quản trị
- Req 4.3: Khi thay đổi role → update DB, revoke all tokens, audit log
- Req 4.4: Last-admin protection — không cho hạ role Admin cuối cùng
- Req 11.2: Disable account → revoke all tokens, forced-logout, xóa sessions

## Dependencies
- Task 3.3 (SessionService) ✅ Done
- Task 4.2 (RolesGuard + @Roles decorator) ✅ Done
- Task 10.1 (AuditService) ✅ Done
- User entity ✅ Exists

## Implementation Details
- AdminService sẽ inject UserRepository, SessionService, AuditService
- Last-admin protection: count users WHERE systemRole='Admin' AND isActive=true
- Disable: set isActive=false, revokeAllSessions, addToForcedLogout, audit log
- Change role: update systemRole, revokeAllSessions (force re-login with new claims), audit log
