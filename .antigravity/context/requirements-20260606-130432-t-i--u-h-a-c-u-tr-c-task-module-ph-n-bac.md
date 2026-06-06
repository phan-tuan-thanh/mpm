# Requirements — Tối ưu hóa cấu trúc Task Module phần Backend
**Date**: 2026-06-06 13:04:32  |  **Task ID**: 20260606-130432-t-i--u-h-a-c-u-tr-c-task-module-ph-n-bac  |  Status: APPROVED

---

## 📋 Tổng quan yêu cầu
Tái cấu trúc (Refactor) phần Backend của Task Module (bao gồm `TaskService` và `TaskController`) để tuân thủ giới hạn kích thước dòng code quy định trong [project.context.json](file:///Users/thanhphan/Labs/github/mpm/.antigravity/memory/project.context.json#L29-L39):
- `service` tối đa 100 dòng.
- `route_handler` (controller) tối đa 80 dòng.

Mục tiêu là đảm bảo tính sạch sẽ, dễ đọc, dễ bảo trì cho Agent và lập trình viên mà KHÔNG làm thay đổi bất kỳ hành vi hoặc API contracts nào của hệ thống (Zero-regression).

## 👤 User Stories

### US-1: Tuân thủ giới hạn dòng của TaskService
> **As a** Developer/Agent, **I want to** chia nhỏ `TaskService` thành các service nhỏ chuyên biệt, **so that** code của từng service không vượt quá 100 dòng và dễ dàng bảo trì.

#### Acceptance Criteria
- [ ] Tách `TaskService` thành các sub-services chuyên biệt:
  - `TaskQueryService`: Chứa các phương thức đọc (`findAll`, `findById`, `search`). Tổng dòng <= 100.
  - `TaskOrderService`: Chứa logic sắp xếp (`reorder`, `rebalanceOrder`). Tổng dòng <= 100.
  - `TaskDeleteService`: Chứa logic xóa (`delete`, `bulkDelete`). Tổng dòng <= 100.
  - `TaskMutationService` (hoặc giữ `TaskService` làm Mutation Service): Chứa logic tạo (`create`) và cập nhật (`update`). Cần đảm bảo file này hoặc các file helper đi kèm không vượt quá 100 dòng.
- [ ] Giữ `TaskService` làm facade (inject và delegate) hoặc đăng ký trực tiếp các sub-services vào `TaskModule` và inject vào các controllers tương ứng.
- [ ] Đảm bảo không làm ảnh hưởng đến các service khác import `TaskService`.

### US-2: Tuân thủ giới hạn dòng của TaskController
> **As a** Developer/Agent, **I want to** chia nhỏ `TaskController` thành các controller chuyên biệt, **so that** code của từng controller không vượt quá 80 dòng.

#### Acceptance Criteria
- [ ] Tách `TaskController` thành các controllers nhỏ hơn:
  - `TaskQueryController`: `@Get` endpoints (`findAll`, `search`, `findById`, `getActivity`). Tổng dòng <= 80.
  - `TaskController` (hoặc `TaskMutationController`): `@Post`, `@Patch`, `@Delete` endpoints. Tổng dòng <= 80.
- [ ] Đảm bảo giữ nguyên URL path prefix (`api/projects/:projectId/tasks`) và các decorator phân quyền `@ProjectRoles`.

## 🔒 Non-functional Requirements
- [ ] **Zero Regression**: Đảm bảo không thay đổi API contract, kiểu dữ liệu trả về, hành vi lưu DB hay cơ chế transaction.
- [ ] **Test Coverage**: Toàn bộ unit tests và integration tests liên quan đến Task Module phải pass (`npm run test`).

## 🚫 Out of Scope
- Tái cấu trúc phần Frontend của Task Module (sẽ thực hiện trong task riêng).
- Tách nhỏ các entity hay dto nếu không thực sự cần thiết (giới hạn của entity là 100 dòng, `task.entity.ts` hiện là 129 dòng, tạm thời để sau hoặc chỉ tối ưu nhẹ nếu được).

---

## 🔏 Approval

| | |
|-----------|-------------------|
| **Approved by** | thanhphan |
| **Approved at** | 2026-06-06 13:05:58 |
| **Notes**       |                   |
