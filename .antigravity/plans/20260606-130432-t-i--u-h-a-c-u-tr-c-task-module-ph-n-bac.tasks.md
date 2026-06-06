# Tasks — Tối ưu hóa cấu trúc Task Module phần Backend
**Task ID**: 20260606-130432-t-i--u-h-a-c-u-tr-c-task-module-ph-n-bac  |  **Design ref**: .antigravity/plans/20260606-130432-t-i--u-h-a-c-u-tr-c-task-module-ph-n-bac.design.md  |  Status: APPROVED

---

## ✅ Task Breakdown

### US-1: Tuân thủ giới hạn dòng của TaskService
- [x] Task 1.1: Tạo file [task-query.service.ts](file:///Users/thanhphan/Labs/github/mpm/apps/backend/src/task/task-query.service.ts) chứa các phương thức đọc.
- [x] Task 1.2: Tạo file [task-order.service.ts](file:///Users/thanhphan/Labs/github/mpm/apps/backend/src/task/task-order.service.ts) chứa các phương thức sắp xếp.
- [x] Task 1.3: Tạo file [task-delete.service.ts](file:///Users/thanhphan/Labs/github/mpm/apps/backend/src/task/task-delete.service.ts) chứa các phương thức xóa.
- [x] Task 1.4: Tạo file [task-mutation.service.ts](file:///Users/thanhphan/Labs/github/mpm/apps/backend/src/task/task-mutation.service.ts) chứa các phương thức tạo/cập nhật (Tách thành `task-create.service.ts`, `task-update.service.ts`, `task-validation.ts`).
- [x] Task 1.5: Sửa đổi [task.service.ts](file:///Users/thanhphan/Labs/github/mpm/apps/backend/src/task/task.service.ts) thành Facade để ủy quyền cho các sub-services mới.
- [x] Task 1.6: Cập nhật [task.module.ts](file:///Users/thanhphan/Labs/github/mpm/apps/backend/src/task/task.module.ts) để đăng ký các sub-services mới làm providers.

### US-2: Tuân thủ giới hạn dòng của TaskController
- [x] Task 2.1: Tạo file [task-query.controller.ts](file:///Users/thanhphan/Labs/github/mpm/apps/backend/src/task/task-query.controller.ts) chứa các endpoints GET.
- [x] Task 2.2: Sửa đổi [task.controller.ts](file:///Users/thanhphan/Labs/github/mpm/apps/backend/src/task/task.controller.ts) để loại bỏ các GET endpoints.
- [x] Task 2.3: Đăng ký `TaskQueryController` trong [task.module.ts](file:///Users/thanhphan/Labs/github/mpm/apps/backend/src/task/task.module.ts).

## 🧪 Verification Checklist
- [x] Tất cả AC trong requirements đã met
- [x] Code đã pass linting/formatting (`npm run lint` hoặc build check)
- [x] Tests đã pass (`npm run test`)
- [x] Không có regression
- [x] Progress Log trong design đầy đủ

## 📊 Progress Summary

| Tổng tasks | Hoàn thành | Còn lại | % |
|------------|------------|---------|---|
| 9 | 9 | 0 | 100% |

---

## 🔏 Approval

| | |
|-----------|-------------------|
| **Approved by** | thanhphan |
| **Approved at** | 2026-06-06 13:06:48 |
| **Notes**       |                   |
