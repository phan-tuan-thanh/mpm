# Task Detail — Chế độ đọc (Read Mode) — Thiết kế

Ngày: 2026-06-11 (cập nhật sau review cùng ngày)
Trạng thái: Đã thống nhất qua brainstorming, đã sửa theo review

## Mục tiêu

Tối ưu task detail cho việc **đọc nội dung mạch lạc**: mặc định mọi vùng hiển thị dạng đọc
sạch (không toolbar, không viền input), chỉ chuyển sang edit khi người dùng chủ động —
theo mô hình per-section của Notion/Linear, không có nút gạt Xem/Sửa toàn cục.

## User Stories

### US-1: Đọc mô tả task sạch sẽ
**Là** thành viên dự án, **tôi muốn** mở task detail và đọc mô tả như một trang tài liệu
(không toolbar, không khung soạn thảo), **để** nắm nội dung công việc nhanh và không bị
phân tâm bởi các control chỉnh sửa.

Tiêu chí chấp nhận:
- [ ] Mở task detail → mô tả hiển thị dạng đọc: không toolbar, không viền input.
- [ ] Mọi định dạng giữ nguyên như khi soạn: màu chữ, highlight, căn lề, font, ảnh đã
      resize, bảng, checklist. (Ngoại lệ duy nhất: code block không có màu cú pháp.)
- [ ] Bôi đen để copy nội dung không làm bật chế độ sửa.
- [ ] Click link trong mô tả → mở tab mới, không bật chế độ sửa.
- [ ] Panel mở nhanh hơn hiện tại (không khởi tạo editor khi chỉ đọc).

### US-2: Chuyển sang sửa khi cần
**Là** thành viên dự án, **tôi muốn** click vào mô tả (hoặc nút bút chì) để sửa, có nút
Lưu/Hủy rõ ràng, **để** chỉnh nội dung một cách chủ động mà không sợ lưu nhầm.

Tiêu chí chấp nhận:
- [ ] Hover vùng mô tả → nền đổi nhẹ + hiện nút bút chì góc phải.
- [ ] Click nội dung hoặc nút bút chì → editor đầy đủ toolbar xuất hiện, focus sẵn.
- [ ] Có nút Lưu / Hủy dưới editor; `Ctrl+Enter` = Lưu, `Esc` = Hủy.
- [ ] Click ra ngoài KHÔNG tự lưu, KHÔNG thoát chế độ sửa.
- [ ] Hủy khi có thay đổi → hỏi xác nhận "Bỏ thay đổi chưa lưu?".
- [ ] Bấm Esc khi đang sửa chỉ hủy sửa, KHÔNG đóng panel.
- [ ] Lưu thất bại → báo lỗi, nội dung đang gõ còn nguyên, bấm Lưu lại được.
- [ ] Mô tả trống → hiện "Thêm mô tả…", click vào sửa ngay.

### US-3: Tick checklist ngay khi đọc
**Là** thành viên dự án, **tôi muốn** tick/bỏ tick các mục checklist trong mô tả ngay ở
chế độ đọc, **để** cập nhật tiến độ nhanh mà không phải vào chế độ sửa.

Tiêu chí chấp nhận:
- [ ] Click checkbox trong mô tả ở chế độ đọc → trạng thái đổi ngay và được lưu.
- [ ] Lưu thất bại → checkbox trở về trạng thái cũ + báo lỗi.
- [ ] Tick checkbox không làm bật chế độ sửa.

### US-4: Đọc comment đồng nhất (liên quan thiết kế comment)
**Là** thành viên dự án, **tôi muốn** nội dung comment hiển thị cùng kiểu đọc sạch như
mô tả, **để** trải nghiệm đọc thống nhất trong toàn task detail.

Tiêu chí chấp nhận:
- [ ] Comment render tĩnh bằng cùng viewer, mọi định dạng giữ nguyên.
- [ ] Bấm Sửa trong menu ⋯ mới chuyển comment đó thành editor với Lưu/Hủy.

## Hiện trạng

- Title (`task-title-inline`): đã có pattern display/edit, click để sửa — giữ nguyên.
- Mô tả: `app-rich-text-editor` luôn active kèm toolbar, save-on-blur — điểm "ồn" chính,
  là thay đổi trọng tâm.
- Properties pills, attachments, links, sub-items: bản chất đã là "đọc trước, thao tác sau"
  — giữ nguyên (YAGNI).
- Lưu ý: tên `viewMode` trong `task-detail-panel.component.ts` đã dùng cho layout
  (popup/right-pane/full-page) → chế độ mới dùng từ khóa `reading`/`editing`.
- Dữ liệu: `Task.description` là **`TiptapDoc` (JSON ProseMirror)**, không phải HTML
  (libs/shared-types/src/task.types.ts). Comment (thiết kế cùng ngày) lưu **HTML string**.

