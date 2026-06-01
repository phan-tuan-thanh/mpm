# Plan: Task 3.3 — Implement Session Service

## Task ID
3.3 Implement Session Service (Redis session management)

## Approach
Tạo `SessionService` sử dụng NestJS `@Injectable()` decorator, inject Redis client (ioredis) qua constructor. Service quản lý session data trong Redis với các key patterns theo design document.

## Files sẽ tạo
- `apps/backend/src/auth/session.service.ts` — Main session service

## Redis Key Patterns
| Key Pattern | Type | TTL |
|-------------|------|-----|
| `session:{userId}:{sessionId}` | Hash | 7 days (604800s) |
| `refresh_blacklist:{tokenHash}` | String | Remaining token TTL |
| `forced_logout:{userId}` | String | 15 min (900s) |

## Methods
1. `createSession(userId, deviceInfo, ipAddress, refreshTokenHash): SessionData`
2. `getSession(userId, sessionId): SessionData | null`
3. `listSessions(userId): SessionData[]` — max 50
4. `updateLastActivity(userId, sessionId): void`
5. `revokeSession(userId, sessionId): void` — delete + blacklist refresh token
6. `revokeAllSessions(userId): void`
7. `addToForcedLogout(userId): void` — TTL 15 min
8. `isForceLoggedOut(userId): boolean`
9. `blacklistRefreshToken(tokenHash, ttl): void`
10. `isRefreshTokenBlacklisted(tokenHash): boolean`

## Acceptance Criteria (from requirements)
- 2.3: Session stored in Redis with TTL = 7 days, update lastActivity on API use
- 2.4: List max 50 active sessions
- 2.5: Revoke session = delete from Redis + blacklist refresh token
- 3.6: Maintain revoked refresh token list in Redis with remaining TTL
- 11.1: Full session invalidation + forced-logout list (TTL 15 min)
- 11.2: Same as 11.1 for admin disable
- 11.5: Forced-logout flag blocks all requests

## Dependencies
- Task 1.3 (shared types) ✅ Done
- Redis (ioredis) — inject via constructor
