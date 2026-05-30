# Task Execution Workflow

## Quy trình /start-task

Khi thực hiện bất kỳ task nào từ spec, PHẢI tuân thủ quy trình sau:

### Bước 1: Tạo Plan File
- Đường dẫn: `.kiro/plans/YYYY-MM-DD_<slug-task>.md`
- Nội dung:
  - Task ID và tên
  - Mô tả ngắn gọn approach
  - Danh sách file sẽ tạo/sửa
  - Acceptance criteria (từ requirements)
  - Dependencies (task nào cần hoàn thành trước)

### Bước 2: Kiểm tra Dependencies
- Đọc Task Dependency Graph trong tasks.md
- Nếu task phụ thuộc task khác chưa done → thông báo user, không tiếp tục

### Bước 3: Implement
- Tạo/sửa code theo plan
- Tuân thủ coding standards (xem coding-standards.md)
- Tuân thủ project structure (xem structure.md)

### Bước 4: Test
- Chạy unit test liên quan
- Chạy property test nếu task có (marked với `*`)
- Fix lỗi nếu test fail

### Bước 5: Báo cáo
- Tóm tắt: file đã tạo/sửa, test results
- Đánh dấu task là done trong tasks.md
- Gợi ý task tiếp theo có thể thực hiện

## Lưu ý
- KHÔNG được skip bước tạo plan
- KHÔNG được implement nhiều task cùng lúc (trừ khi cùng wave trong dependency graph)
- Mỗi task phải có commit riêng với message format: `feat(auth): <mô tả task>`
