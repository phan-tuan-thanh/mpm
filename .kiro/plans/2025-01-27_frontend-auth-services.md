# Plan: Task 15.1 — Implement Angular Auth Service và Token Service

## Task ID
15.1

## Approach
Tạo 2 Angular services cho frontend auth module:
1. **TokenService** — Quản lý Access Token trong memory, decode JWT payload (base64 only), check expiry, concurrent refresh protection
2. **AuthService** — Signal-based auth state management (isAuthenticated, currentUser, isLoading), orchestrate login/logout/refresh

## Files to Create
- `apps/frontend/src/app/auth/services/token.service.ts`
- `apps/frontend/src/app/auth/services/auth.service.ts`

## Acceptance Criteria (from Requirements)
- **1.6**: Auth_Client lưu Access_Token trong memory, Refresh_Token trong httpOnly secure cookie
- **3.3**: Khi Access_Token còn dưới 2 phút trước exp → tự động refresh
- **3.8**: Nếu refresh thất bại → xóa Access_Token, xóa cookie, redirect to login trong 2 giây
- **3.9**: Nhiều request refresh đồng thời → chỉ gửi 1 request, các request khác chờ kết quả
- **12.1**: Access_Token chỉ lưu trong memory (JavaScript variable), không localStorage/sessionStorage

## Dependencies
- Task 14.1 (Auth Module wiring) — ✅ Done
- Shared types from `@mpm/shared-types` (JwtPayload, SystemRole, ProjectRole, ProjectRoleEntry)

## Key Design Decisions
- Token stored as private variable in TokenService (not localStorage/sessionStorage)
- JWT payload decoded via base64 (no verification needed on client — server verifies)
- Concurrent refresh uses a shared Observable (shareReplay pattern)
- Auth state uses Angular Signals (signal(), computed())
- HttpClient for API calls to backend
