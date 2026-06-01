# Implementation Plan: Project Management

## Overview

Triển khai Epic A — Project Management cho Agile PM. Bao gồm: database migration cho bảng `projects`, backend `ProjectModule` + `ProjectMemberModule`, frontend `AppShell` với collapsible sidebar, và các pages: Project List, Create Project, Project Settings (General/Members/Danger Zone). InvitationModule cũ sẽ bị xóa sau khi ProjectMemberModule hoạt động.

Stack: NestJS 11 + TypeORM + PostgreSQL 17 (backend), Angular 19 + Signals + PrimeNG 21 + Tailwind CSS 4 (frontend).

## Tasks

- [ ] 1. Database migration và shared types
  - [ ] 1.1 Tạo migration `CreateProjectTable`
    - Tạo file migration mới trong `migrations/` (timestamp prefix)
    - Tạo `CREATE TYPE "project_status_enum" AS ENUM ('active', 'archived')`
    - Tạo bảng `projects` với columns: id (UUID PK), name (VARCHAR 100), description (VARCHAR 2000 nullable), key (VARCHAR 5 UNIQUE), status (project_status_enum DEFAULT 'active'), owner_id (FK → users.id ON DELETE RESTRICT), task_counter (INTEGER DEFAULT 0), created_at, updated_at, archived_at (nullable)
    - Thêm FK constraint vào `project_members`: `ALTER TABLE project_members ADD CONSTRAINT fk_pm_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE`
    - Tạo indexes: `idx_project_key` (UNIQUE), `idx_project_owner`, `idx_project_status`, `idx_project_created`
    - Implement `down()` để rollback migration
    - _Requirements: 1.1, 4.3_

  - [ ] 1.2 Cập nhật audit event enum
    - Thêm `ALTER TYPE audit_event_type_enum ADD VALUE IF NOT EXISTS` cho 7 events mới: `project_created`, `project_updated`, `project_archived`, `project_deleted`, `member_added`, `member_removed`, `member_role_changed`
    - Cập nhật `apps/backend/src/auth/constants/auth-events.ts` với 7 event types mới
    - _Requirements: 1.5, 3.2, 4.1, 4.3, 5.1, 5.6_

  - [ ] 1.3 Cập nhật shared types
    - Thêm vào `libs/shared-types/src/`: interfaces `Project`, `ProjectListItem`, `MemberResponse`, `CreateProjectDto`, `UpdateProjectDto`, `AddMemberDto`
    - Thêm type `ProjectStatus = 'active' | 'archived'`
    - Thêm type `ProjectAuditEvent` với 7 event types mới
    - Build lại shared-types library
    - _Requirements: 1.1_

- [ ] 2. Checkpoint — Verify migration và shared types
  - Chạy migration trên database development, kiểm tra schema đúng với thiết kế
  - Verify shared types compile không lỗi
  - Hỏi user nếu có vấn đề

