---
specName: project-settings
version: 1.0
status: completed
estimatedDays: 10
---

# Tasks: Project Settings Enhancement (Epic A+)

## Overview

Triển khai Epic A+ — cập nhật đối tượng Project để tương đương Plane.so. Bao gồm: mở rộng bảng `projects` (emoji, cover, network, lead, timezone, feature flags), Custom States per project, Estimate Configuration, và migrate `tasks.state` → `tasks.state_id` (FK). **Epic này phải hoàn thành trước khi bắt đầu Epic B (Task Management).**

Stack: NestJS 11 + TypeORM + PostgreSQL 17 (backend), Angular 21 + Signals + PrimeNG 21 (frontend).

## Tasks

- [x] 1. Database migrations
  - [x] 1.1 Migration 1: `AddProjectSettingsColumns`
    - `ALTER TABLE projects` — thêm: `emoji VARCHAR(10)`, `cover_image_url VARCHAR(500)`, `network VARCHAR(10) NOT NULL DEFAULT 'secret' CHECK (network IN ('public','secret'))`, `lead_id UUID REFERENCES users(id) ON DELETE SET NULL`, `timezone VARCHAR(50) NOT NULL DEFAULT 'Asia/Ho_Chi_Minh'`, 6 feature flag columns (BOOLEAN)
    - Tạo index: `idx_projects_network`, `idx_projects_lead`
    - Tạo `CREATE TYPE state_group_enum AS ENUM ('backlog','unstarted','started','completed','cancelled')`
    - Tạo bảng `project_states` với UNIQUE(project_id, name) và trigger `enforce_single_default_state`
    - Tạo `CREATE TYPE estimate_type_enum AS ENUM ('points','categories','time')`
    - Tạo bảng `project_estimate_configs` với UNIQUE(project_id) và CHECK jsonb_array_length(values) >= 2
    - INSERT 6 default states cho mỗi project đã tồn tại (nếu có)
    - INSERT default estimate config cho mỗi project đã tồn tại
    - `ALTER TYPE audit_event_type_enum ADD VALUE IF NOT EXISTS` cho 6 events mới
    - Implement `down()` rollback
    - _Requirements: 1.1, 1.2, 1.3, 4.1, 5.1_

  - [x] 1.2 Migration 2: `MigrateTaskStateToFK`
    - `ALTER TABLE tasks ADD COLUMN state_id UUID`
    - `UPDATE tasks SET state_id = ps.id FROM project_states ps WHERE ps.project_id = tasks.project_id AND LOWER(ps.name) = mapping(tasks.state)`  (mapping: `backlog→Backlog`, `todo→Todo`, `in_progress→In Progress`, `in_review→In Review`, `done→Done`, `cancelled→Cancelled`)
    - Verify: `SELECT COUNT(*) FROM tasks WHERE state_id IS NULL` phải = 0 trước khi tiếp tục
    - `ALTER TABLE tasks ALTER COLUMN state_id SET NOT NULL`
    - `ALTER TABLE tasks ADD CONSTRAINT fk_task_state FOREIGN KEY (state_id) REFERENCES project_states(id) ON DELETE RESTRICT`
    - `ALTER TABLE tasks DROP COLUMN state`
    - `DROP TYPE task_state_enum`
    - `DROP INDEX idx_tasks_state; CREATE INDEX idx_tasks_state_id ON tasks(project_id, state_id)`
    - Implement `down()`: recreate enum, restore column state, populate từ state_id JOIN name, drop state_id
    - _Requirements: 9.1, 9.2, 9.6_

- [x] 2. Cập nhật shared types
  - Cập nhật `Project` interface: thêm `emoji`, `coverImageUrl`, `network`, `lead`, `timezone`, `features`, `stateStats`
  - Thêm interface `ProjectState`, `ProjectStateGrouped`, `EstimateConfig`, `ProjectFeatures`
  - Thêm enum `StateGroup`, `EstimateType`, `ProjectNetwork`
  - Thêm DTOs: `UpdateProjectGeneralDto` (thêm fields mới), `CreateStateDto`, `UpdateStateDto`, `ReorderStatesDto`, `MigrateStateDto`, `UpdateEstimateConfigDto`, `UpdateFeaturesDto`
  - Build lại shared-types library
  - _Requirements: 1.1_

