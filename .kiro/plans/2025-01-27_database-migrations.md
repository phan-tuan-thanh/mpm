# Plan: Task 1.2 — Database Migrations

## Task ID
1.2 Tạo database migrations cho User, ProjectMember, Invitation, AuditLog entities

## Approach
Tạo một TypeORM migration file sử dụng raw SQL để có toàn quyền kiểm soát schema, indexes, và constraints. Migration sẽ:
1. Tạo extension `uuid-ossp` (hoặc dùng `gen_random_uuid()` từ pgcrypto)
2. Tạo các PostgreSQL enum types
3. Tạo 4 bảng: users, project_members, invitations, audit_logs
4. Tạo tất cả indexes theo design document

## Files tạo/sửa
- `migrations/1706345600000-CreateAuthTables.ts` — TypeORM migration class

## Acceptance Criteria (từ requirements)
- Req 1.4: User profile lưu trong PostgreSQL (external_id, email, display_name, avatar_url)
- Req 5.1: Project roles (Scrum_Master, Product_Owner, Developer, QA, Stakeholder), mỗi user chỉ 1 role/project
- Req 7.1: Invitation record với email, project_role, project_id, invited_by, expires_at, token unique 32+ chars
- Req 10.3: Audit log với index trên user_id, event_type, timestamp

## Dependencies
- Task 1.1 (Docker Compose) ✅ Done
- Task 1.3 (Shared types) ✅ Done

## Enum Values
- system_role_enum: 'Admin', 'User'
- project_role_enum: 'Scrum_Master', 'Product_Owner', 'Developer', 'QA', 'Stakeholder'
- invitation_status_enum: 'pending', 'accepted', 'expired', 'cancelled'
- audit_event_type_enum: 20 values from AuthEvent constant
