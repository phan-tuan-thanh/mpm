# Implementation Plan: User Authentication & Authorization

## Overview

Triển khai hệ thống xác thực và phân quyền cho Agile PM sử dụng Authentik (OAuth2/OIDC), JWT token management với RS256, RBAC hai cấp (System + Project), session management qua Redis, rate limiting, và audit logging. Backend NestJS 11, Frontend Angular 19, PostgreSQL 17, Redis 7.x.

## Tasks

- [x] 1. Infrastructure setup và database migrations
  - [x] 1.1 Tạo Docker Compose services cho PostgreSQL, Redis, và Authentik
    - Thêm services `postgres`, `redis`, `authentik-server`, `authentik-worker` vào `docker/docker-compose.yml`
    - Cấu hình environment variables cho kết nối giữa các services
    - Tạo `.env.example` với tất cả biến môi trường cần thiết (DB credentials, Redis URL, Authentik client ID/secret, JWT keys path)
    - _Requirements: 1.1, 9.4, 12.3_

  - [x] 1.2 Tạo database migrations cho User, ProjectMember, Invitation, AuditLog entities
    - Tạo migration file trong `migrations/` với TypeORM CLI
    - Tạo bảng `users` với columns: id (UUID PK), external_id (unique), email (unique), display_name, avatar_url, system_role (enum), is_active (boolean), created_at, updated_at
    - Tạo bảng `project_members` với columns: id (UUID PK), user_id (FK), project_id (UUID), project_role (enum), created_at; unique constraint trên (user_id, project_id)
    - Tạo bảng `invitations` với columns: id (UUID PK), project_id, email, project_role, token (unique, min 32 chars), status (enum), invited_by (FK), accepted_by (FK nullable), expires_at, created_at, updated_at
    - Tạo bảng `audit_logs` với columns: id (UUID PK), event_type (enum), user_id (FK nullable), ip_address, user_agent, timestamp (UTC), metadata (jsonb)
    - Tạo tất cả indexes theo design: idx_user_external_id, idx_user_email, idx_project_member_unique, idx_project_member_project, idx_invitation_token, idx_invitation_project_status, idx_invitation_email_project, idx_audit_log_user, idx_audit_log_event_type, idx_audit_log_timestamp, idx_audit_log_composite
    - _Requirements: 1.4, 5.1, 7.1, 10.3_

  - [x] 1.3 Tạo shared interfaces, types, và constants
    - Tạo `libs/shared-types/src/auth.types.ts` với interfaces: JwtPayload, ProjectRoleEntry, SessionData, ErrorResponse
    - Tạo type definitions: SystemRole, ProjectRole, Resource, Action, PermissionMatrix
    - Tạo `apps/backend/src/auth/constants/permission-matrix.ts` với permission matrix theo design
    - Tạo `apps/backend/src/auth/constants/auth-events.ts` với enum cho audit event types
    - _Requirements: 3.2, 4.1, 5.5_

- [x] 2. Checkpoint - Verify infrastructure
  - Ensure Docker Compose starts successfully, migrations run without errors, và shared types compile. Ask the user if questions arise.

