# QUY ĐỊNH THỐNG NHẤT GIAO DIỆN FORM CHI TIẾT VÀ TẠO MỚI TASK

Tài liệu này quy định cấu trúc hiển thị bắt buộc đối với biểu mẫu Xem/Chỉnh sửa chi tiết Task (`task-detail-panel`) và biểu mẫu Tạo mới Task (`quick-create`) trên toàn bộ hệ thống MPM, áp dụng đồng bộ ở cả 3 chế độ hiển thị:
1. **Popup Mode (Dialog)**
2. **Right Pane Mode (Drawer)**
3. **Full-page Mode (Trang toàn màn hình)**

---

## 1. Nguyên tắc thiết kế cốt lõi

*   **Bố cục Single-column (Một cột duy nhất):** 
    Tất cả các chế độ hiển thị phải tuân thủ bố cục một cột duy nhất chứa toàn bộ thông tin chi tiết và thuộc tính. Không sử dụng cấu trúc Sidebar bên phải riêng biệt ở bất kỳ chế độ nào (bao gồm cả Full-page Mode).
*   **Chiều rộng ở Full-page Mode:**
    Khi hiển thị ở chế độ Full-page Mode, phần nội dung form bắt buộc phải được hiển thị toàn bộ chiều rộng màn hình (Full-width) thay vì giới hạn chiều rộng, giúp tối ưu không gian làm việc và hiển thị đầy đủ thông tin trên màn hình lớn.
*   **Thống nhất thiết kế thuộc tính (Metadata Row):**
    Các trường thông tin/thuộc tính bổ sung của Task (State, Priority, Assignees, Labels, Parent, Dates, Estimate, Modules) phải được tổ chức thành **Thanh thuộc tính dạng 2 dòng cố định** đặt ngay dưới tiêu đề và phần soạn thảo mô tả, trên phần chân trang (Footer).

---

## 2. Cấu trúc Layout chi tiết (Từ trên xuống dưới)

1.  **Header Bar:**
    *   Chứa dropdown lựa chọn Task Type bên trái dưới dạng Pill button.
    *   Chứa các nút chuyển đổi chế độ xem (Drawer, Popup, Full Page) và nút đóng/quay lại ở bên phải.
    *   *Lưu ý:* Tuyệt đối không hiển thị nút ẩn/hiện sidebar ở chế độ Full-page.
2.  **Title Input:**
    *   Input tiêu đề lớn, không viền, không box-shadow để tập trung trải nghiệm viết.
3.  **Content Area (Scrollable):**
    *   **Rich Text Editor:** Soạn thảo mô tả chi tiết của Task.
    *   **Attachments & Links:** Danh sách file đính kèm và liên kết liên quan (chỉ hiển thị khi đã tồn tại bản ghi nháp hoặc bản ghi chính thức).
    *   **Sub-Items Section:** Danh sách và cây công việc con.
4.  **Metadata Block (2 dòng):**
    *   **Dòng 1 (Thuộc tính cốt lõi):** Trạng thái (State) -> Độ ưu tiên (Priority) -> Người thực hiện (Assignees).
    *   **Dòng 2 (Thuộc tính bổ trợ):** Nhãn (Labels) -> Công việc cha (Parent) -> Ngày bắt đầu (Start Date) -> Ngày hết hạn (Due Date) -> Điểm ước lượng (Estimate) -> Phân hệ (Modules).
    *   Mỗi thuộc tính được hiển thị dưới dạng Pill button (`meta-pill`). Nhấp vào sẽ mở ra Popover nhỏ tương ứng tại chỗ để chọn nhanh giá trị.
5.  **Footer Bar:**
    *   Chứa nút Lưu (Submit), Hủy (Cancel).
    *   Nút bật tắt "Tạo tiếp" (Create More) và nút mở rộng nhanh sang Full-page.
