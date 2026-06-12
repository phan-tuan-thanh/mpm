# Quản trị hệ thống

🔒 **Toàn bộ trang này chỉ dành cho tài khoản có System Role = Admin**

Truy cập: **Sidebar → Quản trị** hoặc đường dẫn `/admin/users`

---

## 1. Tổng quan

Trang quản trị cho phép Admin quản lý toàn bộ tài khoản người dùng trong hệ thống:

- Xem danh sách tất cả users
- Thay đổi System Role (Admin / User)
- Khóa/Kích hoạt tài khoản

### Thống kê nhanh

Góc phải toolbar hiển thị 3 chỉ số:
- **Tổng**: Số lượng tài khoản
- **Hoạt động**: Số tài khoản đang active
- **Bị khóa**: Số tài khoản đã disabled

---

## 2. Tìm kiếm

Ô tìm kiếm lọc theo **tên hiển thị** hoặc **email** (client-side, tức thì).

---

## 3. Bảng danh sách Users

| Cột | Nội dung |
|-----|----------|
| Avatar | Chữ cái đầu tên |
| Họ tên | Tên hiển thị + badge "Bạn" nếu là chính mình |
| Email | Email đăng nhập |
| System Role | Dropdown chọn Admin/User |
| Trạng thái | Active (xanh) hoặc Disabled (đỏ) |
| Ngày tạo | Định dạng dd/MM/yyyy HH:mm |
| Hành động | Nút Khóa/Kích hoạt |

---

## 4. System Role

Có 2 vai trò hệ thống:

| Role | Quyền |
|------|-------|
| **Admin** | Toàn quyền: truy cập trang quản trị, quản lý users, bypass quyền dự án |
| **User** | Quyền thông thường, phụ thuộc vào Project Role trong từng dự án |

### Thay đổi Role

1. Nhấn dropdown **System Role** trên row user muốn đổi
2. Chọn role mới
3. Nếu **hạ quyền Admin → User**: dialog cảnh báo xuất hiện, xác nhận để tiếp tục

### Bảo vệ Admin cuối cùng

Hệ thống không cho phép:
- Hạ quyền Admin cuối cùng đang active
- Khóa tài khoản Admin cuối cùng đang active

Điều này đảm bảo luôn có ít nhất 1 Admin có thể truy cập hệ thống.

---

## 5. Khóa / Kích hoạt tài khoản

### Khóa tài khoản (Disable)

1. Nhấn nút **"Khóa"** (icon 🔒) trên row user
2. Dialog xác nhận xuất hiện:
   > "Bạn có chắc muốn vô hiệu hóa tài khoản [Tên]? Họ sẽ bị đăng xuất ngay lập tức khỏi mọi thiết bị và không thể tiếp tục đăng nhập."
3. Nhấn **"Vô hiệu hóa"** để xác nhận

Hậu quả:
- User bị đăng xuất ngay lập tức (token bị vô hiệu)
- Không thể đăng nhập lại cho đến khi được kích hoạt

### Kích hoạt lại (Enable)

1. Nhấn nút **"Kích hoạt"** (icon 🔓) trên row user disabled
2. Dialog xác nhận
3. Nhấn **"Kích hoạt"**

Sau khi kích hoạt, user có thể đăng nhập bình thường.

---

## 6. Quy tắc quan trọng

| Quy tắc | Mô tả |
|---------|--------|
| Không tự thao tác | Admin không thể đổi role hoặc khóa chính mình |
| Bảo vệ admin cuối | Không thể để hệ thống mất toàn bộ admin |
| Đăng xuất tức thì | Khóa tài khoản có hiệu lực ngay, không cần chờ token hết hạn |

---

## 7. Ai có thể trở thành Admin?

- Tài khoản đầu tiên đăng nhập vào hệ thống thường được set Admin tự động
- Các Admin hiện tại có thể nâng quyền User thường thành Admin
- Không giới hạn số lượng Admin
