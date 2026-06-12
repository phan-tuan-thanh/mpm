# Cài đặt dự án

Truy cập: **Sidebar → Cài đặt** hoặc đường dẫn `/projects/:key/settings`

Cài đặt dự án được chia thành 4 nhóm chính, truy cập qua submenu trên sidebar.

---

## 1. Cấu hình chung

Nhóm này chứa nhiều tab con:

### Tab Cấu hình chung (General Info)

Chỉnh sửa thông tin cơ bản của dự án:

| Trường | Mô tả | Có thể sửa? |
|--------|--------|-------------|
| Tên dự án | Tên hiển thị | ✅ |
| Mã dự án | Identifier (prefix task ID) | ❌ Không thể đổi |
| Mô tả | Rich text mô tả dự án | ✅ |
| Biểu tượng | Emoji icon | ✅ |
| Quyền riêng tư | Public / Secret | ✅ |
| Múi giờ | Timezone của dự án | ✅ |
| Lead | Người phụ trách | ✅ |

### Tab Cấu hình Sprint

Xem chi tiết tại [Tài liệu Sprint → Cấu hình Sprint](./05-sprints.md#7-cấu-hình-sprint).

### Tab Trạng thái (States)

Quản lý các trạng thái workflow cho tasks:

- Xem danh sách states hiện tại (được nhóm theo category)
- Thêm state mới
- Đổi tên state
- Thay đổi thứ tự (drag & drop)
- Xóa state (chỉ khi không có task nào đang dùng)

#### State Categories

| Category | Mô tả | Ví dụ |
|----------|--------|-------|
| **Backlog** | Chưa bắt đầu | Todo, Planned |
| **Started** | Đang thực hiện | In Progress, In Review |
| **Completed** | Đã xong | Done, Deployed |
| **Cancelled** | Đã hủy | Won't Do |

### Tab Mức ưu tiên (Priorities)

Cấu hình các mức ưu tiên cho tasks trong dự án:

- Thêm/sửa/xóa mức ưu tiên
- Tùy chỉnh tên, icon và màu
- Mặc định: Urgent, High, Medium, Low, None

### Tab Labels

Quản lý nhãn (tags) cho tasks:

- Tạo label mới với tên và màu
- Sửa label hiện có
- Xóa label (sẽ gỡ khỏi tất cả tasks đang dùng)

### Tab Ước lượng (Estimates)

Cấu hình cách ước lượng effort:

- Chọn thang đo: Story Points, T-shirt sizes, Hours
- Tùy chỉnh danh sách giá trị có sẵn

---

## 2. Thành viên (Members)

Truy cập: **Cài đặt → Thành viên** (submenu sidebar)

### Danh sách thành viên

Bảng hiển thị:
- Avatar, họ tên, email
- Vai trò trong dự án
- Ngày tham gia
- Nút thao tác (đổi vai trò, xóa)

### Tìm kiếm

Ô tìm kiếm ở đầu bảng lọc theo tên hoặc email.

### Thêm thành viên

🔒 **Quyền**: Chỉ Scrum Master hoặc Admin

1. Nhấn **"Thêm thành viên"**
2. Nhập email của người muốn mời
3. Chọn vai trò
4. Nhấn **"Thêm"**

📌 **Lưu ý**: Người được mời phải đã có tài khoản trong hệ thống (đã đăng nhập qua Authentik ít nhất 1 lần).

### Vai trò dự án (Project Role)

| Vai trò | Quyền |
|---------|-------|
| **Scrum Master** | Toàn quyền cấu hình dự án, quản lý thành viên |
| **Product Owner** | Quản lý backlog, ưu tiên tasks |
| **Developer** | Tạo/sửa tasks, cập nhật trạng thái |
| **QA Engineer** | Tạo/sửa tasks, log bugs |
| **Stakeholder** | Chỉ xem, không chỉnh sửa |

### Đổi vai trò

🔒 **Quyền**: Chỉ Scrum Master hoặc Admin

1. Nhấn dropdown vai trò bên cạnh tên thành viên
2. Chọn vai trò mới
3. Nếu hạ quyền Scrum Master, dialog cảnh báo sẽ xuất hiện

### Xóa thành viên

🔒 **Quyền**: Chỉ Scrum Master hoặc Admin

- Nhấn nút 🗑️ → dialog xác nhận → xóa

📌 **Lưu ý**: Bạn không thể tự xóa hoặc đổi vai trò của chính mình.

---

## 3. Tính năng (Features)

Truy cập: **Cài đặt → Tính năng** (submenu sidebar)

🔒 **Quyền**: Chỉ Scrum Master hoặc Admin mới có thể bật/tắt

Bảng toggle cho các tính năng tùy chọn:

| Tính năng | Mô tả | Mặc định |
|-----------|--------|----------|
| **Sprints/Cycles** | Quản lý sprint, dashboard, velocity | Bật |
| **Modules** | Nhóm tasks theo phân hệ | Bật |
| **Views tùy chỉnh** | Lưu bộ lọc thành view | Bật |
| **Pages (Tài liệu)** | Wiki/documentation nội bộ | Bật |
| **Intake (Yêu cầu)** | Hòm thư tiếp nhận yêu cầu | Tắt |
| **Time Tracking** | Ghi nhận giờ làm việc | Tắt |

Khi tắt một tính năng:
- Menu tương ứng biến mất khỏi sidebar
- Route bị chặn bởi guard (không thể truy cập trực tiếp bằng URL)
- Dữ liệu cũ vẫn được giữ lại, bật lại sẽ hiện lại

---

## 4. Danger Zone

Truy cập: **Cài đặt → Danger Zone** (submenu sidebar)

🔒 **Quyền**: Chỉ Scrum Master hoặc Admin

### Lưu trữ dự án (Archive)

- Chuyển dự án sang chế độ **chỉ đọc**
- Dữ liệu được giữ nguyên nhưng không thể chỉnh sửa
- Có thể khôi phục sau

### Xóa vĩnh viễn dự án

⚠️ **Hành động này KHÔNG THỂ HOÀN TÁC**

1. Nhấn **"Xóa dự án"**
2. Dialog xác nhận xuất hiện với cảnh báo đỏ
3. Phải nhập chính xác **mã dự án** (ví dụ: `APM`) để xác nhận
4. Nhấn **"Tôi hiểu, hãy xóa dự án này"**

Sau khi xóa:
- Toàn bộ dữ liệu bị xóa: tasks, sprints, thành viên, cấu hình
- Được chuyển về trang danh sách dự án
- Không thể khôi phục bằng bất kỳ cách nào
