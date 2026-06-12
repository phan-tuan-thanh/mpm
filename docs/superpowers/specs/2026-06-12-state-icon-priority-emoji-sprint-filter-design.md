# Design: State icon cấu hình được, fix priority emoji, sprint filter có completed

**Ngày:** 2026-06-12
**Trạng thái:** Approved
**Liên quan:** Mở rộng spec `2026-06-12-display-startdate-state-design.md` (component `app-state-dot`).

## Phạm vi

Ba phần độc lập nhưng cùng đợt cải thiện backlog UI:

1. **State icon cấu hình được như priority** — mỗi project state có thể gán icon (PrimeIcon hoặc emoji) trong Project Settings → States tab; icon hiển thị thay dot ở mọi nơi render state.
2. **Fix bug priority emoji không hiển thị** — priority gán icon emoji từ icon picker nhưng các nơi render dùng `<i [class]="icon">` nên emoji không hiện.
3. **Sprint filter bổ sung sprint đã hoàn thành** — dropdown filter Sprint ở backlog toolbar hiện chỉ lấy `openSprints()` (lọc bỏ `completed`).

## Phần 1 — State icon cấu hình được

### Quyết định

- Icon là **cột trên `project_states`** (không dùng config service riêng như priority): icon đi cùng state ref đã embed trong mọi API response (`task.state` có sẵn name/color/group).
- **Icon thay thế dot** khi có: pi icon tô màu state, emoji giữ nguyên màu emoji, tooltip tên state. Không có icon → fallback dot viền/fill như spec trước.
- Chỉ cấu hình ở **Project Settings → States tab**. Workspace State Templates không có icon (YAGNI); state tạo từ template ban đầu không icon → dùng dot.

### Backend

- Migration mới trong `migrations/` (pattern TS hiện có): `ALTER TABLE project_states ADD COLUMN icon varchar(50) NULL`. Không backfill.
- `apps/backend/src/project/entities/project-state.entity.ts`: thêm `@Column({ type: 'varchar', length: 50, nullable: true }) icon!: string | null;`
- `apps/backend/src/project/state/project-state.service.ts`: `create()` nhận `dto.icon`; `update()` thêm `if (dto.icon !== undefined) state.icon = dto.icon;`
- `apps/backend/src/task/task-query.service.ts`: query sub-items tree (raw SQL) thêm `ps.icon AS state_icon` vào SELECT và map vào `state.icon`. Query list/detail dùng relation nên tự có icon.

### Shared types

- `TaskStateRef` (`libs/shared-types/src/task.types.ts`) và `ProjectState` (`libs/shared-types/src/project.types.ts`): thêm `icon?: string | null`.

### Frontend

- **`app-state-dot`** (từ spec trước) mở rộng: nếu `state.icon` có giá trị → render `app-icon-display` (pi icon set `[style.color]="state.color"`, emoji hiển thị nguyên bản); nếu không → dot viền/fill theo group. Vẫn là điểm render duy nhất cho: task-row (List), board-card (Board), group header task-list.
- **States tab** (`apps/frontend/src/app/projects/pages/project-settings/states-tab/`): thêm icon picker giống Priorities tab — nút preview (render qua `app-state-dot`) mở `app-icon-picker-panel` trong `p-popover` có `appendTo="body"`, ở cả form sửa và form thêm state. Icon picker: bổ sung context `'state'` vào `IconContext` trong `icon-picker.constants.ts` và gán context này cho các nhóm icon phù hợp (trạng thái/tiến trình); States tab truyền `context="state"`.
- **Task detail panel** (`task-detail-panel.component.ts`): meta pill State (dòng ~279-282) và popover chọn state chuyển sang `app-state-dot` để icon hiển thị nhất quán.

## Phần 2 — Fix priority emoji không hiển thị

Icon picker có tab Emoji nên `ProjectPriority.icon` có thể là emoji string. Bốn nơi render dùng `<i [class]="icon">` khiến emoji bị nhét vào attribute class → không hiển thị:

| File | Dòng | Ngữ cảnh |
|------|------|----------|
| `task-row.component.ts` | ~145 | Priority icon trên List row |
| `board-card.component.ts` | ~112 | Priority icon trên Board card |
| `task-detail-panel.component.ts` | ~288 | Meta pill Priority |
| `task-detail-panel.component.ts` | ~507 | Popover chọn priority |

**Fix:** thay `<i [class]="...">` bằng `app-icon-display` (đã xử lý đúng cả pi class lẫn emoji). Pi icon vẫn tô `colorLight` qua `[style.color]` như cũ; emoji hiển thị nguyên bản, kích thước font giữ theo style hiện tại từng chỗ.

## Phần 3 — Sprint filter bổ sung sprint đã hoàn thành

### Nguyên nhân

`backlog-toolbar.component.ts:311` build options từ `sprintService.openSprints()` — computed lọc bỏ `status === 'completed'` (`sprint.service.ts:46-47`).

### Giải pháp (phân nhóm + tìm kiếm + show more)

- **`SprintService`**: thêm computed `completedSprints` — lọc `status === 'completed'`, sort `completedAt` giảm dần.
- **Sprint filter popover** (`backlog-toolbar.component.ts:202`), giữ pattern `p-popover` + `.pop-list`/`.pop-item`:
  - Ô tìm kiếm ở đầu popover, lọc theo tên sprint trên cả hai nhóm.
  - Option "Chưa có sprint" giữ nguyên trên cùng.
  - Nhóm **"Đang mở"**: section header chữ nhỏ uppercase; danh sách open sprints như hiện tại, active có hậu tố "(đang chạy)".
  - Nhóm **"Đã hoàn thành"**: section header; mặc định hiện 5 sprint completed gần nhất + nút "Xem thêm (n)" mở toàn bộ. Khi đang gõ tìm kiếm → bỏ giới hạn, hiện tất cả kết quả khớp.
  - Sprint completed đang được chọn làm filter luôn hiển thị (không bị giới hạn 5 ẩn mất).
- **Label trên nút filter** (dòng ~407, `sprintOptions().find(...)`): nguồn tra cứu phải gồm cả completed sprints để hiện đúng tên khi đang filter theo sprint đã xong.

## Kiểm chứng

1. Gán pi icon và emoji cho priority và state → hiển thị đúng ở List row, Board card, Detail panel (pill + popover), Settings tabs; dark mode OK.
2. State không có icon → vẫn render dot viền/fill theo group như spec trước.
3. State tạo mới từ template → không icon, dùng dot; gán icon trong States tab → cập nhật ngay các view.
4. Sprint filter: thấy nhóm "Đã hoàn thành", tìm kiếm hoạt động trên cả hai nhóm, "Xem thêm" mở hết, chọn sprint completed → filter đúng và nút filter hiện đúng tên.
5. Toggle Display Properties (State) vẫn điều khiển ẩn/hiện như spec trước, không phụ thuộc state có icon hay không.
