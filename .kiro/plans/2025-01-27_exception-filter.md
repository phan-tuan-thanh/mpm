# Plan: Task 13.3 — Implement Global Exception Filter

## Task ID
13.3 Implement Global Exception Filter

## Approach
Tạo NestJS ExceptionFilter sử dụng `@Catch(HttpException)` để format tất cả HTTP exceptions theo ErrorResponse interface từ `@mpm/shared-types`. Filter sẽ:
1. Catch tất cả HttpException
2. Format response theo ErrorResponse: statusCode, error, message, errorCode, timestamp
3. Trigger audit log (non-blocking) cho 401/403 responses
4. Ẩn stack trace trong production (NODE_ENV === 'production')
5. Include stack trace trong development cho debugging

## Files sẽ tạo
- `apps/backend/src/auth/filters/http-exception.filter.ts`

## Acceptance Criteria (từ requirements)
- Req 1.7: Error response chứa mã phân loại lỗi
- Req 8.3: Error response chỉ rõ nguyên nhân (TOKEN_MISSING, TOKEN_EXPIRED, TOKEN_INVALID)
- Req 8.8: Error response chỉ rõ nguyên nhân không đủ quyền
- Coding standards: Không trả về stack trace trong production

## Dependencies
- Task 10.1 (AuditService) — ✅ Done
- Task 13.1 (Security Headers) — ✅ Done
- ErrorResponse interface từ @mpm/shared-types — ✅ Available

## Implementation Details
- Sử dụng `@Catch(HttpException)` decorator
- Inject `AuditService` qua constructor (optional injection vì filter có thể được dùng trước khi AuditService available)
- Extract errorCode từ exception response nếu có, otherwise generate từ HTTP status
- Audit log cho 401/403: fire-and-forget, sử dụng AuditService.log()
- NODE_ENV check cho stack trace inclusion
