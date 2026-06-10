# Custom Priority Configuration — Design Document

**Date:** 2026-06-10
**Status:** Approved

---

## Mục tiêu

Cho phép user cấu hình mức ưu tiên (priority) theo nhu cầu của từng dự án: thêm, bớt, đổi tên, màu, icon và thứ tự. Cấu hình được quản lý trong tab **Mức ưu tiên** của menu **Cấu hình** dự án.

---

## Quyết định thiết kế

| # | Câu hỏi | Quyết định |
|---|---------|-----------|
| 1 | Lưu ở đâu? | **Backend-supported** — bảng `project_priority` trong DB |
| 2 | Xoá priority đang dùng? | **Auto migrate** — dialog chọn replacement, backend tự UPDATE tasks |
| 3 | Thuộc tính mỗi mức? | **Tên + Màu cặp light/dark + Icon** (PrimeIcons picker) |
| 4 | Mục "None" có thể xoá? | **Không** — `isSystem = true`, chỉ đổi tên/màu/icon |

---

## Phần 1 — Backend

### Bảng `project_priority`

```sql
CREATE TABLE project_priority (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name        VARCHAR(50)  NOT NULL,
  value       VARCHAR(50)  NOT NULL,   -- slug lưu trong tasks.priority
  color_light VARCHAR(7)   NOT NULL,   -- hex light mode
  color_dark  VARCHAR(7)   NOT NULL,   -- hex dark mode
  icon        VARCHAR(100) NOT NULL,   -- "pi pi-flag"
  "order"     INTEGER      NOT NULL,
  is_system   BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  UNIQUE (project_id, value)
);
```

**Seed khi tạo project** — 5 mục mặc định với `value` khớp enum cũ:

| name    | value   | color_light | color_dark | icon          | order | is_system |
|---------|---------|-------------|------------|---------------|-------|-----------|
| Urgent  | urgent  | #EF4444     | #FCA5A5    | pi pi-flag    | 1     | false     |
| High    | high    | #F97316     | #FDBA74    | pi pi-flag    | 2     | false     |
| Medium  | medium  | #EAB308     | #FDE047    | pi pi-flag    | 3     | false     |
| Low     | low     | #3B82F6     | #93C5FD    | pi pi-flag    | 4     | false     |
| None    | none    | #9CA3AF     | #6B7280    | pi pi-flag    | 5     | true      |

> **Không cần migrate tasks.priority** — cột này vẫn là VARCHAR, các giá trị cũ khớp `value` của seed data.

### API Endpoints

| Method | Path | Mô tả |
|--------|------|-------|
| `GET`    | `/projects/:id/priorities`         | Lấy danh sách, sorted by order |
| `POST`   | `/projects/:id/priorities`         | Tạo mới |
| `PATCH`  | `/projects/:id/priorities/:pid`    | Sửa name/colorLight/colorDark/icon |
| `DELETE` | `/projects/:id/priorities/:pid`    | Xoá + migrate tasks |
| `POST`   | `/projects/:id/priorities/reorder` | Lưu thứ tự sau kéo thả |

**DELETE body:**
```json
{ "migrateToValue": "low" }
```
Backend thực hiện: `UPDATE tasks SET priority = $migrateToValue WHERE priority = $deletedValue AND project_id = $id`

**Validation:**
- `is_system = true` → reject DELETE
- `name` max 50 chars, `value` slug unique per project
- Tối thiểu 2 mục (1 system + 1 thường)

---

## Phần 2 — Frontend: Settings Tab

### Route

Thêm vào `main.ts` trong `children` của `settings`:

```typescript
{
  path: 'priorities',
  loadComponent: () =>
    import('.../project-settings/priorities-tab/priorities-tab.component')
      .then(m => m.PrioritiesTabComponent),
  title: 'Mức ưu tiên — Agile PM',
}
```

### Sidebar navigation

Thêm vào `settingsSubItems` trong `sidebar.component.ts` (sau `estimates`):

```typescript
{ label: 'Mức ưu tiên', icon: 'pi-flag', route: ['priorities'], exact: false, danger: false },
```

### Layout `PrioritiesTabComponent`

```
┌─────────────────────────────────────────────────────┐
│  Mức ưu tiên                          [+ Thêm mức]  │
│  Kéo để sắp xếp thứ tự hiển thị                    │
├─────────────────────────────────────────────────────┤
│ ≡  🔴●  [pi-flag▾]  Urgent          [✎] [🗑]       │
│ ≡  🟠●  [pi-flag▾]  High            [✎] [🗑]       │
│ ≡  🟡●  [pi-flag▾]  Medium          [✎] [🗑]       │
│ ≡  🔵●  [pi-flag▾]  Low             [✎] [🗑]       │
├─────────────────────────────────────────────────────┤
│ 🔒  ⬜●  [pi-minus▾] None           [✎]            │  ← isSystem
└─────────────────────────────────────────────────────┘
```

Khi bấm `[✎]` → **inline edit** tại chỗ (không dialog):

```
┌──────────────────────────────────────────────────────────────┐
│ ≡  [light██] [dark██]  [icon picker▾]  [_Urgent___________]  │
│                                        [Lưu]  [Hủy]          │
└──────────────────────────────────────────────────────────────┘
```

