# UI Standards — Chuẩn giao diện toàn hệ thống

Tài liệu này định nghĩa các chuẩn hiển thị và tương tác áp dụng **thống nhất trên toàn bộ frontend** của Agile PM, bất kể epic hay feature nào. Mọi component, page, và feature mới đều phải tuân thủ các chuẩn này.

## 1. Định dạng Ngày và Thời gian

| Trường hợp | Định dạng | Ví dụ |
|-----------|----------|-------|
| Chỉ ngày | `dd/MM/yyyy` | `02/06/2026` |
| Ngày + Giờ đầy đủ | `dd/MM/yyyy HH:mm:ss` | `02/06/2026 14:30:05` |
| Giờ phút (không giây) | `HH:mm` | `14:30` |

**Quy tắc:**
- LUÔN dùng Angular pipe hoặc utility function thống nhất — không format inline bằng `toLocaleDateString` hay string manipulation
- Múi giờ: hiển thị theo giờ địa phương của trình duyệt (không hardcode UTC)
- Dùng `date-fns` hoặc Angular `DatePipe` với locale `vi-VN`

## 2. Định dạng Số

| Trường hợp | Định dạng | Ví dụ |
|-----------|----------|-------|
| Số nguyên | Phân cách phần nghìn bằng dấu phẩy | `1,000` — `10,000` — `1,000,000` |
| Số thập phân | Phân cách phần nghìn + tối đa 2 chữ số lẻ | `1,234.56` |
| Tỷ lệ / Phần trăm | Tối đa 2 chữ số thập phân | `12.50%` — không hiển thị `12.5000%` |
| Story points | Tối đa 1 chữ số thập phân | `0.5` — `1.0` — `13.0` |

**Quy tắc:**
- Dùng Angular `DecimalPipe` (`number:'1.0-2'`) cho số thập phân
- Dùng Angular `PercentPipe` hoặc `DecimalPipe` + ký hiệu `%` thủ công cho tỷ lệ
- Không hiển thị số âm trong các trường business logic (story points, capacity)

## 3. Trang danh sách (List / Table Pages)

**Mọi trang có dữ liệu dạng danh sách PHẢI có:**

### 3a. Filter đầy đủ
- Tối thiểu: text search (debounce 300ms) và/hoặc filter theo status/loại
- Khuyến nghị: date range picker nếu data có timestamp
- Filter state phải được phản ánh vào URL query params (để có thể bookmark/share link)

### 3b. Multiple Select và Bulk Actions
- `<p-table>` phải có `[selection]` binding để cho phép chọn nhiều rows
- Khi có ít nhất 1 row được chọn: hiển thị toolbar/banner với số lượng đã chọn và các bulk action buttons
- Bulk actions tối thiểu: **Delete** (nếu user có quyền)

### 3c. Confirm Dialog trước khi xóa
- Mọi thao tác xóa (đơn lẻ hoặc hàng loạt) đều phải có confirm dialog **trước** khi gửi request
- Dùng PrimeNG `ConfirmDialog` + `ConfirmationService` — không dùng `window.confirm()`
- Confirm message phải rõ ràng: ghi rõ **tên/số lượng** items sẽ bị xóa
- Đối với hành động không thể hoàn tác (xóa vĩnh viễn): yêu cầu user gõ tên/key để xác nhận

### 3d. Empty State
- Khi danh sách trống (chưa có data hoặc filter không khớp): hiển thị empty state component với icon, message mô tả, và CTA phù hợp
- Phân biệt "chưa có data nào" vs "filter không tìm thấy kết quả"

### 3e. Loading State
- Hiển thị `<p-skeleton>` trong khi đang tải data lần đầu
- Hiển thị loading overlay khi đang thực hiện action (delete, bulk delete)

## 4. Confirm Dialog — Quy tắc chung

| Mức độ nghiêm trọng | Loại confirm | Ví dụ |
|--------------------|-------------|-------|
| Thấp (có thể hoàn tác) | Confirm dialog đơn giản | Archive project |
| Cao (không thể hoàn tác) | Confirm dialog + gõ tên/key | Delete project, Delete account |
| Bulk action | Confirm dialog ghi rõ số lượng | Xóa 5 tasks đã chọn |

**Nút trong confirm dialog:**
- Cancel: `p-button severity="secondary"` (bên trái)
- Confirm xóa: `p-button severity="danger"` (bên phải)

## 5. Toast Notifications

| Loại | Severity | Khi dùng |
|------|---------|---------|
| Thành công | `success` | Sau mọi mutating operation thành công |
| Lỗi | `error` | Khi API call thất bại |
| Cảnh báo | `warn` | Khi có conflict hoặc điều kiện cần chú ý |
| Thông tin | `info` | Thông báo trung tính |

**Quy tắc:**
- Dùng PrimeNG `ToastModule` + `MessageService` — không dùng `alert()`
- Duration mặc định: 3000ms cho success, 5000ms cho error
- Position: `top-right`

## 6. Form Validation

- Hiển thị lỗi **inline** ngay dưới field bị lỗi — không dùng alert/modal
- Chỉ hiển thị lỗi sau khi field đã bị touch (onBlur) hoặc submit lần đầu
- Màu lỗi: PrimeNG `invalid` state (đường viền đỏ + text lỗi bên dưới)
- Required field: đánh dấu bằng `*` trong label

## 7. Responsive và Accessibility

- Minimum support: desktop (1280px+), tablet (768px+)
- Mobile (< 768px): sidebar collapse tự động, table chuyển sang card view nếu cần
- ARIA labels cho icon-only buttons
- Keyboard navigation: mọi interactive element phải accessible bằng Tab
