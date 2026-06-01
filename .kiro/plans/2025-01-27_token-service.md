# Plan: Task 3.1 — Implement Token Service (JWT sign/verify với RS256)

## Task ID
3.1

## Approach
Tạo NestJS Injectable service `TokenService` xử lý:
1. JWT signing/verification với RS256 (asymmetric keys)
2. Refresh token generation (random) và verification (SHA-256 hash)
3. Load RSA keys từ filesystem tại initialization

## Files sẽ tạo
- `apps/backend/src/auth/token.service.ts` — Main service implementation

## Dependencies
- Task 1.3 (shared types) — ✅ Done
- `@mpm/shared-types` — JwtPayload interface
- `jsonwebtoken` library — JWT operations
- `crypto` module (Node.js built-in) — random token generation, SHA-256 hashing
- `@nestjs/config` — ConfigService for environment variables

## Acceptance Criteria (from Requirements 3.1, 3.2, 3.7)
- RS256 signing với RSA key minimum 2048-bit
- Access Token payload chứa: sub, email, systemRole, projectRoles, iat, exp
- exp = iat + 15 minutes (configurable via JWT_ACCESS_TOKEN_EXPIRY)
- Refresh token: random string minimum 32 characters
- Refresh token stored as SHA-256 hash
- Round-trip property: sign then verify returns identical claims
- Load keys from JWT_PRIVATE_KEY_PATH, JWT_PUBLIC_KEY_PATH

## Implementation Details
- Use `@Injectable()` decorator
- Use `ConfigService` for env vars: JWT_PRIVATE_KEY_PATH, JWT_PUBLIC_KEY_PATH, JWT_ACCESS_TOKEN_EXPIRY
- Load keys in `onModuleInit()` lifecycle hook
- Throw `UnauthorizedException` for invalid/expired tokens
- Throw `InternalServerErrorException` if keys cannot be loaded
- No `any` types — strict TypeScript
