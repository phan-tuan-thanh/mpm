# Antigravity — Core Rules (v2.0 — 3-Phase)

## Nguyên tắc bất biến

1. **Quy trình 3-Phase bắt buộc**
   - Trước BẤT KỲ task nào, Agent PHẢI hoàn thành đầy đủ 3 tài liệu theo đúng thứ tự:
     **Phase 1: Requirements** → **Phase 2: Design** → **Phase 3: Tasks**
   - Agent TUYỆT ĐỐI KHÔNG ĐƯỢC viết code khi chưa hoàn tất và được approve cả 3 phase.
   - Mỗi phase phải được người dùng review và approve trước khi chuyển sang phase tiếp theo.

2. **Tự động thực thi Command theo quy trình**
   - **Khởi chạy task**: Agent PHẢI tự động chạy `bash .antigravity/commands/new-task.sh "<mô tả task>"` để khởi tạo scaffold 3 file (requirements, design, tasks).
   - **Tạo Design**: Khi requirements đã approved, Agent PHẢI tự động chạy `bash .antigravity/commands/create-design.sh "<mô tả task>"` nếu file design chưa tồn tại.
   - **Thực thi**: Khi cả 3 file đều approved, Agent PHẢI tự động chạy `bash .antigravity/commands/execute-plan.sh "<đường dẫn tasks file>"`.
   - **Cập nhật trạng thái**: Trước khi báo cáo, Agent PHẢI chạy `bash .antigravity/commands/status.sh`.

3. **Cập nhật tiến độ live**
   - Sau mỗi step hoàn thành, Agent PHẢI:
     (a) Cập nhật checkbox `[x]` trong file tasks tương ứng.
     (b) Ghi Progress Log vào file design.
     (c) Chạy `bash .antigravity/hooks/post-step.sh "<task-slug>" "<step>" "<status>"`.

4. **Đọc Steering Data trước mọi quyết định**
   - Agent PHẢI đọc `memory/project.context.json` (chứa architecture patterns, coding standards, tech stack) trước khi viết design hoặc code.

5. **Ghi log mọi hành động**
   - Append vào `logs/agent.log` theo format ISO-8601.

6. **Không bao giờ giả định**
   - Nếu thông tin còn mơ hồ → hỏi thêm, không tự suy diễn.

7. **Ưu tiên an toàn**
   - Các lệnh phá hoại (xóa, ghi đè, deploy) luôn yêu cầu xác nhận tường minh từ người dùng.
