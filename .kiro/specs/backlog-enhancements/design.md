---
specName: backlog-enhancements
version: 1.0
status: draft
---

# Design: Backlog Enhancements

## Overview

Tài liệu kỹ thuật cho **Backlog Enhancements** — cải tiến UX Backlog (drag toàn row, label badge, display properties) và mở rộng mô hình scope cho Labels, States và Modules sang workspace/project level.

### Quyết định thiết kế chính

| Quyết định | Lựa chọn | Lý do |
|-----------|----------|-------|
| Drag toàn row | Bỏ `cdkDragHandle`, giữ `cdkDrag` trên row | CDK dùng toàn element khi không có `cdkDragHandle`; click vẫn hoạt động nhờ 5px threshold |
| Display Properties storage | `localStorage` per-project | Không cần API; persist local; không tốn server state |
| Label scope | Thêm cột `scope`, `workspace_id`, nullable `project_id` | UNION query đơn giản; không cần bảng mới; backward compatible |
| State templates | Bảng riêng `workspace_state_templates` + `template_id` trên `project_states` | Decoupled; project states hoàn toàn độc lập sau khi copy; không cần runtime inheritance |
| Module nhiều-nhiều | Bảng join `task_modules` | Task thuộc nhiều modules; tránh denormalize |
| Module progress | Computed column hoặc computed tại query time | Tránh stale cache; tính lại khi query |

---

## Architecture

### High-Level Component Flow

```
Frontend Angular 21
  ├── BacklogPage
  │     ├── BacklogToolbarComponent      ← thêm nút "Display"
  │     │     └── DisplayPropertiesPanel ← mới
  │     └── TaskListComponent            ← nhận displayProps @Input
  │           ├── Label badges (scope-aware)
  │           └── Module badges (scope-aware)
  ├── ModulesPage                        ← mới (/projects/:key/modules)
  │     ├── ModuleListComponent
  │     └── ModuleDetailComponent
  ├── TaskDetailPanelComponent
  │     └── Modules field (multi-select picker)
  └── LabelManagerComponent
        └── 2 tabs: Workspace / Project

NestJS Backend
  ├── LabelController           ← cập nhật: thêm workspace routes
  ├── LabelService              ← cập nhật: merge query, scope validation
  ├── ProjectStateController    ← giữ nguyên
  ├── StateTemplateController   ← mới: /workspaces/:wid/state-templates
  ├── StateTemplateService      ← mới
  ├── ModuleController          ← mới: /workspaces/:wid/modules + /projects/:pid/modules
  └── ModuleService             ← mới
```

---

## Data Model

### Thay đổi bảng `labels`

```sql
-- Migration: AddLabelScope
ALTER TABLE labels
  ADD COLUMN scope         VARCHAR(10)  NOT NULL DEFAULT 'project'
                           CHECK (scope IN ('workspace', 'project')),
  ADD COLUMN workspace_id  UUID         NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
  ALTER COLUMN project_id  DROP NOT NULL;

-- Xóa UNIQUE constraint cũ (project_id, name)
ALTER TABLE labels DROP CONSTRAINT IF EXISTS labels_project_id_name_key;

-- Thêm 2 partial UNIQUE constraints theo scope
CREATE UNIQUE INDEX idx_labels_unique_workspace
  ON labels(workspace_id, name)
  WHERE scope = 'workspace';

CREATE UNIQUE INDEX idx_labels_unique_project
  ON labels(project_id, name)
  WHERE scope = 'project';

-- Indexes cho merge query
CREATE INDEX idx_labels_workspace ON labels(workspace_id) WHERE scope = 'workspace';
CREATE INDEX idx_labels_project   ON labels(project_id)   WHERE scope = 'project';

-- Backfill workspace_id từ project.workspace_id cho labels hiện tại
UPDATE labels l
SET workspace_id = p.workspace_id
FROM projects p
WHERE l.project_id = p.id;
```

### Bảng mới `workspace_state_templates`

```sql
CREATE TABLE workspace_state_templates (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID        NOT NULL,  -- FK khi có workspace entity
    name         VARCHAR(50) NOT NULL,
    color        CHAR(7)     NOT NULL DEFAULT '#6B7280',
    "group"      VARCHAR(20) NOT NULL CHECK ("group" IN ('backlog','unstarted','started','completed','cancelled')),
    is_default   BOOLEAN     NOT NULL DEFAULT false,
    "order"      SMALLINT    NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(workspace_id, name)
);

CREATE INDEX idx_state_templates_workspace ON workspace_state_templates(workspace_id);
```

