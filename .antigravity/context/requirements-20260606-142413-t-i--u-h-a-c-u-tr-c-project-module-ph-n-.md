# Requirements — tối ưu hóa cấu trúc project module phần backend
**Date**: 2026-06-06 14:24:13  |  **Task ID**: 20260606-142413-t-i--u-h-a-c-u-tr-c-project-module-ph-n-  |  Status: APPROVED

---

## 📋 Tổng quan yêu cầu
Tái cấu trúc file `ProjectService` (858 dòng) và `ProjectController` (182 dòng) thành các file nhỏ hơn để tuân thủ giới hạn kích thước file của dự án (Service tối đa 100 dòng, Controller tối đa 80 dòng) mà không thay đổi bất kỳ hành vi hoặc API bên ngoài nào.

## 👤 User Stories

### US-1: Phân tách ProjectService thành các Sub-services
> **As a** lập trình viên dự án,
> **I want to** phân tách `ProjectService` thành các service đơn nhiệm nhỏ hơn dưới 100 dòng và giữ `ProjectService` như một Facade,
> **so that** code dễ đọc, dễ bảo trì và tuân thủ tiêu chuẩn file size limits.

#### Acceptance Criteria
- [ ] **Given** `ProjectService` hiện tại quá lớn, **When** tái cấu trúc, **Then** tách thành `ProjectCreateService`, `ProjectQueryService`, `ProjectUpdateService`, `ProjectDeleteService`.
- [ ] **Given** các sub-services mới, **When** triển khai, **Then** mỗi service phải có kích thước dưới hoặc bằng 100 dòng.
- [ ] **Given** `ProjectService` Facade, **When** gọi các phương thức nghiệp vụ, **Then** nó phải ủy quyền tương ứng cho các sub-services mà không thay đổi signature của method.

### US-2: Phân tách ProjectController thành các Controllers nhỏ hơn
> **As a** lập trình viên dự án,
> **I want to** tách các endpoints GET (đọc) khỏi `ProjectController` sang `ProjectQueryController` riêng biệt,
> **so that** cả hai controller đều có kích thước dưới 80 dòng.

#### Acceptance Criteria
- [ ] **Given** `ProjectController` hiện tại, **When** tái cấu trúc, **Then** di chuyển các endpoint GET (`/`, `/by-key/:key`, `/:projectId`) sang `ProjectQueryController`.
- [ ] **Given** hai controllers mới, **When** kiểm tra kích thước, **Then** cả `ProjectController` và `ProjectQueryController` đều phải dưới hoặc bằng 80 dòng.
- [ ] **Given** `ProjectModule`, **When** khai báo, **Then** phải đăng ký đầy đủ các controller và sub-services mới.

## 🔒 Non-functional Requirements
- [ ] Performance: Thời gian phản hồi của API không bị ảnh hưởng (các truy vấn SQL/TypeORM giữ nguyên tối ưu).
- [ ] Security: Các project roles guard (`@ProjectRoles`, `@Roles`, v.v.) và cơ chế xác thực phải hoạt động bình thường trên các controller mới.
- [ ] Testability: Các bài test hiện tại trong `project.service.spec.ts` và `project-settings.spec.ts` phải pass 100% mà không cần sửa đổi lớn ngoài phần mock module dependencies.

## 🚫 Out of Scope
- Thay đổi schema của database hoặc business logic hiện tại.
- Tái cấu trúc các service khác như `ProjectStateService` hoặc `ProjectMemberService` (trừ khi cần thiết để fix import).

---

## 🔏 Approval

| | |
||-|
| **Approved by** | thanhphan |
| **Approved at** | 2026-06-06 14:27:40 |
| **Notes** | |
