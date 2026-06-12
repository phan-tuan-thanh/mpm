# Bắt đầu nhanh

## 1. Đăng nhập

Agile PM sử dụng **Authentik** làm nhà cung cấp xác thực (Identity Provider) thông qua giao thức OAuth2/OIDC.

### Đăng nhập lần đầu

1. Truy cập ứng dụng — bạn sẽ được chuyển đến trang **Đăng nhập**
2. Nhấn nút **"Đăng nhập với Authentik"**
3. Hệ thống chuyển hướng sang trang đăng nhập Authentik
4. Nhập thông tin tài khoản Authentik của bạn
5. Sau khi xác thực thành công, bạn được chuyển về Agile PM

### Đổi tài khoản

Nếu bạn muốn đăng nhập bằng tài khoản khác:

1. Tại trang Đăng nhập, nhấn **"Đăng nhập bằng tài khoản khác"**
2. Hệ thống sẽ đăng xuất phiên Authentik hiện tại
3. Sau đó tự động bắt đầu lại quy trình đăng nhập với trang chọn tài khoản

### Xử lý lỗi đăng nhập

Nếu gặp lỗi, hệ thống sẽ hiển thị thông báo cụ thể:

| Lỗi | Nguyên nhân | Cách khắc phục |
|-----|-------------|----------------|
| Phiên đăng nhập không hợp lệ | State mismatch (CSRF) | Thử đăng nhập lại |
| Mã xác thực không hợp lệ | Code đã hết hạn | Thử đăng nhập lại |
| Lỗi từ nhà cung cấp | Authentik gặp sự cố | Chờ và thử lại sau |
| Phiên làm việc đã hết hạn | Token hết hạn | Đăng nhập lại |

---

## 2. Tổng quan giao diện

Sau khi đăng nhập, bạn sẽ thấy giao diện chính gồm các phần:

```
┌─────────────────────────────────────────────────┐
│              Header (Top Bar)                     │
├────────┬────────────────────────────────────────┤
│        │                                          │
│ Side-  │         Nội dung chính                   │
│  bar   │         (Main Content)                   │
│        │                                          │
│        │                                          │
└────────┴────────────────────────────────────────┘
```

### Sidebar (Thanh bên trái)

Sidebar là trung tâm điều hướng của ứng dụng:

- **Chuyển dự án**: Dropdown ở đầu sidebar cho phép chọn nhanh dự án làm việc
- **Dự án**: Quay về danh sách tất cả dự án
- **Work Items**: Xem danh sách tasks của dự án đang chọn
- **Sprints**: Quản lý sprint (nếu tính năng được bật)
- **Modules**: Phân nhóm tasks theo module (nếu được bật)
- **Custom Views / Pages / Intake**: Các tính năng mở rộng (tùy cấu hình)
- **Cài đặt**: Cấu hình dự án (với submenu chi tiết)
- **Quản trị**: Chỉ hiển thị với tài khoản Admin

💡 **Mẹo**: Sidebar có thể thu gọn (chỉ hiển thị icon) khi bạn cần nhiều không gian làm việc hơn.

### Chuyển đổi dự án nhanh

1. Nhấn vào dropdown tên dự án ở đầu sidebar
2. Gõ tên hoặc mã dự án vào ô tìm kiếm
3. Nhấn vào dự án muốn chuyển — hệ thống tự động điều hướng đến board của dự án đó

---

## 3. Tạo dự án đầu tiên

1. Từ trang **Danh sách dự án**, nhấn nút **"Tạo dự án mới"**
2. Điền thông tin:
   - **Tên dự án** (bắt buộc): Ví dụ "Agile PM Mobile App"
   - **Mã dự án** (bắt buộc): 2–5 ký tự viết hoa, ví dụ "APM". Hệ thống tự gợi ý từ tên
   - **Mô tả**: Mô tả ngắn gọn về dự án (hỗ trợ rich text)
   - **Biểu tượng**: Chọn emoji đại diện cho dự án
   - **Quyền riêng tư**: Public (mọi người trong workspace) hoặc Secret (chỉ thành viên)
   - **Người phụ trách**: Mặc định là bạn
   - **Múi giờ**: Mặc định Asia/Saigon
   - **State template**: Mẫu trạng thái công việc (Blank hoặc template từ workspace)
3. Nhấn **"Tạo dự án"**

📌 **Lưu ý**: Mã dự án (key) không thể thay đổi sau khi tạo. Hãy chọn cẩn thận.

Sau khi tạo thành công, bạn được chuyển đến board của dự án mới. Hãy tiếp tục tạo tasks đầu tiên!

---

## 4. Luồng làm việc cơ bản

```
Tạo dự án → Mời thành viên → Tạo Tasks → Tổ chức Sprint → Theo dõi tiến độ
```

1. **Tạo dự án** mới hoặc chọn dự án có sẵn
2. **Thêm thành viên** vào dự án (Cài đặt → Thành viên)
3. **Tạo Work Items** (tasks) và phân loại theo trạng thái
4. **Tạo Sprint** và kéo tasks vào sprint (nếu dùng Scrum)
5. **Theo dõi** tiến độ qua Dashboard, Burndown chart và Velocity report
