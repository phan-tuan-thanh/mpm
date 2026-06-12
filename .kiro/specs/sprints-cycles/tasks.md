# Implementation Plan: Sprints/Cycles

## Overview

Kế hoạch triển khai chia thành hai khối: **Backend** (NestJS 11 `SprintModule` + TypeORM migrations + Global Cron snapshot) và **Frontend** (Angular 21 + PrimeNG + Tailwind). Các task được sắp xếp tăng dần theo mức độ phụ thuộc: hạ tầng dữ liệu trước, kế đến là các service nghiệp vụ thuần (dễ test bằng property-based test), sau đó là controller/authorization, rồi tới các thành phần UI. Mỗi task xây trên kết quả của task trước và kết thúc bằng việc wiring vào hệ thống — không để lại code mồ côi.

Property-based test dùng **fast-check** (TypeScript) cho 10 correctness properties trong `design.md`; mọi sub-task test được đánh dấu `*` (tùy chọn). Unit/integration test bổ trợ cho property test. Toàn bộ tuân thủ steering: `tech.md`, `coding-standards.md`, `structure.md`, `ui-standards.md`.

**Đường dẫn chính:**
- Backend module: `apps/backend/src/sprint/`
- Migrations: `migrations/`
- Frontend feature: `apps/frontend/src/app/projects/sprints/`

---

## Tasks

- [x] 1. Tạo schema cơ sở dữ liệu và migrations (TypeORM)
  - [x] 1.1 Viết migration tạo bảng `sprints`, `sprint_member_capacities`, `sprint_snapshots`
    - Tạo file `migrations/<timestamp>-CreateSprintTables.ts` với `up`/`down`
    - `sprints`: id (uuid PK), project_id (FK→projects), name, goal, start_date, end_date, status (`planning|active|completed`, default `planning`), target_capacity (numeric null), initial_story_points (numeric null), initial_tasks_count (int null), completed_at, created_by, created_at, updated_at, deleted_at (soft delete)
    - `sprint_member_capacities`: id, sprint_id (FK), user_id (FK), capacity (numeric), timestamps, deleted_at
    - `sprint_snapshots`: id, sprint_id (FK), snapshot_date (date), remaining_story_points (numeric), remaining_tasks_count (int), timestamps, deleted_at
    - _Requirements: 1.1, 4.1, 8.2, 9.1, 10.2, 10.3, 15.1_

  - [x] 1.2 Viết migration thêm cột `sprint_id` vào bảng `tasks` và tạo indexes
    - Thêm cột `tasks.sprint_id` (uuid, nullable, FK→sprints.id ON DELETE SET NULL), migrate dữ liệu từ `cycle_id` cũ nếu tồn tại
    - `CREATE INDEX idx_sprints_project_status ON sprints (project_id, status) WHERE deleted_at IS NULL`
    - `CREATE INDEX idx_tasks_sprint_id ON tasks (sprint_id) WHERE sprint_id IS NOT NULL`
    - `CREATE UNIQUE INDEX idx_sprint_snapshots_sprint_date ON sprint_snapshots (sprint_id, snapshot_date) WHERE deleted_at IS NULL`
    - _Requirements: 7.1, 9.9 (idempotency snapshot), 10.4, 15.2_

  - [x] 1.3 Viết migration đảm bảo `projects.sprint_settings` (JSONB) + giá trị mặc định
    - Thêm/đảm bảo cột `sprint_settings` JSONB trên `projects`
    - Backfill mặc định cho project hiện có: `{terminology:'sprint', maxActiveSprints:1, defaultDurationWeeks:2, capacityMode:'total'}`
    - _Requirements: 1.1, 1.2_

- [ ] 2. Định nghĩa entities và khởi tạo SprintModule
  - [ ] 2.1 Tạo các TypeORM entities và core types
    - `apps/backend/src/sprint/entities/sprint.entity.ts`, `sprint-member-capacity.entity.ts`, `sprint-snapshot.entity.ts` (cột `@DeleteDateColumn` cho soft delete)
    - `apps/backend/src/sprint/types/sprint.types.ts`: `SprintStatus`, `CapacityMode`, `Terminology`, `SprintSettings`, `MemberCapacityResult`, hằng `DONE_STATES` (xác minh giá trị chính xác với `TaskModule`/`StateModule` hiện có trước khi hardcode)
    - Bổ sung quan hệ `sprint_id` vào `Task` entity hiện có
    - _Requirements: 1.1, 2.2, 5.3, 5.4, 15.1_

  - [ ] 2.2 Tạo `SprintModule` và đăng ký vào `app.module.ts`
    - `apps/backend/src/sprint/sprint.module.ts`: import `TypeOrmModule.forFeature([...])`, `ScheduleModule.forRoot()` (cho cron), khai báo providers/controllers (rỗng ban đầu, bổ sung dần)
    - Wire `SprintModule` vào `apps/backend/src/app.module.ts`
    - _Requirements: 14.1_