### Thay đổi bảng `project_states`

```sql
-- Migration: AddTemplateIdToProjectStates
ALTER TABLE project_states
  ADD COLUMN template_id UUID REFERENCES workspace_state_templates(id) ON DELETE SET NULL;

CREATE INDEX idx_project_states_template ON project_states(template_id) WHERE template_id IS NOT NULL;
```

### Bảng mới `modules`

```sql
CREATE TYPE module_status_enum AS ENUM ('backlog', 'in_progress', 'paused', 'completed', 'cancelled');

CREATE TABLE modules (
    id           UUID               PRIMARY KEY DEFAULT gen_random_uuid(),
    scope        VARCHAR(10)        NOT NULL CHECK (scope IN ('workspace', 'project')),
    workspace_id UUID               NOT NULL,
    project_id   UUID               REFERENCES projects(id) ON DELETE CASCADE,
    name         VARCHAR(100)       NOT NULL,
    description  TEXT,
    status       module_status_enum NOT NULL DEFAULT 'backlog',
    start_date   DATE,
    end_date     DATE,
    created_by   UUID               NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at   TIMESTAMPTZ        NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ        NOT NULL DEFAULT now(),
    CONSTRAINT chk_module_scope CHECK (
        (scope = 'workspace' AND project_id IS NULL) OR
        (scope = 'project'   AND project_id IS NOT NULL)
    )
);

CREATE UNIQUE INDEX idx_modules_unique_workspace ON modules(workspace_id, name) WHERE scope = 'workspace';
CREATE UNIQUE INDEX idx_modules_unique_project   ON modules(project_id, name)   WHERE scope = 'project';
CREATE INDEX idx_modules_workspace ON modules(workspace_id) WHERE scope = 'workspace';
CREATE INDEX idx_modules_project   ON modules(project_id)   WHERE scope = 'project';
CREATE INDEX idx_modules_end_date  ON modules(end_date)     WHERE end_date IS NOT NULL;
```

### Bảng mới `task_modules`

```sql
CREATE TABLE task_modules (
    task_id   UUID NOT NULL REFERENCES tasks(id)   ON DELETE CASCADE,
    module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    added_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (task_id, module_id)
);

CREATE INDEX idx_task_modules_module ON task_modules(module_id);
CREATE INDEX idx_task_modules_task   ON task_modules(task_id);
```

### Cập nhật bảng `tasks` — thêm vào TaskListItem response

Không thêm cột vào `tasks`. Module được JOIN từ `task_modules` khi query task list.

---

## API Contracts

### Label Endpoints — Cập nhật

#### `GET /api/projects/:projectId/labels`

Trả về merged list (workspace + project), không thay đổi response schema để backward compatible.

**Response (200):**
```json
[
  {
    "id": "uuid",
    "scope": "workspace",
    "workspaceId": "uuid",
    "projectId": null,
    "name": "bug",
    "color": "#EF4444",
    "taskCount": 12
  },
  {
    "id": "uuid",
    "scope": "project",
    "workspaceId": "uuid",
    "projectId": "uuid",
    "name": "frontend",
    "color": "#3B82F6",
    "taskCount": 3
  }
]
```

---

#### `GET /api/workspaces/:workspaceId/labels`

**Guards:** `@JwtAuth`, Workspace Admin only

**Response (200):** Array of workspace-scoped labels (same schema)

---

#### `POST /api/workspaces/:workspaceId/labels`

**Guards:** `@JwtAuth`, Workspace Admin only

**Request:**
```json
{ "name": "hotfix", "color": "#F97316" }
```

**Response (201):** Label object với `scope = 'workspace'`

**Errors:**
| Code | Error | Khi nào |
|------|-------|---------|
| 403 | FORBIDDEN | Non-admin |
| 409 | LABEL_NAME_EXISTS | Tên trùng trong workspace |

---

#### `PATCH /api/workspaces/:workspaceId/labels/:labelId`
#### `DELETE /api/workspaces/:workspaceId/labels/:labelId`

