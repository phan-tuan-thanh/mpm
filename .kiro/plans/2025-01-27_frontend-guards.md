# Plan: Task 15.3 — Implement Auth Guard và Role Guard (Angular)

## Task Info
- **Task ID**: 15.3
- **Tên**: Implement Auth Guard và Role Guard (Angular)
- **Requirements**: 8.1, 8.4

## Approach
Tạo 2 Angular functional guards (CanActivateFn pattern — Angular 19):
1. **auth.guard.ts** — Kiểm tra user đã authenticated chưa, nếu chưa redirect to /login với returnUrl
2. **role.guard.ts** — Kiểm tra system role hoặc project role từ route data

Cả hai guard sử dụng:
- `inject()` function cho DI (Router, AuthService)
- `ActivatedRouteSnapshot.data` cho role requirements
- Angular 19 functional guard pattern (CanActivateFn)
- Strict TypeScript (no `any`)

## Files sẽ tạo
1. `apps/frontend/src/app/auth/guards/auth.guard.ts`
2. `apps/frontend/src/app/auth/guards/role.guard.ts`
3. `apps/frontend/src/app/auth/services/auth.service.ts` (minimal interface — nếu chưa tồn tại)

## Dependencies
- Task 15.1 (Auth Service) — cùng wave 10, chưa hoàn thành
- Sẽ tạo minimal AuthService interface để guards compile được

## Acceptance Criteria (từ Requirements)
- Req 8.1: Guard xác thực Access_Token cho mọi request đến protected endpoint
- Req 8.4: Guard hỗ trợ decorator-based authorization: roles cho System_Role và project roles
