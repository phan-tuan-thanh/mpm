# Plan: Task 4.2 — Implement Roles Guard (System Role)

## Task ID
4.2

## Approach
Tạo `@Roles()` decorator để set metadata với required system roles, và `RolesGuard` (CanActivate) để kiểm tra `request.user.systemRole` against required roles. Guard chạy SAU JwtAuthGuard nên `request.user` đã được populate.

## Files tạo mới
1. `apps/backend/src/auth/decorators/roles.decorator.ts` — @Roles('Admin') decorator
2. `apps/backend/src/auth/guards/roles.guard.ts` — RolesGuard (CanActivate)

## Acceptance Criteria (từ Requirements)
- 4.1: Hỗ trợ hai System_Role: Admin và User
- 4.5: User không có Admin role gửi request đến admin endpoint → HTTP 403 + Audit_Log
- 8.4: Hỗ trợ decorator-based authorization: @Roles('Admin')
- 8.8: Token hợp lệ nhưng không có required role → HTTP 403

## Dependencies
- Task 4.1 (JWT Auth Guard + decorators) — ✅ Done
- RequestUser interface từ current-user.decorator.ts
- SystemRole type từ @mpm/shared-types
- AuthEvent.ACCESS_DENIED từ auth-events.ts

## Implementation Details
- Decorator: `SetMetadata(ROLES_KEY, roles)` — nhận array SystemRole
- Guard: Reflector.getAllAndOverride để đọc metadata
- Nếu không có metadata → cho qua (endpoint không yêu cầu role)
- Nếu user.systemRole không nằm trong required roles → ForbiddenException với errorCode INSUFFICIENT_ROLE
- Ghi audit log (Logger) khi access denied — AuditService sẽ wire sau