- [x] 3. Checkpoint — Verify migrations và types
  - Chạy Migration 1 + Migration 2 trên database development
  - Verify schema: `\d projects`, `\d project_states`, `\d project_estimate_configs`, `\d tasks`
  - Verify trigger `enforce_single_default_state` hoạt động đúng
  - Verify tasks không còn column `state`, không còn enum `task_state_enum`
  - Verify shared types compile không lỗi
  - Hỏi user nếu có vấn đề

- [x] 4. Backend — Project State Service và Controller
  - [x] 4.1 Tạo ProjectState entity
    - `apps/backend/src/project/entities/project-state.entity.ts`
    - TypeORM decorators, relation `@ManyToOne(() => Project)`, `@OneToMany(() => Task, t => t.state)` — **quan trọng**: sau khi migrate, Task entity phải có `@ManyToOne(() => ProjectState)` thay vì column enum
    - _Requirements: 4.1, 9.1_

  - [x] 4.2 Implement Project State Service
    - `apps/backend/src/project/state/project-state.service.ts`
    - `findAll(projectId)` — SELECT grouped theo state_group, ORDER BY "order"
    - `create(projectId, userId, dto: CreateStateDto)` — validate name unique, check max 20 states, INSERT với order = MAX + 1, ghi audit `project_state_created`
    - `update(projectId, stateId, userId, dto: UpdateStateDto)` — UPDATE name/color/group/order/is_default; nếu is_default = true → trigger DB tự xử lý old default; ghi audit `project_state_updated`
    - `reorder(projectId, items: ReorderItem[], userId)` — bulk UPDATE "order" trong transaction
    - `delete(projectId, stateId, userId)` — check COUNT(tasks WHERE state_id), nếu > 0 → 422 STATE_IN_USE; check là default state → 422 DEFAULT_STATE; check còn lại ≥ 2 states; DELETE; ghi audit `project_state_deleted`
    - `migrate(projectId, fromStateId, toStateId, userId)` — UPDATE tasks SET state_id = toStateId WHERE state_id = fromStateId (transaction), sau đó DELETE fromStateId
    - _Requirements: 4.1–4.10, 9.2–9.6_

  - [x] 4.3 Implement Project State Controller
    - `apps/backend/src/project/state/project-state.controller.ts`
    - `GET /api/projects/:projectId/states` — @JwtAuth + member check
    - `POST /api/projects/:projectId/states` — @ProjectRoles('Scrum_Master')
    - `PATCH /api/projects/:projectId/states/reorder` — @ProjectRoles('Scrum_Master')
    - `PATCH /api/projects/:projectId/states/:stateId` — @ProjectRoles('Scrum_Master')
    - `DELETE /api/projects/:projectId/states/:stateId` — @ProjectRoles('Scrum_Master')
    - `POST /api/projects/:projectId/states/migrate` — @ProjectRoles('Scrum_Master'); body `{ fromStateId, toStateId }`
    - _Requirements: 10.1_

- [x] 5. Backend — Estimate Config Service và Controller
  - [x] 5.1 Tạo ProjectEstimateConfig entity
    - `apps/backend/src/project/entities/project-estimate-config.entity.ts`
    - `@OneToOne(() => Project)`, `@Column({ type: 'jsonb' }) values`
    - _Requirements: 5.1_

  - [x] 5.2 Implement Estimate Config Service
    - `apps/backend/src/project/estimate/estimate-config.service.ts`
    - `getConfig(projectId)` — SELECT + trả về available templates
    - `updateConfig(projectId, userId, dto: UpdateEstimateConfigDto)` — validate values (min 2, max 12, unique for points); nếu estimate_type thay đổi → queue background job reset estimate_value cho tất cả tasks; UPDATE config; ghi audit `project_estimate_updated`
    - Background job `reset-estimates`: `UPDATE tasks SET estimate_value = NULL WHERE project_id = ?`
    - _Requirements: 5.1–5.6_

  - [x] 5.3 Implement Estimate Config Controller
    - `GET /api/projects/:projectId/estimate-config` — @JwtAuth + member check
    - `PATCH /api/projects/:projectId/estimate-config` — @ProjectRoles('Scrum_Master')
    - _Requirements: 5.1_

