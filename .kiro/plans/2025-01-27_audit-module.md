# Plan: Task 10.1 — Implement Audit Service và Controller

## Task ID
10.1

## Mô tả
Tạo Audit module hoàn chỉnh với:
- AuditLog entity (TypeORM)
- AuditQueryDto (class-validator)
- AuditService: `log()` non-blocking, error handling ghi file system
- AuditController: `GET /api/admin/audit-logs` với @Roles('Admin'), filters, pagination

## Files sẽ tạo
1. `apps/backend/src/audit/entities/audit-log.entity.ts`
2. `apps/backend/src/audit/dto/audit-query.dto.ts`
3. `apps/backend/src/audit/audit.service.ts`
4. `apps/backend/src/audit/audit.controller.ts`
5. `apps/backend/src/audit/audit.module.ts`

## Approach
- Entity: map bảng `audit_logs` đã tạo trong migration (UUID PK, event_type enum, user_id FK nullable, ip_address, user_agent, timestamp, metadata jsonb)
- Service `log()`: fire-and-forget (Promise không await), catch errors → Logger.error + ghi file
- Service `findAll()`: query với filters (user_id, event_type, startDate, endDate), pagination (page, pageSize default 20, max 100)
- Controller: `GET /api/admin/audit-logs` với @Roles('Admin'), @UseGuards(RolesGuard), ValidationPipe cho query params
- Return format: `{ data: AuditLog[], total: number, page: number, pageSize: number }`

## Acceptance Criteria (từ Requirements 10.x)
- 10.1: Ghi audit log cho các sự kiện auth
- 10.2: Mỗi record chứa event_type, user_id, ip_address, user_agent, timestamp (UTC ISO 8601), metadata
- 10.3: Lưu vào PostgreSQL với indexes
- 10.4: Admin query với filter + pagination (default 20, max 100)
- 10.5: Giữ 90 ngày trước archival
- 10.6: Nếu write thất bại → không block operation gốc, ghi lỗi vào logging riêng
- 10.7: Non-Admin → HTTP 403
- 10.8: Filter không match → empty array, total=0

## Dependencies
- Task 6.2 (Auth Controller) ✅
- Task 4.2 (Roles Guard) ✅
- User entity ✅
- Migration đã tạo bảng audit_logs ✅