- [x] 3. Auth module core — Token Service và Session Service
  - [x] 3.1 Implement Token Service (JWT sign/verify với RS256)
    - Tạo `apps/backend/src/auth/token.service.ts`
    - Implement `signAccessToken(payload: JwtPayload): string` — ký JWT với RS256 private key, exp = 15 phút
    - Implement `verifyAccessToken(token: string): JwtPayload` — verify signature với public key, check exp
    - Implement `generateRefreshToken(): { token: string, hash: string }` — tạo random token (min 32 chars) và hash
    - Implement `verifyRefreshToken(token: string, hash: string): boolean`
    - Load RSA keys từ file path configured qua environment variables
    - _Requirements: 3.1, 3.2, 3.7_

  - [ ]* 3.2 Write property tests cho Token Service
    - **Property 1: JWT Payload Round-Trip** — Sign rồi verify phải trả về claims giống hệt payload gốc
    - **Property 2: JWT Contains All Required Claims** — Token phải chứa đúng sub, email, systemRole, projectRoles, iat, exp
    - **Property 3: Invalid Token Rejection** — Token bị tamper signature, expired, hoặc malformed phải bị reject
    - **Validates: Requirements 3.1, 3.2, 3.7, 1.8, 8.3**

  - [x] 3.3 Implement Session Service (Redis session management)
    - Tạo `apps/backend/src/auth/session.service.ts`
    - Implement `createSession(userId, deviceInfo, ipAddress, refreshTokenHash): SessionData` — lưu vào Redis với TTL 7 ngày
    - Implement `getSession(userId, sessionId): SessionData | null`
    - Implement `listSessions(userId): SessionData[]` — trả về tối đa 50 sessions
    - Implement `updateLastActivity(userId, sessionId): void`
    - Implement `revokeSession(userId, sessionId): void` — xóa session, thêm refresh token vào blacklist
    - Implement `revokeAllSessions(userId): void` — xóa tất cả sessions của user
    - Implement `addToForcedLogout(userId): void` — thêm vào forced-logout list với TTL 15 phút
    - Implement `isForceLoggedOut(userId): boolean`
    - Implement `blacklistRefreshToken(tokenHash, ttl): void`
    - Implement `isRefreshTokenBlacklisted(tokenHash): boolean`
    - _Requirements: 2.3, 2.4, 2.5, 3.6, 11.1, 11.2, 11.5_

  - [ ]* 3.4 Write property tests cho Session Service
    - **Property 10: Session Revocation Removes Access** — Sau khi revoke, session không còn trong Redis và refresh token nằm trong blacklist
    - **Property 11: Security Event Triggers Full Session Invalidation** — Khi security event xảy ra, tất cả sessions bị xóa, user vào forced-logout list
    - **Property 12: Forced-Logout Flag Blocks All Requests** — User trong forced-logout list phải bị reject mọi request
    - **Validates: Requirements 2.1, 2.5, 11.1, 11.2, 11.3, 11.5**

- [x] 4. Auth module — Guards và Decorators
  - [x] 4.1 Implement JWT Auth Guard và decorators
    - Tạo `apps/backend/src/auth/guards/jwt-auth.guard.ts` — validate Access Token từ Authorization header (Bearer scheme)
    - Kiểm tra forced-logout list trước khi cho phép request
    - Gắn user info (id, email, systemRole, projectRoles) vào request context
    - Tạo `apps/backend/src/auth/decorators/public.decorator.ts` — @Public() decorator bypass authentication
    - Tạo `apps/backend/src/auth/decorators/current-user.decorator.ts` — @CurrentUser() extract user từ request
    - Trả về error codes phân biệt: TOKEN_MISSING, TOKEN_EXPIRED, TOKEN_INVALID, SESSION_REVOKED
    - _Requirements: 8.1, 8.2, 8.3, 8.7, 11.5_

  - [x] 4.2 Implement Roles Guard (System Role)
    - Tạo `apps/backend/src/auth/guards/roles.guard.ts`
    - Tạo `apps/backend/src/auth/decorators/roles.decorator.ts` — @Roles('Admin') decorator
    - Check user.systemRole against required roles
    - Trả về HTTP 403 với error code INSUFFICIENT_ROLE nếu không đủ quyền
    - Ghi Audit_Log khi access bị denied
    - _Requirements: 4.1, 4.5, 8.4, 8.8_

  - [x] 4.3 Implement Project Roles Guard
    - Tạo `apps/backend/src/auth/guards/project-roles.guard.ts`
    - Tạo `apps/backend/src/auth/decorators/project-roles.decorator.ts` — @ProjectRoles('Scrum_Master', 'Product_Owner')
    - Extract projectId từ route params (`:projectId`) hoặc request body
    - Tra cứu permission matrix để verify quyền truy cập
    - Trả về HTTP 400 nếu thiếu projectId, HTTP 403 nếu không đủ quyền
    - Ghi Audit_Log khi access bị denied
    - _Requirements: 5.4, 5.5, 5.6, 8.4, 8.5, 8.6, 8.8_

  - [ ]* 4.4 Write property tests cho Guards
    - **Property 6: Permission Matrix Correctness** — Verify permission check trả về đúng kết quả cho mọi (role, resource, action) tuple
    - **Property 7: System Role Guard Enforcement** — Admin-only endpoint chỉ cho Admin access, User bị 403
    - **Property 8: Project Role Guard Enforcement** — Project-scoped endpoint chỉ cho user có đúng role trong project
    - **Property 9: @Public Decorator Bypasses Authentication** — Public endpoint cho phép request không có token
    - **Validates: Requirements 4.1, 4.5, 5.4, 5.5, 5.6, 8.4, 8.7, 8.8**

