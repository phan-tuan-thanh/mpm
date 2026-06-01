# Plan: Task 1.3 — Tạo shared interfaces, types, và constants

## Task Info
- **Task ID**: 1.3
- **Wave**: 0 (no dependencies)
- **Requirements**: 3.2, 4.1, 5.5

## Approach

Tạo các shared types dùng chung giữa backend và frontend, cùng với constants cho permission matrix và audit events.

## Files Created/Modified

| File | Action | Description |
|------|--------|-------------|
| `libs/shared-types/src/auth.types.ts` | Created | Interfaces: JwtPayload, ProjectRoleEntry, SessionData, ErrorResponse; Types: SystemRole, ProjectRole, Resource, Action, PermissionMatrix |
| `libs/shared-types/src/index.ts` | Created | Barrel export cho tất cả types |
| `libs/shared-types/package.json` | Created | Package config cho @mpm/shared-types |
| `libs/shared-types/tsconfig.json` | Created | TypeScript config extends root |
| `apps/backend/src/auth/constants/permission-matrix.ts` | Created | Permission matrix + hasPermission helper |
| `apps/backend/src/auth/constants/auth-events.ts` | Created | AuthEvent const object + AuthEventType type |

## Acceptance Criteria

- [x] JwtPayload interface với sub, email, systemRole, projectRoles, iat, exp
- [x] ProjectRoleEntry interface với projectId, role
- [x] SessionData interface với sessionId, userId, deviceInfo, ipAddress, createdAt, lastActivity, refreshTokenHash
- [x] ErrorResponse interface với statusCode, error, message, errorCode, timestamp
- [x] SystemRole type: 'Admin' | 'User'
- [x] ProjectRole type: 5 roles
- [x] Resource type: 'task' | 'sprint' | 'document' | 'member'
- [x] Action type: 'create' | 'read' | 'update' | 'delete'
- [x] PermissionMatrix type: Record<ProjectRole, Record<Resource, Action[]>>
- [x] Permission matrix matches design table
- [x] hasPermission helper function
- [x] AuthEvent const with all audit event types from design
- [x] AuthEventType type derived from AuthEvent values
- [x] No `any` types used
- [x] Strict TypeScript compliance
- [x] No diagnostics errors

## Status: COMPLETE

All files already implemented and verified with zero diagnostics errors.
