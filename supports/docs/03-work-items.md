# Work Items (Tasks)

Work Items là đơn vị công việc cơ bản trong Agile PM. Mỗi work item (task) có thể là Epic, Story, Task hoặc Subtask tùy theo cấu trúc phân cấp của dự án.

## 1. Chế độ hiển thị

Work Items hỗ trợ 2 chế độ hiển thị, chuyển đổi qua toolbar:

### Chế độ List (Danh sách)

- Hiển thị tasks dạng danh sách phẳng
- Hỗ trợ expand/collapse để xem sub-items
- Kéo thả để sắp xếp thứ tự (reorder)
- Kéo thả giữa các nhóm trạng thái (move to state)
- Chỉ hiển thị tasks cấp cha (parentId = null)

### Chế độ Board (Kanban)

- Hiển thị dạng cột, mỗi cột là một trạng thái
- Kéo thả task giữa các cột để đổi trạng thái
- Hiển thị tất cả tasks (bao gồm sub-items)
- Phù hợp cho daily standup và theo dõi workflow

💡 **Mẹo**: Chế độ hiển thị được lưu vào URL query param `?view=list` hoặc `?view=board`, nên bạn có thể bookmark.

---

## 2. Toolbar

Thanh công cụ phía trên cung cấp các tính năng:

| Chức năng | Mô tả |
|-----------|--------|
| Tìm kiếm/Filter | Lọc tasks theo từ khóa, trạng thái, assignee, v.v. |
| Group By | Nhóm theo trạng thái, assignee, priority, module |
| Order By | Sắp xếp theo rank, ngày tạo, priority, v.v. |
| Display Properties | Tùy chỉnh thông tin hiển thị trên mỗi task card |
| Chuyển View | Toggle giữa List và Board |
| Tạo Task | Mở form tạo task mới |

---

## 3. Tạo Task mới

Có nhiều cách tạo task:

### Quick Create (Tạo nhanh)

1. Nhấn nút **"+"** trên toolbar hoặc nút **"Tạo task"** trong một nhóm trạng thái
2. Form Quick Create xuất hiện (popup, right-pane, hoặc full-page tùy cấu hình)
3. Điền thông tin:
   - **Tiêu đề** (bắt buộc)
   - **Trạng thái**: Mặc định theo nhóm bạn chọn
   - **Mô tả**: Rich text editor
   - **Attachments**: Đính kèm file
   - **Links**: Thêm liên kết URL
4. Nhấn **Tạo** để hoàn thành

#### Chế độ hiển thị Quick Create

Bạn có thể thay đổi cách hiển thị form tạo task:

| Chế độ | Mô tả |
|--------|--------|
| **Popup** | Hiển thị thanh nhỏ ở dưới cùng trang |
| **Right Pane** | Panel bên phải |
| **Full Page** | Chiếm toàn bộ vùng nội dung |

### Tạo liên tục (Create More)

Khi đánh dấu "Tạo tiếp" trong form, sau khi tạo xong một task, form sẽ tự động mở lại để bạn tạo task tiếp theo mà không cần nhấn nút lại.

---

## 4. Bulk Actions (Thao tác hàng loạt)

Khi chọn nhiều tasks (tick checkbox), thanh bulk actions xuất hiện:

| Hành động | Mô tả |
|-----------|--------|
| **Thêm vào Sprint** | Thêm tất cả tasks đã chọn vào một sprint |
| **Xóa** | Xóa hàng loạt (có xác nhận) |
| **Bỏ chọn** | Hủy selection |

### Thêm vào Sprint

1. Chọn nhiều tasks bằng checkbox
2. Nhấn **"Thêm vào Sprint"**
3. Dialog xuất hiện với dropdown chọn sprint (chỉ hiển thị sprint planning/active)
4. Chọn sprint đích → nhấn **"Thêm vào Sprint"**

---

## 5. Display Properties (Thuộc tính hiển thị)

Bạn có thể tùy chỉnh thông tin nào hiển thị trên mỗi task card trong danh sách/board:

- Assignee
- Priority
- Story Points
- Due Date
- Labels
- Module
- Sprint
- Chế độ hiển thị Task Detail (right-pane / full-page)
- Chế độ hiển thị Task Creation (popup / right-pane / full-page)

💡 **Mẹo**: Cấu hình Display Properties được lưu riêng cho từng dự án trong localStorage của trình duyệt.

---

## 6. Kéo thả (Drag & Drop)

### Trong chế độ List

- **Reorder**: Kéo task lên/xuống để thay đổi thứ tự sắp xếp
- **Move to State**: Kéo task vào nhóm trạng thái khác

### Trong chế độ Board

- Kéo task giữa các cột (trạng thái) để cập nhật workflow

---

## 7. Task ID

Mỗi task có ID dạng `{PROJECT_KEY}-{number}`, ví dụ: `APM-42`. ID này tự động tăng và không thể thay đổi.