- [x] 5. Checkpoint - Verify core auth services
  - Ensure all tests pass cho Token Service, Session Service, và Guards. Ask the user if questions arise.

- [x] 6. Auth module — Controller và OAuth flow
  - [x] 6.1 Implement Auth Service (orchestrates auth flow)
    - Tạo `apps/backend/src/auth/auth.service.ts`
    - Implement `handleCallback(code, state)` — exchange code với Authentik, validate ID token, upsert user, generate tokens, create session
    - Implement `refreshTokens(refreshToken, ipAddress, deviceInfo)` — validate refresh token, rotation, blacklist old token
    - Implement `logout(userId, sessionId)` — revoke session, notify Authentik end-session
    - Implement `handleTokenTheft(userId)` — revoke all sessions, add to forced-logout, audit log
    - Implement `handleSecurityEvent(userId, eventType)` — full session invalidation within 5 seconds
    - Timeout 10 giây cho Authentik calls, graceful degradation cho logout
    - _Requirements: 1.3, 1.4, 1.5, 1.7, 1.8, 1.10, 2.1, 2.7, 3.4, 3.5, 11.1, 11.2, 11.3_

  - [x] 6.2 Implement Auth Controller (REST endpoints)
    - Tạo `apps/backend/src/auth/auth.controller.ts`
    - `GET /api/auth/login` — @Public(), redirect to Authentik authorize URL với state parameter
    - `POST /api/auth/callback` — @Public(), exchange code, return accessToken + set refreshToken cookie
    - `POST /api/auth/refresh` — extract refreshToken từ httpOnly cookie, perform rotation
    - `POST /api/auth/logout` — revoke current session
    - `GET /api/auth/sessions` — list active sessions (max 50)
    - `DELETE /api/auth/sessions/:sessionId` — revoke specific session
    - Set cookie flags: httpOnly, Secure, SameSite=Strict, Path=/api/auth/refresh, Max-Age=604800
    - _Requirements: 1.1, 1.2, 1.5, 1.6, 2.1, 2.4, 2.5, 12.2_

  - [x] 6.3 Implement DTOs và validation
    - Tạo `apps/backend/src/auth/dto/auth-callback.dto.ts` — validate code (string, required), state (string, required)
    - Tạo `apps/backend/src/auth/dto/login-response.dto.ts` — accessToken field
    - Tạo `apps/backend/src/auth/dto/session-list.dto.ts` — array of session info
    - Sử dụng class-validator decorators cho validation
    - _Requirements: 1.2, 1.9, 2.4_

  - [ ]* 6.4 Write property tests cho OAuth flow
    - **Property 19: OAuth State Parameter Validation** — Callback với state không khớp phải bị reject
    - **Property 4: Token Rotation Produces New Valid Pair and Blacklists Old** — Refresh phải tạo token mới, blacklist token cũ
    - **Property 5: Revoked Refresh Token Reuse Triggers Full Invalidation** — Token đã revoke bị reuse phải trigger full invalidation
    - **Property 22: Default Role Assignment for New Users** — User mới từ Authentik phải có systemRole = User
    - **Property 23: Email Sync from Authentik on Login** — Email trong DB phải sync với Authentik email claim
    - **Validates: Requirements 1.9, 3.4, 3.5, 4.2, 6.3**

- [x] 7. Rate Limiting module
  - [x] 7.1 Implement Rate Limit Service và Guard
    - Tạo `apps/backend/src/rate-limit/rate-limit.module.ts`
    - Tạo `apps/backend/src/rate-limit/rate-limit.service.ts` — Redis counter với sliding window
    - Implement `checkLoginRateLimit(ip): { allowed: boolean, retryAfter?: number }` — max 5 attempts / 15 min per IP
    - Implement `checkRefreshRateLimit(userId): { allowed: boolean, retryAfter?: number }` — max 10 requests / 1 min per user
    - Implement `incrementLoginCounter(ip): void`
    - Implement `incrementRefreshCounter(userId): void`
    - Tạo `apps/backend/src/rate-limit/rate-limit.guard.ts` — apply rate limiting, return HTTP 429 với Retry-After header
    - Handle Redis unavailable → return HTTP 503 (fail-closed)
    - Ghi Audit_Log khi rate limit triggered
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

  - [ ]* 7.2 Write property tests cho Rate Limiter
    - **Property 13: Rate Limiter Enforces Configured Limits** — Sau 5 failed logins, attempt thứ 6 phải bị reject với 429 và Retry-After header chính xác
    - **Validates: Requirements 9.1, 9.2, 9.3**