- [ ] 3. Tạo DTOs với class-validator
  - [ ] 3.1 Viết các DTO request/response và validation
    - `apps/backend/src/sprint/dto/`: `CreateSprintDto`, `UpdateSprintDto` (PartialType, KHÔNG có `status`), `CompleteSprintDto`, `UpdateMemberCapacityDto`, `BulkDeleteSprintDto`, `AssignTasksDto`/`BulkRemoveTasksDto`, `UpdateSprintSettingsDto`, `SprintPaginationResponseDto`, `BurndownDataPointDto`
    - Ràng buộc: `name` 1–255 ký tự, `goal` ≤1000, ISO date, `targetCapacity` 0–999,999.99, `capacity` 0–9,999, `maxActiveSprints` int 1–10, `defaultDurationWeeks` IsIn([1,2,4]), `terminology`/`capacityMode` IsIn, bulk list 1–100
    - _Requirements: 1.1, 1.6, 1.7, 1.8, 1.9, 2.3, 2.4, 2.5, 3.1, 3.3, 3.4, 3.5, 4.7, 7.7, 8.8, 14.6_

  - [ ]* 3.2 Viết unit test cho DTO validation
    - Test biên: tên rỗng/quá dài (>255), targetCapacity âm/vượt trần, enum sai, list rỗng/>100
    - _Requirements: 1.6, 1.7, 1.8, 1.9, 2.3, 2.4, 2.5, 4.7, 7.7, 8.8_

- [ ] 4. Triển khai CapacityService (logic thuần — ưu tiên test sớm)
  - [ ] 4.1 Implement `effectiveSP` và `calculateMemberCapacity`
    - `apps/backend/src/sprint/capacity.service.ts`: `effectiveSP(task)` (≥1, =estimateValue khi >0), `calculateMemberCapacity(sprint, tasks, capacities)` trả `actualUsed` (làm tròn 1 chữ số thập phân), `unestimatedTasksCount`, kẹp ≥0
    - Tính `availableCapacity` theo `total` / `member-based`
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

  - [ ]* 4.2 Property test cho effective SP
    - **Property 6: Effective SP non-negative & default**
    - **Validates: Requirements 8.3**
    - fast-check: ∀ task, `effectiveSP(t) ≥ 1` và `= estimateValue` khi `estimateValue > 0`, ngược lại `= 1`

  - [ ]* 4.3 Property test cho tổng capacity của member
    - **Property 7: Capacity sum correctness**
    - **Validates: Requirements 8.4, 8.5**
    - fast-check: ∀ member m, `actualUsed(m) = Σ effectiveSP(t)` cho task gán m; kết quả không âm

  - [ ]* 4.4 Unit test cho `availableCapacity` và `unestimatedTasksCount`
    - Test chế độ total vs member-based, task chưa ước lượng
    - _Requirements: 8.1, 8.2, 8.6_