- [x] 6. Backend — Cập nhật Project Service (General + Cover + Network + Features)
  - [x] 6.1 Cập nhật Project Service
    - Cập nhật `apps/backend/src/project/project.service.ts`:
    - `create()`: thêm emoji, network, leadId, timezone vào INSERT; sau INSERT gọi `createDefaultStates()` và `createDefaultEstimateConfig()` trong cùng transaction
    - `update()`: thêm validate emoji format, validate timezone bằng IANA list, validate leadId là member; UPDATE các fields mới; ghi audit
    - `updateFeatures(projectId, userId, dto)`: UPDATE feature_* columns; ghi audit `project_features_updated`
    - `join(projectId, userId)`: check network = 'public', check chưa là member, INSERT project_member với role Developer, ghi audit `member_joined_public`
    - _Requirements: 1.1–1.6, 2.1–2.5, 6.1–6.9_

  - [x] 6.2 Implement Cover Image Service
    - `apps/backend/src/project/cover/cover.service.ts`
    - `upload(projectId, userId, file)`: validate magic bytes, resize bằng `sharp` về 1920×384, lưu `uploads/projects/{projectId}/cover.{ext}`, UPDATE projects SET cover_image_url
    - `delete(projectId, userId)`: xóa file, UPDATE projects SET cover_image_url = NULL
    - _Requirements: 3.2–3.4_

  - [x] 6.3 Implement Cover Image Controller
    - `POST /api/projects/:projectId/cover` — Multer + @ProjectRoles('Scrum_Master')
    - `DELETE /api/projects/:projectId/cover` — @ProjectRoles('Scrum_Master')
    - `GET /api/projects/:projectId/cover` — stream file (auth check member)
    - _Requirements: 3.2_

  - [x] 6.4 Implement Features Controller
    - `PATCH /api/projects/:projectId/features` — @ProjectRoles('Scrum_Master')
    - _Requirements: 6.2_

  - [x] 6.5 Cập nhật Project findAll và findById responses
    - `findAll()`: JOIN lead user, trả về thêm emoji, network, lead, feature flags, state_stats (GROUP BY state_group)
    - `findById()`: tương tự + estimate_config
    - _Requirements: 8.1–8.4_

- [x] 7. Cập nhật Task Entity và Task Service (sau khi migrate schema)
  - Cập nhật `apps/backend/src/task/entities/task.entity.ts`: xóa `@Column({ type: 'enum', enum: TaskState }) state`, thêm `@ManyToOne(() => ProjectState) state`, `@Column() stateId: string`
  - Cập nhật `apps/backend/src/task/task.service.ts`:
    - `create()`: khi không có stateId → query state có `is_default = true` của project để set default
    - `findAll()`: JOIN project_states để trả về `state: { id, name, color, group }` thay vì string cũ
    - Backlog filter: `WHERE ps.group IN ('backlog', 'unstarted', 'started')` thay vì tên cứng
    - `update()`: validate stateId thuộc cùng project
  - _Requirements: 9.1–9.5_

- [x] 8. Wire các modules mới vào AppModule
  - Tạo `ProjectStateModule`, `EstimateConfigModule`, `CoverModule` — hoặc gộp vào `ProjectModule` hiện tại
  - Thêm `sharp` dependency: `npm install sharp` trong `apps/backend`
  - Cấu hình `BullModule` cho queue `reset-estimates` (hoặc dùng simple setImmediate nếu không muốn Bull ở Phase 1)
  - _Requirements: 5.2_

