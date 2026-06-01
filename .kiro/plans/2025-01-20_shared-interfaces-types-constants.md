# Plan: Task 1.3 — Tạo shared interfaces, types, và constants

## Task ID
1.3

## Mô tả
Tạo shared interfaces, types, và constants cho hệ thống authentication & authorization.

## Approach
Kiểm tra và xác nhận các file đã tồn tại với nội dung đúng theo design document.

## Files
- `libs/shared-types/src/auth.types.ts` — Interfaces & types (đã tồn tại)
- `libs/shared-types/src/index.ts` — Re-exports (đã tồn tại)
- `apps/backend/src/auth/constants/permission-matrix.ts` — Permission matrix (đã tồn tại)
- `apps/backend/src/auth/constants/auth-events.ts` — Audit event types (đã tồn tại)

## Acceptance Criteria
- [x] `libs/shared-types/src/auth.types.ts` with all interfaces and types
- [x] `apps/backend/src/auth/constants/permission-matrix.ts` with correct permission matrix
- [x] `apps/backend/src/auth/constants/auth-events.ts` with audit event types enum
- [ ] All types compile without errors (strict TypeScript)
- [ ] Permission matrix matches the design document exactly

## Dependencies
- None (Wave 0 task)

## Verification
- TypeScript compilation check with strict mode
- Permission matrix correctness verification against design doc