- [x] 8. Profile module
  - [x] 8.1 Implement Profile Service và Controller
    - Tạo `apps/backend/src/profile/profile.module.ts`, `profile.service.ts`, `profile.controller.ts`
    - `GET /api/profile` — trả về display_name, email, avatar_url, system_role, danh sách projects + roles
    - `PATCH /api/profile` — update display_name (1-100 chars) và/hoặc avatar_url (http/https, max 2048 chars)
    - Validate input với class-validator: display_name @Length(1, 100), avatar_url @IsUrl({protocols: ['http', 'https']}) @MaxLength(2048)
    - Skip database write nếu không có thay đổi so với data hiện tại
    - Tạo DTOs: `update-profile.dto.ts`, `profile-response.dto.ts`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ]* 8.2 Write property tests cho Profile validation
    - **Property 14: Profile Validation Accepts Valid and Rejects Invalid Input** — display_name 1-100 chars accepted, empty/over 100 rejected; avatar URL http/https ≤2048 accepted, otherwise rejected
    - **Validates: Requirements 6.2, 6.4**

- [x] 9. Invitation module
  - [x] 9.1 Implement Invitation Service và Controller
    - Tạo `apps/backend/src/invitation/invitation.module.ts`, `invitation.service.ts`, `invitation.controller.ts`
    - `POST /api/projects/:projectId/invitations` — @ProjectRoles('Scrum_Master') hoặc @Roles('Admin'), tạo invitation với token random 32+ chars, expires 7 ngày
    - `GET /api/projects/:projectId/invitations` — list invitations với pagination (max 50/page)
    - `POST /api/invitations/:token/accept` — accept invitation, gán project role, mark as accepted
    - `DELETE /api/projects/:projectId/invitations/:id` — cancel pending invitation
    - Check duplicate: email đã là member hoặc có pending invitation → HTTP 409
    - Check expired → HTTP 410, already accepted → HTTP 409
    - Handle unauthenticated user: redirect to login, process invitation after auth
    - Tạo DTOs: `create-invitation.dto.ts`, `invitation-response.dto.ts`
    - Tạo entity: `apps/backend/src/invitation/entities/invitation.entity.ts`
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9_

  - [ ]* 9.2 Write property tests cho Invitation
    - **Property 15: Invitation Lifecycle State Machine** — pending → accepted (before expiry), pending → expired (after expiry), pending → cancelled; accepted/expired/cancelled không thể accept
    - **Property 16: Duplicate Invitation Prevention** — Email đã là member hoặc có pending invite → reject với 409
    - **Validates: Requirements 7.3, 7.5, 7.6, 7.7, 7.9**

- [x] 10. Audit Log module
  - [x] 10.1 Implement Audit Service và Controller
    - Tạo `apps/backend/src/audit/audit.module.ts`, `audit.service.ts`, `audit.controller.ts`
    - Implement `log(eventType, userId, ipAddress, userAgent, metadata): void` — non-blocking write to PostgreSQL
    - Implement error handling: nếu write thất bại, log to file system, không block operation gốc
    - `GET /api/admin/audit-logs` — @Roles('Admin'), filter by user_id, event_type, time_range; pagination (default 20, max 100 per page)
    - Trả về empty array với total=0 khi filter không match
    - Tạo entity: `apps/backend/src/audit/entities/audit-log.entity.ts` (nếu chưa có trong auth module)
    - Tạo DTO: `audit-query.dto.ts`
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8_

  - [ ]* 10.2 Write property tests cho Audit Log
    - **Property 17: Audit Log Record Completeness** — Mọi audit record phải chứa event_type, user_id (if applicable), ip_address, user_agent, timestamp (UTC ISO 8601), metadata
    - **Property 18: Audit Log Query Filtering and Pagination** — Query với filters trả về đúng records matching, ordered by timestamp desc, count ≤ page_size
    - **Validates: Requirements 10.1, 10.2, 10.4**