- [x] 9. Viết property tests
  - **P1: Default States on Create** — tạo project mới → có đúng 6 states, có đúng 1 is_default = true
  - **P2: Single Default State** — set is_default cho state B → state A tự động set is_default = false
  - **P3: State Name Unique** — tạo 2 states cùng tên trong project → 409
  - **P4: State Deletion Guard** — xóa state đang có tasks → 422 STATE_IN_USE
  - **P5: State Migration** — migrate + delete: không còn task nào orphan
  - **P6: Feature Flag** — toggle feature_cycles = false → GET project trả về features.cycles = false
  - **P7: Network Visibility** — project secret không xuất hiện trong findAll của non-member
  - **P8: Public Join** — user join project public → tự động role Developer; join project secret → 403
  - **P9: Lead Validation** — set lead_id = non-member → 422 LEAD_NOT_MEMBER
  - **P10: Estimate Reset** — đổi estimate_type → tất cả tasks.estimate_value = NULL sau job chạy
  - **P11: Task Default State** — create task không có stateId → state_id = default state của project
  - **P12: Backlog Filter** — query backlog với state group filter đúng, không phụ thuộc tên state
  - _Validates: Req 1–9_

- [x] 10. Checkpoint — Verify backend hoàn toàn
  - Chạy tất cả property tests
  - Test manual: tạo project → check 6 default states + estimate config; update emoji/timezone/lead; toggle feature; tạo custom state; set default; xóa state có tasks (migration); upload cover; join public project
  - Test task.create với default state
  - Hỏi user nếu có vấn đề

- [x] 11. Frontend — Cập nhật Project Store và Services
  - [x] 11.1 Cập nhật Project Angular Service
    - `apps/frontend/src/app/projects/services/project.service.ts`:
    - Cập nhật `createProject(dto)` và `updateProject(id, dto)` với fields mới
    - Thêm `uploadCover(id, file)`, `deleteCover(id)`, `joinProject(id)`, `updateFeatures(id, dto)`
    - Thêm State service methods: `getStates(projectId)`, `createState(dto)`, `updateState(id, dto)`, `reorderStates(items)`, `deleteState(id)`, `migrateState(from, to)`
    - Thêm Estimate service methods: `getEstimateConfig(projectId)`, `updateEstimateConfig(projectId, dto)`
    - _Requirements: 1.1, 2.1_

  - [x] 11.2 Cập nhật Project Signal Store
    - Cập nhật `apps/frontend/src/app/projects/state/project.store.ts`:
    - Thêm signals: `currentProjectStates`, `currentEstimateConfig`
    - Thêm methods: `loadStates(projectId)`, `loadEstimateConfig(projectId)`, `updateFeatures(dto)`
    - _Requirements: 6.1_

- [x] 12. Frontend — Cập nhật Project List Page
  - Cập nhật `apps/frontend/src/app/projects/pages/project-list/project-list.component.ts`:
  - Thêm cột **Emoji** (hoặc inline trong cột Tên) — hiển thị emoji hoặc avatar text fallback
  - Thêm cột **Lead** — avatar + name
  - Thêm cột **Network** — badge "Public" / "Secret"
  - Thêm filter **Network**: All / Public / Secret
  - _Requirements: 8.1, 8.4_

- [x] 13. Frontend — Cập nhật Create Project Form
  - Cập nhật `apps/frontend/src/app/projects/pages/create-project/create-project.component.ts`:
  - Thêm **Emoji picker**: button chọn emoji mở overlay với grid emoji + search input; hiển thị emoji đã chọn
  - Thêm **Network** toggle: `p-selectButton` với options "Secret / Public" + tooltip giải thích
  - Thêm **Lead** dropdown: `p-select` với danh sách members (ban đầu chỉ có owner); nếu chưa có member → disable và tooltip "Thêm thành viên trước"
  - Thêm **Timezone** select: `p-select` searchable với danh sách IANA timezones, default "Asia/Ho_Chi_Minh"
  - _Requirements: 1.1, 2.5, 3.1_

