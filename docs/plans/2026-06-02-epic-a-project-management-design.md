# Epic A: Project Management — Design Document

**Date:** 2026-06-02  
**Status:** Approved  
**Scope:** Core — tạo/xem project, mời member (direct add), project settings (general + members + danger zone)

---

## 1. Architecture Overview

### Backend — modules mới
- `ProjectModule` (`src/project/`) — CRUD project, archive, delete
- `ProjectMemberModule` (`src/project/members/`) — add/remove/change role
- Migration mới: bảng `projects` + FK constraint cho `project_members`
- `InvitationModule` hiện tại bị xóa (thay bằng direct-add flow)

### Frontend — structure mới
- `AppShellComponent` — layout chính với collapsible sidebar + router outlet
- `ProjectModule` — list, create, settings pages
- Sidebar: project switcher (dropdown) ở top, nav links bên dưới

### Luồng sau login
```
Login → /projects (project list)
         → click project → /projects/:key/board
         → tạo mới      → /projects/new
```

**Không thay đổi:** `AuthModule`, `ProfileModule`, `AuditModule`, `AdminModule`

---

## 2. Database Schema

### Migration: `CreateProjectTables`

```sql
-- Bảng projects
CREATE TABLE "projects" (
  "id"           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name"         VARCHAR(100) NOT NULL,
  "description"  VARCHAR(2000),
  "key"          VARCHAR(5) NOT NULL,
  "status"       project_status_enum NOT NULL DEFAULT 'active',
  "owner_id"     UUID NOT NULL REFERENCES users(id),
  "task_counter" INTEGER NOT NULL DEFAULT 0,
  "created_at"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  "archived_at"  TIMESTAMPTZ,
  CONSTRAINT "uq_project_key" UNIQUE ("key")
);

CREATE TYPE "project_status_enum" AS ENUM ('active', 'archived');

-- FK bổ sung cho project_members
ALTER TABLE "project_members"
  ADD CONSTRAINT "fk_pm_project"
  FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE;
```

### Indexes
| Index | Column(s) | Type |
|-------|-----------|------|
| `uq_project_key` | `key` | UNIQUE |
| `idx_project_owner` | `owner_id` | INDEX |
| `idx_project_status` | `status` | INDEX |

### Constraints
- `key`: 2–5 ký tự in hoa (`/^[A-Z]{2,5}$/`), unique toàn hệ thống
- `name`: 1–100 ký tự
- `description`: tối đa 2000 ký tự

---

## 3. Backend API

### ProjectModule — `src/project/`

| Method | Endpoint | Guard | Mô tả |
|--------|----------|-------|-------|
| `GET` | `/projects` | JWT | Danh sách projects của user hiện tại |
| `POST` | `/projects` | JWT | Tạo project mới (owner = current user) |
| `GET` | `/projects/:id` | JWT + member | Chi tiết project |
| `PATCH` | `/projects/:id` | Scrum_Master / Admin | Sửa name, description |
| `PATCH` | `/projects/:id/archive` | Scrum_Master / Admin | Archive project |
| `DELETE` | `/projects/:id` | Scrum_Master / Admin | Xóa vĩnh viễn |

### ProjectMemberModule — `src/project/members/`

| Method | Endpoint | Guard | Mô tả |
|--------|----------|-------|-------|
| `GET` | `/projects/:id/members` | JWT + member | Danh sách members + roles |
| `POST` | `/projects/:id/members` | Scrum_Master / Admin | Add member bằng email (direct add) |
| `PATCH` | `/projects/:id/members/:userId` | Scrum_Master / Admin | Đổi project role |
| `DELETE` | `/projects/:id/members/:userId` | Scrum_Master / Admin | Xóa member |

### Audit events bổ sung
```
project_created, project_updated, project_archived, project_deleted,
member_added, member_removed, member_role_changed
```

### Business rules
- `key` unique: trả `409` với message rõ ràng nếu đã tồn tại
- Không thể xóa/archive nếu là Scrum_Master duy nhất
- Không thể remove member nếu họ là Scrum_Master duy nhất

---

## 4. Frontend Routes & Pages

### Routing structure
```
/projects                    → ProjectListPage
/projects/new                → CreateProjectPage
/projects/:key               → redirect → /projects/:key/board
/projects/:key/*             → ProjectShellComponent (sidebar layout)
  ├── board                  → BoardPage (placeholder)
  ├── backlog                → BacklogPage (placeholder)
  └── settings               → ProjectSettingsPage
        ├── (general)        → tab General (default)
        ├── members          → tab Members
        └── danger           → tab Danger Zone
```

### AppShellComponent
- Sidebar trái: collapsible, state lưu `localStorage`
- Collapsed: 64px (icon only) / Expanded: 240px, CSS transition
- Top: project switcher dropdown
- Nav: Board, Backlog, Settings

### ProjectListPage — `/projects`
- Table: Tên, Key, Status badge, Owner, Ngày tạo (dd/MM/yyyy), Actions
- Filter: tên (search text), status (active/archived), date range
- Multiple select + bulk delete với confirm dialog (PrimeNG ConfirmDialog)
- CTA: "Tạo project mới"

### CreateProjectPage — `/projects/new`
- Fields: Name, Key (auto-suggest từ name, editable, uppercase), Description
- Key: debounced unique check → inline error nếu trùng

### ProjectSettingsPage — tab General
- Sửa name, description
- Key: read-only (không thể thay đổi sau khi tạo)

### ProjectSettingsPage — tab Members
- Table: Avatar, Tên, Email, Role (p-select), Ngày tham gia (dd/MM/yyyy)
- Filter: search theo tên/email
- Add member: input email → lookup user → confirm với role selector
- Remove: confirm dialog

### ProjectSettingsPage — tab Danger Zone
- Archive: confirm dialog
- Delete: confirm dialog yêu cầu gõ project key để xác nhận

---

## 5. UI Standards (toàn dự án)

> Xem chi tiết tại `.kiro/steering/ui-standards.md` — chuẩn áp dụng toàn hệ thống.

Tóm tắt: `dd/MM/yyyy` · `HH:mm:ss` · số phân nghìn · tỷ lệ ≤ 2 số lẻ · list pages: filter + bulk select + confirm delete · sidebar collapsible.

---

## 6. Implementation Order

1. **Migration** — tạo bảng `projects`, thêm FK vào `project_members`, update audit event enum
2. **Backend** — `ProjectModule` (CRUD + archive/delete) → `ProjectMemberModule`
3. **Frontend shell** — `AppShellComponent` với collapsible sidebar, routing setup
4. **Frontend pages** — `ProjectListPage` → `CreateProjectPage` → `ProjectSettingsPage`
5. **Xóa** `InvitationModule` (sau khi `ProjectMemberModule` hoạt động)
