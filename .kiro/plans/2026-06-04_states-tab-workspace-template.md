# Task 21: Frontend — States Tab cập nhật

## Task ID
21. Frontend — States Tab cập nhật

## Approach
Cập nhật `states-tab.component.ts` để:
1. Thêm service method gọi `GET /api/workspaces/:wid/state-templates` và `POST /api/workspaces/:wid/state-templates/apply/:projectId`
2. Hiển thị section "Workspace Template" (read-only) phía trên "Project States"
3. States có `templateId != null` hiển thị icon `pi-link` nhỏ bên cạnh tên
4. Nút "Áp dụng lại template" cho admin

## Files sẽ tạo/sửa
- `apps/frontend/src/app/projects/services/state-template.service.ts` — **TẠO MỚI**: Service gọi API workspace state templates
- `apps/frontend/src/app/projects/pages/project-settings/states-tab/states-tab.component.ts` — **SỬA**: Thêm workspace template section, icon pi-link, nút apply

## Acceptance Criteria (from Req 5.8)
- WHEN SM/PO xem Settings > States, THE Task_Client SHALL hiển thị 2 section: "Workspace Template" (read-only, để tham khảo) và "Project States" (editable)
- State nào có `template_id` không null SHALL hiển thị icon "từ template"

## Dependencies
- Task 17 (Backend — StateTemplate entity + shared types) ✅ Done
- Task 18 (Backend — StateTemplateService) ✅ Done
- Task 19 (Backend — StateTemplateController + routes) ✅ Done
- Task 20 (Backend — Project Service seed) ✅ Done
