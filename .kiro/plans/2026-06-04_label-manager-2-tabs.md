# Task 13: Frontend — Label Manager UI 2 tab

## Mô tả
Refactor LabelManagerComponent hiện tại thành layout 2 tab sử dụng PrimeNG Tabs:
- Tab "Workspace Labels": danh sách với icon `pi-globe`, readonly cho non-admin, editable cho admin
- Tab "Project Labels": giữ nguyên behavior hiện tại  
- Admin indicator: nút "+ Thêm workspace label" chỉ hiển thị với admin
- Confirm dialog khi xóa workspace label: "Label này đang dùng trong X tasks. Xóa sẽ bỏ label khỏi tất cả."

## Files sẽ sửa
- `apps/frontend/src/app/tasks/components/label-manager/label-manager.component.ts` — refactor toàn bộ
- `libs/shared-types/src/project.types.ts` — thêm `workspaceId` vào Project interface

## Dependencies
- Task 12 (LabelStore + LabelService workspace methods) — ✅ done
- AuthStore có `isAdmin` computed signal — ✅ available

## Approach
1. Thêm `workspaceId` vào shared-types Project interface (backend đã trả về field này)
2. Thêm `@Input() workspaceId` vào LabelManagerComponent
3. Refactor template: sử dụng PrimeNG `p-tabs` / `p-tablist` / `p-tab` / `p-tabpanels` / `p-tabpanel`
4. Tab Workspace: load workspace labels riêng, admin-only edit/create/delete 
5. Tab Project: giữ nguyên behavior hiện tại
6. Confirm dialog workspace label: hiển thị affected task count
7. Cập nhật backlog.component.ts truyền thêm workspaceId

## Acceptance Criteria (Req 4.7)
- Label Manager hiển thị 2 tab riêng biệt
- "Workspace Labels" readonly với non-admin, editable với admin
- "Project Labels" editable với SM/PO (behavior hiện tại)
