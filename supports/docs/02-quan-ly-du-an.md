# Quản lý dự án

## 1. Danh sách dự án

Trang danh sách dự án (`/projects`) là điểm bắt đầu chính của ứng dụng, hiển thị tất cả dự án mà bạn có quyền truy cập.

### Bộ lọc và tìm kiếm

Phía trên bảng danh sách có các công cụ lọc:

| Bộ lọc | Mô tả | Tùy chọn |
|--------|--------|----------|
| Tìm kiếm | Lọc theo tên dự án | Gõ tên, tự động lọc sau 300ms |
| Trạng thái | Lọc theo trạng thái dự án | Tất cả / Đang hoạt động / Đã lưu trữ |
| Quyền riêng tư | Lọc theo cấp độ truy cập | Tất cả / Public / Secret |
| Khoảng thời gian | Lọc theo ngày tạo | Chọn khoảng ngày bắt đầu – kết thúc |

💡 **Mẹo**: Trạng thái filter được lưu vào URL. Bạn có thể bookmark hoặc chia sẻ link đã lọc cho đồng nghiệp.

### Xóa dự án hàng loạt

1. Tick chọn các dự án muốn xóa trong cột checkbox
2. Nhấn nút **"Xóa hàng loạt"** xuất hiện phía trên bảng
3. Xác nhận trong dialog cảnh báo

⚠️ **Cảnh báo**: Xóa dự án là hành động vĩnh viễn, không thể hoàn tác. Toàn bộ dữ liệu (tasks, sprints, thành viên) sẽ bị xóa theo.

---

## 2. Tạo dự án mới

Truy cập: **Danh sách dự án → Nút "Tạo dự án mới"** hoặc đường dẫn `/projects/new`

### Các trường thông tin

| Trường | Bắt buộc | Mô tả |
|--------|----------|--------|
| Tên dự án | ✅ | Tên hiển thị của dự án |
| Mã dự án (Key) | ✅ | 2–5 ký tự in hoa, dùng làm prefix cho task ID |
| Mô tả | ❌ | Mô tả chi tiết, hỗ trợ rich text editor |
| Biểu tượng (Emoji) | ❌ | Icon đại diện, mặc định 🚀 |
| Quyền riêng tư | ✅ | **Secret** (mặc định) hoặc **Public** |
| Người phụ trách (Lead) | ❌ | Mặc định là người tạo |
| Múi giờ | ✅ | Mặc định Asia/Saigon |
| State template | ✅ | Mẫu trạng thái: Blank hoặc workspace template |

### Quy tắc mã dự án

- Chỉ chấp nhận chữ in hoa A-Z
- Độ dài: 2–5 ký tự
- Tự động gợi ý từ tên dự án (lấy chữ cái đầu mỗi từ)
- Kiểm tra trùng lặp tự động (debounce 500ms)
- **Không thể thay đổi** sau khi tạo

### Quyền riêng tư

| Chế độ | Mô tả |
|--------|--------|
| **Secret** | Chỉ thành viên được mời mới nhìn thấy và truy cập dự án |
| **Public** | Tất cả thành viên trong workspace đều nhìn thấy dự án |

### State Template

Khi tạo dự án, bạn chọn mẫu trạng thái cho tasks:

- **Blank**: Bắt đầu trống, tự cấu hình sau
- **Workspace Template** (nếu có): Sử dụng mẫu đã được admin tạo sẵn

---

## 3. Truy cập dự án

Sau khi chọn dự án từ danh sách hoặc dropdown sidebar, bạn sẽ được điều hướng đến **Board** (Kanban) mặc định.

Các trang có sẵn cho mỗi dự án:

| Đường dẫn | Trang | Mô tả |
|-----------|-------|--------|
| `/projects/:key/workitem` | Work Items | Danh sách/Board tất cả tasks |
| `/projects/:key/sprints` | Sprints | Quản lý sprint |
| `/projects/:key/modules` | Modules | Phân nhóm theo module |
| `/projects/:key/settings` | Cài đặt | Cấu hình dự án |

📌 **Lưu ý**: Các trang Sprints, Modules, Custom Views, Pages và Intake chỉ hiển thị khi tính năng tương ứng được bật trong **Cài đặt → Tính năng**.
