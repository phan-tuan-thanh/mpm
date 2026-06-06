# Tasks — tối ưu hóa cấu trúc project module phần backend
**Task ID**: 20260606-142413-t-i--u-h-a-c-u-tr-c-project-module-ph-n-  |  **Design ref**: .antigravity/plans/20260606-142413-t-i--u-h-a-c-u-tr-c-project-module-ph-n-.design.md  |  Status: APPROVED

---

## ✅ Task Breakdown

### US-1: Phân tách ProjectService thành các Sub-services
- [x] Task 1.1: Tạo file `project-query.service.ts` chứa các phương thức đọc (`findAll`, `findById`, `findByKey`).
- [x] Task 1.2: Tạo file `project-create.service.ts` chứa phương thức tạo project (`create`), bao gồm default states và validation liên quan.
- [x] Task 1.3: Tạo file `project-update.service.ts` chứa các phương thức cập nhật (`update`, `updateFeatures`, `join`), cùng các validation helper.
- [x] Task 1.4: Tạo file `project-delete.service.ts` chứa các phương thức xóa/archive (`archive`, `delete`, `bulkDelete`).
- [x] Task 1.5: Sửa đổi `project.service.ts` thành Facade để ủy quyền cho các sub-services mới.

### US-2: Phân tách ProjectController thành các Controllers nhỏ hơn
- [x] Task 2.1: Tạo file `project-query.controller.ts` chứa các endpoints đọc (GET: `/`, `/by-key/:key`, `/:projectId`).
- [x] Task 2.2: Sửa đổi `project.controller.ts` để loại bỏ các endpoints đọc, chỉ giữ lại các write endpoints (POST, PATCH, DELETE).
- [x] Task 2.3: Cập nhật `project.module.ts` để khai báo các controller và providers mới.

## 🧪 Verification Checklist
- [x] Tất cả AC trong requirements đã met
- [x] Code đã pass linting/formatting
- [x] Tests đã pass (`npm run test`)
- [x] Không có regression
- [x] Progress Log trong design đầy đủ

## 📊 Progress Summary

| Tổng tasks | Hoàn thành | Còn lại | % |
|------------|------------|---------|---|
| 8 | 8 | 0 | 100% |

---

## 🔏 Approval

| | |
|-|-|
| **Approved by** | thanhphan |
| **Approved at** | 2026-06-06 14:28:37 |
| **Notes** | |
