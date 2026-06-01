# Plan: Task 6.1 — Implement Auth Service

## Task ID
6.1 Implement Auth Service (orchestrates auth flow)

## Approach
Tạo `AuthService` là service trung tâm điều phối toàn bộ authentication flow:
- Exchange authorization code với Authentik
- Validate ID token, upsert user
- Generate token pair, create session
- Token refresh với rotation
- Logout với graceful degradation
- Token theft detection và security event handling

## Files to Create
1. `apps/backend/src/auth/entities/user.entity.ts` — TypeORM User entity
2. `apps/backend/src/auth/auth.service.ts` — Main auth service

## Dependencies
- TokenService (task 3.1 ✅)
- SessionService (task 3.3 ✅)
- Shared types (task 1.3 ✅)
- Auth events constants (task 1.3 ✅)

## Acceptance Criteria (from Requirements)
- 1.3: Exchange code lấy ID token trong 10 giây
- 1.4: Upsert user từ ID token claims
- 1.5: Phát hành Access Token (15min) + Refresh Token (7 days)
- 1.7: Trả HTTP 401 khi code không hợp lệ
- 1.8: Reject ID token có signature/expiry không hợp lệ
- 1.10: HTTP 502 khi Authentik timeout 10s
- 2.1: Logout revoke session + notify Authentik end-session
- 2.7: Graceful degradation nếu Authentik end-session timeout 5s
- 3.4: Token rotation — new pair + blacklist old
- 3.5: Revoked token reuse → full invalidation
- 11.1: Security event → revoke all + forced-logout within 5s
- 11.2: Admin disable → same as 11.1
- 11.3: Token theft → revoke all + forced-logout + audit log

## Key Design Decisions
- HttpService (axios) cho Authentik calls với 10s timeout
- 5s timeout cho end-session (graceful)
- TypeORM Repository<User> cho user upsert
- Logger thay AuditService (sẽ wire sau)
- No `any` types — strict TypeScript