**DELETE Response (200):**
```json
{ "deletedLabelId": "uuid", "affectedTaskCount": 25 }
```

---

### State Template Endpoints — Mới

#### `GET /api/workspaces/:workspaceId/state-templates`

**Response (200):**
```json
[
  {
    "id": "uuid",
    "workspaceId": "uuid",
    "name": "In Progress",
    "color": "#3B82F6",
    "group": "started",
    "isDefault": false,
    "order": 2
  }
]
```

---

#### `POST /api/workspaces/:workspaceId/state-templates`

**Guards:** `@JwtAuth`, Workspace Admin

**Request:**
```json
{ "name": "In Review", "color": "#8B5CF6", "group": "started" }
```

**Response (201):** StateTemplate object

**Errors:**
| Code | Error | Khi nào |
|------|-------|---------|
| 409 | TEMPLATE_NAME_EXISTS | Tên trùng trong workspace |

---

#### `PATCH /api/workspaces/:workspaceId/state-templates/:templateId`
#### `DELETE /api/workspaces/:workspaceId/state-templates/:templateId`

---

#### `POST /api/workspaces/:workspaceId/state-templates/apply/:projectId`

Apply (merge) template vào project đang tồn tại — chỉ thêm states chưa có (theo template_id).

**Guards:** `@JwtAuth`, Workspace Admin

**Response (200):**
```json
{ "addedCount": 2, "skippedCount": 3 }
```

---

### Cập nhật `POST /api/projects` — thêm stateTemplate

**Request thêm field:**
```json
{
  "name": "New Project",
  "key": "NP",
  "stateTemplate": "workspace"
}
```

`stateTemplate`: `"blank"` (default) | `"workspace"` — nếu `"workspace"` và workspace chưa có template, fallback về `"blank"`.

---

### Module Endpoints — Mới

#### `GET /api/projects/:projectId/modules`

**Guards:** `@JwtAuth`, member check

**Query params:** `status` (filter), `scope` (workspace | project | all, default: all)

**Response (200):**
```json
[
  {
    "id": "uuid",
    "scope": "workspace",
    "workspaceId": "uuid",
    "projectId": null,
    "name": "Release v2.0",
    "description": null,
    "status": "in_progress",
    "startDate": "2026-06-01",
    "endDate": "2026-07-01",
    "taskCount": 24,
    "completedCount": 8,
    "progress": 33,
    "createdBy": "uuid",
    "createdAt": "2026-05-01T00:00:00Z",
    "updatedAt": "2026-06-01T00:00:00Z"
  }
]
```

---

#### `POST /api/projects/:projectId/modules`

**Guards:** `@JwtAuth`, `@ProjectRoles('Scrum_Master','Product_Owner')`

**Request:**
```json
{
  "name": "Sprint 3",
  "description": "Authentication refactor",
  "status": "backlog",
  "startDate": "2026-06-15",
  "endDate": "2026-06-30"
}
```

**Response (201):** Module object với `scope = 'project'`

---

#### `PATCH /api/projects/:projectId/modules/:moduleId`

Partial update — name, description, status, startDate, endDate.

**Guards:** `@JwtAuth`, `@ProjectRoles('Scrum_Master','Product_Owner')` cho project module; Workspace Admin cho workspace module.

---

#### `DELETE /api/projects/:projectId/modules/:moduleId`

Xóa module và tất cả `task_modules`. Tasks không bị ảnh hưởng.

---

#### `GET /api/workspaces/:workspaceId/modules`

**Guards:** `@JwtAuth`, member của workspace

---

#### `POST /api/workspaces/:workspaceId/modules`

**Guards:** `@JwtAuth`, Workspace Admin

---

#### `POST /api/projects/:projectId/modules/:moduleId/tasks`

Gán tasks vào module.

**Request:**
```json
{ "taskIds": ["uuid-1", "uuid-2"] }
```

**Response (200):**
```json
{ "added": 2, "alreadyExists": 0 }
```

---

#### `DELETE /api/projects/:projectId/modules/:moduleId/tasks/:taskId`

Gỡ task khỏi module.

---

#### Cập nhật `GET /api/projects/:projectId/tasks`

Thêm `modules` vào TaskListItem response:

```json
{
  "id": "uuid",
  "taskId": "MPM-42",
  "modules": [
    { "id": "uuid", "name": "Sprint 3", "scope": "project", "status": "in_progress" }
  ]
}
```