- [ ] 5. Triển khai SprintService — CRUD và soft delete
  - [ ] 5.1 Implement create/update/get/list Sprint
    - `apps/backend/src/sprint/sprint.service.ts`: `create` (status=planning, gán projectId, 404 nếu project không tồn tại), `update` (bỏ qua `status` trong payload), `findOne` (kèm tasks, 404 nếu deleted), `findAll` (server-side pagination, filter status + search name, loại trừ `deletedAt != null`)
    - _Requirements: 2.1, 2.2, 2.6, 2.7, 3.1, 3.2, 3.6, 15.6_

  - [ ] 5.2 Implement bulk delete (soft delete) trong transaction
    - `bulkDelete(projectId, ids[])`: set `deletedAt=now()`, set `sprint_id=null` cho task liên quan, atomic transaction, rollback khi lỗi; 400 nếu list rỗng/>100; 404 nếu có sprint không tồn tại/đã xóa
    - `softDeleteOne(id)`: từ chối nếu đã `deletedAt != null`
    - _Requirements: 4.1, 4.2, 4.3, 4.6, 4.7, 4.8, 15.1, 15.2, 15.3, 15.4, 15.5_

  - [ ]* 5.3 Property test cho soft delete preservation
    - **Property 10: Soft delete preservation**
    - **Validates: Requirements 4.1, 4.2, 15.1, 15.2**
    - fast-check: sau xóa, bản ghi vẫn tồn tại với `deletedAt` set; mọi task liên quan có `sprint_id = null`

  - [ ]* 5.4 Property test cho status transition validity
    - **Property 5: Status transition validity**
    - **Validates: Requirements 3.2, 5.6, 6.2**
    - fast-check: chỉ `planning→active→completed` hợp lệ; mọi chuyển tiếp khác bị từ chối; `update` không đổi `status`

  - [ ]* 5.5 Unit test cho CRUD + pagination/filter
    - Test 404, exclude soft-deleted, filter status + search
    - _Requirements: 2.7, 3.6, 15.6_

- [ ] 6. Triển khai SprintService — vòng đời Start/Complete
  - [ ] 6.1 Implement `startSprint` (transaction, active limit, ghi initial SP/tasks)
    - Pre: status=planning, activeCount < maxActiveSprints; Post: status=active, startDate=now() nếu null, ghi initialStoryPoints/initialTasksCount (=0 nếu rỗng)
    - 400 khi vượt active limit, 409 khi sai trạng thái, 404 khi không tồn tại/đã xóa
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8_

  - [ ]* 6.2 Property test cho active limit invariant
    - **Property 1: Active limit invariant**
    - **Validates: Requirements 5.1, 5.5**
    - fast-check: ∀ project, `count(active sprints) ≤ maxActiveSprints` tại mọi thời điểm sau chuỗi thao tác start

  - [ ] 6.3 Implement `completeSprint` (transaction, mutual exclusion, reassign task)
    - Pre: status=active; nếu còn task chưa Done → đúng MỘT trong `targetSprintId`/`moveToBacklog`; target phải `planning` và cùng project
    - Post: status=completed, completedAt=now(), reassign task chưa Done (→ target hoặc null), giữ task Done, giữ initialStoryPoints/initialTasksCount
    - 409 sai trạng thái, 400 vi phạm mutual exclusion / target không planning, 404 target không tồn tại/khác project
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 6.10, 6.11_

  - [ ]* 6.4 Property test cho mutual exclusion khi complete
    - **Property 3: Complete mutual exclusion**
    - **Validates: Requirements 6.3, 6.4**
    - fast-check: với `unfinishedTasks ≠ ∅`, thành công ⟺ đúng MỘT trong `targetSprintId`/`moveToBacklog`

  - [ ]* 6.5 Property test cho tính đầy đủ của reassignment
    - **Property 4: Task reassignment completeness**
    - **Validates: Requirements 6.7, 6.8, 6.9**
    - fast-check: sau complete, mọi task chưa Done có `sprintId = target` hoặc `null`; không task chưa Done nào còn trỏ về sprint cũ; task Done giữ nguyên

  - [ ]* 6.6 Property test cho tính bất biến của velocity
    - **Property 2: Velocity immutability**
    - **Validates: Requirements 5.8, 6.10**
    - fast-check: sau khi active, thêm/xóa task và complete KHÔNG đổi `initialStoryPoints`/`initialTasksCount`

- [ ] 7. Triển khai SprintService — gán task vào Sprint
  - [ ] 7.1 Implement assign/bulk-add/bulk-remove task
    - `assignTask(sprintId, taskId)`, `addTasks(sprintId, taskIds[])`, `bulkRemoveTasks(sprintId, taskIds[])`; transaction, rollback khi lỗi
    - 404 nếu sprint/task không tồn tại/đã xóa/khác project; 409 nếu sprint đích `completed`; 400 nếu list rỗng/>100
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.7, 7.8, 7.9_

  - [ ]* 7.2 Unit test cho gán task
    - Test khác project (404), sprint completed (409), bulk biên 1/100/0/101, rollback
    - _Requirements: 7.4, 7.7, 7.8, 7.9_

