# Requirements — Tối ưu hóa cấu trúc Task Module phần Frontend
**Date**: 2026-06-06 13:18:29  |  **Task ID**: 20260606-131829-t-i--u-h-a-c-u-tr-c-task-module-ph-n-fro  |  Status: APPROVED

---

## 📋 Tổng quan yêu cầu
Tái cấu trúc (Refactor) các component Angular của Task Module trên Frontend để tuân thủ quy định về số dòng tối đa của một component (<= 150 dòng dòng):
- Trọng tâm là tách nhỏ `TaskDetailPanelComponent` (645 dòng) và `TaskListComponent` (364 dòng) thành các sub-components.
- Không làm thay đổi hành vi nghiệp vụ, luồng xử lý hoặc trải nghiệm người dùng hiện tại (Zero-regression).

## 👤 User Stories

### US-1: Phân tách TaskDetailPanelComponent thành các tab components chuyên biệt
> **As a** Developer/Agent, **I want to** tách nhỏ `TaskDetailPanelComponent` thành các sub-components tương ứng với từng tab, **so that** code của mỗi component không vượt quá 150 dòng và dễ bảo trì.

#### Acceptance Criteria
- [ ] Tách nhỏ thành các component con độc lập:
  - `TaskAttachmentsComponent`: Phụ trách tệp đính kèm.
  - `TaskLinksComponent`: Phụ trách liên kết URL.
  - `TaskOverviewTabComponent`: Bố cục chính tab tổng quan.
  - `TaskSubitemsTabComponent`: Phụ trách sub-items.
  - `TaskRelationsTabComponent`: Phụ trách relations.
  - `TaskActivityTabComponent`: Phụ trách comments & activity stream.
- [ ] Đảm bảo `TaskDetailPanelComponent` thu gọn xuống < 150 dòng, đóng vai trò điều phối chính.

### US-2: Phân tách TaskListComponent thành TaskRowComponent
> **As a** Developer/Agent, **I want to** tách logic kết xuất một hàng task (row content) ra khỏi `TaskListComponent`, **so that** file `task-list.component.ts` không vượt quá 150 dòng.

#### Acceptance Criteria
- [ ] Tạo `TaskRowComponent` chứa giao diện và logic định dạng của một hàng task.
- [ ] Thu nhỏ `TaskListComponent` xuống dưới 150 dòng.

## 🔒 Non-functional Requirements
- [ ] **Zero Regression**: Giữ nguyên toàn bộ hành vi UI, các hiệu ứng hover, cơ chế kéo thả cdkDrag và đồng bộ trạng thái lưu (saving status).
- [ ] **Compilation**: Dự án frontend phải build thành công không có lỗi TypeScript.

## 🚫 Out of Scope
- Thay đổi thiết kế giao diện (UI/UX) của các panel hoặc danh sách task.
- Thay đổi logic trong các Service hoặc Store của Frontend.

---

## 🔏 Approval

| | |
|-----------|-------------------|
| **Approved by** | thanhphan |
| **Approved at** | 2026-06-06 13:20:00 |
| **Notes**       |                   |