- [ ] 3. Backend — ProjectModule
  - [ ] 3.1 Tạo Project entity
    - Tạo `apps/backend/src/project/entities/project.entity.ts`
    - TypeORM decorators: `@Entity('projects')`, @PrimaryGeneratedColumn, @Column cho tất cả fields
    - Relations: `@ManyToOne(() => User)` cho owner, `@OneToMany(() => ProjectMember)` cho members
    - _Requirements: 1.1_

  - [ ] 3.2 Implement Project Service
    - Tạo `apps/backend/src/project/project.service.ts`
    - `create(userId, dto: CreateProjectDto)` — validate key format, check duplicate key (SELECT), INSERT project, INSERT project_member (Scrum_Master), ghi audit log `project_created`
    - `findAll(userId, query)` — SELECT projects WHERE user là member; Admin thấy tất cả; hỗ trợ filter name, status, date range
    - `findById(id, userId)` — SELECT project, check membership, trả về 404 nếu không tồn tại hoặc không có quyền
    - `findByKey(key, userId)` — SELECT project WHERE key = ?, check membership
    - `update(id, userId, dto: UpdateProjectDto)` — ignore key field nếu có, UPDATE name/description, ghi audit log `project_updated`
    - `archive(id, userId)` — UPDATE status = 'archived', archived_at = now(), ghi audit log `project_archived`
    - `delete(id, userId)` — DELETE project (CASCADE xóa project_members), ghi audit log `project_deleted`
    - `bulkDelete(ids[], userId)` — transaction: DELETE mỗi project trong ids, rollback toàn bộ nếu lỗi
    - _Requirements: 1.1, 1.2, 1.3, 1.5, 2.1, 2.5, 2.6, 3.1, 3.2, 3.3, 4.1, 4.3, 4.6_

  - [ ] 3.3 Implement Project Controller
    - Tạo `apps/backend/src/project/project.controller.ts`
    - `GET /api/projects` — @JwtAuth, gọi `findAll(userId, query)`
    - `POST /api/projects` — @JwtAuth, validate CreateProjectDto, gọi `create`
    - `GET /api/projects/by-key/:key` — @JwtAuth, gọi `findByKey`
    - `GET /api/projects/:id` — @JwtAuth + project member check, gọi `findById`
    - `PATCH /api/projects/:id` — @ProjectRoles('Scrum_Master') + @Roles('Admin'), gọi `update`
    - `PATCH /api/projects/:id/archive` — @ProjectRoles('Scrum_Master') + @Roles('Admin'), gọi `archive`
    - `DELETE /api/projects/:id` — @ProjectRoles('Scrum_Master') + @Roles('Admin'), gọi `delete`
    - `DELETE /api/projects` — @JwtAuth, body `{ids: string[]}`, gọi `bulkDelete`
    - _Requirements: 1.1, 2.1, 3.1, 3.3, 4.1, 4.3, 4.6_

  - [ ] 3.4 Tạo DTOs và validation
    - `create-project.dto.ts`: `@IsString() @Length(1,100) name`, `@Matches(/^[A-Z]{2,5}$/) key`, `@IsOptional() @MaxLength(2000) description`
    - `update-project.dto.ts`: tương tự create nhưng không có key, tất cả optional
    - `project-response.dto.ts`: full project shape
    - `project-list-item.dto.ts`: lightweight shape cho list
    - _Requirements: 1.4_

  - [ ]* 3.5 Viết property tests cho Project Service
    - **Property 1: Project Key Uniqueness** — create với key trùng → 409 PROJECT_KEY_EXISTS
    - **Property 2: Project Key Format** — create với key không match regex → 400
    - **Property 3: Creator Auto-Assignment** — sau khi create, user tồn tại trong project_members với Scrum_Master
    - **Property 6: Key Immutability** — PATCH với key field → key trong DB không thay đổi
    - **Property 9: Project Visibility** — findAll chỉ trả về projects user là member (ngoại trừ Admin)
    - **Property 10: Archive Preserves Data** — sau archive, project_members không bị xóa
    - **Property 11: Delete Cascades Members** — sau delete, không còn project_members orphan
    - **Property 12: Audit Log** — mọi mutating op đều tạo audit log
    - **Validates: Requirements 1.3, 1.4, 1.5, 2.1, 3.3, 4.1, 4.3**

