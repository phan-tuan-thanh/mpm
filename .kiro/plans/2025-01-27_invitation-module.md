# Plan: Task 9.1 — Implement Invitation Service và Controller

## Task Info
- **Task ID**: 9.1
- **Tên**: Implement Invitation Service và Controller
- **Requirements**: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9

## Approach

Tạo invitation module hoàn chỉnh theo NestJS module pattern, bao gồm entity, DTOs, service, controller, và module registration. Sử dụng crypto.randomBytes cho token generation, TypeORM cho data access, class-validator cho DTO validation.

## Files sẽ tạo

1. `apps/backend/src/invitation/entities/invitation.entity.ts` — TypeORM entity cho bảng invitations
2. `apps/backend/src/invitation/dto/create-invitation.dto.ts` — DTO validate input tạo invitation
3. `apps/backend/src/invitation/dto/invitation-response.dto.ts` — DTO response format
4. `apps/backend/src/invitation/invitation.service.ts` — Business logic: create, accept, cancel, list
5. `apps/backend/src/invitation/invitation.controller.ts` — REST endpoints
6. `apps/backend/src/invitation/invitation.module.ts` — Module registration

## Acceptance Criteria (từ Requirements 7.x)

- 7.1: Tạo invitation với email, project_role, token (32+ chars), expires 7 ngày
- 7.2: Token duy nhất không thể đoán được (crypto.randomBytes)
- 7.3: Accept invitation → gán project role, mark accepted
- 7.4: Unauthenticated user → redirect to login, process after auth
- 7.5: Expired → HTTP 410
- 7.6: Already accepted → HTTP 409
- 7.7: Duplicate (email đã là member hoặc pending invite) → HTTP 409
- 7.8: List invitations với pagination (max 50/page)
- 7.9: Cancel pending invitation → mark cancelled

## Dependencies

- Task 1.2 (migrations) ✅
- Task 4.1-4.3 (guards, decorators) ✅
- Task 6.1-6.2 (auth service, controller) ✅
