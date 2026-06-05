# Plan: Task 1.1 — Thêm DisplayProperties interface

## Task ID
1.1

## Mô tả
Thêm interface `DisplayProperties` và const `DEFAULT_DISPLAY_PROPS` vào `libs/shared-types/src/task.types.ts`, sau đó export từ `index.ts`.

## Approach
1. Thêm interface `DisplayProperties` vào cuối file `task.types.ts`
2. Thêm const `DEFAULT_DISPLAY_PROPS` với giá trị mặc định theo Requirement 3.8
3. Cập nhật `index.ts` để export cả interface và const mới
4. Build shared-types library (compile TypeScript)

## Files tạo/sửa
- `libs/shared-types/src/task.types.ts` — thêm interface + const
- `libs/shared-types/src/index.ts` — thêm export

## Acceptance Criteria (Req 3.8)
- Khi không có settings trong localStorage, dùng giá trị mặc định:
  - Tất cả bật (showAssignee, showPriority, showDueDate, showLabels, showEstimate, showSubItemCount, showState, showModules = true)
  - showStartDate = false
  - labelMode = 'badge'
  - maxLabels = 2
  - alwaysShowLabels = false
  - maxModules = 1

## Dependencies
- Không có dependency — task đầu tiên trong wave 0