- [ ] 8. Triển khai SnapshotService và dữ liệu Burndown
  - [ ] 8.1 Implement upsert snapshot và `buildBurndown`
    - `apps/backend/src/sprint/snapshot.service.ts`: `upsertSnapshot` (idempotent theo unique index), `buildBurndown(sprint, snapshots)`
    - Burndown: 1 điểm/ngày từ startDate→endDate; ideal line giảm tuyến tính, kẹp [0, initial], làm tròn (SP 1 chữ số thập phân, Task về số nguyên); actual carry-forward; ngày tương lai → actual=null
    - 409 nếu sprint chưa có startDate/endDate
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.7, 9.8, 10.2, 10.3_

  - [ ]* 8.2 Property test cho ideal line đơn điệu không tăng
    - **Property 8: Burndown ideal monotonic**
    - **Validates: Requirements 9.2, 9.4**
    - fast-check: chuỗi `idealStoryPoints` không tăng, bắt đầu từ `initialStoryPoints`, kết thúc tại `0`

  - [ ]* 8.3 Unit test cho carry-forward và ngày tương lai
    - Test ngày thiếu snapshot dùng giá trị gần nhất; ngày sau hôm nay actual=null; 409 khi chưa start
    - _Requirements: 9.5, 9.7, 9.8_

- [ ] 9. Triển khai Global Cron Job chụp snapshot hàng ngày
  - [ ] 9.1 Implement `SnapshotCronJob` (@nestjs/schedule)
    - `apps/backend/src/sprint/snapshot.cron.ts`: `@Cron('59 23 * * *')` quét mọi sprint active, tính remainingStoryPoints (Σ effectiveSP task chưa Done, ≥0) + remainingTasksCount, upsert theo `(sprint_id, snapshot_date)`
    - Lỗi 1 sprint → log lỗi kèm sprint_id, giữ nguyên bản ghi, tiếp tục sprint khác; log số lượng đã xử lý (kể cả 0)
    - Đăng ký provider trong `SprintModule`
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

  - [ ]* 9.2 Property test cho idempotency của snapshot
    - **Property 9: Snapshot idempotency**
    - **Validates: Requirements 10.4**
    - fast-check: chạy cron nhiều lần cùng ngày/cùng sprint chỉ giữ đúng MỘT bản ghi `(sprint_id, snapshot_date)`

  - [ ]* 9.3 Unit test cho cron khi không có sprint active và khi lỗi cục bộ
    - Test 0 sprint → log count=0, không tạo bản ghi; lỗi 1 sprint không chặn các sprint còn lại
    - _Requirements: 10.5, 10.6_

- [ ] 10. Triển khai báo cáo Velocity và Dashboard aggregation
  - [ ] 10.1 Implement velocity report và dashboard aggregation
    - `getVelocity(projectId)`: committed (`initialStoryPoints`) + completed (Σ SP task Done) cho sprint `completed`, sort `completedAt` asc, average velocity (làm tròn 1 chữ số thập phân), bao gồm cả sprint soft-deleted; rỗng → average=0
    - `getDashboard(projectId)`: tổng hợp tiến độ tính tại DB (SUM/COUNT)
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 15.7_

  - [ ]* 10.2 Unit test cho velocity
    - Test không có sprint completed (rỗng, avg=0), bao gồm soft-deleted, sort theo completedAt
    - _Requirements: 11.3, 11.4_

- [ ] 11. Triển khai SprintController và Authorization
  - [ ] 11.1 Implement `SprintController` với `ProjectRolesGuard` + `@ProjectRoles`
    - `apps/backend/src/sprint/sprint.controller.ts`: khai báo toàn bộ endpoint trong design §3.2; gắn guard + roles đúng ma trận (SM/PO cho CRUD/start/complete/delete/settings; +Developer/QA cho gán task; tất cả role gồm Stakeholder cho GET)
    - Áp `ValidationPipe` cho mọi input; capacity endpoints (`PUT/GET /sprints/:id/capacities`), settings endpoint
    - _Requirements: 1.3, 1.10, 2.8, 3.7, 4.5, 5.9, 6.12, 7.5, 7.6, 8.7 (cảnh báo qua response), 11.6, 14.1, 14.2, 14.3, 14.4, 14.5, 14.6_

  - [ ]* 11.2 Integration test cho authorization toàn bộ endpoint
    - Test Stakeholder bị chặn mutating (403), thiếu token (401), sai role (403), mọi endpoint đều có guard
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

  - [ ]* 11.3 Integration test full Scrum flow (e2e backend)
    - create → addTasks → start → snapshot → complete (reassign) → velocity
    - _Requirements: 2.1, 5.1, 6.1, 9.1, 11.1_

