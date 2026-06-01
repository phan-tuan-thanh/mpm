# Plan: Task 6.2 — Implement Auth Controller (REST endpoints)

## Task ID
6.2

## Approach
Tạo Auth Controller với 6 endpoints theo design document:
- `GET /api/auth/login` — redirect to Authentik
- `POST /api/auth/callback` — exchange code, return tokens
- `POST /api/auth/refresh` — token rotation via cookie
- `POST /api/auth/logout` — revoke session
- `GET /api/auth/sessions` — list active sessions
- `DELETE /api/auth/sessions/:sessionId` — revoke specific session

Cookie configuration: httpOnly, Secure (prod), SameSite=Strict, Path=/api/auth/refresh, Max-Age=604800

## Files to Create/Modify
- **Create**: `apps/backend/src/auth/auth.controller.ts`

## Dependencies
- AuthService (task 6.1) ✅ — handleCallback, refreshTokens, logout
- SessionService (task 3.3) ✅ — listSessions, revokeSession
- @Public() decorator (task 4.1) ✅
- @CurrentUser() decorator (task 4.1) ✅
- RateLimitGuard + @RateLimit() (task 7.1) ✅
- ConfigService — environment variables

## Acceptance Criteria (from Requirements)
- 1.1: Login page redirects to Authentik
- 1.2: State parameter for CSRF protection
- 1.5: Issue Access Token + Refresh Token pair
- 1.6: Store Refresh Token in httpOnly secure cookie
- 2.1: Logout revokes session
- 2.4: List active sessions (max 50)
- 2.5: Revoke specific session
- 12.2: Cookie flags: httpOnly, Secure, SameSite=Strict, Path=/api/auth/refresh, Max-Age=604800
