# Modules

Module giúp bạn nhóm các tasks liên quan thành các phân hệ logic, ví dụ: Authentication, Payment, Notification, Dashboard...

📌 **Lưu ý**: Tính năng Modules cần được bật trong **Cài đặt → Tính năng**.

## 1. Tổng quan

Truy cập: **Sidebar → Modules**

Trang Modules hiển thị tất cả modules theo 2 phạm vi:

| Phạm vi | Mô tả | Quyền chỉnh sửa |
|---------|--------|-----------------|
| **Workspace** | Modules dùng chung cho toàn workspace | 🔒 Chỉ Admin |
| **Project** | Modules riêng của dự án hiện tại | Scrum Master / Admin |

---

## 2. Tạo Module

1. Nhấn nút **"Tạo Module"** trên toolbar
2. Điền thông tin:
   - **Tên module** (bắt buộc)
   - **Mô tả**: Giải thích mục đích module
   - **Trạng thái**: Trạng thái vòng đời ban đầu
   - **Ngày bắt đầu** (tùy chọn)
   - **Ngày kết thúc** (tùy chọn)
3. Nhấn **"Lưu"**

---

## 3. Vòng đời Module

Mỗi module có trạng thái (lifecycle status) riêng:

```
Backlog → In Progress → Paused → Completed → Cancelled
```

| Trạng thái | Mô tả |
|------------|--------|
| **Backlog** | Module đang trong kế hoạch, chưa bắt đầu |
| **In Progress** | Đang thực hiện |
| **Paused** | Tạm dừng |
| **Completed** | Đã hoàn thành |
| **Cancelled** | Đã hủy |

📌 **Lưu ý**: Chỉ một số transition trạng thái là hợp lệ. Ví dụ: không thể chuyển trực tiếp từ Backlog sang Completed. Hệ thống sẽ báo lỗi nếu transition không hợp lệ.

---

## 4. Lọc Module theo trạng thái

Toolbar có bộ lọc trạng thái cho phép:
- Chọn một hoặc nhiều trạng thái để hiển thị
- Nút **"Xóa filter"** để reset

---

## 5. Chỉnh sửa Module

1. Nhấn vào nút edit trên module card
2. Form chỉnh sửa mở ra với các trường:
   - Tên, mô tả, trạng thái, ngày bắt đầu/kết thúc
3. Lưu thay đổi

### Xử lý xung đột

Nếu 2 người cùng sửa module, hệ thống sẽ:
- Hiển thị cảnh báo **"Xung đột cập nhật"**
- Tự động reload dữ liệu mới nhất

---

## 6. Xóa Module

1. Nhấn nút menu (⋮) trên module card
2. Dialog xác nhận xuất hiện
3. Xác nhận xóa

⚠️ **Cảnh báo**: Khi xóa module, tất cả liên kết giữa tasks và module sẽ bị gỡ (tasks không bị xóa, chỉ mất liên kết).

---

## 7. Gán Task vào Module

Từ **Task Detail Panel**:
1. Mở chi tiết task
2. Trong phần Properties (bên phải), tìm trường **Module**
3. Chọn module từ dropdown

Một task chỉ thuộc về 1 module tại một thời điểm.

---

## 8. Module Card

Mỗi module card hiển thị:
- Tên module
- Trạng thái (badge màu)
- Mô tả ngắn
- Số tasks đã gán
- Progress bar (% tasks hoàn thành)
- Khoảng thời gian (nếu có)