## Kiến trúc

### Component mới: `app-rich-text-viewer` (shared)

Đặt cạnh `rich-text-editor`. Nhận **cả hai định dạng** đầu vào:

- `[doc]` — `TiptapDoc` JSON (dùng cho mô tả task): convert sang HTML bằng
  `generateHTML(doc, extensions)` của `@tiptap/core`. Bộ extensions phải **dùng chung
  builder với RTE** (tái cấu trúc `buildExtensions` trong `rte-extensions.ts` để export
  một biến thể render-only — không cần suggestion/placeholder plugins). Lệch bộ
  extensions giữa editor và viewer = mất node/mark khi render.
- `[html]` — chuỗi HTML (dùng cho comment): bỏ qua bước convert.

**Sanitize**: KHÔNG dùng `DomSanitizer` của Angular — sanitizer này dùng allowlist cố
định và **strip thuộc tính `style`**, sẽ làm mất màu chữ/highlight do
`@tiptap/extension-color` + `text-style` sinh ra (`style="color: …"`), phá vỡ cam kết
"đọc và sửa nhìn giống hệt nhau". Thay vào đó dùng **DOMPurify** (đã có trong
dependencies frontend) với allowlist khớp schema TipTap — chốt danh sách:
`class`, `style` (giới hạn property: `color`, `background-color`, `text-align`,
`font-family` — khớp các extension Color, Highlight multicolor, TextAlign, FontFamily
đang bật trong rte-extensions.ts), `data-type`, `data-checked`, `href`, `target`,
`rel`, `src`, `alt`, `title`, `width`/`height` (ảnh đã resize), `colspan`/`rowspan`
(table), và `type`/`checked`/`disabled` trên `<input>` (taskItem). Tag `<mark>`
(Highlight) phải được giữ. Sau sanitize mới `bypassSecurityTrustHtml`.
Viết unit test khóa allowlist này (script/iframe/onerror/`javascript:` bị loại;
style màu, `text-align`, `font-family`, `checked`, `<mark>`, `width` được giữ).

**Link ra ngoài**: dùng DOMPurify hook (`afterSanitizeAttributes`) ép mọi `<a>` thành
`target="_blank" rel="noopener noreferrer"` — nội dung đọc nằm trong panel, mở link đè
lên app sẽ mất ngữ cảnh làm việc.

Render qua `innerHTML`, tái dùng đúng CSS classes của RTE content — không nhảy layout
khi chuyển mode. Không mount ProseMirror khi chỉ đọc → panel mở nhẹ hơn. Kết quả
`generateHTML` + sanitize **memoize trong `computed()`** theo input doc/html — không
chạy lại mỗi chu kỳ change detection.

### Tương tác trong trạng thái đọc

- Click link → mở link, không kích hoạt edit (`stopPropagation`).
- **Checkbox của checklist** → tick trực tiếp, không bắt vào edit. Cơ chế: duyệt DOM
  viewer đếm thứ tự checkbox bị click (thứ N) → duyệt `TiptapDoc` JSON theo cùng thứ tự
  document-order, flip `attrs.checked` của `taskItem` thứ N → emit doc mới để panel gọi
  API update description. Chấp nhận ở v1: mỗi lần tick sinh một entry
  `description_changed` trong activity log (ghi nhận, tối ưu sau nếu gây nhiễu).
- Bôi đen chọn text → không kích hoạt edit (kiểm tra selection rỗng tại `mouseup`).
- Click ảnh → mở ảnh trong tab mới, không vào edit (chưa làm lightbox — YAGNI, app
  hiện chưa có cơ chế preview ảnh nào).
- Click vùng còn lại → emit `editRequested`.

### State

Signal `editingSection: 'description' | null` trong `TaskDetailStateService` (mở rộng
được cho vùng khác sau này). Mỗi thời điểm một vùng edit; đang edit dirty thì click vùng
khác không tự nhảy — tránh mất dữ liệu.

## Hành vi từng vùng

### Mô tả (thay đổi chính)

```
┌─ Chế độ ĐỌC ──────────────────────────────┐   ┌─ Chế độ EDIT ─────────────────────────────┐
│ MÔ TẢ                              [✏️]*   │   │ MÔ TẢ                                     │
│                                            │   │ ┌─ B I U <> 🔗 🖼 ───────────────────────┐ │
│ Nội dung render sạch, không viền,          │   │ │ Nội dung trong RTE đầy đủ toolbar,    │ │
│ không toolbar. Checklist tick được:        │   │ │ focus sẵn.                            │ │
│  ☑ việc một                                │   │ │                                       │ │
│  ☐ việc hai                                │   │ └───────────────────────────────────────┘ │
│                                            │   │                      [ Hủy ]  [ Lưu ]     │
│ (* nút bút chì chỉ hiện khi hover,         │   │  Esc = Hủy · Ctrl+Enter = Lưu             │
│    nền sáng nhẹ khi hover)                 │   │                                           │
└────────────────────────────────────────────┘   └───────────────────────────────────────────┘
```