**Delete flow** (giống states-tab):
1. Click `[🗑]` → dialog xác nhận + dropdown chọn mức thay thế
2. Confirm → gọi `DELETE /projects/:id/priorities/:pid` với `migrateToValue`
3. Reload danh sách sau khi thành công

---

## Phần 3 — Shared UI Components

Đặt trong `apps/frontend/src/app/shared/components/`.

### `ColorPickerPanelComponent`

**Path:** `shared/components/color-picker-panel/`
**Selector:** `app-color-picker-panel`

Bảng màu preset + ô nhập hex tự do.

```typescript
@Input()  value: string                  // hex hiện tại, e.g. "#EF4444"
@Output() valueChange: EventEmitter<string>
```

UI:
```
┌────────────────────────────────┐
│  ● ● ● ● ● ● ● ● ● ● ● ● ●   │  preset swatches (36 màu)
│  ● ● ● ● ● ● ● ● ● ● ● ● ●   │
├────────────────────────────────┤
│  # [_______]   ██ preview      │  hex input + live preview
└────────────────────────────────┘
```

### `ColorPairPickerComponent`

**Path:** `shared/components/color-pair-picker/`
**Selector:** `app-color-pair-picker`

Wrapper 2 × `ColorPickerPanelComponent` (Light / Dark).

```typescript
@Input()  light: string
@Input()  dark: string
@Output() lightChange: EventEmitter<string>
@Output() darkChange: EventEmitter<string>
```

UI:
```
┌──────────────────────────────────────┐
│  Light  [████] ──────────────────    │
│  Dark   [████] ──────────────────    │
└──────────────────────────────────────┘
```

### `IconPickerPanelComponent`

**Path:** `shared/components/icon-picker-panel/`
**Selector:** `app-icon-picker-panel`

Hiển thị dưới dạng `p-popover`, chia nhóm icon, có search.

```typescript
@Input()  value: string                  // "pi pi-flag"
@Output() valueChange: EventEmitter<string>
// @Input() groups?: IconGroup[]         // override nhóm nếu cần
```

Danh sách icon định nghĩa trong `icon-picker.constants.ts`:

```typescript
export interface IconGroup { label: string; icons: string[] }

export const ICON_GROUPS: IconGroup[] = [
  { label: 'Flag / Priority', icons: ['pi pi-flag', 'pi pi-bookmark', 'pi pi-star', ...] },
  { label: 'Alert',           icons: ['pi pi-bolt', 'pi pi-exclamation-triangle', ...] },
  { label: 'Status',          icons: ['pi pi-check-circle', 'pi pi-times-circle', ...] },
  { label: 'Arrow',           icons: ['pi pi-arrow-up', 'pi pi-arrow-down', ...] },
  // dễ bổ sung nhóm mới
];
```

---

## Phần 4 — `PriorityConfigService` Refactor

Bỏ hoàn toàn localStorage. Service mới:

```typescript
@Injectable({ providedIn: 'root' })
export class PriorityConfigService {
  private readonly _priorities = signal<Record<string, ProjectPriority[]>>({});

  loadPriorities(projectId: string): void   // gọi API, lưu vào signal
  getOptions(projectId: string): ProjectPriority[]
  getConfig(projectId: string, value: string): ProjectPriority
}
```

`ProjectStore.loadProject()` tự gọi `priorityConfigService.loadPriorities(projectId)` — giống cách đang gọi `loadStates()`.

**Xoá** nút "Tùy chỉnh..." trong priority popover của `task-detail-panel`. Toàn bộ customization chỉ ở settings tab.

---

## Các file cần tạo / sửa

### Tạo mới
- `apps/backend/src/project/entities/project-priority.entity.ts`
- `apps/backend/src/project/priority/priority.controller.ts`
- `apps/backend/src/project/priority/priority.service.ts`
- `apps/backend/src/project/priority/dto/`
- Migration file
- `apps/frontend/src/app/projects/pages/project-settings/priorities-tab/priorities-tab.component.ts`
- `apps/frontend/src/app/shared/components/color-picker-panel/`
- `apps/frontend/src/app/shared/components/color-pair-picker/`
- `apps/frontend/src/app/shared/components/icon-picker-panel/`
- `apps/frontend/src/app/shared/components/icon-picker-panel/icon-picker.constants.ts`
- `apps/frontend/src/app/projects/services/priority.service.ts` (HTTP)

### Sửa
- `libs/shared-types/src/project.types.ts` — thêm `ProjectPriority` interface
- `libs/shared-types/src/task.types.ts` — `TaskPriority = string` (thay union)
- `apps/frontend/src/main.ts` — thêm route `priorities`
- `apps/frontend/src/app/layout/app-shell/sidebar/sidebar.component.ts` — thêm menu item
- `apps/frontend/src/app/projects/state/project.store.ts` — load priorities
- `apps/frontend/src/app/tasks/services/priority-config.service.ts` — refactor
- `apps/frontend/src/app/tasks/components/task-detail-panel/task-detail-panel.component.ts` — xoá edit mode
- `apps/backend/src/project/project.module.ts` — đăng ký module priority