- [ ] 12. Checkpoint backend — Đảm bảo toàn bộ test backend pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 13. Triển khai Frontend SprintService (HttpClient + Signals)
  - [ ] 13.1 Tạo `SprintService` frontend
    - `apps/frontend/src/app/projects/sprints/services/sprint.service.ts`: HttpClient gọi REST API, state bằng Signals (danh sách sprint, active sprint, selected filter, capacity, burndown, velocity)
    - Model TypeScript khớp DTO backend; utility format ngày `dd/MM/yyyy`, số phân cách phần nghìn, SP 1 chữ số thập phân (dùng pipe/utility thống nhất theo ui-standards)
    - _Requirements: 1.4, 1.5, 13.2, 13.3_

  - [ ]* 13.2 Unit test cho SprintService frontend
    - Test gọi API, cập nhật signals, mapping model
    - _Requirements: 13.2, 13.3_

- [ ] 14. Triển khai Sprint Filter Dropdown và Capacity Indicator (Backlog/Board toolbar)
  - [ ] 14.1 Tạo Sprint Filter Dropdown component
    - `apps/frontend/src/app/projects/sprints/components/sprint-filter-dropdown/`: `p-select` với All Sprints (mặc định) / Backlog (No Sprint) / active rồi planning (loại trừ deleted và completed) / + Create Sprint
    - Search debounce 300ms (case-insensitive), đồng bộ lựa chọn vào URL query param, empty state phân biệt "không có task/Sprint khớp"
    - Lọc task theo `sprint_id` trong ≤1s; áp thuật ngữ Sprint/Cycle theo settings
    - **Bắt buộc**: Tích hợp KHÔNG làm ảnh hưởng DnD hiện có trên Backlog/Board; kiểm tra thực tế bằng kéo thả sau khi thay đổi filter
    - _Requirements: 1.4, 1.5, 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 13.18_

  - [ ] 14.2 Tạo Capacity Indicator component
    - Hiển thị `actualUsed / capacity SP` (≤1 chữ số thập phân) + thanh tiến trình; trạng thái over-capacity khi `actualUsed > capacity`
    - Toast `warn` kèm số lượng khi `unestimatedTasksCount > 0`
    - **Bắt buộc**: thanh tiến trình có dark variant (ví dụ: `bg-indigo-600 dark:bg-indigo-400`)
    - _Requirements: 8.7, 8.9, 8.10, 13.3, 13.16_

  - [ ]* 14.3 Unit test cho filter + capacity indicator
    - Test debounce, URL sync, over-capacity, empty state
    - _Requirements: 12.2, 12.5, 12.6, 8.10_

- [ ] 15. Triển khai gán task vào Sprint trên UI
  - [ ] 15.1 Thêm gán Sprint qua Task Detail Panel, Context Menu và Bulk Action
    - Dropdown Sprint trong Task Detail Panel; Context Menu "Move to Sprint..."; Bulk action gán/loại nhiều task
    - Gọi `assignTask`/`addTasks`/`bulkRemoveTasks`; toast success/error theo ui-standards
    - _Requirements: 7.1, 7.2, 7.3, 13.12, 13.13_

  - [ ]* 15.2 Unit test cho thao tác gán task UI
    - Test single/bulk assign, xử lý lỗi hiển thị toast
    - _Requirements: 7.1, 7.2, 7.3, 13.13_

