# Plan: Task 14.1 — Wire tất cả components vào Auth Module

## Task ID
14.1

## Mô tả
Tạo `apps/backend/src/auth/auth.module.ts` — module chính wire tất cả authentication/authorization components lại với nhau.

## Approach
- Tạo NestJS module class `AuthModule` implements `NestModule` (để configure middleware)
- Register tất cả providers: AuthService, TokenService, SessionService, guards
- Register JwtAuthGuard as global guard via APP_GUARD provider token
- Import: TypeOrmModule.forFeature([User, ProjectMember]), ConfigModule, HttpModule, RateLimitModule
- Export: TokenService, SessionService cho các module khác sử dụng
- Configure middleware (SecurityHeaders, CORS, HTTPS Redirect) cho all routes via `configure()`

## Files tạo/sửa
- **Tạo**: `apps/backend/src/auth/auth.module.ts`

## Acceptance Criteria (từ Requirements 8.1, 8.9)
- JwtAuthGuard xác thực Access_Token cho mọi protected endpoint (global guard)
- Auth_Service xử lý authentication/authorization < 50ms per request
- All middleware registered for all routes

## Dependencies
- Task 13.1 (Security Headers, CORS) ✅ Done
- Task 13.3 (HttpExceptionFilter) — in progress (parallel), not blocking
- All services and guards already implemented