- [ ] 4. Backend — ProjectMemberModule
  - [ ] 4.1 Implement Project Member Service
    - Tạo `apps/backend/src/project/members/project-member.service.ts`
    - `listMembers(projectId)` — SELECT project_members JOIN users WHERE project_id = ?; hỗ trợ filter theo displayName/email
    - `addMember(projectId, actorId, dto: AddMemberDto)` — lookup user bằng email (404 nếu không tồn tại), check duplicate (409 nếu đã là member), INSERT project_member, ghi audit log `member_added`, gọi TokenService để revoke token của user được thêm
    - `changeRole(projectId, targetUserId, actorId, dto: UpdateMemberRoleDto)` — check không phải Scrum_Master duy nhất (422), UPDATE role, ghi audit log `member_role_changed`, revoke token của targetUser
    - `removeMember(projectId, targetUserId, actorId)` — check không phải Scrum_Master duy nhất (422), DELETE project_member, ghi audit log `member_removed`, revoke token của targetUser
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

  - [ ] 4.2 Implement Project Member Controller
    - Tạo `apps/backend/src/project/members/project-member.controller.ts`
    - `GET /api/projects/:projectId/members` — @JwtAuth + member check
    - `POST /api/projects/:projectId/members` — @ProjectRoles('Scrum_Master') + @Roles('Admin')
    - `PATCH /api/projects/:projectId/members/:userId` — @ProjectRoles('Scrum_Master') + @Roles('Admin')
    - `DELETE /api/projects/:projectId/members/:userId` — @ProjectRoles('Scrum_Master') + @Roles('Admin')
    - _Requirements: 5.1, 5.4, 5.6, 5.8_

  - [ ] 4.3 Tạo Member DTOs
    - `add-member.dto.ts`: `@IsEmail() email`, `@IsEnum(ProjectRole) projectRole`
    - `update-member-role.dto.ts`: `@IsEnum(ProjectRole) projectRole`
    - `member-response.dto.ts`: userId, displayName, email, avatarUrl, projectRole, joinedAt
    - _Requirements: 5.1_

  - [ ]* 4.4 Viết property tests cho Project Member Service
    - **Property 4: Last Scrum_Master Protection** — changeRole/removeMember khi chỉ còn 1 Scrum_Master → 422
    - **Property 5: Member Uniqueness** — addMember user đã là member → 409
    - **Property 8: Direct Add Rejects Unknown Email** — addMember email không tồn tại → 404
    - **Property 14: Role Change Triggers Token Revocation** — sau changeRole/removeMember, token của targetUser bị revoke
    - **Validates: Requirements 5.2, 5.3, 5.5, 5.7**

- [ ] 5. Wire ProjectModule vào AppModule
  - Tạo `apps/backend/src/project/project.module.ts` — register ProjectController, ProjectMemberController, ProjectService, ProjectMemberService, TypeORM entities (Project, ProjectMember)
  - Import ProjectModule vào `apps/backend/src/app.module.ts`
  - Đảm bảo ProjectModule import AuditModule và AuthModule (để dùng TokenService)
  - _Requirements: 1.1_

- [ ] 6. Checkpoint — Verify tất cả backend modules
  - Chạy tất cả unit tests và property tests
  - Test manual: create project, add member, change role, archive, delete
  - Hỏi user nếu có vấn đề

- [ ] 7. Xóa InvitationModule
  - Xóa folder `apps/backend/src/invitation/`
  - Xóa InvitationModule khỏi `apps/backend/src/app.module.ts`
  - Kiểm tra không còn imports nào tham chiếu đến InvitationModule
  - _Requirements: design decision — direct add thay thế invitation flow_

- [ ] 8. Frontend — Routing và AppShell
  - [ ] 8.1 Cập nhật app routing
    - Cập nhật `apps/frontend/src/app/app.component.ts` (hoặc tạo `app.routes.ts` nếu chưa có)
    - Route `/` redirect đến `/projects`
    - Route `/projects` → lazy load ProjectListPage
    - Route `/projects/new` → lazy load CreateProjectPage
    - Route `/projects/:key/*` → lazy load AppShell (bao gồm sub-routes: board, backlog, settings)
    - Áp dụng `authGuard` cho tất cả routes trừ `/login`, `/callback`
    - _Requirements: 6.1, 6.6_

  - [ ] 8.2 Implement AppShell Component
    - Tạo `apps/frontend/src/app/layout/app-shell/app-shell.component.ts` — standalone component
    - Layout: flexbox row — sidebar bên trái + `<router-outlet>` bên phải
    - Inject `ActivatedRoute` để lấy `:key` param, load project vào ProjectStore
    - Khi `:key` không tìm thấy hoặc user không có quyền: hiển thị 403/404 page
    - _Requirements: 6.1, 6.6_

  - [ ] 8.3 Implement Sidebar Component
    - Tạo `apps/frontend/src/app/layout/app-shell/sidebar/sidebar.component.ts` — standalone
    - Collapsed state: `signal<boolean>` khởi tạo từ `localStorage.getItem('sidebar_collapsed')`
    - WHEN toggle: cập nhật signal + `localStorage.setItem('sidebar_collapsed', ...)`
    - Width transition: CSS `transition: width 200ms ease`; collapsed = 64px, expanded = 240px
    - Project Switcher: PrimeNG `<p-select>` với danh sách projects từ ProjectStore; khi thay đổi → router navigate đến `/projects/:newKey/board`
    - Nav links (dùng PrimeNG `<p-menu>` hoặc custom): Board, Backlog, Settings — active state theo route hiện tại
    - _Requirements: 6.2, 6.3, 6.4, 6.5_

