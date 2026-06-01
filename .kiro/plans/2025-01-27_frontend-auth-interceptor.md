# Plan: Task 15.2 — Implement Auth Interceptor

## Task ID
15.2 Implement Auth Interceptor

## Approach
Tạo Angular 19 functional interceptor (HttpInterceptorFn) sử dụng `inject()` cho DI.
Interceptor sẽ:
1. Skip auth header cho các auth endpoints (/api/auth/login, /api/auth/callback, /api/auth/refresh)
2. Attach `Authorization: Bearer <token>` cho tất cả request khác
3. Handle 401 response:
   - TOKEN_EXPIRED → trigger token refresh, retry original request
   - Khác → clear tokens, redirect to /login
4. Handle 429 response: extract Retry-After header
5. Concurrent refresh: nếu refresh đang in-progress, queue request chờ kết quả

## Files tạo mới
- `apps/frontend/src/app/auth/interceptors/auth.interceptor.ts`

## Dependencies
- Task 15.1: TokenService (`getAccessToken()`, `clearTokens()`, `refreshToken()`)
- Task 15.1: AuthService (logout/redirect methods)
- Shared types: `ErrorResponse` from `@mpm/shared-types`

## Acceptance Criteria (from Requirements)
- Req 3.3: Auto-refresh khi token sắp hết hạn
- Req 3.8: Khi refresh thất bại → clear state, redirect to login
- Req 11.4: Khi nhận 401 → xử lý theo errorCode
- Req 3.9: Concurrent refresh protection (chỉ 1 request refresh)

## Technical Decisions
- Sử dụng BehaviorSubject để track refresh state (isRefreshing)
- Sử dụng `switchMap` + `filter` pattern cho concurrent refresh queue
- Angular 19 functional interceptor pattern (không dùng class-based)
- Strict TypeScript — không dùng `any`