- [ ] 16. Triển khai submenu Sprints và trang Sprints List
  - [ ] 16.1 Tạo route + Collapsible submenu Sprints trên sidebar
    - Route `/projects/:projectId/sprints/{list,dashboard,velocity,settings}` (lazy load), submenu đúng 4 mục theo thứ tự List/Dashboard/Velocity/Settings, áp thuật ngữ Sprint/Cycle
    - _Requirements: 1.4, 1.5, 13.1_

  - [ ] 16.2 Tạo trang Sprints List với `p-table` server-side pagination
    - Server-side pagination + filter search (debounce 300ms±50) + status, đồng bộ URL query params (reload khôi phục đúng filter)
    - Multiple select + toolbar ghi số lượng đã chọn + nút bulk delete; ConfirmDialog (ConfirmationService) ghi rõ số lượng trước khi xóa; hủy → không gửi request
    - Empty state phân biệt "chưa có dữ liệu" (CTA tạo Sprint) vs "filter không khớp" (xóa bộ lọc); loading `p-skeleton`; ngày `dd/MM/yyyy`
    - Toast success (3000ms, top-right) / error (5000ms) sau mutating
    - **Bắt buộc layout**: `flex flex-col h-full` — KHÔNG dùng `max-w-* mx-auto p-6`; toolbar `flex-shrink-0`; `pButton` dùng `size="small" [fluid]="false"`
    - **Bắt buộc dark mode**: table header `bg-gray-50 dark:bg-surface-800`; status badge Sprint có đủ cặp light/dark; row hover `hover:bg-gray-50/50 dark:hover:bg-surface-800/50`
    - _Requirements: 4.4, 13.1, 13.2, 13.4, 13.5, 13.6, 13.7, 13.8, 13.9, 13.10, 13.11, 13.12, 13.13, 13.14, 13.15, 13.16, 13.17_

  - [ ]* 16.3 Unit test cho Sprints List
    - Test confirm dialog hiển thị số lượng + hủy không gửi, URL sync filter, empty/loading states
    - _Requirements: 4.4, 13.5, 13.7, 13.8, 13.9, 13.10, 13.11_

- [ ] 17. Triển khai Sprint Dashboard và Burndown Chart
  - [ ] 17.1 Tạo trang Dashboard với Burndown Chart (`p-chart`)
    - Active Sprint Selector; Burndown `p-chart` (Chart.js) với switch Story Points (mặc định) / Task Count; thống kê tiến độ
    - Định dạng số theo ui-standards; loading skeleton; xử lý 409 khi sprint chưa start
    - **Bắt buộc layout**: `flex flex-col h-full`; Sprint Selector trong toolbar `flex-shrink-0`
    - **Bắt buộc dark mode**: chart background/grid color phải có dark variant; màu đường burndown actual/ideal contrast đủ trên cả hai mode
    - _Requirements: 9.6, 9.7, 13.2, 13.3, 13.11, 13.15, 13.16_

  - [ ]* 17.2 Unit test cho Dashboard/Burndown
    - Test toggle SP/Task vẽ lại chart, xử lý sprint chưa start
    - _Requirements: 9.6, 9.7_

- [ ] 18. Triển khai trang Velocity Reports
  - [ ] 18.1 Tạo trang Velocity với biểu đồ cột Committed vs Completed
    - `p-chart` cột so sánh Committed SP vs Completed SP từng Sprint + Average Velocity (SP ≤1 chữ số thập phân); loading `p-skeleton`
    - **Bắt buộc layout**: `flex flex-col h-full`
    - **Bắt buộc dark mode**: màu cột chart có dark variant; label trục X/Y contrast đủ trên dark mode
    - _Requirements: 11.6, 11.7, 13.3, 13.15, 13.16_

  - [ ]* 18.2 Unit test cho Velocity UI
    - Test render chart + average, trạng thái loading
    - _Requirements: 11.6, 11.7_

- [ ] 19. Triển khai trang Sprint Settings
  - [ ] 19.1 Tạo trang Settings cấu hình Sprint cấp dự án
    - Form: terminology, defaultDurationWeeks, maxActiveSprints, capacityMode; validation inline (ui-standards §6); gọi PATCH settings; toast success/error
    - Phản ánh thay đổi terminology ra toàn UI (Sprint/Cycle)
    - **Bắt buộc layout**: `flex flex-col h-full`; form nằm trong `flex-1 overflow-y-auto px-6 py-4`; KHÔNG dùng `max-w-* mx-auto p-6`
    - **Bắt buộc button**: nút "Lưu thay đổi" ở cuối form có thể dùng `w-full` hoặc `[fluid]="true"`; các toggle/radio button KHÔNG dùng `flex-1`
    - **Bắt buộc dark mode**: mọi form field label, section heading, helper text có `dark:` variant
    - _Requirements: 1.1, 1.3, 1.4, 1.5, 13.12, 13.13, 13.15, 13.16, 13.17_

  - [ ]* 19.2 Unit test cho Settings form
    - Test validation inline, submit hợp lệ, hiển thị lỗi 400 từ backend
    - _Requirements: 1.3, 1.6, 1.7, 1.8, 1.9_