- [ ] 9. Frontend — Project Service và Signal Store
  - [ ] 9.1 Implement Project Service (Angular)
    - Tạo `apps/frontend/src/app/projects/services/project.service.ts` — injectable
    - `getProjects(filter?)` → `GET /api/projects`
    - `getProjectByKey(key)` → `GET /api/projects/by-key/:key`
    - `createProject(dto)` → `POST /api/projects`
    - `updateProject(id, dto)` → `PATCH /api/projects/:id`
    - `archiveProject(id)` → `PATCH /api/projects/:id/archive`
    - `deleteProject(id)` → `DELETE /api/projects/:id`
    - `bulkDeleteProjects(ids)` → `DELETE /api/projects` body `{ids}`
    - `getMembers(projectId, filter?)` → `GET /api/projects/:projectId/members`
    - `addMember(projectId, dto)` → `POST /api/projects/:projectId/members`
    - `changeMemberRole(projectId, userId, dto)` → `PATCH /api/projects/:projectId/members/:userId`
    - `removeMember(projectId, userId)` → `DELETE /api/projects/:projectId/members/:userId`
    - _Requirements: 2.1, 5.1_

  - [ ] 9.2 Implement Project Signal Store
    - Tạo `apps/frontend/src/app/projects/state/project.store.ts`
    - Signals: `projects`, `currentProject`, `members`, `isLoading`, `error`
    - Methods: `loadProjects(filter?)`, `loadProject(key)`, `setCurrentProject(project)`, `loadMembers(projectId)`
    - _Requirements: 2.1, 6.5_

- [ ] 10. Frontend — Project List Page
  - [ ] 10.1 Implement ProjectListPage
    - Tạo `apps/frontend/src/app/projects/pages/project-list/project-list.component.ts` — standalone
    - PrimeNG `<p-table>` với columns: Tên (link → /projects/:key/board), Key, Status (`<p-tag>`), Vai trò của tôi, Ngày tạo (pipe: dd/MM/yyyy)
    - **Filter panel**: text search (debounce 300ms), status dropdown (All/Active/Archived), date range picker
    - **Multiple select**: `[selection]` binding, selection toolbar hiện khi có rows được chọn
    - **Bulk delete button**: gọi `confirmService.confirm()` trước khi gọi `bulkDeleteProjects`
    - **CTA**: nút "Tạo project mới" → navigate `/projects/new`
    - Empty state khi chưa có project
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 8.1, 8.5_

- [ ] 11. Frontend — Create Project Page
  - [ ] 11.1 Implement CreateProjectPage
    - Tạo `apps/frontend/src/app/projects/pages/create-project/create-project.component.ts` — standalone
    - Form fields: Name (p-inputtext, required, max 100), Key (p-inputtext, uppercase auto-transform, pattern `/^[A-Z]{2,5}$/`, debounced unique check 500ms), Description (p-textarea, max 2000, optional)
    - Key auto-suggest: WHEN name thay đổi → lấy các chữ cái in hoa đầu tiên của các từ, giới hạn 5 ký tự
    - Key unique check: debounced 500ms → `GET /api/projects/by-key/:key` → nếu exists thì show inline error
    - Submit: gọi `createProject`, on success navigate `/projects/:newKey/board`
    - Cancel: navigate về `/projects`
    - _Requirements: 1.1, 1.3, 1.4, 1.6_

