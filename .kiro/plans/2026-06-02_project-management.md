# Kế hoạch: Project Management
**Ngày:** 2026-06-02 | **Spec:** project-management | **Ước tính:** 16 tasks

## Mục tiêu
Triển khai Epic A — Project Management cho Agile PM bao gồm database migration, backend ProjectModule, ProjectMemberModule, frontend AppShell, sidebar, và các pages: Project List, Create Project, Project Settings (tabs: General, Members, Danger Zone).

## Các bước
- [x] 1. Database migration và shared types
  - [x] 1.1 Tạo migration `CreateProjectTable`
  - [x] 1.2 Cập nhật audit event enum (`project_created`, `project_updated`, `project_archived`, `project_deleted`, `member_added`, `member_removed`, `member_role_changed` trong `apps/backend/src/auth/constants/auth-events.ts`)
  - [x] 1.3 Cập nhật shared types (`libs/shared-types/src/` with `Project`, `ProjectListItem`, `MemberResponse`, `CreateProjectDto`, `UpdateProjectDto`, `AddMemberDto`, `ProjectStatus`, `ProjectAuditEvent`)
- [x] 2. Checkpoint — Verify migration và shared types
- [x] 3. Backend — ProjectModule
  - [x] 3.1 Tạo Project entity (`apps/backend/src/project/entities/project.entity.ts`)
  - [x] 3.2 Implement Project Service (`apps/backend/src/project/project.service.ts`)
  - [x] 3.3 Implement Project Controller (`apps/backend/src/project/project.controller.ts`)
  - [x] 3.4 Tạo DTOs và validation (`apps/backend/src/project/dto/`)
  - [x] 3.5 Viết property tests cho Project Service (`apps/backend/test/property/`)
- [x] 4. Backend — ProjectMemberModule
  - [x] 4.1 Implement Project Member Service (`apps/backend/src/project/members/project-member.service.ts`)
  - [x] 4.2 Implement Project Member Controller (`apps/backend/src/project/members/project-member.controller.ts`)
  - [x] 4.3 Tạo Member DTOs (`apps/backend/src/project/dto/`)
  - [x] 4.4 Viết property tests cho Project Member Service (`apps/backend/test/property/`)
- [x] 5. Wire ProjectModule vào AppModule
- [x] 6. Checkpoint — Verify tất cả backend modules
- [x] 7. Xóa InvitationModule
- [x] 8. Frontend — Routing và AppShell
  - [x] 8.1 Cập nhật app routing
  - [x] 8.2 Implement AppShell Component
  - [x] 8.3 Implement Sidebar Component
- [x] 9. Frontend — Project Service và Signal Store
  - [x] 9.1 Implement Project Service (Angular)
  - [x] 9.2 Implement Project Signal Store
- [x] 10. Frontend — Project List Page
- [x] 11. Frontend — Create Project Page
- [x] 12. Frontend — Project Settings Page
  - [x] 12.1 Implement ProjectSettingsPage container
  - [x] 12.2 Implement General Tab
  - [x] 12.3 Implement Members Tab
  - [x] 12.4 Implement Danger Zone Tab
- [x] 13. Checkpoint — Verify toàn bộ frontend
- [x] 14. Final checkpoint — Đảm bảo tất cả tests pass

## File sẽ thay đổi
| File | Loại | Ghi chú |
| --- | --- | --- |
| `migrations/<timestamp>-CreateProjectTable.ts` | Tạo mới | Migration cho bảng projects, FK và indexes |
| `apps/backend/src/auth/constants/auth-events.ts` | Sửa đổi | Thêm 7 event types mới |
| `libs/shared-types/src/index.ts` | Sửa đổi | Export các interface/type mới |
| `libs/shared-types/src/project.types.ts` | Tạo mới | Các kiểu dữ liệu liên quan project |
| `apps/backend/src/project/entities/project.entity.ts` | Tạo mới | TypeORM Project entity |
| `apps/backend/src/project/project.service.ts` | Tạo mới | Project service backend |
| `apps/backend/src/project/project.controller.ts` | Tạo mới | Project REST endpoints |
| `apps/backend/src/project/dto/create-project.dto.ts` | Tạo mới | Validation DTO |
| `apps/backend/src/project/dto/update-project.dto.ts` | Tạo mới | Validation DTO |
| `apps/backend/src/project/dto/project-response.dto.ts` | Tạo mới | Response DTO |
| `apps/backend/src/project/dto/project-list-item.dto.ts` | Tạo mới | Response DTO |
| `apps/backend/src/project/members/project-member.service.ts` | Tạo mới | Member management service |
| `apps/backend/src/project/members/project-member.controller.ts` | Tạo mới | Member REST endpoints |
| `apps/backend/src/project/dto/add-member.dto.ts` | Tạo mới | Validation DTO |
| `apps/backend/src/project/dto/update-member-role.dto.ts` | Tạo mới | Validation DTO |
| `apps/backend/src/project/dto/member-response.dto.ts` | Tạo mới | Response DTO |
| `apps/backend/src/project/project.module.ts` | Tạo mới | NestJS module wiring |
| `apps/backend/src/app.module.ts` | Sửa đổi | Import ProjectModule, remove InvitationModule |
| `apps/backend/src/invitation/` | Xóa | Xóa InvitationModule cũ |
| `apps/frontend/src/main.ts` | Sửa đổi | Routing config cho frontend |
| `apps/frontend/src/app/layout/app-shell/` | Tạo mới | AppShell component & Sidebar component |
| `apps/frontend/src/app/projects/` | Tạo mới | Services, Store, Pages (List, Create, Settings) |

## Rủi ro
- Việc xóa hoàn toàn InvitationModule có thể ảnh hưởng nếu có code nào khác tham chiếu tới nó. Cần kiểm tra kỹ toàn bộ backend codebase.
- Việc auto-refresh/revoke token của user khi đổi role/xóa cần phối hợp đúng với TokenService và AuthModule.
- UI styling với Tailwind CSS v4 và PrimeNG v21 cần đảm bảo đồng bộ, tránh lỗi mất CSS layout.

## Done criteria
- Đã chạy database migrations thành công.
- Đã xóa InvitationModule và build backend thành công.
- Toàn bộ backend unit tests, property tests và E2E tests viết mới đều pass và đạt coverage.
- Giao diện frontend hoạt động mượt mà, đầy đủ các page, tab, sidebar collapsible hoạt động bình thường, chuyển project nhanh không load lại trang.
- Không có lỗi compile hay runtime ở cả frontend và backend.

## Rollback
- Hoàn tác các file được sửa đổi (git checkout).
- Xóa các file tạo mới.
- Chạy `npm run migration:revert` ở backend để rollback schema database.
