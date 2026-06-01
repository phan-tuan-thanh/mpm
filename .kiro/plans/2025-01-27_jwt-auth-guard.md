# Plan: Task 4.1 — JWT Auth Guard và Decorators

## Task ID
4.1 Implement JWT Auth Guard và decorators

## Approach
Tạo 3 files theo NestJS conventions:
1. **JWT Auth Guard** — CanActivate guard validate Access Token, check forced-logout, attach user to request
2. **@Public() decorator** — SetMetadata decorator bypass authentication
3. **@CurrentUser() decorator** — createParamDecorator extract user từ request

## Files tạo mới
- `apps/backend/src/auth/guards/jwt-auth.guard.ts`
- `apps/backend/src/auth/decorators/public.decorator.ts`
- `apps/backend/src/auth/decorators/current-user.decorator.ts`

## Acceptance Criteria (từ Requirements)
- 8.1: Guard xác thực Access Token trong Authorization header (Bearer scheme)
- 8.2: Gắn user info (id, email, systemRole, projectRoles) vào request context
- 8.3: Error codes phân biệt: TOKEN_MISSING, TOKEN_EXPIRED, TOKEN_INVALID
- 8.7: @Public() decorator bypass authentication
- 11.5: Kiểm tra forced-logout list → SESSION_REVOKED

## Dependencies
- Task 3.1 (Token Service) ✅ Done
- Task 3.3 (Session Service) ✅ Done
- Task 1.3 (Shared types) ✅ Done

## Implementation Details
- Guard sử dụng Reflector để check @Public() metadata
- TokenService.verifyAccessToken() throws UnauthorizedException với message TOKEN_EXPIRED hoặc TOKEN_INVALID
- SessionService.isForceLoggedOut(userId) returns boolean
- Guard catches specific error messages để map sang error codes
- Request user interface extends JwtPayload (sub → id mapping)