- [x] 14. Frontend — Cập nhật Project Settings Page (thêm tabs mới)

  - [x] 14.1 Cập nhật General Tab
    - Thêm **Emoji picker** section (tương tự Create form)
    - Thêm **Cover Image** section: hiển thị preview hiện tại, nút Upload (`p-fileUpload`), nút Remove; progress bar khi upload
    - Thêm **Network** toggle (Public/Secret) với mô tả hậu quả khi chuyển
    - Thêm **Lead** dropdown (project members)
    - Thêm **Timezone** select
    - _Requirements: 7.2_

  - [x] 14.2 Implement States Tab
    - Tạo `apps/frontend/src/app/projects/pages/project-settings/states-tab/states-tab.component.ts`
    - Layout: 5 sections theo State_Group (Backlog, Unstarted, Started, Completed, Cancelled) — mỗi section có header group name và danh sách states
    - Mỗi state row: drag handle (CDK DragDrop), color swatch (`p-colorPicker` inline), name input (editable inline), group badge, Default star (click to set default), delete button
    - "Thêm state" button mở inline form cuối mỗi section: color picker + name input + "Thêm"
    - Khi xóa state có tasks: hiển thị dialog "Chọn state thay thế" với dropdown state options, nút "Di chuyển & Xóa"
    - Không cho xóa state cuối cùng hoặc default state (disable button + tooltip)
    - _Requirements: 7.3, 4.1–4.10_

  - [x] 14.3 Implement Estimates Tab
    - Tạo `apps/frontend/src/app/projects/pages/project-settings/estimates-tab/estimates-tab.component.ts`
    - Section 1: **Estimate Type** — 3 card options: Points / Categories / Time (radio-style; selected card highlighted)
    - Section 2: **Template** (nếu có template cho type đó) — dropdown chọn template, click "Áp dụng" fill values
    - Section 3: **Custom values** — list `p-chips` (add/remove/reorder); với Points: chỉ cho nhập số; với Categories: free text
    - Section 4: **Preview** — mini mockup hiển thị estimate field trên work item giả
    - Khi đổi type: confirmation dialog "Thao tác này sẽ xóa estimate của X work items. Tiếp tục?"
    - Nút "Lưu" — PATCH estimate config
    - _Requirements: 7.5, 5.1–5.6_

  - [x] 14.4 Implement Features Tab
    - Tạo `apps/frontend/src/app/projects/pages/project-settings/features-tab/features-tab.component.ts`
    - 6 feature rows: icon + tên + mô tả ngắn + `p-toggleSwitch`
    - Cycles, Modules, Views, Pages: bật mặc định
    - Intake, Time Tracking: tắt mặc định
    - Khi toggle → auto-save PATCH /features (không cần nút Save)
    - Non SM/Admin: thấy trạng thái nhưng toggle bị disabled + tooltip "Chỉ Scrum Master mới được thay đổi"
    - _Requirements: 7.6, 6.1–6.9_

- [x] 15. Frontend — Cập nhật Sidebar (emoji + feature-aware navigation)
  - Cập nhật Sidebar component:
  - Project emoji hiển thị trong Project_Switcher thay icon mặc định; fallback: 2 chữ cái đầu name
  - Navigation links: Backlog (luôn hiển thị), Cycles (chỉ khi feature_cycles), Modules (chỉ khi feature_modules), Views (chỉ khi feature_views), Pages (chỉ khi feature_pages), Settings
  - Inject project features từ ProjectStore để conditional render
  - _Requirements: 6.3–6.9, 8.2, 8.5_

- [x] 16. Frontend — Feature Guard và Route Protection
  - Tạo `apps/frontend/src/app/core/guards/project-feature.guard.ts`
  - `CanActivateFn` nhận `data.feature` từ route config; kiểm tra ProjectStore; redirect về backlog + toast nếu feature tắt
  - Áp dụng guard vào routes: `/cycles` (feature: 'cycles'), `/modules` (feature: 'modules'), `/views` (feature: 'views'), `/pages` (feature: 'pages')
  - _Requirements: 6.9_

- [x] 17. Frontend — Cập nhật Task Store và Backlog (state-aware)
  - Cập nhật Task Signal Store: load project states từ ProjectStore; thay hardcoded state options bằng dynamic states
  - Cập nhật Backlog filter bar: State filter options load từ project states API (grouped by state_group)
  - Cập nhật Task Detail Panel: State p-select load từ project states; color dot theo `state.color`
  - Cập nhật Estimate field: render dựa theo `estimateConfig.estimateType`
  - _Requirements: 9.3–9.5_

