# Task Comments — Thiết kế

Ngày: 2026-06-11  
Cập nhật: 2026-06-12 (sau review kỹ thuật + review sanitize/edge cases)  
Trạng thái: Đã chốt — sẵn sàng implement

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
├── mentions      uuid[] — userId được tag, trích tự động từ content sau sanitize
├── edited_at     timestamptz null — hiển thị "(đã chỉnh sửa)"
├── deleted_at    timestamptz null — soft delete
└── created_at / updated_at

task_comment_reaction
├── comment_id    uuid FK → task_comment  ← PK phần 1
├── user_id       uuid FK → user          ← PK phần 2
├── emoji         varchar — thuộc bộ 6 emoji cố định  ← PK phần 3
└── created_at
-- Composite PK (comment_id, user_id, emoji): DB tự chặn double-react, không cần cột id thừa
-- Thêm index: task_comment(task_id), task_comment(parent_id), task_comment_reaction(comment_id)

task_attachments  ← thêm cột phân biệt nguồn gốc
└── source  varchar default 'attachment' — 'attachment' | 'comment_image'
-- Ảnh paste/upload trong comment đặt source = 'comment_image'
-- Tab "Đính kèm" chỉ hiển thị WHERE source = 'attachment'
```

Quyết định:

- **Tách entity riêng** thay vì ở nhờ `task_activity`: thread, reaction, rich text không
  nhét vừa mô hình activity log.
- **Soft delete**: giữ luồng nguyên vẹn khi comment gốc bị xóa — hiển thị placeholder
  "Bình luận đã bị xóa", reply bên dưới giữ nguyên.
- **Reaction dùng composite PK** `(comment_id, user_id, emoji)`: DB tự chặn double-react,
  gọn hơn unique constraint riêng.
- **`task_activity` giữ vai trò lịch sử**: thêm/xóa comment vẫn ghi entry
  `comment_added`/`comment_deleted` (không lưu nội dung) cho tab "Tất cả"/"Lịch sử".
- **`mentions` tự trích phía server**: sau khi sanitize content, server tự parse
  `data-id` của mention node — không tin mảng `mentions` do client gửi.
- **`source` column trong `task_attachments`**: ảnh từ comment không xuất hiện trong
  tab "Đính kèm" của task.

## API

Base route giữ nguyên: `api/projects/:projectId/tasks/:taskId/comments`, dùng `@ProjectRoles`
như hiện tại.

| Method | Route | Mô tả |
|---|---|---|
| GET | `/comments` | Toàn bộ comment của task: gốc theo thời gian tăng dần, kèm `replies[]` và `reactions[]` gộp sẵn `{emoji, count, userIds}`. Không phân trang ở v1 (xem Trade-offs). |
| POST | `/comments` | Body `{content, parentId?}`. `mentions` **bỏ khỏi body** — server tự trích từ content. `parentId` trỏ tới reply → 400 (ép 1 cấp). Sanitize HTML server-side bằng `sanitize-html`. |
| PATCH | `/comments/:id` | Chỉ tác giả. Set `edited_at`. Server re-trích `mentions` từ content mới. |
| DELETE | `/comments/:id` | Tác giả **hoặc** Scrum_Master/Product_Owner/Admin. Soft delete. Ghi entry `comment_deleted` vào `task_activity`. |
| PUT | `/comments/:id/reactions/:emoji` | **Add** reaction. Emoji ngoài bộ cố định → 400. Idempotent (upsert). |
| DELETE | `/comments/:id/reactions/:emoji` | **Remove** reaction. Idempotent (no-op nếu chưa react). |

> **Thay đổi so với bản trước**: reaction dùng cặp PUT/DELETE thay vì PUT-toggle — tránh
> race condition khi click nhanh, đúng ngữ nghĩa HTTP (idempotent).

> **Quyền xóa comment** — thêm Product_Owner là **thay đổi có chủ đích**: PO có trách nhiệm
> nội dung backlog, cần quyền dọn dẹp comment không phù hợp. Code hiện tại
> (`activity.service.ts:205`) chỉ cho Scrum_Master/Admin — sẽ cập nhật trong CommentService mới.

Sanitize server-side:
- Thư viện: **`sanitize-html`** (Node.js). Frontend đang dùng `DOMPurify` để preview,
  nhưng server cần thư viện độc lập với DOM.
- **Whitelist tag** — khớp đúng preset composer (không rộng hơn):
  `p, br, strong, em, s, code, pre, ul, ol, li, blockquote, a, img, span`.
  Không cho phép: `h1–h6, table, thead, tbody, tr, th, td, mark, u, hr`.
  Nội dung dán từ ngoài vào (Word, Google Docs…) sẽ bị strip các tag ngoài danh sách này.
- **Whitelist attribute** — theo từng tag:
  - `a`: `href, target, rel` (không cho `class` ở đây).
  - `img`: `src, alt`.
  - `span`: chỉ cho `data-type, data-id, data-label` (mention pill); không cho `class` tự do.
  - Các tag còn lại: không có attribute đặc biệt.
- **`allowedClasses`** (option của `sanitize-html`): chỉ whitelist `{ 'span': ['rte-mention'] }` —
  strip toàn bộ class khác để tránh giả mạo Tailwind/PrimeNG class của UI hệ thống.
- **`href` scheme**: chỉ cho phép `http, https, mailto`. `javascript:`, `data:`, `ftp:` và
  mọi scheme khác bị strip. Force `rel="noopener noreferrer"` khi `target="_blank"`.
  (Mặc định `sanitize-html` cho cả `ftp` — cần cấu hình `allowedSchemes` tường minh.)
- **`src` của `img`**: giới hạn về pattern `/api/projects/.*/attachments/.*` —
  không cho src ngoài (blob URL, data URI, URL bên thứ ba đều bị strip).
- **Trích mentions sau sanitize**: parse `span[data-type="mention"]` lấy `data-id`,
  lọc chỉ giữ UUID hợp lệ **và** thuộc danh sách thành viên dự án
  (query `project_member` trong cùng transaction). Lưu vào `mentions[]`.
  Không tin mảng `mentions` từ client body.

Logic chuyển từ `ActivityService` sang `CommentService` mới (`task/comment/`);
`ActivityService` chỉ còn ghi entry lịch sử.

Upload ảnh trong comment:
- Tái dùng endpoint upload attachment (`POST /attachments`) với param `source=comment_image`.
- `AttachmentService.upload()` nhận `source` và lưu vào cột `source` của `task_attachments`.
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
dự án). Reaction hiện thành pill `👍 3`; pill của mình highlight (`bg-highlight`), click để
gọi PUT (thêm) hoặc DELETE (bỏ).

**Khác** — sửa inline bằng RTE tại chỗ (Lưu/Hủy); mention render pill `@Tên`
(`text-primary bg-highlight`); mọi màu có `dark:` variant; xóa có confirm dialog.

## Edge cases

- **Reply vào comment đã xóa** → backend trả 400; composer reply ẩn khi gốc đã xóa.
- **PATCH / reaction trên comment đã xóa** → backend trả **410 Gone**.
- **Soft delete — GET response**: comment đã xóa mà còn reply không bị loại khỏi danh sách,
  nhưng server trả về `{ id, deletedAt, authorId, content: null }` — không lộ nội dung cũ
  dù qua DevTools. Client render placeholder "Bình luận đã bị xóa".
- **Ẩn comment gốc đã xóa, không còn reply**: server lọc ngay trong câu query GET —
  trả về comment gốc có `deleted_at IS NOT NULL` **chỉ khi** còn ít nhất 1 reply chưa xóa
  (subquery `WHERE id IN (SELECT parent_id FROM task_comment WHERE deleted_at IS NULL)`)
  — không phó mặc client.
- **Mention người đã rời dự án** → pill vẫn render (label lưu trong content HTML);
  search chỉ gợi ý thành viên hiện tại.
- **Sanitize HTML server-side** — bắt buộc, content render `innerHTML`; whitelist khớp
  đúng preset composer, `class` bị giới hạn về `allowedClasses`.
- **Ảnh đã upload nhưng comment không gửi** → chấp nhận attachment mồ côi (`source=comment_image`) ở v1.

## Migration

Migration TypeORM thực hiện theo thứ tự:

1. **Schema**: tạo bảng `task_comment` + `task_comment_reaction` (composite PK); thêm cột
   `source varchar default 'attachment'` vào `task_attachments`.
2. **Data**: chuyển **cả hai loại** `comment_added` **và** `comment_edited` từ `task_activity`
   sang `task_comment`:
   - `content = comment` (**luôn** escape HTML — nội dung cũ là plain text từ textarea,
     người dùng hoàn toàn có thể đã gõ `<script>` hay `<b>`), sau đó bọc `<p>`.
   - `edited_at`: null với `comment_added`; bằng `updated_at` của row cũ với `comment_edited`
     (xấp xỉ tốt nhất — `task_activity` không lưu thời điểm sửa riêng).
   - `created_at`: bằng `created_at` của row cũ.
3. **Cleanup**: xóa cột `comment` khỏi các entry đã migrate trong `task_activity` (set null) —
   đảm bảo tab "Tất cả" nhất quán: mọi entry `comment_added` chỉ hiển thị "đã thêm bình luận",
   không lộ nội dung cũ.
4. **Index**: tạo `idx_task_comment_task_id ON task_comment(task_id)`;
   `idx_task_comment_parent_id ON task_comment(parent_id)`;
   composite PK của `task_comment_reaction` đã tự tạo index.

> **Lưu ý**: entry `comment_edited` trong `task_activity` **không** tạo entry mới —
> `ActivityService.editComment()` sửa trực tiếp row hiện tại và đổi `entryType` thành
> `comment_edited` (xem `activity.service.ts:190`). Vì vậy script phải migrate cả hai loại.

## Cleanup sau migration

Sau khi migration thành công và đã verify:

- Xóa hàm `addComment`, `editComment`, `deleteComment` khỏi `ActivityService`.
- Xóa `COMMENT_ENTRY_TYPES` và nhánh `case 'comments'` trong `getFilteredActivity`/`buildFilterCondition`.
- Cập nhật `CommentController` để inject `CommentService` thay vì `ActivityService`.

## Trade-offs v1

- **Không phân trang GET /comments**: trade-off chấp nhận được ở v1. Ngưỡng: khi task
  có >200 comment thì phải thêm pagination (offset hoặc cursor). Ghi nhận để làm v2.
- **Ảnh mồ côi**: upload ảnh rồi không gửi comment → chấp nhận ở v1.
- **Mention search client-side**: gọi API thành viên 1 lần khi mở editor, filter local —
  đủ dùng với team size dự án hiện tại.

## Testing

- Backend: specs cho `CommentService` — CRUD, ép thread 1 cấp, soft delete giữ reply,
  add/remove reaction (PUT/DELETE idempotent), phân quyền sửa/xóa (tác giả/SM/PO/Admin),
  sanitize + trích mentions tự động, img src chỉ cho phép URL internal.
- Frontend: specs cho component comment list — render thread, placeholder đã xóa,
  nhãn đã sửa, toggle reaction pill (PUT/DELETE), ẩn nút Trả lời ở reply
  (theo pattern spec activity-panel).
