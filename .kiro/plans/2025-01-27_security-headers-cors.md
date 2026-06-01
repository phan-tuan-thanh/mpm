# Plan: Task 13.1 — Security Headers và CORS

## Task ID
13.1 Implement Security Headers và CORS

## Approach
- **Option A (Recommended)**: NestJS middleware for security headers + custom CORS middleware for origin validation
- Security headers middleware applies to ALL routes
- CORS middleware validates Origin header against ALLOWED_ORIGINS env var
- HTTPS redirect middleware for production environment

## Files to Create
1. `apps/backend/src/auth/middleware/security-headers.middleware.ts` — Adds security headers to all responses
2. `apps/backend/src/auth/middleware/cors.middleware.ts` — Custom CORS validation with 403 rejection
3. `apps/backend/src/auth/middleware/https-redirect.middleware.ts` — HTTPS redirect in production

## Acceptance Criteria (from Requirements 12.3, 12.4, 12.5, 12.6)
- [x] 12.3: In production, reject non-HTTPS requests with 301 redirect to HTTPS URL
- [x] 12.4: All responses include: X-Content-Type-Options: nosniff, X-Frame-Options: DENY, Strict-Transport-Security: max-age=31536000; includeSubDomains
- [x] 12.5: CORS policy only allows origins from ALLOWED_ORIGINS env var
- [x] 12.6: Requests from disallowed origins → HTTP 403, no Access-Control-Allow-Origin header

## Dependencies
- Task 1.1 (Infrastructure setup) — ✅ Done
- Task 1.3 (Shared types) — ✅ Done
- No blocking dependencies for this task

## Implementation Details
- Use NestJS `NestMiddleware` interface
- Read `ALLOWED_ORIGINS` from ConfigService (comma-separated)
- Read `NODE_ENV` from ConfigService for production detection
- No `any` types — strict TypeScript
- Handle preflight (OPTIONS) requests properly for CORS