- [ ] 20. Checkpoint cuối — Đảm bảo toàn bộ test (backend + frontend) pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Task gắn `*` là tùy chọn (test) và có thể bỏ qua để đạt MVP nhanh hơn; task core không bao giờ gắn `*`.
- Mỗi task tham chiếu requirement cụ thể để truy vết.
- Property-based test (fast-check) kiểm chứng 10 correctness properties; mỗi property là một sub-task riêng đặt sát phần triển khai để bắt lỗi sớm.
- Unit/integration test bổ trợ cho các ví dụ và edge case.
- Mọi mutating operation chạy trong transaction; UI tuân thủ `ui-standards.md` (định dạng ngày/số, filter + URL sync, multiple select, confirm dialog, empty/loading state, toast).
- Cron job snapshot tách khỏi luồng request; dashboard aggregation tính tại DB.

### Checklist bắt buộc cho mọi frontend task (vi phạm = sai — từ `CLAUDE.md` và project memory)

Trước khi đánh dấu bất kỳ frontend task nào là hoàn thành, phải kiểm tra:

**Page Layout:**
- [ ] Trang dùng `flex flex-col h-full` — KHÔNG dùng `max-w-* mx-auto p-6`
- [ ] Toolbar: `flex items-center gap-3 px-6 py-3 border-b flex-shrink-0`
- [ ] Content area: `flex-1 overflow-y-auto px-6 py-4`
- [ ] Button trong toolbar: `size="small"` + `[fluid]="false"`

**Dark Mode:**
- [ ] Mọi container: `bg-white dark:bg-surface-900`
- [ ] Mọi heading: `text-gray-900 dark:text-surface-0`
- [ ] Mọi label/subtext: `text-gray-500 dark:text-surface-400` hoặc `text-gray-700 dark:text-surface-200`
- [ ] Mọi border/divider: `border-gray-200 dark:border-surface-700`
- [ ] Table header row: `bg-gray-50 dark:bg-surface-800`
- [ ] Table row hover: `hover:bg-gray-50/50 dark:hover:bg-surface-800/50`
- [ ] Status badge Sprint (planning/active/completed) có cặp light + dark
- [ ] Capacity Indicator thanh tiến trình có dark variant

**Button Sizing:**
- [ ] Mọi `pButton` action: `[fluid]="false"` trừ khi là form submit cuối form
- [ ] Không có `flex-1` hoặc `w-full` trên action/toggle button

**Drag-and-Drop (nếu có DnD mới):**
- [ ] `[cdkDropListSortingDisabled]="true"` trên mọi `cdkDropList`
- [ ] KHÔNG có `cdkDragHandle`
- [ ] Ghost div (opacity-25) đặt NGOÀI `cdkDrag`, trước nó
- [ ] Line indicator (h-0.5 bg-indigo-600 dark:bg-indigo-500) TRONG `cdkDrag`
- [ ] `(pointerdown)="$event.stopPropagation()"` trên mọi button/input bên trong item
- [ ] CSS: `transition: none !important` cho `.cdk-drop-list-dragging .cdk-drag`

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.3"] },
    { "id": 1, "tasks": ["1.2", "2.1"] },
    { "id": 2, "tasks": ["2.2", "3.1"] },
    { "id": 3, "tasks": ["3.2", "4.1"] },
    { "id": 4, "tasks": ["4.2", "4.3", "4.4", "5.1", "8.1"] },
    { "id": 5, "tasks": ["5.2", "6.1", "7.1", "8.2", "8.3", "9.1", "10.1"] },
    { "id": 6, "tasks": ["5.3", "5.4", "5.5", "6.2", "6.3", "7.2", "9.2", "9.3", "10.2"] },
    { "id": 7, "tasks": ["6.4", "6.5", "6.6", "11.1"] },
    { "id": 8, "tasks": ["11.2", "11.3", "13.1"] },
    { "id": 9, "tasks": ["13.2", "14.1", "14.2", "16.1"] },
    { "id": 10, "tasks": ["14.3", "15.1", "16.2", "17.1", "18.1", "19.1"] },
    { "id": 11, "tasks": ["15.2", "16.3", "17.2", "18.2", "19.2"] }
  ]
}
```
