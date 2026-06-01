# Plan: Tasks 16.1, 16.2, 16.3 — Frontend Login, Callback Pages & Auth Routes

## Task IDs
- 16.1: Implement Login Page
- 16.2: Implement Callback Page
- 16.3: Implement Auth Routes (lazy-loaded) + Auth Store

## Approach
Implement Angular 19 standalone components for login and callback pages, plus lazy-loaded routes and a minimal signal-based auth store.

## Files to Create
1. `apps/frontend/src/app/auth/pages/login/login.component.ts` — Login page with "Đăng nhập với Authentik" button
2. `apps/frontend/src/app/auth/pages/callback/callback.component.ts` — OAuth callback handler
3. `apps/frontend/src/app/auth/auth.routes.ts` — Lazy-loaded routes for /login, /callback
4. `apps/frontend/src/app/auth/state/auth.store.ts` — Minimal Signal-based store (delegates to AuthService)
5. `apps/frontend/src/environments/environment.ts` — Environment config with Authentik URLs

## Acceptance Criteria (from Requirements)
- 1.1: Login page shows "Đăng nhập với Authentik" button
- 1.2: On click → generate state (crypto.randomUUID), save to sessionStorage, redirect to Authentik authorize URL
- 1.6: On success → store accessToken in memory, redirect to dashboard
- 1.7: On error → display categorized error message (invalid_code, provider_error)
- 1.9: Verify state matches sessionStorage → if not, redirect to login with error
- 1.10: Timeout → display "hệ thống xác thực không phản hồi"

## Dependencies
- Task 15.1 (Auth Service, Token Service) ✅ Done
- Task 15.2 (Auth Interceptor) ✅ Done
- Task 15.3 (Auth Guard, Role Guard) ✅ Done
