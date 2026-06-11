# Plan — Task 3.6: Xác minh test Preservation (task 2) vẫn PASS

## Task
- **Spec**: `project-settings-tab-ui-consistency` (bugfix)
- **Task ID**: 3.6
- **Tên**: Xác minh test Preservation (task 2) vẫn PASS trên code ĐÃ fix

## Approach
- Chạy lại CHÍNH file test Preservation từ task 2 — KHÔNG viết test mới, KHÔNG sửa spec.
- File: `apps/frontend/src/app/projects/pages/project-settings/project-settings-tab-preservation.spec.ts`
- Lệnh: `cd apps/frontend && npx jest src/app/projects/pages/project-settings/project-settings-tab-preservation.spec.ts`
- Mục tiêu: tất cả test PASS → xác nhận không có regression từ fix (task 3.1–3.4).

## File sẽ tạo/sửa
- KHÔNG sửa source/test nào. Chỉ chạy test và báo cáo.
- Tạo plan này (bắt buộc theo task-workflow).

## Acceptance Criteria (Requirements 3.1–3.5)
- 3.1 Nút hành động cùng hàng tiêu đề cũ (search + "Thêm thành viên", bulk-delete, "Thêm mức") vẫn hiển thị + hoạt động.
- 3.2 Tiêu đề cấp section/card hợp lệ vẫn còn.
- 3.3 Logic CRUD nghiệp vụ giữ nguyên.
- 3.4 Header chung + thanh tab của trang cha giữ nguyên.
- 3.5 general-info-tab giữ nguyên + đồng nhất spacing.

## Dependencies
- Task 2 (viết test preservation) — done.
- Task 3.1–3.4 (fix) — done.

## Expected Outcome
- Tất cả preservation tests PASS. Nếu FAIL → có regression thật → STOP và báo cáo control/title/handler bị lỗi, KHÔNG sửa spec.
