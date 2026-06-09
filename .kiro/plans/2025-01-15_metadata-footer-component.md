# Plan: Task 9.3 — Create MetadataFooterComponent

## Task
- **ID:** 9.3
- **Name:** Create `MetadataFooterComponent` standalone component

## Approach
Create a simple standalone Angular component that displays task metadata (created/updated timestamps and creator name).

## Files to Create/Modify
- **Create:** `apps/frontend/src/app/tasks/components/task-detail-panel/components/metadata-footer/metadata-footer.component.ts`
- **Create:** `apps/frontend/src/app/tasks/components/task-detail-panel/components/metadata-footer/index.ts`
- **Modify:** `apps/frontend/src/app/tasks/components/task-detail-panel/components/index.ts` (add barrel export)

## Acceptance Criteria (from Requirements 9.1–9.5)
- 9.1: Display "Tạo lúc" with creation timestamp (dd/MM/yyyy HH:mm) and creator's display name (truncated to 30 chars + ellipsis if longer)
- 9.2: Display "Cập nhật lúc" with last modification timestamp (dd/MM/yyyy HH:mm)
- 9.3: If task never modified after creation, display "Cập nhật lúc" = "Tạo lúc" value
- 9.4: If creator account no longer exists, display "Người dùng không xác định"
- 9.5: When task data refreshed, update "Cập nhật lúc" to reflect latest server value

## Component Design
- Inputs: `createdAt`, `updatedAt`, `creatorName`
- Uses Angular `DatePipe` for date formatting
- Pure display component — no outputs
- Creator name truncation logic (>30 chars → first 30 + "…")
- Null/empty creatorName → "Người dùng không xác định"

## Dependencies
- None — this is a standalone display component
