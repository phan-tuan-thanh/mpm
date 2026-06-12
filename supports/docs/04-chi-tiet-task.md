# Chi tiết Task

Khi nhấn vào một task trong danh sách hoặc board, panel chi tiết sẽ mở ra cho phép bạn xem và chỉnh sửa đầy đủ thông tin.

## 1. Chế độ hiển thị

Task Detail Panel có 2 chế độ:

| Chế độ | Mô tả |
|--------|--------|
| **Right Pane** | Panel trượt từ bên phải, không che toàn bộ nội dung |
| **Full Page** | Chiếm toàn bộ vùng nội dung, giống trang riêng |

Bạn có thể chuyển đổi giữa 2 chế độ bằng nút toggle trên header của panel.

---

## 2. Tiêu đề (Title)

- Nhấn vào tiêu đề task để chỉnh sửa trực tiếp (inline edit)
- Tự động lưu khi bạn nhấn Enter hoặc click ra ngoài
- Hiển thị Task ID (ví dụ: `APM-42`) bên cạnh tiêu đề

---

## 3. Mô tả (Description)

- Sử dụng **Rich Text Editor** với các tính năng:
  - Heading (H1–H3)
  - Bold, Italic, Strikethrough
  - Bullet list, Numbered list
  - Code block
  - Link
  - Quote
- Tự động lưu khi mất focus

---

## 4. Thuộc tính (Properties)

Panel bên phải hiển thị metadata của task:

| Thuộc tính | Mô tả |
|------------|--------|
| **Trạng thái** | Workflow state hiện tại (có thể thay đổi bằng dropdown) |
| **Mức ưu tiên** | Priority theo cấu hình dự án (Urgent, High, Medium, Low, None) |
| **Người thực hiện** | Assignee — chọn từ danh sách thành viên dự án |
| **Story Points** | Điểm ước lượng (hỗ trợ số thập phân 1 chữ số) |
| **Ngày bắt đầu** | Start date |
| **Ngày đến hạn** | Due date |
| **Labels** | Nhãn phân loại (có thể gắn nhiều) |
| **Module** | Module mà task thuộc về |
| **Sprint** | Sprint đang chứa task |
| **Parent task** | Task cha (nếu là sub-item) |

---

## 5. Sub-Items (Công việc con)

Mỗi task có thể chứa nhiều sub-items, tạo thành cấu trúc phân cấp:

```
Epic
  └── Story
        └── Task
              └── Subtask
```

### Tạo Sub-Item

1. Trong panel chi tiết, cuộn đến phần **Sub-Items**
2. Nhấn nút **"Thêm sub-item"**
3. Nhập tiêu đề và các thông tin cần thiết
4. Sub-item mới được tạo với parent là task hiện tại

### Quản lý Sub-Items

- Tick checkbox để đánh dấu hoàn thành
- Nhấn vào sub-item để mở chi tiết của nó
- Thanh progress hiển thị tỷ lệ hoàn thành của tất cả sub-items

---

## 6. Attachments (File đính kèm)

### Thêm file đính kèm

1. Trong phần **Attachments**, nhấn nút upload hoặc kéo thả file
2. File được upload lên server và liên kết với task
3. Hiển thị tên file, kích thước và ngày upload

### Quản lý

- Nhấn vào tên file để tải về
- Nút xóa (🗑️) để gỡ file đính kèm

---

## 7. Links (Liên kết)

Thêm các URL liên quan đến task (tài liệu thiết kế, Figma, trang web tham khảo...):

1. Nhấn **"Thêm link"**
2. Nhập URL và tiêu đề (tùy chọn)
3. Link hiển thị dạng clickable

---

## 8. Activity Log (Nhật ký hoạt động)

Phần Activity hiển thị lịch sử thay đổi và bình luận:

### Loại activity

| Loại | Mô tả |
|------|--------|
| **Comment** | Bình luận của thành viên |
| **Change** | Thay đổi thuộc tính (trạng thái, assignee, priority...) |
| **Attachment** | Thêm/xóa file đính kèm |

### Bộ lọc Activity

Bạn có thể lọc theo loại:
- **Tất cả**: Hiển thị mọi hoạt động
- **Bình luận**: Chỉ hiển thị comments
- **Thay đổi**: Chỉ hiển thị change log

### Thêm bình luận

1. Gõ nội dung vào ô comment ở cuối phần Activity
2. Hỗ trợ rich text (bold, italic, code, link)
3. Nhấn **Gửi** hoặc Ctrl+Enter

---

## 9. Phím tắt

| Phím | Hành động |
|------|-----------|
| `Esc` | Đóng panel chi tiết |
| `Ctrl + Enter` | Gửi comment |