JOIN `task_modules → modules` — LEFT JOIN để không exclude tasks không thuộc module nào.

---

## Business Logic

### Label Merge Query

```typescript
// label.service.ts — findAllForProject
async findAllForProject(projectId: string, workspaceId: string) {
  return this.labelRepo
    .createQueryBuilder('l')
    .leftJoin('task_labels', 'tl', 'tl.label_id = l.id')
    .select('l.*')
    .addSelect('COUNT(tl.task_id)', 'taskCount')
    .where('(l.scope = :ws AND l.workspace_id = :wid) OR (l.scope = :proj AND l.project_id = :pid)', {
      ws: 'workspace', wid: workspaceId,
      proj: 'project', pid: projectId,
    })
    .groupBy('l.id')
    .orderBy('l.scope', 'ASC')   // workspace trước
    .addOrderBy('l.name', 'ASC')
    .getRawMany();
}
```

### State Template Apply Logic

```typescript
async applyTemplate(workspaceId: string, projectId: string): Promise<{ addedCount: number; skippedCount: number }> {
  const templates = await this.templateRepo.find({ where: { workspaceId } });
  const existingTemplateIds = new Set(
    (await this.stateRepo.find({ where: { projectId }, select: ['templateId'] }))
      .map(s => s.templateId).filter(Boolean)
  );

  let addedCount = 0, skippedCount = 0;
  for (const tpl of templates) {
    if (existingTemplateIds.has(tpl.id)) { skippedCount++; continue; }
    // Check name uniqueness
    const nameExists = await this.stateRepo.findOne({ where: { projectId, name: tpl.name } });
    const name = nameExists ? `${tpl.name} (template)` : tpl.name;
    await this.stateRepo.save({ projectId, name, color: tpl.color, group: tpl.group,
      isDefault: false, order: tpl.order, templateId: tpl.id });
    addedCount++;
  }
  return { addedCount, skippedCount };
}
```

### Module Progress Computation

```typescript
// Computed khi query, không lưu vào DB để tránh stale
async findAllForProject(projectId: string, workspaceId: string) {
  return this.moduleRepo
    .createQueryBuilder('m')
    .leftJoin('task_modules', 'tm', 'tm.module_id = m.id')
    .leftJoin('tasks', 't', 't.id = tm.task_id AND t.project_id = :pid', { pid: projectId })
    .select('m.*')
    .addSelect('COUNT(t.id)', 'taskCount')
    .addSelect(`COUNT(t.id) FILTER (WHERE t.state IN ('done', 'completed'))`, 'completedCount')
    .where('(m.scope = :ws AND m.workspace_id = :wid) OR (m.scope = :proj AND m.project_id = :pid2)', {
      ws: 'workspace', wid: workspaceId,
      proj: 'project', pid2: projectId,
    })
    .groupBy('m.id')
    .orderBy('m.scope', 'ASC').addOrderBy('m.end_date', 'ASC')
    .getRawMany()
    .then(rows => rows.map(r => ({
      ...r,
      taskCount: parseInt(r.taskCount),
      completedCount: parseInt(r.completedCount),
      progress: r.taskCount > 0 ? Math.round(parseInt(r.completedCount) / parseInt(r.taskCount) * 100) : 0,
    })));
}
```

### Display Properties — Frontend

```typescript
// libs/shared-types/src/task.types.ts
export interface DisplayProperties {
  showAssignee: boolean;
  showPriority: boolean;
  showDueDate: boolean;
  showStartDate: boolean;
  showLabels: boolean;
  showEstimate: boolean;
  showSubItemCount: boolean;
  showState: boolean;
  showModules: boolean;
  alwaysShowLabels: boolean;
  labelMode: 'badge' | 'dot';
  maxLabels: number;   // 1–4
  maxModules: number;  // 1–3
}

export const DEFAULT_DISPLAY_PROPS: DisplayProperties = {
  showAssignee: true, showPriority: true, showDueDate: true,
  showStartDate: false, showLabels: true, showEstimate: true,
  showSubItemCount: true, showState: true, showModules: true,
  alwaysShowLabels: false, labelMode: 'badge', maxLabels: 2, maxModules: 1,
};
```

