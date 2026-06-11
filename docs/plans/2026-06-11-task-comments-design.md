# Task Comments — Thiết kế

Ngày: 2026-06-11
Trạng thái: Đã thống nhất qua brainstorming

## Mục tiêu

Nâng cấp chức năng bình luận trong task detail từ plain text cơ bản lên công cụ trao đổi
hiệu quả cho nhân sự: rich text + đính kèm ảnh, @mention thành viên, trả lời theo luồng,
reaction emoji.

## Phạm vi v1

- Rich text (TipTap) + dán/đính kèm ảnh trong comment.
- @Mention thành viên dự án — chỉ highlight trong nội dung, **chưa có notification**
  (lưu sẵn dữ liệu mentions để làm notification ở giai đoạn sau).
- Thread 1 cấp kiểu Linear/GitHub: comment gốc + danh sách reply phẳng. Không reply-của-reply.
- Reaction với bộ emoji cố định: 👍 ❤️ 🎉 👀 ✅ 😄.
- Vị trí: giữ trong tab "Bình luận" của Activity Panel. Layout A — mỗi luồng là một card
  có viền, reply nằm gọn trong card.

Ngoài phạm vi: notification (in-app/email), websocket realtime, nested thread, emoji picker
đầy đủ, resolve thread.

## Hiện trạng

- Backend: `CommentController` (POST/PATCH/DELETE) lưu comment như entry trong `task_activity`
  (`comment_added/edited/deleted`), logic nằm trong `ActivityService`.
- Frontend: tab "Bình luận" trong `activity-panel`, composer là textarea plain text
  (`task-activity-tab.component.ts`), sửa/xóa inline.
- Hạ tầng sẵn có: `app-rich-text-editor` (shared) đã hỗ trợ `mentionSearch`, `uploadImage`,
  feature presets, `buildMentionExtension` (rte-mention.ts); module `attachment` upload file.

## Mô hình dữ liệu

```
task_comment
├── id            uuid PK
├── task_id       uuid FK → task
├── author_id     uuid FK → user
├── parent_id     uuid FK → task_comment, null = comment gốc (chỉ 1 cấp)
├── content       text — HTML từ TipTap, đã sanitize phía server
├── mentions      uuid[] — userId được tag, sẵn cho notification sau này
├── edited_at     timestamptz null — hiển thị "(đã chỉnh sửa)"
├── deleted_at    timestamptz null — soft delete
└── created_at / updated_at

task_comment_reaction
├── comment_id    uuid FK → task_comment
├── user_id       uuid FK → user
├── emoji         varchar — thuộc bộ 6 emoji cố định
├── created_at
└── UNIQUE (comment_id, user_id, emoji)
```

Quyết định:

- **Tách entity riêng** thay vì ở nhờ `task_activity`: thread, reaction, rich text không
  nhét vừa mô hình activity log.
- **Soft delete**: giữ luồng nguyên vẹn khi comment gốc bị xóa — hiển thị placeholder
  "Bình luận đã bị xóa", reply bên dưới giữ nguyên.
- **Reaction là bảng riêng**: unique constraint chặn double-react tại DB, toggle/đếm đơn giản.
- **`task_activity` giữ vai trò lịch sử**: thêm/xóa comment vẫn ghi entry
  `comment_added`/`comment_deleted` (không lưu nội dung) cho tab "Tất cả"/"Lịch sử".

## API

Base route giữ nguyên: `api/projects/:projectId/tasks/:taskId/comments`, dùng `@ProjectRoles`
như hiện tại.

| Method | Route | Mô tả |
|---|---|---|
| GET | `/comments` | Toàn bộ comment của task: gốc theo thời gian tăng dần, kèm `replies[]` và `reactions[]` gộp sẵn `{emoji, count, userIds}`. Không phân trang ở v1. |
| POST | `/comments` | Body `{content, parentId?, mentions?}`. `parentId` trỏ tới reply → 400 (ép 1 cấp). Sanitize HTML server-side. |
| PATCH | `/comments/:id` | Chỉ tác giả. Set `edited_at`. |
| DELETE | `/comments/:id` | Tác giả hoặc Scrum_Master/Product_Owner/Admin. Soft delete. |
| PUT | `/comments/:id/reactions/:emoji` | Toggle reaction. Emoji ngoài bộ cố định → 400. |

- Logic chuyển từ `ActivityService` sang `CommentService` mới (`task/comment/`);
  `ActivityService` chỉ còn ghi entry lịch sử. Xóa `addComment/editComment/deleteComment`
  cũ sau migration.
- Ảnh trong comment: tái dùng endpoint upload attachment của task, RTE nhúng URL trả về.
- Mention search: tái dùng API thành viên dự án, lọc client-side.

## Frontend

Nâng cấp tab "Bình luận" (tab "Tất cả"/"Lịch sử" giữ nguyên):

**Composer** — thay textarea bằng `app-rich-text-editor`, preset rút gọn (bold, italic, code,
list, link, ảnh, mention; bỏ table/heading/màu chữ). Truyền `mentionSearch` + `uploadImage`.
Placeholder "Viết bình luận… gõ @ để nhắc ai đó". Nút Gửi cỡ nhỏ, fit nội dung.

**Danh sách** — layout A: mỗi comment gốc là card có viền chứa cả replies (thụt lề, kẻ dọc nối).
Header: avatar + tên + thời gian tương đối (tooltip `dd/MM/yyyy HH:mm:ss`), nhãn
"(đã chỉnh sửa)" khi có `editedAt`. Gốc bị xóa còn reply → placeholder mờ "Bình luận đã bị xóa".

**Hành động** — hàng dưới mỗi comment: nút reaction 😀+, "Trả lời" (chỉ ở gốc), menu ⋯
Sửa/Xóa theo quyền. Reaction mở `p-popover` chứa 6 emoji cố định (đúng convention popover
dự án). Reaction hiện thành pill `👍 3`; pill của mình highlight (`bg-highlight`), click để toggle.

**Khác** — sửa inline bằng RTE tại chỗ (Lưu/Hủy); mention render pill `@Tên`
(`text-primary bg-highlight`); mọi màu có `dark:` variant; xóa có confirm dialog.

## Edge cases

- Reply vào comment đã xóa → backend chặn; composer reply ẩn khi gốc đã xóa.
- Gốc đã xóa và không còn reply hiển thị → ẩn hoàn toàn khỏi danh sách.
- Mention người đã rời dự án → pill vẫn render (label lưu trong content); search chỉ gợi ý
  thành viên hiện tại.
- Sanitize HTML server-side (whitelist tag/attr TipTap) — bắt buộc, content render `innerHTML`.
- Ảnh đã upload nhưng comment không gửi → chấp nhận attachment mồ côi ở v1.

## Migration

Migration TypeORM: tạo `task_comment` + `task_comment_reaction`; script chuyển entry
`comment_added` hiện có sang `task_comment` (escape HTML, bọc `<p>`). Entry cũ trong
`task_activity` giữ nguyên cho tab Lịch sử.

## Testing

- Backend: specs cho `CommentService` — CRUD, ép thread 1 cấp, soft delete giữ reply,
  toggle reaction + unique, phân quyền sửa/xóa, sanitize.
- Frontend: specs cho component comment list — render thread, placeholder đã xóa,
  nhãn đã sửa, toggle reaction, ẩn nút Trả lời ở reply (theo pattern spec activity-panel).
