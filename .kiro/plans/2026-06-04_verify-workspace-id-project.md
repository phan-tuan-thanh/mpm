# Task 15: Verify workspace_id trên Project entity

## Task Info
- **Task ID:** 15
- **Sprint:** 3 (State Templates)
- **Blocker:** Toàn Sprint 3

## Approach

Kiểm tra xem cột `workspace_id` đã tồn tại trên `projects` table trong migrations chưa.

### Kết quả kiểm tra:
1. ✅ **Entity đã có**: `project.entity.ts` define `@Column({ name: 'workspace_id', type: 'uuid', nullable: true }) workspaceId`
2. ❌ **Migration chưa có**: Không có migration nào thêm `workspace_id` vào table `projects`
3. ⚠️ **AddLabelScope migration** đã reference `p."workspace_id"` từ projects table — giả định cột đã tồn tại

### Quyết định:
- Tạo migration `AddWorkspaceIdToProjects` đặt **trước** AddLabelScope migration (timestamp nhỏ hơn)
- Dùng timestamp `1749020000000` (trước `1749024000000` của AddLabelScope)
- Migration thêm `workspace_id UUID NULL` vào projects table + index

## Files sẽ tạo/sửa
- `migrations/1749020000000-AddWorkspaceIdToProjects.ts` — migration mới

## Acceptance Criteria
- `projects` table có cột `workspace_id` UUID nullable
- Migration chạy được (up/down)
- AddLabelScope migration vẫn hoạt động đúng (reference `p.workspace_id`)

## Dependencies
- Không có dependency (đây là blocker cho Sprint 3)