```typescript
// backlog.component.ts
protected readonly displayProps = signal<DisplayProperties>(
  JSON.parse(localStorage.getItem(`display-props-${this.projectId}`) ?? 'null')
  ?? DEFAULT_DISPLAY_PROPS
);

updateDisplayProps(patch: Partial<DisplayProperties>): void {
  this.displayProps.update(prev => {
    const next = { ...prev, ...patch };
    localStorage.setItem(`display-props-${this.projectId}`, JSON.stringify(next));
    return next;
  });
}
```

### Drag toàn row — Thay đổi template

Tại [task-list.component.ts:115-168](../../../apps/frontend/src/app/tasks/pages/backlog/task-list/task-list.component.ts#L115-L168):

```html
<!-- Trước: cdkDrag row với cdkDragHandle trên icon -->
<div cdkDrag class="row-hover flex items-center border-b border-gray-50 cursor-pointer" ...>

<!-- Sau: thêm cursor-grab, bỏ cdkDragHandle khỏi icon -->
<div cdkDrag class="row-hover flex items-center border-b border-gray-50 cursor-grab active:cursor-grabbing" ...>
```

```html
<!-- Trước (line 165-168) -->
<i cdkDragHandle class="show-on-hover opacity-0 pi pi-bars ..." ...></i>

<!-- Sau: bỏ cdkDragHandle -->
<i class="show-on-hover opacity-0 pi pi-bars text-[10px] text-gray-300 flex-shrink-0 mr-1"
   style="width:12px" (click)="$event.stopPropagation()"></i>
```

---

## Security Considerations

- **Scope isolation**: Mọi query workspace resource đều filter `workspace_id` để tránh cross-workspace access
- **Authorization**: Workspace Admin check qua `@Roles('admin')` guard; project SM/PO check qua `@ProjectRoles(...)` guard hiện có
- **Label delete cascade**: Xóa workspace label cascade `task_labels` của nhiều project — cần confirm dialog với count; log audit
- **Module permission**: SM/PO chỉ CRUD project-scoped modules; workspace-scoped modules chỉ Workspace Admin

---

## Performance Considerations

- **Label merge**: Partial indexes `WHERE scope = 'workspace'` và `WHERE scope = 'project'` đảm bảo query hiệu quả; COUNT với JOIN task_labels cần index `idx_task_labels_label` (đã có từ Epic B)
- **Module progress**: Computed tại query time với aggregate — thêm index `idx_tasks_state` (đã có) để filter state nhanh
- **Task list modules JOIN**: LEFT JOIN `task_modules → modules` — thêm index `idx_task_modules_task` để tránh seq scan
- **Display Properties**: Không có network call — apply tức thì phía client qua Angular Signals; không ảnh hưởng API performance

---

## Dependencies

- **Epic B shared types**: `Label`, `TaskListItem`, `ProjectState` cần cập nhật thêm `scope`, `modules[]`, `templateId`
- **Epic A**: Cần `workspace_id` trên `Project` entity — verify trước khi migrate
- **Angular CDK DragDrop**: Đã có từ Epic B — chỉ thay đổi template, không thêm dependency
- **Frontend libs mới**: Không cần thêm library mới

---

## Migration Plan

### Migration 1: `AddLabelScope`
1. Thêm cột `scope` (default 'project'), `workspace_id` (default placeholder UUID)
2. Nullable `project_id`
3. Backfill `workspace_id` từ `projects.workspace_id`
4. Drop UNIQUE(project_id, name), thêm 2 partial UNIQUE indexes
5. `down()`: xóa indexes, cột mới; restore NOT NULL trên project_id; restore UNIQUE cũ

### Migration 2: `CreateWorkspaceStateTemplates`
1. Tạo bảng `workspace_state_templates`
2. Thêm cột `template_id` vào `project_states` (nullable, FK với ON DELETE SET NULL)
3. `down()`: drop `template_id`, drop bảng

### Migration 3: `CreateModules`
1. Tạo enum `module_status_enum`
2. Tạo bảng `modules` với CHECK constraint scope
3. Tạo bảng `task_modules`
4. Tạo indexes
5. `down()`: drop indexes → task_modules → modules → enum

Thứ tự: Migration 1 → 2 → 3. Tất cả migrations backward compatible — không xóa dữ liệu hiện tại.