- [x] 11. Admin module — User management
  - [x] 11.1 Implement Admin Controller
    - Tạo admin endpoints trong auth module hoặc separate admin module
    - `GET /api/admin/users` — @Roles('Admin'), list all users
    - `PATCH /api/admin/users/:id/role` — @Roles('Admin'), change system role, revoke all tokens, audit log
    - `POST /api/admin/users/:id/disable` — @Roles('Admin'), disable account, full session invalidation
    - Implement last-admin protection: không cho phép hạ role Admin cuối cùng
    - _Requirements: 4.1, 4.3, 4.4, 11.2_

- [x] 12. Checkpoint - Verify all backend modules
  - Ensure all tests pass cho tất cả backend modules. Ask the user if questions arise.

- [x] 13. Security middleware và global configuration
  - [x] 13.1 Implement Security Headers và CORS
    - Tạo NestJS middleware hoặc interceptor cho security headers: X-Content-Type-Options: nosniff, X-Frame-Options: DENY, Strict-Transport-Security: max-age=31536000; includeSubDomains
    - Configure CORS policy: chỉ allow origins từ environment variable `ALLOWED_ORIGINS`
    - Reject requests từ origin không được phép với HTTP 403
    - Configure HTTPS redirect trong production
    - _Requirements: 12.3, 12.4, 12.5, 12.6_

  - [ ]* 13.2 Write property tests cho Security Headers và CORS
    - **Property 20: CORS Policy Enforcement** — Origin trong allowed list → response có Access-Control-Allow-Origin; origin không trong list → 403 không có ACAO header
    - **Property 21: Security Headers Present in All Responses** — Mọi response phải có X-Content-Type-Options: nosniff, X-Frame-Options: DENY, HSTS header
    - **Validates: Requirements 12.4, 12.5, 12.6**

  - [x] 13.3 Implement Global Exception Filter
    - Tạo `apps/backend/src/auth/filters/http-exception.filter.ts`
    - Format tất cả error responses theo ErrorResponse interface: statusCode, error, message, errorCode, timestamp
    - Trigger audit log cho 401/403 responses (non-blocking)
    - Không trả về stack trace trong production
    - _Requirements: 1.7, 8.3, 8.8_

- [x] 14. Auth Module wiring (NestJS module registration)
  - [x] 14.1 Wire tất cả components vào Auth Module
    - Tạo `apps/backend/src/auth/auth.module.ts` — register providers, controllers, guards, imports
    - Register JwtAuthGuard as global guard (APP_GUARD)
    - Register RateLimitGuard trên auth endpoints
    - Import TypeORM entities, Redis module
    - Configure JWT module với RS256 keys
    - Export services cho các module khác sử dụng (AuditService, RbacService)
    - _Requirements: 8.1, 8.9_

- [x] 15. Frontend — Auth module core
  - [x] 15.1 Implement Angular Auth Service và Token Service
    - Tạo `apps/frontend/src/app/auth/services/auth.service.ts` — Signal-based auth state (isAuthenticated, currentUser, isLoading)
    - Tạo `apps/frontend/src/app/auth/services/token.service.ts` — lưu Access Token trong memory (private variable), không dùng localStorage/sessionStorage
    - Implement `getAccessToken(): string | null`
    - Implement `setAccessToken(token: string): void`
    - Implement `clearTokens(): void`
    - Implement `isTokenExpiringSoon(): boolean` — check < 2 phút trước exp
    - Implement concurrent refresh protection: chỉ 1 refresh request tại một thời điểm, các request khác chờ kết quả
    - _Requirements: 1.6, 3.3, 3.8, 3.9, 12.1_

  - [x] 15.2 Implement Auth Interceptor
    - Tạo `apps/frontend/src/app/auth/interceptors/auth.interceptor.ts`
    - Attach Bearer token vào mọi request (trừ auth endpoints)
    - Handle 401 response: nếu TOKEN_EXPIRED → trigger refresh; nếu khác → clear state, redirect to login
    - Handle 429 response: hiển thị countdown timer từ Retry-After header
    - _Requirements: 3.3, 3.8, 11.4_

  - [x] 15.3 Implement Auth Guard và Role Guard (Angular)
    - Tạo `apps/frontend/src/app/auth/guards/auth.guard.ts` — CanActivate, redirect to login nếu chưa authenticated
    - Tạo `apps/frontend/src/app/auth/guards/role.guard.ts` — check system role hoặc project role
    - _Requirements: 8.1, 8.4_

