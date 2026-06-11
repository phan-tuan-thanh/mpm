# Task Detail — Chế độ đọc (Read Mode) — Thiết kế

Ngày: 2026-06-11
Trạng thái: Đã thống nhất qua brainstorming

## Mục tiêu

Tối ưu task detail cho việc **đọc nội dung mạch lạc**: mặc định mọi vùng hiển thị dạng đọc
sạch (không toolbar, không viền input), chỉ chuyển sang edit khi người dùng chủ động —
theo mô hình per-section của Notion/Linear, không có nút gạt Xem/Sửa toàn cục.

## Hiện trạng

- Title (`task-title-inline`): đã có pattern display/edit, click để sửa — giữ nguyên.
- Mô tả: `app-rich-text-editor` luôn active kèm toolbar, save-on-blur — điểm "ồn" chính,
  là thay đổi trọng tâm.
- Properties pills, attachments, links, sub-items: bản chất đã là "đọc trước, thao tác sau"
  — giữ nguyên (YAGNI).
- Lưu ý: tên `viewMode` trong `task-detail-panel.component.ts` đã dùng cho layout
  (popup/right-pane/full-page) → chế độ mới dùng từ khóa `reading`/`editing`.

## Kiến trúc

### Component mới: `app-rich-text-viewer` (shared)

Đặt cạnh `rich-text-editor`. Render TipTap HTML tĩnh qua `innerHTML` đã sanitize
(`DomSanitizer`, cùng whitelist với RTE), tái dùng đúng CSS classes của RTE content
để đọc/sửa nhìn giống hệt nhau — không nhảy layout khi chuyển mode. Không mount
ProseMirror khi chỉ đọc → panel mở nhẹ hơn.

Tương tác trong trạng thái đọc:
- Click link → mở link, không kích hoạt edit (`stopPropagation`).
- Checkbox của checklist → tick trực tiếp, emit event để lưu ngầm (không bắt vào edit).
- Bôi đen chọn text → không kích hoạt edit (kiểm tra selection rỗng tại `mouseup`).
- Click ảnh → mở preview, không vào edit.
- Click vùng còn lại → emit `editRequested`.

### State

Signal `editingSection: 'description' | null` trong `TaskDetailStateService` (mở rộng
được cho vùng khác sau này). Mỗi thời điểm một vùng edit; đang edit dirty thì click vùng
khác không tự nhảy — tránh mất dữ liệu.

## Hành vi từng vùng

### Mô tả (thay đổi chính)

- **Đọc**: `app-rich-text-viewer`, không viền/nền input. Hover → nền sáng nhẹ
  (`hover:bg-gray-50 dark:hover:bg-surface-800`) + nút bút chì nhỏ góc phải trên.
- **Trống**: placeholder mờ "Thêm mô tả…", click vào edit ngay.
- **Trigger edit**: click nội dung HOẶC nút bút chì (cả hai) → swap sang
  `app-rich-text-editor` (giữ cấu hình hiện tại), tự focus.
- **Lưu/thoát kiểu Jira**: nút Lưu (primary) / Hủy (text) dưới editor, fit nội dung.
  `Ctrl+Enter` = Lưu, `Esc` = Hủy. Click ra ngoài KHÔNG lưu, không thoát. Hủy khi dirty
  → confirm "Bỏ thay đổi chưa lưu?". Bỏ cơ chế save-on-blur hiện tại.

### Các vùng khác

- Title: giữ pattern click-to-edit sẵn có, thêm hover hint nhẹ cho đồng bộ.
- Properties pills / attachments / links / sub-items: giữ nguyên.
- Comment (thiết kế 2026-06-11-task-comments-design.md): dùng chung
  `app-rich-text-viewer` để render nội dung, bấm Sửa trong menu ⋯ mới thành editor
  với Lưu/Hủy — đồng nhất pattern.

### Conflict

Đang đọc mà task được người khác cập nhật → viewer cập nhật tự do. Đang edit → giữ bản
đang gõ, Lưu áp dụng bản của mình (last-write-wins như hiện tại).

## Edge cases

- Đóng panel / chuyển task khi đang edit dirty → confirm trước khi rời.
- Lưu thất bại → toast lỗi, GIỮ trạng thái edit và nội dung đang gõ, cho Lưu lại.
- Tick checkbox ở chế độ đọc thất bại → revert + toast.
- Mô tả dài → hiển thị đầy đủ, không collapse (panel cha đã scroll).

## Testing

- `app-rich-text-viewer` specs: render HTML, click link không emit edit, click text emit
  edit, selection không emit, checkbox emit event riêng, sanitize loại script.
- Panel description specs: mặc định trạng thái đọc; click → editor xuất hiện + focus;
  Lưu gọi API rồi về đọc; Hủy dirty có confirm; Esc/Ctrl+Enter; lưu lỗi giữ edit.
