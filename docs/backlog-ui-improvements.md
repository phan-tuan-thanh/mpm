# Phân tích & Giải pháp cải thiện UI Backlog

> **Phạm vi:** `apps/frontend/src/app/tasks/pages/backlog/`
> **Ngày:** 2026-06-03

---

## Mục lục

1. [Drag toàn row thay vì nút handle](#1-drag-toàn-row-thay-vì-nút-handle)
2. [Label hiển thị dạng badge](#2-label-hiển-thị-dạng-badge)
3. [Toggle hiển thị thuộc tính per-item](#3-toggle-hiển-thị-thuộc-tính-per-item)
4. [Labels — scope và tuỳ biến theo project](#4-labels--scope-và-tuỳ-biến-theo-project)
5. [States — scope và tuỳ biến theo project](#5-states--scope-và-tuỳ-biến-theo-project)
6. [Modules — scope và tuỳ biến theo project](#6-modules--scope-và-tuỳ-biến-theo-project)

---

## 1. Drag toàn row thay vì nút handle

### Hiện trạng

File: [task-list.component.ts:165-168](../apps/frontend/src/app/tasks/pages/backlog/task-list/task-list.component.ts#L165-L168)

```html
<!-- Chỉ icon hamburger mới là drag handle -->
<i cdkDragHandle
   class="show-on-hover opacity-0 pi pi-bars ..."
   (click)="$event.stopPropagation()"></i>
```

Vấn đề:
- User phải hover để icon xuất hiện → không trực quan.
- Vùng bắt kéo nhỏ (12px), dễ miss.
- Toàn bộ row đã có `cdkDrag`, nhưng khi có `cdkDragHandle` Angular CDK **chỉ** kích hoạt drag từ handle đó.

### Giải pháp

Bỏ `cdkDragHandle` khỏi icon hamburger. CDK sẽ tự dùng toàn bộ phần tử `cdkDrag` (tức là toàn row) làm vùng kéo.

**Trước (lines 164-168):**
```html
@else {
  <i cdkDragHandle
     class="show-on-hover opacity-0 pi pi-bars text-[10px] ..."
     (click)="$event.stopPropagation()"></i>
}
```

**Sau:**
```html
@else {
  <!-- Giữ icon visual, bỏ cdkDragHandle — toàn row trở thành drag zone -->
  <i class="show-on-hover opacity-0 pi pi-bars text-[10px] text-gray-300 flex-shrink-0 mr-1"
     style="width:12px"
     (click)="$event.stopPropagation()"></i>
}
```

Đồng thời thêm `cursor-grab` lên class của row root:

```html
<!-- line 116 — cdkDrag row -->
<div cdkDrag
     class="row-hover flex items-center border-b border-gray-50 cursor-grab active:cursor-grabbing"
     ...>
```

**Lưu ý bảo tồn UX click:**
Row đang emit `taskClick` khi click. CDK phân biệt drag và click qua threshold distance (mặc định 5px) nên click thông thường vẫn hoạt động. Không cần thêm guard code.

**Kết quả kỳ vọng:**
- Toàn row có thể kéo, cursor chuyển `grab` khi hover.
- Icon hamburger vẫn hiện lên khi hover như visual hint.
- Click vào row vẫn mở task detail (không bị kích hoạt drag).

---

## 2. Label hiển thị dạng badge

### Hiện trạng

File: [task-list.component.ts:207-210](../apps/frontend/src/app/tasks/pages/backlog/task-list/task-list.component.ts#L207-L210)

```html
@for (label of (task.labels ?? []).slice(0, 2); track label.id) {
  <span class="show-on-hover opacity-0 text-xs px-1.5 py-px rounded-full font-medium
               flex-shrink-0 mr-1 max-w-[72px] truncate"
        [style.background]="label.color + '22'" [style.color]="label.color">
    {{ label.name }}
  </span>
}
```

Vấn đề:
- Labels chỉ hiện **khi hover** (`show-on-hover opacity-0`).
- Giới hạn cứng 2 label, không có overflow indicator.
- Style badge chưa nhất quán — thiếu border, icon, và "+N" indicator.

### Giải pháp — 3 chế độ hiển thị

#### 2a. Luôn hiển thị (không ẩn khi không hover)

Bỏ class `show-on-hover opacity-0` khỏi label span. Labels luôn visible như plane.so.

#### 2b. Badge style hoàn chỉnh

```html
<!-- Single label -->
<span class="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium
             border flex-shrink-0 mr-1"
      [style.background]="label.color + '1A'"
      [style.color]="label.color"
      [style.border-color]="label.color + '40'"
      [pTooltip]="label.name">
  <span class="w-1.5 h-1.5 rounded-full flex-shrink-0"
        [style.background]="label.color"></span>
  <span class="max-w-[80px] truncate">{{ label.name }}</span>
</span>
```

#### 2c. Overflow indicator khi nhiều hơn N labels

```html
<!-- Hiển thị tối đa maxLabels, còn lại gom vào +N -->
@let visibleLabels = (task.labels ?? []).slice(0, maxLabels);
@let hiddenCount = (task.labels?.length ?? 0) - maxLabels;

@for (label of visibleLabels; track label.id) {
  <!-- badge như 2b -->
}

@if (hiddenCount > 0) {
  <span class="inline-flex items-center text-xs px-1.5 py-0.5 rounded-full
               bg-gray-100 text-gray-500 font-medium flex-shrink-0"
        [pTooltip]="hiddenLabels(task.labels)">
    +{{ hiddenCount }}
  </span>
}
```

`maxLabels` mặc định = 2, có thể controlled từ `displayProps` (feature ở mục 3).

#### 2d. Compact mode — chỉ hiện dot

Khi cột quá hẹp hoặc user chọn mode compact:

```html
<!-- Chỉ các chấm màu thay vì text label -->
@for (label of (task.labels ?? []).slice(0, 4); track label.id) {
  <span class="w-2 h-2 rounded-full flex-shrink-0 -mr-0.5"
        [style.background]="label.color"
        [pTooltip]="label.name"></span>
}
```

### Cấu trúc thay thế hoàn chỉnh (recommended)

```html
<!-- Thay thế block lines 207-210 -->
<div class="flex items-center flex-shrink-0 mr-2 gap-1"
     [class.show-on-hover]="!displayProps.alwaysShowLabels"
     [class.opacity-0]="!displayProps.alwaysShowLabels">

  @if (displayProps.labelMode === 'dot') {
    @for (label of (task.labels ?? []).slice(0, 4); track label.id) {
      <span class="w-2 h-2 rounded-full"
            [style.background]="label.color"
            [pTooltip]="label.name"></span>
    }
  } @else {
    @for (label of (task.labels ?? []).slice(0, displayProps.maxLabels); track label.id) {
      <span class="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full
                   font-medium border flex-shrink-0"
            [style.background]="label.color + '1A'"
            [style.color]="label.color"
            [style.border-color]="label.color + '40'"
            [pTooltip]="label.name">
        <span class="w-1.5 h-1.5 rounded-full" [style.background]="label.color"></span>
        <span class="max-w-[80px] truncate">{{ label.name }}</span>
      </span>
    }
    @if ((task.labels?.length ?? 0) > displayProps.maxLabels) {
      <span class="text-xs px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium"
            [pTooltip]="hiddenLabelNames(task)">
        +{{ (task.labels?.length ?? 0) - displayProps.maxLabels }}
      </span>
    }
  }

</div>
```

---

## 3. Toggle hiển thị thuộc tính per-item

### Hiện trạng — Display properties

Hiện tại không có cơ chế nào để user bật/tắt cột/thuộc tính trong list view. Các thuộc tính (label, estimate, due date, priority, assignee) luôn được hard-code render với class `show-on-hover`.

### Mục tiêu (theo plane.so)

Panel **"Display Properties"** cho phép user chọn:
- Thuộc tính nào hiển thị (Assignee, Start date, Due date, Labels, Priority, State, Sub-item count, Attachment count, Estimate, Module, Cycle, Link, Created by)
- Chế độ hiển thị label (badge / dot)
- Group by / Order by

### Thiết kế giải pháp

#### 3a. Interface `DisplayProperties`

Thêm vào `libs/shared-types/src/task.types.ts` (hoặc file riêng):

```typescript
export interface DisplayProperties {
  showAssignee: boolean;
  showPriority: boolean;
  showDueDate: boolean;
  showStartDate: boolean;
  showLabels: boolean;
  showEstimate: boolean;
  showSubItemCount: boolean;
  showState: boolean;        // có thể ẩn state circle
  alwaysShowLabels: boolean; // false = chỉ hiện khi hover
  labelMode: 'badge' | 'dot';
  maxLabels: number;         // 1-4
}

export const DEFAULT_DISPLAY_PROPS: DisplayProperties = {
  showAssignee: true,
  showPriority: true,
  showDueDate: true,
  showStartDate: false,
  showLabels: true,
  showEstimate: true,
  showSubItemCount: true,
  showState: true,
  alwaysShowLabels: false,
  labelMode: 'badge',
  maxLabels: 2,
};
```

#### 3b. Lưu trữ state

Dùng `localStorage` để persist per-project settings (không cần API):

```typescript
// backlog.component.ts
protected readonly displayProps = signal<DisplayProperties>(
  JSON.parse(localStorage.getItem(`display-props-${this.projectId}`) ?? 'null')
  ?? DEFAULT_DISPLAY_PROPS
);

updateDisplayProps(patch: Partial<DisplayProperties>): void {
  this.displayProps.update(p => {
    const next = { ...p, ...patch };
    localStorage.setItem(`display-props-${this.projectId}`, JSON.stringify(next));
    return next;
  });
}
```

#### 3c. Component `DisplayPropertiesPanel`

Tạo component mới: `backlog-toolbar/display-properties-panel.component.ts`

```
backlog/
  backlog-toolbar/
    backlog-toolbar.component.ts        (hiện có)
    display-properties-panel.component.ts  (mới)
```

UI panel (popover, kích hoạt từ nút "Display" trên toolbar):

```
┌─────────────────────────────────┐
│  Display Properties          ✕  │
├─────────────────────────────────┤
│  Assignee          [toggle ON]  │
│  Start date        [toggle OFF] │
│  Due date          [toggle ON]  │
│  Labels            [toggle ON]  │
│    └─ Mode:  ● Badge  ○ Dot     │
│    └─ Max:   [2]  ▲ ▼           │
│    └─ Always show  [toggle OFF] │
│  Priority          [toggle ON]  │
│  Estimate          [toggle ON]  │
│  Sub-item count    [toggle ON]  │
├─────────────────────────────────┤
│  Group by   [State         ▼]   │
│  Order by   [Manual - Rank ▼]   │
└─────────────────────────────────┘
```

#### 3d. Truyền `displayProps` vào `TaskListComponent`

```typescript
// backlog.component.ts template
<app-task-list
  [tasks]="tasks()"
  [states]="states()"
  [displayProps]="displayProps()"
  ...
/>
```

```typescript
// task-list.component.ts
@Input() displayProps: DisplayProperties = DEFAULT_DISPLAY_PROPS;
```

#### 3e. Áp dụng trong template — conditional render

```html
<!-- Thay các block show-on-hover hiện tại -->

@if (displayProps.showSubItemCount && childCount > 0) {
  <span class="show-on-hover opacity-0 ...">...</span>
}

@if (displayProps.showLabels) {
  <!-- badge block từ mục 2 -->
}

@if (displayProps.showEstimate && task.estimateValue != null) {
  <span class="show-on-hover opacity-0 ...">...</span>
}

@if (displayProps.showDueDate && task.dueDate) {
  <span class="...">...</span>
}

@if (displayProps.showPriority && task.priority !== 'none') {
  <i class="show-on-hover opacity-0 ..."></i>
}

@if (displayProps.showAssignee && task.assignees?.length) {
  <div class="show-on-hover opacity-0 ...">...</div>
}
```

---

---

## 4. Labels — scope và tuỳ biến theo project

### Hiện trạng

File: [label.entity.ts](../apps/backend/src/task/entities/label.entity.ts) và [task.types.ts:43-51](../libs/shared-types/src/task.types.ts#L43-L51)

```typescript
// Hiện tại — Label chỉ gắn cứng với 1 project
export interface Label {
  id: string;
  projectId: string;   // bắt buộc, FK cứng
  name: string;
  color: string;
  taskCount?: number;
  createdAt: Date;
  updatedAt: Date;
}
```

Vấn đề:
- Label chỉ tồn tại trong phạm vi 1 project, không tái sử dụng được giữa các project.
- Không có workspace-level labels (ví dụ: nhãn tổ chức chung như `bug`, `feature`, `hotfix`).
- Mỗi project phải tạo lại label từ đầu, gây rời rạc dữ liệu.
- Không phân biệt được "label được kế thừa từ workspace" và "label riêng của project".

### Thiết kế scope

#### 4a. Mô hình scope

| Scope | Ý nghĩa | Ai quản lý | Visible trong |
|-------|---------|-----------|--------------|
| `workspace` | Label dùng chung toàn workspace | Admin / Owner workspace | Mọi project trong workspace |
| `project` | Label riêng của project | SM / PO của project | Chỉ project đó |

#### 4b. Thay đổi data model

**Backend — `label.entity.ts`:**
```typescript
@Entity('labels')
export class Label {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: ['workspace', 'project'], default: 'project' })
  scope: 'workspace' | 'project';

  // workspaceId luôn có (mọi label đều thuộc workspace)
  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId: string;

  // projectId chỉ có khi scope = 'project', nullable
  @Column({ name: 'project_id', type: 'uuid', nullable: true })
  projectId: string | null;

  @Column({ type: 'varchar', length: 50 })
  name: string;

  @Column({ type: 'char', length: 7, default: '#6B7280' })
  color: string;
  // ...
}
```

**Shared types:**
```typescript
export interface Label {
  id: string;
  scope: 'workspace' | 'project';
  workspaceId: string;
  projectId: string | null;   // null khi scope='workspace'
  name: string;
  color: string;
  taskCount?: number;
  createdAt: Date;
  updatedAt: Date;
}
```

#### 4c. Thay đổi API

| Endpoint | Mục đích |
|----------|---------|
| `GET /api/workspaces/:wid/labels` | Lấy workspace labels |
| `POST /api/workspaces/:wid/labels` | Tạo workspace label (admin only) |
| `PATCH /api/workspaces/:wid/labels/:id` | Sửa workspace label |
| `DELETE /api/workspaces/:wid/labels/:id` | Xóa workspace label |
| `GET /api/projects/:pid/labels` | Lấy **tất cả** labels visible trong project (workspace + project-scoped) |
| `POST /api/projects/:pid/labels` | Tạo project label |
| `PATCH /api/projects/:pid/labels/:id` | Sửa project label (không sửa được workspace label) |
| `DELETE /api/projects/:pid/labels/:id` | Xóa project label |

`GET /api/projects/:pid/labels` trả về merged list:
```typescript
// label.service.ts — findAllForProject
async findAllForProject(projectId: string, workspaceId: string) {
  return this.labelRepo.find({
    where: [
      { scope: 'workspace', workspaceId },
      { scope: 'project', projectId },
    ],
    order: { scope: 'ASC', name: 'ASC' },
  });
}
```

#### 4d. Thay đổi UI — Label Manager

Hiện tại: [label-manager.component.ts](../apps/frontend/src/app/tasks/components/label-manager/label-manager.component.ts) — 1 danh sách phẳng.

Sau khi cải thiện: chia thành 2 tab.

```
┌─────────────────────────────────────────┐
│  Quản lý Labels                      ✕  │
├─────────────────────────────────────────┤
│  [Workspace Labels]  [Project Labels]   │ ← tabs
├─────────────────────────────────────────┤
│  Workspace Labels (chỉ Admin xem/sửa)  │
│  ● bug          #EF4444  [4 tasks]      │
│  ● feature      #3B82F6  [12 tasks]     │
│  ● hotfix       #F97316  [2 tasks]      │
│                                         │
│  [+ Thêm workspace label] (admin only)  │
├─────────────────────────────────────────┤
│  Project Labels (SM/PO quản lý)         │
│  ● backend      #10B981  [3 tasks]  ✏️  │
│  ● ui-fix       #8B5CF6  [1 task]   ✏️  │
│                                         │
│  [+ Thêm project label]                 │
└─────────────────────────────────────────┘
```

#### 4e. Thay đổi UI — Hiển thị badge theo scope

Workspace labels có visual indicator riêng để phân biệt:

```html
<!-- Badge workspace label — thêm icon globe nhỏ -->
<span class="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium border"
      [style.background]="label.color + '1A'"
      [style.color]="label.color"
      [style.border-color]="label.color + '40'">
  @if (label.scope === 'workspace') {
    <i class="pi pi-globe text-[8px] opacity-60"></i>
  } @else {
    <span class="w-1.5 h-1.5 rounded-full" [style.background]="label.color"></span>
  }
  <span class="max-w-[80px] truncate">{{ label.name }}</span>
</span>
```

#### 4f. Quy tắc quyền

| Hành động | Workspace Admin | Project SM/PO | Project Member |
|-----------|:-:|:-:|:-:|
| Tạo workspace label | ✅ | ❌ | ❌ |
| Sửa/xóa workspace label | ✅ | ❌ | ❌ |
| Gán workspace label vào task | ✅ | ✅ | ✅ |
| Tạo project label | ✅ | ✅ | ❌ |
| Sửa/xóa project label | ✅ | ✅ | ❌ |
| Gán project label vào task | ✅ | ✅ | ✅ |

---

## 5. States — scope và tuỳ biến theo project

### Hiện trạng

File: [project-state.entity.ts](../apps/backend/src/project/entities/project-state.entity.ts) và [project.types.ts:89-99](../libs/shared-types/src/project.types.ts#L89-L99)

```typescript
// Hiện tại — State gắn cứng với 1 project
export interface ProjectState {
  id: string;
  projectId: string;   // bắt buộc
  name: string;
  color: string;
  group: StateGroup;   // 'backlog'|'unstarted'|'started'|'completed'|'cancelled'
  isDefault: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}
```

Ràng buộc hiện tại:
- Tối đa 20 states / project.
- Không xóa default state.
- State đang dùng bởi task phải migrate trước khi xóa.
- Không có khái niệm workspace template.

Vấn đề:
- Mỗi project được seed một bộ states mặc định cứng (không rõ từ đâu), không thể tái sử dụng cấu hình tổ chức.
- Không có workspace-level state template để đồng bộ quy trình làm việc giữa các project.
- PM tạo project mới phải thiết lập lại states từ đầu mỗi lần.

### Thiết kế scope

#### 5a. Mô hình 2 lớp

```
Workspace
 └── State Templates  (scope='workspace')
      ├── "To Do"        group=unstarted  (template)
      ├── "In Progress"  group=started    (template)
      └── "Done"         group=completed  (template)

Project A
 └── States  (scope='project')
      ├── "Backlog"       group=backlog    (project-only)
      ├── "In Review"     group=started    (project-only)
      └── "Done"          group=completed  (overrides/inherits template)
```

Hai chiến lược có thể chọn — ghi rõ trade-off:

| | **Chiến lược A — Template (copy-on-create)** | **Chiến lược B — Runtime inheritance** |
|-|----------------------------------------------|----------------------------------------|
| Cơ chế | Khi tạo project, copy states từ template vào project | Project có thể kế thừa workspace states tại runtime |
| Độ phức tạp backend | Thấp — chỉ cần seed logic | Cao — mỗi query phải merge 2 nguồn |
| Tính đồng bộ | Thay đổi template không ảnh hưởng project cũ | Thay đổi template lan sang tất cả project kế thừa |
| Tuỳ biến per-project | Tự do hoàn toàn sau khi copy | Phải override (tạo project-state riêng) |
| **Recommended** | ✅ Đơn giản, dễ kiểm soát | ⚠️ Phù hợp nếu cần sync live |

**Tài liệu này chọn Chiến lược A** (template copy-on-create) vì phù hợp với kiến trúc hiện tại và không cần thay đổi task query logic.

#### 5b. Thay đổi data model

**Bảng mới — `workspace_state_templates`:**
```typescript
@Entity('workspace_state_templates')
export class WorkspaceStateTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId: string;

  @Column({ type: 'varchar', length: 50 })
  name: string;

  @Column({ type: 'char', length: 7, default: '#6B7280' })
  color: string;

  @Column({
    type: 'enum',
    enum: ['backlog', 'unstarted', 'started', 'completed', 'cancelled'],
  })
  group: StateGroup;

  @Column({ name: 'is_default', type: 'boolean', default: false })
  isDefault: boolean;

  @Column({ type: 'smallint', default: 0 })
  order: number;
}
```

**`project_states` — thêm trường `templateId` để trace nguồn gốc (optional):**
```typescript
@Column({ name: 'template_id', type: 'uuid', nullable: true })
templateId: string | null;   // null = state do project tự tạo
```

**Shared types — bổ sung:**
```typescript
export interface WorkspaceStateTemplate {
  id: string;
  workspaceId: string;
  name: string;
  color: string;
  group: StateGroup;
  isDefault: boolean;
  order: number;
}

// ProjectState — thêm trường templateId
export interface ProjectState {
  id: string;
  projectId: string;
  templateId: string | null;   // null = custom state
  name: string;
  color: string;
  group: StateGroup;
  isDefault: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}
```

#### 5c. Luồng tạo project mới

```
User tạo project
  └─→ Chọn: [Blank] hoặc [Dùng workspace template]
        │
        ├─ Blank: seed 3 states mặc định cứng (Backlog, In Progress, Done)
        │
        └─ Workspace template: copy toàn bộ WorkspaceStateTemplate
             vào project_states với templateId tương ứng
```

API:
```
POST /api/projects
body: { ..., stateTemplate: 'blank' | 'workspace' }
```

#### 5d. Thay đổi API workspace templates

| Endpoint | Mục đích |
|----------|---------|
| `GET /api/workspaces/:wid/state-templates` | Lấy danh sách templates |
| `POST /api/workspaces/:wid/state-templates` | Tạo template (admin) |
| `PATCH /api/workspaces/:wid/state-templates/:id` | Sửa template |
| `DELETE /api/workspaces/:wid/state-templates/:id` | Xóa template |
| `POST /api/workspaces/:wid/state-templates/apply/:pid` | Áp dụng lại template vào project (merge) |

Endpoint `apply` cho phép workspace admin đồng bộ lại template vào project đang tồn tại — chỉ thêm state còn thiếu, không xóa state project đã tùy biến.

#### 5e. Thay đổi UI — Settings States Tab

Hiện tại: [states-tab.component.ts](../apps/frontend/src/app/projects/pages/project-settings/states-tab/states-tab.component.ts) — hiển thị 1 danh sách phẳng per-project.

Sau khi cải thiện:

```
┌─────────────────────────────────────────────────────┐
│  States                                             │
├─────────────────────────────────────────────────────┤
│  Workspace Template  (Admin only — read-only ở đây) │
│  ┌──────────────────────────────────────────────┐   │
│  │  ● Backlog      [backlog]    #6B7280          │   │
│  │  ● To Do        [unstarted]  #9CA3AF          │   │
│  │  ● In Progress  [started]    #3B82F6          │   │
│  │  ● Done         [completed]  #10B981          │   │
│  │  ● Cancelled    [cancelled]  #EF4444          │   │
│  └──────────────────────────────────────────────┘   │
│  [Áp dụng lại template vào project này]             │
│                                                     │
│  States của Project  (SM/PO chỉnh sửa)              │
│  ┌──────────────────────────────────────────────┐   │
│  │  ⠿ ● Backlog    [backlog]    #6B7280  ★ ✏️ 🗑 │   │ ← ★=default
│  │  ⠿ ● In Review  [started]    #8B5CF6     ✏️ 🗑 │   │ ← custom (templateId=null)
│  │  ⠿ ● Done       [completed]  #10B981     ✏️ 🗑 │   │ ← từ template (templateId có)
│  └──────────────────────────────────────────────┘   │
│  [+ Thêm state]                                     │
└─────────────────────────────────────────────────────┘
```

Visual indicator: state có `templateId` không null hiển thị icon nhỏ (ví dụ `pi-link`) cho biết state này được copy từ workspace template.

#### 5f. Thay đổi UI — Backlog list

States trong backlog list view không thay đổi logic render — vẫn dùng `ProjectState` per-project. Sự khác biệt chỉ ở cách các states được tạo ra ban đầu (từ template hay blank).

Tuy nhiên, nếu workspace admin thay đổi template sau khi project đã tạo: cần UI thông báo "Template đã được cập nhật. Bạn có muốn đồng bộ?" (banner nhỏ trong Settings > States).

#### 5g. Quyền

| Hành động | Workspace Admin | Project SM/PO | Project Member |
|-----------|:-:|:-:|:-:|
| Xem workspace state templates | ✅ | ✅ (read-only) | ❌ |
| Tạo/sửa/xóa workspace templates | ✅ | ❌ | ❌ |
| Áp dụng template vào project | ✅ | ❌ | ❌ |
| Tạo/sửa/xóa project states | ✅ | ✅ | ❌ |
| Đặt default state | ✅ | ✅ | ❌ |
| Migrate tasks giữa states | ✅ | ✅ | ❌ |

---

---

## 6. Modules — scope và tuỳ biến theo project

### Hiện trạng

Module hiện tại **chỉ là một feature flag** bật/tắt:

- [project.entity.ts:77-78](../apps/backend/src/project/entities/project.entity.ts#L77-L78): `featureModules: boolean`
- [sidebar.component.ts:157-168](../apps/frontend/src/app/layout/app-shell/sidebar/sidebar.component.ts#L157-L168): Hiển thị link sidebar `/projects/:key/modules` khi `features().modules === true`
- [project.types.ts:43](../libs/shared-types/src/project.types.ts#L43): `modules: boolean` trong `ProjectFeatures`

Không có: entity Module, bảng DB, service, controller, hay shared type `ProjectModule`. Feature chưa được triển khai — chỉ mới có placeholder routing.

Vấn đề khi triển khai nếu không thiết kế scope ngay từ đầu:
- Module sẽ lại bị gắn cứng per-project như Label và State hiện tại.
- Không thể tạo "module template" dùng chung (ví dụ: Release v1.0 áp dụng cho nhiều project).
- Không thể báo cáo tổng hợp tiến độ module xuyên project ở workspace level.

### Khái niệm Module trong hệ thống

Module là **container nhóm tasks** theo chủ đề, milestone hoặc deliverable. Khác với State (workflow) và Label (tag), Module mô tả **phạm vi công việc** có thời hạn cụ thể.

| Thuộc tính | Mô tả |
|------------|-------|
| `name` | Tên module (VD: "Release 2.0", "Auth Refactor") |
| `description` | Mô tả chi tiết |
| `status` | `backlog` / `in_progress` / `paused` / `completed` / `cancelled` |
| `startDate` / `endDate` | Thời gian thực hiện |
| `scope` | `workspace` hoặc `project` |
| `progress` | % hoàn thành (computed từ tasks) |

Một task có thể thuộc **0 hoặc nhiều** module (many-to-many).

### Thiết kế scope

#### 6a. Mô hình scope

| Scope | Ý nghĩa | Ai quản lý | Visible trong |
|-------|---------|-----------|--------------|
| `workspace` | Module xuyên project, track deliverable tổ chức | Admin / Owner workspace | Mọi project trong workspace |
| `project` | Module riêng của project, track milestone nội bộ | SM / PO của project | Chỉ project đó |

So sánh với Labels:
- Labels là **tag phân loại** → không có lifecycle.
- Modules là **container có thời hạn** → có status, ngày bắt đầu/kết thúc, progress.
- Workspace module thường tương ứng với Release hoặc Program Increment (PI).
- Project module thường tương ứng với Sprint hoặc Feature Group.

#### 6b. Thay đổi data model

**Bảng mới — `modules`:**
```typescript
@Entity('modules')
export class ProjectModule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: ['workspace', 'project'], default: 'project' })
  scope: 'workspace' | 'project';

  // workspaceId luôn có
  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId: string;

  // null khi scope = 'workspace'
  @Column({ name: 'project_id', type: 'uuid', nullable: true })
  projectId: string | null;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({
    type: 'enum',
    enum: ['backlog', 'in_progress', 'paused', 'completed', 'cancelled'],
    default: 'backlog',
  })
  status: ModuleStatus;

  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate: string | null;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate: string | null;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
```

**Bảng join — `task_modules`** (many-to-many):
```typescript
@Entity('task_modules')
export class TaskModule {
  @Column({ name: 'task_id', type: 'uuid', primary: true })
  taskId: string;

  @Column({ name: 'module_id', type: 'uuid', primary: true })
  moduleId: string;

  @CreateDateColumn({ name: 'added_at', type: 'timestamptz' })
  addedAt: Date;
}
```

**Shared types — `task.types.ts`:**
```typescript
export type ModuleStatus = 'backlog' | 'in_progress' | 'paused' | 'completed' | 'cancelled';

export interface ProjectModule {
  id: string;
  scope: 'workspace' | 'project';
  workspaceId: string;
  projectId: string | null;
  name: string;
  description: string | null;
  status: ModuleStatus;
  startDate: string | null;
  endDate: string | null;
  createdBy: string;
  taskCount?: number;       // computed
  completedCount?: number;  // computed
  progress?: number;        // completedCount / taskCount * 100
  createdAt: Date;
  updatedAt: Date;
}

// Cập nhật TaskListItem — thêm modules
export interface TaskListItem {
  // ...existing fields...
  modules?: Pick<ProjectModule, 'id' | 'name' | 'status'>[];
}
```

#### 6c. API endpoints

**Workspace modules:**

| Method | Endpoint | Mục đích | Quyền |
|--------|----------|---------|-------|
| `GET` | `/api/workspaces/:wid/modules` | Lấy workspace modules | Member |
| `POST` | `/api/workspaces/:wid/modules` | Tạo workspace module | Admin |
| `PATCH` | `/api/workspaces/:wid/modules/:id` | Sửa workspace module | Admin |
| `DELETE` | `/api/workspaces/:wid/modules/:id` | Xóa workspace module | Admin |

**Project modules:**

| Method | Endpoint | Mục đích | Quyền |
|--------|----------|---------|-------|
| `GET` | `/api/projects/:pid/modules` | Lấy tất cả modules visible trong project (workspace + project) | Member |
| `POST` | `/api/projects/:pid/modules` | Tạo project module | SM/PO |
| `PATCH` | `/api/projects/:pid/modules/:id` | Sửa project module | SM/PO |
| `DELETE` | `/api/projects/:pid/modules/:id` | Xóa project module | SM/PO |
| `POST` | `/api/projects/:pid/modules/:id/tasks` | Gán tasks vào module | Member |
| `DELETE` | `/api/projects/:pid/modules/:id/tasks/:tid` | Gỡ task khỏi module | Member |

`GET /api/projects/:pid/modules` trả về merged list tương tự Labels:
```typescript
async findAllForProject(projectId: string, workspaceId: string) {
  return this.moduleRepo.find({
    where: [
      { scope: 'workspace', workspaceId },
      { scope: 'project', projectId },
    ],
    order: { scope: 'ASC', endDate: 'ASC', name: 'ASC' },
  });
}
```

#### 6d. Thay đổi UI — Modules page

Tạo mới trang `/projects/:key/modules` (hiện chỉ là route chưa có component):

```
apps/frontend/src/app/tasks/pages/
  modules/
    modules.component.ts         ← danh sách modules
    module-detail/
      module-detail.component.ts ← tasks trong module
    module-form/
      module-form.component.ts   ← tạo/sửa module
```

Layout trang Modules (2 cột, tương tự plane.so Cycles):

```
┌─────────────────────────────────────────────────────────────┐
│  Modules                               [+ New Module]       │
├────────────────┬────────────────────────────────────────────┤
│  Workspace     │  Project                                   │
│  [Admin only]  │  [SM / PO]                                 │
├────────────────┴────────────────────────────────────────────┤
│                                                             │
│  ◎ Release v2.0          In Progress   30%  → 2026-07-01   │
│    3 projects · 12 tasks                                    │
│                                                             │
│  ◎ Auth Refactor         Backlog        0%  → 2026-08-15   │
│    1 project · 0 tasks                                      │
│                                                             │
│  ─────────────── Project Modules ─────────────────────────  │
│                                                             │
│  ◉ Sprint 1 — Login Flow  Completed   100%  2026-05-01     │
│    8 tasks · 8 done                                         │
│                                                             │
│  ◉ Sprint 2 — Dashboard   In Progress  60%  → 2026-06-15  │
│    10 tasks · 6 done                                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

Visual phân biệt scope:
- **Workspace module**: icon `pi-globe` màu indigo, badge "WS"
- **Project module**: icon `pi-folder` màu teal, không có badge

#### 6e. Thay đổi UI — Backlog list

Module được thêm vào row metadata của task trong backlog (tương tự label badge), controlled bởi `displayProps.showModules`:

```html
@if (displayProps.showModules && task.modules?.length) {
  <div class="flex items-center flex-shrink-0 mr-2 gap-1">
    @for (mod of task.modules.slice(0, displayProps.maxModules); track mod.id) {
      <span class="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded font-medium border"
            [class.border-indigo-200]="mod.scope === 'workspace'"
            [class.border-teal-200]="mod.scope === 'project'"
            [class.bg-indigo-50]="mod.scope === 'workspace'"
            [class.bg-teal-50]="mod.scope === 'project'"
            [class.text-indigo-700]="mod.scope === 'workspace'"
            [class.text-teal-700]="mod.scope === 'project'"
            [pTooltip]="mod.name">
        <i class="text-[8px]"
           [class.pi-globe]="mod.scope === 'workspace'"
           [class.pi-folder]="mod.scope === 'project'"
           [class]="'pi ' + (mod.scope === 'workspace' ? 'pi-globe' : 'pi-folder')"></i>
        <span class="max-w-[80px] truncate">{{ mod.name }}</span>
      </span>
    }
    @if (task.modules.length > displayProps.maxModules) {
      <span class="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-medium">
        +{{ task.modules.length - displayProps.maxModules }}
      </span>
    }
  </div>
}
```

Cập nhật `DisplayProperties` để bao gồm module:
```typescript
export interface DisplayProperties {
  // ...existing fields...
  showModules: boolean;
  maxModules: number;  // 1-3
}

export const DEFAULT_DISPLAY_PROPS: DisplayProperties = {
  // ...existing defaults...
  showModules: true,
  maxModules: 1,
};
```

Panel Display Properties cập nhật:
```
┌─────────────────────────────────┐
│  Display Properties          ✕  │
├─────────────────────────────────┤
│  Assignee          [toggle ON]  │
│  Start date        [toggle OFF] │
│  Due date          [toggle ON]  │
│  Labels            [toggle ON]  │
│    └─ Mode:  ● Badge  ○ Dot     │
│    └─ Max:   [2]  ▲ ▼           │
│  Modules           [toggle ON]  │  ← mới
│    └─ Max:   [1]  ▲ ▼           │  ← mới
│  Priority          [toggle ON]  │
│  Estimate          [toggle ON]  │
│  Sub-item count    [toggle ON]  │
├─────────────────────────────────┤
│  Group by   [State         ▼]   │
│  Order by   [Manual - Rank ▼]   │
└─────────────────────────────────┘
```

#### 6f. Thay đổi UI — Task Detail Panel

Trong task detail panel, thêm field **Modules** (multi-select):

```
Module   [+ Add to module]
         ● Release v2.0    (WS)
         ● Sprint 2        (Project)
```

Picker module hiển thị 2 nhóm:
- **Workspace Modules** (có icon `pi-globe`)
- **Project Modules** (có icon `pi-folder`)

#### 6g. Quyền

| Hành động | Workspace Admin | Project SM/PO | Project Member |
|-----------|:-:|:-:|:-:|
| Tạo workspace module | ✅ | ❌ | ❌ |
| Sửa/xóa workspace module | ✅ | ❌ | ❌ |
| Xem workspace modules | ✅ | ✅ | ✅ |
| Tạo project module | ✅ | ✅ | ❌ |
| Sửa/xóa project module | ✅ | ✅ | ❌ |
| Gán/gỡ task vào module | ✅ | ✅ | ✅ |

---

## Tóm tắt thay đổi cần thực hiện

| # | Layer | File / Thành phần | Loại thay đổi | Mức độ |
|---|-------|-------------------|---------------|--------|
| 1 | Frontend | `task-list.component.ts` L165 | Bỏ `cdkDragHandle`, thêm `cursor-grab` | Nhỏ |
| 2 | Frontend | `task-list.component.ts` L207-210 | Refactor label block → badge có scope indicator | Vừa |
| 3 | Shared | `shared-types/task.types.ts` | Thêm `DisplayProperties`, cập nhật `Label` thêm `scope` | Nhỏ |
| 4 | Frontend | `backlog.component.ts` | Signal `displayProps`, persist localStorage | Vừa |
| 5 | Frontend | `display-properties-panel.component.ts` | Tạo mới panel component | Lớn |
| 6 | Frontend | `backlog-toolbar.component.ts` | Tích hợp nút "Display" + panel popover | Vừa |
| 7 | Frontend | `task-list.component.ts` | `@Input() displayProps`, conditional render | Vừa |
| 8 | Backend | `label.entity.ts` | Thêm `scope`, `workspaceId`, nullable `projectId` | Vừa |
| 9 | Backend | `label.service.ts` | `findAllForProject` merge workspace + project labels | Vừa |
| 10 | Backend | Routes | Thêm workspace label routes | Vừa |
| 11 | Frontend | `label-manager.component.ts` | Giao diện 2 tab (Workspace / Project labels) | Lớn |
| 12 | Shared | `project.types.ts` | Thêm `WorkspaceStateTemplate`, cập nhật `ProjectState` thêm `templateId` | Nhỏ |
| 13 | Backend | `workspace_state_templates` entity + service + controller | Bảng mới, CRUD + apply endpoint | Lớn |
| 14 | Backend | `project.service.ts` | Logic seed states từ template khi tạo project | Vừa |
| 15 | Frontend | `states-tab.component.ts` | Hiển thị workspace template (read-only) + project states | Lớn |
| 16 | Shared | `task.types.ts` | Thêm `ProjectModule`, `ModuleStatus`, cập nhật `TaskListItem` thêm `modules[]` | Nhỏ |
| 17 | Backend | `modules` entity + `task_modules` join table | Migration + 2 bảng mới | Vừa |
| 18 | Backend | `module.service.ts` + `module.controller.ts` | CRUD + task assignment, merge workspace/project | Lớn |
| 19 | Backend | `task.service.ts` | Include modules khi query task list | Nhỏ |
| 20 | Shared | `task.types.ts` | Cập nhật `DisplayProperties` thêm `showModules`, `maxModules` | Nhỏ |
| 21 | Frontend | `modules/` page (mới) | Trang danh sách modules, module detail | Lớn |
| 22 | Frontend | `task-list.component.ts` | Render module badge trong row | Vừa |
| 23 | Frontend | `task-detail-panel.component.ts` | Thêm field Modules (multi-select picker) | Vừa |
| 24 | Frontend | `display-properties-panel.component.ts` | Thêm toggle Modules + maxModules | Nhỏ |

**Thứ tự triển khai đề xuất theo nhóm:**

```
Sprint 1 — UI Backlog cơ bản (không phụ thuộc scope)
  #1  Drag toàn row
  #3  Thêm DisplayProperties type
  #2  Label badge style mới
  #4 + #7  Display props signal + conditional render
  #5 + #6  Display Properties Panel UI

Sprint 2 — Label scope
  #8  DB migration: thêm scope/workspaceId vào labels
  #9 + #10  Service + routes mới
  #3  Cập nhật shared type Label
  #11  Label Manager 2 tab

Sprint 3 — State templates
  #12  Cập nhật shared type ProjectState + WorkspaceStateTemplate
  #13  Entity + service + controller workspace_state_templates
  #14  Seed từ template khi tạo project
  #15  States Tab UI cập nhật

Sprint 4 — Modules (build from scratch với scope)
  #16  Cập nhật shared types (ProjectModule, ModuleStatus, TaskListItem)
  #17  DB migration: tạo bảng modules + task_modules
  #18  Module service + controller (workspace & project scope)
  #19  Task service: include modules trong query
  #20  Cập nhật DisplayProperties thêm showModules
  #21  Trang Modules UI
  #22  Module badge trong backlog row
  #23  Module picker trong task detail panel
  #24  Display Properties Panel: thêm Modules toggle
```

**Ghi chú phụ thuộc:**
- Sprint 4 (`#16–#24`) phụ thuộc Sprint 1 (`displayProps` infrastructure) nhưng **độc lập** với Sprint 2 & 3.
- `#16` (shared types) phải hoàn thành trước tất cả các item còn lại trong Sprint 4.
- `#17` (migration) phải chạy trước `#18` (service).
