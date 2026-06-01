# Plan: Task 4.3 — Implement Project Roles Guard

## Task ID
4.3 Implement Project Roles Guard

## Approach
Tạo `@ProjectRoles()` decorator và `ProjectRolesGuard` theo pattern tương tự JwtAuthGuard đã có. Guard sẽ:
1. Đọc metadata từ `@ProjectRoles()` decorator qua Reflector
2. Extract projectId từ route params hoặc request body
3. Kiểm tra user có role phù hợp trong project đó
4. Admin bypass (systemRole === 'Admin' → always allow)
5. Log audit khi access denied

## Files sẽ tạo
1. `apps/backend/src/auth/decorators/project-roles.decorator.ts`
2. `apps/backend/src/auth/guards/project-roles.guard.ts`

## Acceptance Criteria (từ requirements)
- Req 5.4: Guard tra cứu permission matrix để xác minh Project_Role
- Req 5.5: Permission matrix đúng theo design
- Req 5.6: HTTP 403 + Audit_Log nếu không có role hoặc role không đủ quyền
- Req 8.4: Hỗ trợ `@ProjectRoles('Scrum_Master', 'Product_Owner')` decorator
- Req 8.5: Extract project ID từ route params (`:projectId`) hoặc request body
- Req 8.6: HTTP 400 nếu thiếu projectId
- Req 8.8: HTTP 403 nếu không đủ quyền

## Dependencies
- Task 4.1 (JWT Auth Guard) ✅ — đã hoàn thành
- Task 1.3 (shared types, permission matrix) ✅ — đã hoàn thành
- Task 4.2 (Roles Guard) — marked [-] nhưng không block task này

## Implementation Notes
- Guard chạy SAU JwtAuthGuard → request.user đã có
- Admin systemRole bypass project role check
- Sử dụng `hasPermission()` từ permission-matrix.ts nếu cần check resource/action
- Decorator chỉ set required roles, guard check user có role đó trong project
