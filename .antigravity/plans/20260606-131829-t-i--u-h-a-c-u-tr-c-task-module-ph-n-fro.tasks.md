# Tasks — Tối ưu hóa cấu trúc Task Module phần Frontend
**Task ID**: 20260606-131829-t-i--u-h-a-c-u-tr-c-task-module-ph-n-fro  |  **Design ref**: .antigravity/plans/20260606-131829-t-i--u-h-a-c-u-tr-c-task-module-ph-n-fro.design.md  |  Status: APPROVED

---

## ✅ Task Breakdown

### US-1: Phân tách TaskDetailPanelComponent thành các tab components chuyên biệt
- [x] Task 1.1: Tạo file [task-attachments.component.ts](file:///Users/thanhphan/Labs/github/mpm/apps/frontend/src/app/tasks/components/task-detail-panel/components/task-attachments.component.ts) để quản lý tệp đính kèm.
- [x] Task 1.2: Tạo file [task-links.component.ts](file:///Users/thanhphan/Labs/github/mpm/apps/frontend/src/app/tasks/components/task-detail-panel/components/task-links.component.ts) để quản lý liên kết.
- [x] Task 1.3: Tạo file [task-overview-tab.component.ts](file:///Users/thanhphan/Labs/github/mpm/apps/frontend/src/app/tasks/components/task-detail-panel/components/task-overview-tab.component.ts) cho tab Tổng quan.
- [x] Task 1.4: Tạo file [task-subitems-tab.component.ts](file:///Users/thanhphan/Labs/github/mpm/apps/frontend/src/app/tasks/components/task-detail-panel/components/task-subitems-tab.component.ts) cho tab Sub-items.
- [x] Task 1.5: Tạo file [task-relations-tab.component.ts](file:///Users/thanhphan/Labs/github/mpm/apps/frontend/src/app/tasks/components/task-detail-panel/components/task-relations-tab.component.ts) cho tab Relations.
- [x] Task 1.6: Tạo file [task-activity-tab.component.ts](file:///Users/thanhphan/Labs/github/mpm/apps/frontend/src/app/tasks/components/task-detail-panel/components/task-activity-tab.component.ts) cho tab Activity & bình luận.
- [x] Task 1.7: Sửa đổi [task-detail-panel.component.ts](file:///Users/thanhphan/Labs/github/mpm/apps/frontend/src/app/tasks/components/task-detail-panel/task-detail-panel.component.ts) thành Drawer điều phối trung tâm.

### US-2: Phân tách TaskListComponent thành TaskRowComponent
- [x] Task 2.1: Tạo file [task-row.component.ts](file:///Users/thanhphan/Labs/github/mpm/apps/frontend/src/app/tasks/pages/backlog/task-list/task-row.component.ts) kết xuất một hàng.
- [x] Task 2.2: Sửa đổi [task-list.component.ts](file:///Users/thanhphan/Labs/github/mpm/apps/frontend/src/app/tasks/pages/backlog/task-list/task-list.component.ts) để nhúng `TaskRowComponent`.

## 🧪 Verification Checklist
- [x] Tất cả AC trong requirements đã met
- [x] Code đã pass build check trong frontend
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
| **Approved at** | 2026-06-06 13:20:00 |
| **Notes**       |                   |
