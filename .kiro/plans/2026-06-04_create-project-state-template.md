# Task 22: Frontend — Create Project form cập nhật

## Task ID
22

## Mô tả
Thêm step/option "Chọn State Template" vào form tạo project mới:
- Blank (3 defaults) / Workspace Template
- Option "Workspace Template" chỉ hiện nếu workspace có templates

## Files sẽ sửa
- `apps/frontend/src/app/projects/pages/create-project/create-project.component.ts`

## Approach
1. Inject `StateTemplateService` và `ProjectStore` (đã có)
2. Lấy workspace ID từ loaded projects (ProjectStore.projects()) — dùng first project's workspaceId
3. Fetch state templates khi component init
4. Nếu workspace có templates → hiển thị radio buttons: "Blank (3 mặc định)" / "Từ Workspace Template"
5. Thêm field `stateTemplate` vào form data gửi API

## Acceptance Criteria
- Req 5.3: WHEN tạo project với stateTemplate='workspace', copy templates into project_states
- Req 5.4: WHEN tạo project với stateTemplate='blank', seed 3 defaults

## Dependencies
- Task 17, 18, 19, 20 (Backend StateTemplate) — đã hoàn thành ✓
- StateTemplateService frontend đã tồn tại
