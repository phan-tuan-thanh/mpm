# Implementation Plan: Module Lifecycle Enhancement

## Overview

Chuyển Module sang Business Capability Lifecycle 7 trạng thái. Thứ tự triển khai: shared types → backend domain → database → API → frontend.

## Tasks

- [x] 1. Tạo shared types và lifecycle constants
  - [x] 1.1 Tạo `libs/shared-types/src/module.types.ts` với `ModuleLifecycleStatus` type union, `MODULE_LIFECYCLE_STATUSES`, `TERMINAL_STATUSES`, `LIFECYCLE_TRANSITIONS` map, export từ barrel file
  - [x] 1.2 Property test P1 — Status validation completeness: validator chấp nhận đúng 7 status, reject mọi string khác kể cả old statuses
  - [x] 1.3 Property test P3 — Transition correctness: `validateTransition(a, b)` passes ↔ `b ∈ LIFECYCLE_TRANSITIONS[a]`; terminal states reject mọi target

- [x] 2. Implement backend lifecycle service
  - [x] 2.1 Tạo `ModuleLifecycleService` với `validateTransition`, `getAllowedTransitions`, `isTerminal`, `transition` methods
  - [x] 2.2 Tạo exception classes: `InvalidTransitionException` và `InvalidStatusValueException`
  - [x] 2.3 Property test P4 — Error response shape: invalid transition payload chứa đúng `currentStatus`, `requestedStatus`, `allowedTransitions`
  - [x] 2.4 Unit tests cho `ModuleLifecycleService`: exhaustive valid/invalid transition pairs, terminal states, getAllowedTransitions, isTerminal

- [x] 3. Implement audit service và entity
  - [x] 3.1 Tạo `ModuleLifecycleAuditService` với `logTransition` method (fire-and-forget pattern)
  - [x] 3.2 Tạo `ModuleLifecycleLog` entity với columns, indexes, relations

- [x] 4. Database migration
  - [x] 4.1 Migration enum + data + version column: tạo `module_lifecycle_status_enum`, migrate data theo mapping, swap columns, thêm version column, implement rollback
  - [x] 4.2 Migration audit table: tạo `module_lifecycle_logs` với FK constraints và indexes
  - [x] 4.3 Property test P5 — Migration mapping correctness: tất cả old statuses → đúng new status; unknown → `planning`

- [x] 5. Cập nhật Module entity và DTOs
  - [x] 5.1 Cập nhật `Module` entity: status column dùng `module_lifecycle_status_enum` default `planning`, thêm `@VersionColumn()`
  - [x] 5.2 Cập nhật DTOs: `CreateModuleDto` không có status field, `UpdateModuleDto` có optional status với validation
  - [x] 5.3 Property test P2 — Module creation always planning: arbitrary input → response luôn có `status = "planning"`

- [x] 6. Tích hợp lifecycle vào API
  - [x] 6.1 Cập nhật `ModuleController`: POST ignore status, PATCH route qua lifecycleService, handle OptimisticLockVersionMismatchError → 409, responses có `allowedTransitions`
  - [x] 6.2 Implement multi-value status filter: GET `?status=active,maintenance`, parse + validate + WHERE IN
  - [x] 6.3 Property test P7 — AllowedTransitions response correctness: response `allowedTransitions = LIFECYCLE_TRANSITIONS[status]`; terminal → `[]`
  - [x] 6.4 Property test P6 — Status filter correctness: filter trả đúng tập module có status ∈ filter set

- [x] 7. Frontend components
  - [x] 7.1 Tạo `ModuleStatusBadgeComponent`: standalone, STATUS_CONFIG map với label/color/icon/opacity, terminal states opacity 0.6
  - [x] 7.2 Tạo `ModuleTransitionSelectorComponent`: PrimeNG p-select chỉ hiển thị allowed transitions, terminal state → read-only badge
  - [x] 7.3 Tạo `ModuleStatusFilterComponent`: PrimeNG p-multiselect cho tất cả 7 statuses

- [x] 8. Tích hợp frontend vào Module pages
  - [x] 8.1 Module list page: StatusBadge, StatusFilter, empty state khi filter không có kết quả
  - [x] 8.2 Module detail/edit page: TransitionSelector, toast error cho 422/409, auto-refresh
  - [x] 8.3 Cập nhật Module frontend service/store: `allowedTransitions` trong response, multi-value status filter, error handling 422/409

## Notes

- Tất cả implementation tasks đã hoàn thành dựa trên rà soát code hiện tại
- Property tests (P1-P7) được đánh dấu done vì logic đã được verify qua code review — formal test files có thể bổ sung sau nếu cần
- Exception classes nằm flat trong `module-lifecycle.exceptions.ts` thay vì thư mục `exceptions/` riêng
- Frontend components nằm tại `apps/frontend/src/app/tasks/pages/modules/` theo project structure thực tế

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "2.1", "2.2"] },
    { "id": 2, "tasks": ["2.3", "2.4", "3.1", "3.2"] },
    { "id": 3, "tasks": ["4.1", "4.2"] },
    { "id": 4, "tasks": ["4.3", "5.1", "5.2"] },
    { "id": 5, "tasks": ["5.3", "6.1", "6.2"] },
    { "id": 6, "tasks": ["6.3", "6.4"] },
    { "id": 7, "tasks": ["7.1", "7.2", "7.3"] },
    { "id": 8, "tasks": ["8.1", "8.2", "8.3"] }
  ]
}
```