- [ ] 12. Frontend — Project Settings Page
  - [ ] 12.1 Implement ProjectSettingsPage (container)
    - Tạo `apps/frontend/src/app/projects/pages/project-settings/project-settings.component.ts` — standalone
    - PrimeNG `<p-tabs>` với 3 tabs: General, Members, Danger Zone
    - Route `/projects/:key/settings` → General tab (default)
    - Route `/projects/:key/settings/members` → Members tab
    - Route `/projects/:key/settings/danger` → Danger Zone tab
    - Load current project từ ProjectStore
    - _Requirements: 7.1_

  - [ ] 12.2 Implement General Tab
    - Tạo `apps/frontend/src/app/projects/pages/project-settings/general-tab/general-tab.component.ts`
    - Form: Name (p-inputtext), Description (p-textarea)
    - Project Key: hiển thị read-only với PrimeNG `<p-chip>` hoặc disabled input + tooltip "Không thể thay đổi sau khi tạo"
    - Submit: gọi `updateProject`, show success toast
    - Disable form nếu user không có quyền Scrum_Master/Admin (read-only mode)
    - _Requirements: 7.2, 3.3_

  - [ ] 12.3 Implement Members Tab
    - Tạo `apps/frontend/src/app/projects/pages/project-settings/members-tab/members-tab.component.ts`
    - `<p-table>` với columns: Avatar (p-avatar), Tên, Email, Vai trò (p-select — editable khi có quyền), Ngày tham gia (dd/MM/yyyy), Actions (xóa)
    - Search box filter theo tên/email (client-side filter)
    - Nút "Thêm thành viên" → PrimeNG `<p-dialog>` với input email + p-select role → gọi `addMember`
    - Role change: onChange của p-select → gọi `changeMemberRole` + confirm nếu đang downgrade Scrum_Master
    - Remove: nút xóa mỗi row → confirm dialog → `removeMember`
    - _Requirements: 5.8, 5.9, 7.3_

  - [ ] 12.4 Implement Danger Zone Tab
    - Tạo `apps/frontend/src/app/projects/pages/project-settings/danger-zone-tab/danger-zone-tab.component.ts`
    - Section Archive: nút "Archive Project" (p-button severity="warning") → confirm dialog → `archiveProject`
    - Section Delete: nút "Delete Project" (p-button severity="danger") → dialog yêu cầu gõ Project Key → validate input === project.key → `deleteProject` → navigate `/projects`
    - Hiện warning text mô tả hậu quả của từng hành động
    - _Requirements: 4.2, 4.4, 7.4_

- [ ] 13. Checkpoint — Verify toàn bộ frontend
  - Chạy `ng build` — không có compile errors
  - Test manual toàn bộ flow: đăng nhập → xem project list → tạo project → mời member → settings → archive → delete
  - Kiểm tra responsive trên mobile viewport
  - Hỏi user nếu có vấn đề

- [ ] 14. Final checkpoint — Đảm bảo tất cả tests pass
  - Chạy tất cả backend tests: `npm test` trong `apps/backend`
  - Chạy `ng test` trong `apps/frontend`
  - Kiểm tra không còn imports nào từ InvitationModule đã xóa
  - Hỏi user nếu có vấn đề

## Notes

- Tasks đánh dấu `*` là optional, có thể skip cho MVP nhanh hơn
- Mỗi task tham chiếu Requirement IDs để đảm bảo traceability
- InvitationModule bị xóa ở task 7 — sau khi ProjectMemberModule đã verify hoạt động (task 4+5)
- UI format chuẩn áp dụng: ngày `dd/MM/yyyy`, số có phân nghìn, tỷ lệ ≤ 2 decimals
- PrimeNG components ưu tiên: `p-table`, `p-select`, `p-dialog`, `p-tabs`, `p-button`, `p-toast`, `p-confirmDialog`, `p-tag`, `p-avatar`
- Sidebar state persistence: localStorage key `sidebar_collapsed`
- Token revocation sau member role change: tái sử dụng `TokenService.addToForcedLogout` từ Auth module

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3"] },
    { "id": 1, "tasks": ["2"] },
    { "id": 2, "tasks": ["3.1", "3.2"] },
    { "id": 3, "tasks": ["3.3", "3.4"] },
    { "id": 4, "tasks": ["3.5", "4.1"] },
    { "id": 5, "tasks": ["4.2", "4.3"] },
    { "id": 6, "tasks": ["4.4", "5"] },
    { "id": 7, "tasks": ["6"] },
    { "id": 8, "tasks": ["7", "8.1"] },
    { "id": 9, "tasks": ["8.2", "8.3", "9.1", "9.2"] },
    { "id": 10, "tasks": ["10.1"] },
    { "id": 11, "tasks": ["11.1"] },
    { "id": 12, "tasks": ["12.1"] },
    { "id": 13, "tasks": ["12.2", "12.3", "12.4"] },
    { "id": 14, "tasks": ["13"] },
    { "id": 15, "tasks": ["14"] }
  ]
}
```