- [x] 18. Checkpoint — Verify toàn bộ frontend
  - Chạy `ng build` — zero compile errors
  - Test full flow: tạo project (emoji + timezone + public) → settings → thêm custom state → set default → xóa state có tasks (migrate) → configure estimates (Categories) → toggle features (tắt Cycles) → verify sidebar ẩn Cycles → upload cover
  - Test join public project từ user khác
  - Test feature guard: truy cập `/cycles` khi feature_cycles = false → redirect
  - Test Backlog filter states hiển thị đúng custom states của project
  - Hỏi user nếu có vấn đề

- [x] 19. Final checkpoint
  - Chạy `npm test` backend — tất cả 12 property tests pass
  - Chạy `ng test` frontend
  - Verify không còn reference nào đến `task_state_enum` trong codebase
  - Confirm Epic B (task-management) team đã được notify về schema changes (`tasks.state_id`, `project_states` table)
  - Hỏi user nếu có vấn đề

## Phân công

| Task group | Người làm | Deadline | Trạng thái |
|-----------|-----------|---------|-----------|
| 1 (Migrations) | | | ✅ Done |
| 2–3 (Types + Checkpoint) | | | ✅ Done |
| 4 (State Service + Controller) | | | ✅ Done |
| 5 (Estimate Config) | | | ✅ Done |
| 6 (Project Service updates) | | | ✅ Done |
| 7 (Task Entity/Service update) | | | ✅ Done |
| 8–10 (Wire + Tests + Checkpoint) | | | ✅ Done |
| 11–12 (Angular Store + List) | | | ✅ Done |
| 13 (Create Project form) | | | ✅ Done |
| 14 (Settings tabs: States/Estimates/Features) | | | ✅ Done |
| 15–16 (Sidebar + Guards) | | | ✅ Done |
| 17 (Task Store updates) | | | ✅ Done |
| 18–19 (Checkpoints) | | | ✅ Done |

## Ghi chú implementation

- **Migration order là cực kỳ quan trọng**: Migration 1 phải chạy xong và có default states trước khi Migration 2 chạy — nếu không `UPDATE tasks SET state_id` sẽ fail do không tìm được state UUID
- **`sharp` package**: `npm install sharp` trong `apps/backend`; `sharp` là native addon, cần build environment phù hợp
- **Emoji picker**: Nếu không muốn thư viện ngoài, có thể dùng simple textarea cho emoji (user gõ/paste emoji) cho Phase 1; emoji-mart là option tốt hơn
- **Bull queue**: Nếu không muốn setup Redis queue cho estimate reset job, có thể dùng `setImmediate()` hoặc `process.nextTick()` với warning rằng nó không persistent (ok cho Phase 1)
- **State Group là immutable**: 5 groups là hệ thống cố định — không expose API để tạo/xóa group; chỉ cho phép thêm states vào group
- **Timezone list**: Frontend dùng `Intl.supportedValuesOf('timeZone')` để lấy danh sách; backend validate bằng cùng method hoặc `@Matches` regex với allowed values
- **Thứ tự epic**: **Epic A+ trước, Epic B sau** — team implement Epic B phải đợi migration `tasks.state_id` hoàn thành

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0,  "tasks": ["1.1"] },
    { "id": 1,  "tasks": ["1.2"] },
    { "id": 2,  "tasks": ["2"] },
    { "id": 3,  "tasks": ["3"] },
    { "id": 4,  "tasks": ["4.1", "5.1"] },
    { "id": 5,  "tasks": ["4.2", "5.2"] },
    { "id": 6,  "tasks": ["4.3", "5.3"] },
    { "id": 7,  "tasks": ["6.1", "6.2"] },
    { "id": 8,  "tasks": ["6.3", "6.4", "6.5"] },
    { "id": 9,  "tasks": ["7"] },
    { "id": 10, "tasks": ["8"] },
    { "id": 11, "tasks": ["9"] },
    { "id": 12, "tasks": ["10"] },
    { "id": 13, "tasks": ["11.1", "11.2"] },
    { "id": 14, "tasks": ["12", "13"] },
    { "id": 15, "tasks": ["14.1", "14.2", "14.3", "14.4"] },
    { "id": 16, "tasks": ["15", "16"] },
    { "id": 17, "tasks": ["17"] },
    { "id": 18, "tasks": ["18"] },
    { "id": 19, "tasks": ["19"] }
  ]
}
```
