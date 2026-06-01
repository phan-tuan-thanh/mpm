# Plan: Task 7.1 — Implement Rate Limit Service và Guard

## Task ID
7.1 Implement Rate Limit Service và Guard

## Approach
Tạo rate-limit module với 3 files:
1. **rate-limit.service.ts** — Redis counter với sliding window (INCR + EXPIRE)
2. **rate-limit.guard.ts** — NestJS CanActivate guard, apply rate limiting dựa trên endpoint metadata
3. **rate-limit.module.ts** — NestJS module wiring

Sử dụng custom decorator `@RateLimit()` để đánh dấu endpoint với loại rate limit (login/refresh).

## Files sẽ tạo
- `apps/backend/src/rate-limit/rate-limit.module.ts`
- `apps/backend/src/rate-limit/rate-limit.service.ts`
- `apps/backend/src/rate-limit/rate-limit.guard.ts`

## Acceptance Criteria (từ Requirements 9.1-9.6)
- Login rate limit: max 5 failed attempts per IP / 15 min
- Refresh rate limit: max 10 requests per user / 1 min
- HTTP 429 với Retry-After header khi limit exceeded
- Redis unavailable → HTTP 503 (fail-closed)
- Audit log khi rate limit triggered
- Counter NOT reset on success (chỉ reset khi TTL hết)

## Dependencies
- Task 3.1 (Token Service) ✅
- Task 3.3 (Session Service) ✅
- Task 4.1-4.3 (Guards) ✅
- Redis module (@nestjs-modules/ioredis) ✅
- ConfigService ✅

## Design Decisions
- Sử dụng Redis INCR + EXPIRE (atomic counter with TTL) thay vì sliding window log
- Custom decorator `@RateLimit('login' | 'refresh')` để mark endpoints
- Guard extract IP từ request cho login, userId từ request.user cho refresh
- Fail-closed: catch Redis errors → HTTP 503
- Logger cho audit (AuditService chưa implement)
