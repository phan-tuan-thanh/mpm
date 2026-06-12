# Sprints

Sprint (hay Cycle) là chu kỳ phát triển ngắn hạn giúp đội nhóm lập kế hoạch và theo dõi tiến độ công việc.

📌 **Lưu ý**: Tính năng Sprint cần được bật trong **Cài đặt → Tính năng**. Nếu không thấy menu Sprint trên sidebar, hãy kiểm tra cấu hình.

## 1. Thuật ngữ tùy chỉnh

Dự án có thể gọi Sprint bằng tên khác:

| Tên | Mô tả |
|-----|--------|
| **Sprint** | Thuật ngữ Scrum truyền thống |
| **Cycle** | Thuật ngữ trung lập hơn |

Thay đổi tại: **Cài đặt → Cấu hình chung → Cấu hình Sprint → Nhận diện**

---

## 2. Danh sách Sprint

Truy cập: **Sidebar → Sprints → Danh sách**

### Tìm kiếm và lọc

| Bộ lọc | Mô tả |
|--------|--------|
| Tìm kiếm | Lọc theo tên sprint |
| Trạng thái | Tất cả / Đang lên kế hoạch / Đang chạy / Đã hoàn thành |

### Thông tin mỗi sprint card

- Tên sprint + badge trạng thái
- Story Points cam kết
- Mục tiêu (goal)
- Khoảng thời gian (ngày bắt đầu → kết thúc)
- Nút hành động (Bắt đầu / Hoàn thành / Xóa)

### Chọn nhiều sprint

- Tick checkbox trên mỗi sprint card
- Nút **"Xóa đã chọn"** xuất hiện khi có selection

---

## 3. Tạo Sprint mới

1. Nhấn nút **"Tạo Sprint"** trên toolbar
2. Điền thông tin:
   - **Tên Sprint** (bắt buộc): Ví dụ "Sprint 5 - User Auth"
   - **Mục tiêu**: Mô tả mục tiêu sprint (rich text)
   - **Ngày bắt đầu**: Date picker
   - **Ngày kết thúc**: Date picker (tự gợi ý dựa trên duration mặc định)
3. Nhấn **"Tạo Sprint"**

Sprint mới được tạo với trạng thái **Planning** (Đang lên kế hoạch).

---

## 4. Vòng đời Sprint

```
Planning ──→ Active ──→ Completed
(Lên kế hoạch)  (Đang chạy)  (Hoàn thành)
```

### Bắt đầu Sprint

1. Tại sprint đang ở trạng thái **Planning**, nhấn nút **"Bắt đầu"**
2. Dialog xác nhận xuất hiện
3. Nhấn **"Bắt đầu"** để chuyển sprint sang trạng thái **Active**

📌 **Lưu ý**: Số lượng sprint có thể chạy đồng thời được giới hạn bởi cấu hình (mặc định: 1).

### Hoàn thành Sprint

1. Tại sprint đang **Active**, nhấn nút **"Hoàn thành"**
2. Chọn cách xử lý tasks chưa hoàn thành:
   - **Chuyển về Backlog**: Tasks quay lại backlog chung
   - **Chuyển sang sprint khác**: Chọn sprint đang planning để nhận tasks
3. Nhấn **"Xác nhận hoàn thành"**

---

## 5. Sprint Dashboard

Truy cập: **Sidebar → Sprints → Dashboard**

Dashboard cung cấp cái nhìn tổng quan về sprint đang chạy:

### Chọn Sprint

- Dropdown ở toolbar cho phép chọn sprint active để xem
- Toggle **Story Points / Số task** để đổi đơn vị đo

### Thẻ thống kê (Stats Cards)

| Thẻ | Nội dung |
|-----|----------|
| Tasks | Số task hoàn thành / tổng |
| Story Points | SP hoàn thành / tổng |
| Tiến độ | Phần trăm completion + progress bar |
| Thời gian còn lại | Số ngày còn lại đến ngày kết thúc |

### Burndown Chart

Biểu đồ đường thể hiện:
- **Đường Ideal** (nét đứt): Tiến độ lý tưởng nếu burn đều mỗi ngày
- **Đường Thực tế** (nét liền): Số SP/task còn lại thực tế theo từng ngày

Có thể toggle giữa hiển thị theo **Story Points** hoặc **Số task**.

---

## 6. Velocity Report

Truy cập: **Sidebar → Sprints → Velocity**

Báo cáo hiệu suất qua các sprint đã hoàn thành:

### Bar Chart

- Cột **Committed SP**: Tổng SP cam kết khi bắt đầu sprint
- Cột **Completed SP**: Tổng SP thực tế hoàn thành

### Thẻ tóm tắt

| Thẻ | Nội dung |
|-----|----------|
| Tổng sprint | Số sprint đã hoàn thành |
| Avg Velocity | SP trung bình hoàn thành mỗi sprint |
| Tổng SP hoàn thành | Tổng tất cả SP đã hoàn thành |

💡 **Mẹo**: Velocity report giúp team dự đoán khả năng hoàn thành sprint tiếp theo dựa trên dữ liệu lịch sử.

---

## 7. Cấu hình Sprint

Truy cập: **Cài đặt → Cấu hình chung → Cấu hình Sprint** hoặc **Sidebar → Sprints → Settings**

### Nhận diện

| Cấu hình | Mô tả |
|-----------|--------|
| Terminology | Gọi là "Sprint" hay "Cycle" |
| Biểu tượng | Icon hiển thị trên sidebar và badge |

### Vận hành

| Cấu hình | Mô tả | Giá trị |
|-----------|--------|---------|
| Số sprint active tối đa | Giới hạn sprint chạy đồng thời | 1–10 |
| Thời lượng mặc định | Dùng gợi ý ngày kết thúc khi tạo sprint | 1–12 tuần |

### Capacity

| Chế độ | Mô tả |
|--------|--------|
| **Tổng sprint** | Dùng targetCapacity chung của sprint |
| **Theo thành viên** | Tổng capacity từng member |

---

## 8. Thêm Tasks vào Sprint

Có 2 cách:

### Từ Work Items (Bulk)

1. Mở Work Items, chọn nhiều tasks
2. Nhấn **"Thêm vào Sprint"** trên thanh bulk actions
3. Chọn sprint đích → xác nhận

### Từ Task Detail

1. Mở chi tiết task
2. Trong thuộc tính bên phải, chọn Sprint từ dropdown
