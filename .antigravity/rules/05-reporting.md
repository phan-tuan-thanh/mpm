# Reporting Rule (Post-Execute Protocol)

## Bắt buộc sau mỗi task hoàn thành

### Agent PHẢI thực hiện đủ 3 bước:

**Bước 1 — Tạo báo cáo:**
Chạy: `bash .antigravity/commands/generate-report.sh "<tasks-file>" "<status>"`
→ Báo cáo được lưu tự động vào `reports/<ts>-<slug>.report.md`

**Bước 2 — Hiển thị summary cho user:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 BÁO CÁO HOÀN THÀNH: <task name>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Tasks hoàn thành : X/Y
🎯 Acceptance Criteria: X/Y đã met
📁 Files thay đổi   : N file(s)
⏱️  Thời gian        : <thực tế>
📄 Báo cáo đầy đủ  : reports/<filename>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 Đề xuất tiếp theo: <1-2 câu gợi ý>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Bước 3 — Cập nhật memory:**
- Append vào `memory/decisions.log.md`
- Cập nhật `memory/session.context.json`

### Nội dung báo cáo bắt buộc
- Tổng quan kết quả (3-5 câu)
- Công việc đã hoàn thành (từ checkbox [x])
- Công việc chưa hoàn thành (nếu có)
- Files đã tạo / sửa / xóa (từ design file map)
- Acceptance Criteria: từng AC đã met hay chưa
- Vấn đề gặp phải và cách xử lý
- Đề xuất bước tiếp theo

### Khi task thất bại (status: failed / partial)
Báo cáo PHẢI bao gồm thêm:
- Root cause phân tích
- Bước nào thất bại và lý do
- Rollback đã thực hiện (nếu có)
- Đề xuất fix