- **Đọc**: `app-rich-text-viewer`, không viền/nền input. Hover → nền sáng nhẹ
  (`hover:bg-gray-50 dark:hover:bg-surface-800`) + nút bút chì nhỏ góc phải trên.
- **Trống**: placeholder mờ "Thêm mô tả…", click vào edit ngay. Phát hiện "trống" bằng
  helper `isDocEmpty` (dựa trên `isNodeEmpty` của TipTap) — doc chứa một paragraph rỗng
  vẫn phải tính là trống.
- **Trigger edit**: click nội dung HOẶC nút bút chì (cả hai) → swap sang
  `app-rich-text-editor` (giữ cấu hình hiện tại), tự focus cuối nội dung
  (`focus('end')`) — đặt caret theo điểm click không đáng công sức ở v1.
- **Lưu/thoát kiểu Jira**: nút Lưu (primary) / Hủy (text) dưới editor, fit nội dung.
  `Ctrl+Enter` = Lưu, `Esc` = Hủy. Click ra ngoài KHÔNG lưu, không thoát. Hủy khi dirty
  → confirm "Bỏ thay đổi chưa lưu?" (chủ đích cho user non-tech). Bỏ save-on-blur hiện tại.
- **Xung đột phím Esc với panel**: panel chạy trong `p-drawer`/`p-dialog` có
  `closeOnEscape` mặc định — nếu không xử lý, Esc khi đang edit sẽ đóng cả panel. Giải
  pháp: bind `[closeOnEscape]="editingSection() === null"` trên drawer/dialog, đồng thời
  `keydown.escape` trong editor gọi `stopPropagation()`.

### Các vùng khác

- Title: giữ pattern click-to-edit sẵn có, thêm hover hint nhẹ cho đồng bộ.
- Properties pills / attachments / links / sub-items: giữ nguyên.
- Comment (thiết kế 2026-06-11-task-comments-design.md): dùng chung
  `app-rich-text-viewer` (nhánh input `[html]`) để render nội dung, bấm Sửa trong menu ⋯
  mới thành editor với Lưu/Hủy — đồng nhất pattern.

### Conflict

Đang đọc mà task được người khác cập nhật → viewer cập nhật tự do. Đang edit → giữ bản
đang gõ, Lưu áp dụng bản của mình (last-write-wins như hiện tại).

## Edge cases

- Đóng panel / chuyển task khi đang edit dirty → confirm trước khi rời.
- Lưu thất bại → toast lỗi, GIỮ trạng thái edit và nội dung đang gõ, cho Lưu lại.
- Tick checkbox ở chế độ đọc thất bại → revert + toast.
- Mô tả dài → hiển thị đầy đủ, không collapse (panel cha đã scroll).
- Doc JSON chứa node không có trong bộ extensions (dữ liệu cũ/lỗi) → `generateHTML`
  throw: bọc try/catch, fallback hiển thị thông báo "Không hiển thị được mô tả, bấm để
  sửa" thay vì vỡ panel.
- **Code block không có syntax highlight ở chế độ đọc** (khác biệt có chủ đích ở v1):
  `CodeBlockLowlight` tô màu bằng decoration của editor lúc runtime, `generateHTML` chỉ
  xuất `<pre><code>` thuần. Chấp nhận code đen trắng khi đọc — không chạy lowlight thủ
  công (công sức không xứng giá trị). Đây KHÔNG phải bug.

## Testing

- `app-rich-text-viewer` specs:
  - `generateHTML` round-trip: doc JSON mẫu (đủ node: heading, list, taskList, color,
    link, image) render ra HTML giữ nguyên cấu trúc.
  - DOMPurify: loại `<script>`, `onerror`, `javascript:` href; GIỮ `style` màu chữ,
    `data-checked`, `checked` trên input, `class`; mọi `<a>` có
    `target="_blank" rel="noopener noreferrer"`.
  - Click link không emit edit; click text emit edit; selection không emit;
    checkbox emit doc mới với đúng `taskItem` được flip; doc lỗi → fallback;
    `isDocEmpty` đúng với doc rỗng/paragraph rỗng/doc có nội dung.
- Panel description specs: mặc định trạng thái đọc; click → editor xuất hiện + focus;
  Lưu gọi API rồi về đọc; Hủy dirty có confirm; Esc hủy edit mà KHÔNG đóng panel;
  Ctrl+Enter lưu; lưu lỗi giữ edit.
