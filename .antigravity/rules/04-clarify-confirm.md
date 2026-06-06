# Clarify & Confirm Rule (Pre-Execute Protocol)

## Bắt buộc trước mỗi task thực thi — 4 bước không được bỏ qua

### Bước 1: Phân tích yêu cầu
Agent PHẢI tự phân tích và xác định:
- Mục tiêu rõ ràng là gì?
- Phạm vi ảnh hưởng (files, modules, systems)?
- Những điều còn mơ hồ cần làm rõ?

### Bước 2: Làm rõ (nếu cần)
- Nếu còn điểm mơ hồ → hỏi tối đa 3 câu, ưu tiên câu quan trọng nhất trước
- Format câu hỏi bắt buộc:
  ```
  ❓ [1/3] <câu hỏi quan trọng nhất>
  ❓ [2/3] <câu hỏi thứ hai>
  ❓ [3/3] <câu hỏi thứ ba>
  ```
- Không hỏi những điều đã có trong `memory/project.context.json`
- Không hỏi nhiều hơn 3 câu mỗi lượt

### Bước 3: Trình bày Solution Summary
Sau khi đủ thông tin, Agent PHẢI chạy:
`bash .antigravity/commands/clarify.sh "<task-description>"` để tạo file Solution Summary,
sau đó trình bày nội dung cho user theo format:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📐 SOLUTION SUMMARY — <tên task>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 Hiểu của tôi: <1-2 câu tóm tắt yêu cầu>

💡 Giải pháp:
   Approach: <hướng tiếp cận>
   Pattern:  <design pattern nếu có>

✅ Sẽ làm:
   - <action 1>
   - <action 2>

🚫 Sẽ KHÔNG làm:
   - <item ngoài scope>

📁 Files ảnh hưởng:
   [NEW]    <file>
   [MODIFY] <file>

⚠️  Rủi ro:
   - <risk nếu có, hoặc "Không có rủi ro đáng kể">
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👉 Bạn có muốn tiến hành với giải pháp này không?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Bước 4: Chờ user chốt
- TUYỆT ĐỐI KHÔNG bắt đầu thực thi cho đến khi user xác nhận
- Nếu user yêu cầu chỉnh sửa → cập nhật solution và trình bày lại
- Chỉ proceed khi user nói: "OK", "Đồng ý", "Proceed", "Làm đi", hoặc tương đương
- Khi user chốt → chạy: `bash .antigravity/commands/approve-plan.sh "<solution-summary-file>"`

### Forbidden actions (không bao giờ làm)
- Bắt đầu code trước khi user chốt solution
- Refactor code ngoài scope đã khai báo
- Xóa code "có vẻ không dùng" mà không hỏi
- Tự thêm abstraction/helper ngoài yêu cầu
- Giả định tech stack nếu chưa có trong project.context.json