- [x] 16. Frontend — Login và Callback pages
  - [x] 16.1 Implement Login Page
    - Tạo `apps/frontend/src/app/auth/pages/login/login.component.ts` — standalone component
    - Hiển thị nút "Đăng nhập với Authentik"
    - On click: generate state parameter (crypto.randomUUID), save to sessionStorage, redirect to Authentik authorize URL
    - Hiển thị error messages từ query params (nếu redirect back với error)
    - Tailwind CSS styling
    - _Requirements: 1.1, 1.2_

  - [x] 16.2 Implement Callback Page
    - Tạo `apps/frontend/src/app/auth/pages/callback/callback.component.ts` — standalone component
    - Extract code và state từ URL query params
    - Verify state matches sessionStorage value → nếu không khớp, redirect to login với error
    - Call `POST /api/auth/callback` với code và state
    - On success: store accessToken in memory, redirect to dashboard
    - On error: hiển thị error message phân loại (invalid_code, provider_error, timeout)
    - _Requirements: 1.2, 1.6, 1.7, 1.9, 1.10_

  - [x] 16.3 Implement Auth Routes (lazy-loaded)
    - Tạo `apps/frontend/src/app/auth/auth.routes.ts` — lazy-loaded routes cho /login, /callback
    - Tạo `apps/frontend/src/app/auth/state/auth.store.ts` — Signal-based store cho auth state
    - _Requirements: 1.1, 1.6_

- [x] 17. Checkpoint - Verify frontend auth flow
  - Ensure frontend components compile, unit tests pass. Ask the user if questions arise.

- [x] 18. Integration wiring và E2E tests
  - [x] 18.1 Wire frontend và backend together
    - Configure Angular proxy config cho development (proxy `/api` to NestJS backend)
    - Configure environment files với Authentik URLs, API base URL
    - Verify full OAuth flow: login → Authentik → callback → token → dashboard
    - _Requirements: 1.1, 1.6_

  - [ ]* 18.2 Write E2E tests cho auth flows
    - Test full OAuth login flow (với mocked Authentik)
    - Test token refresh cycle (multiple rotations)
    - Test session management (create, list, revoke)
    - Test RBAC enforcement (system role + project role)
    - Test rate limiting (counter increment, 429 response)
    - Test invitation flow (create, accept, expire)
    - _Requirements: 1.1-1.10, 2.1-2.7, 3.1-3.9, 4.1-4.5, 5.1-5.7, 7.1-7.9, 9.1-9.6_

- [x] 19. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties defined in the design document (23 properties total)
- Unit tests validate specific examples and edge cases
- Backend uses NestJS 11 + TypeScript 5.x + TypeORM + Redis (ioredis)
- Frontend uses Angular 19 + Signals + Tailwind CSS 4.x
- Testing: Jest + fast-check (property-based testing)
- All tokens stored securely: Access Token in memory, Refresh Token in httpOnly cookie
- Redis keys follow patterns defined in design: session:{userId}:{sessionId}, refresh_blacklist:{tokenHash}, forced_logout:{userId}, rate:login:{ip}, rate:refresh:{userId}

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.3"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["3.1", "3.3"] },
    { "id": 3, "tasks": ["3.2", "3.4", "4.1"] },
    { "id": 4, "tasks": ["4.2", "4.3"] },
    { "id": 5, "tasks": ["4.4", "6.1", "7.1"] },
    { "id": 6, "tasks": ["6.2", "6.3", "7.2", "8.1"] },
    { "id": 7, "tasks": ["6.4", "8.2", "9.1", "10.1"] },
    { "id": 8, "tasks": ["9.2", "10.2", "11.1", "13.1"] },
    { "id": 9, "tasks": ["13.2", "13.3", "14.1"] },
    { "id": 10, "tasks": ["15.1", "15.2", "15.3"] },
    { "id": 11, "tasks": ["16.1", "16.2", "16.3"] },
    { "id": 12, "tasks": ["18.1"] },
    { "id": 13, "tasks": ["18.2"] }
  ]
}
```
