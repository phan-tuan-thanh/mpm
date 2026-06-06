# Design & Tasks Rule (Phase 2 + Phase 3)

## Phase 2: Design — Bắt buộc phân tích thiết kế

Trước khi chia task, Agent PHẢI hoàn thành file design với đầy đủ:

### Checklist Design bắt buộc
```
[ ] Architecture Overview (sơ đồ thành phần, data flow)
[ ] Data Model (nếu có: schema, entities, relationships)
[ ] API Contracts (nếu có: endpoints, request/response)
[ ] File Map — bảng liệt kê file [NEW], [MODIFY], [DELETE]
[ ] Technical Decisions (lý do chọn giải pháp A thay vì B)
[ ] Risks & Mitigation
[ ] User đã review và APPROVED file design
```

### Quy tắc viết Design
- Đọc `memory/project.context.json` để tuân thủ architecture patterns, coding standards
- Chạy `bash .antigravity/hooks/pre-design.sh` trước khi tạo design (kiểm tra requirements đã approved)
- Chạy `bash .antigravity/commands/create-design.sh "<mô tả task>"` nếu file chưa tồn tại

## Phase 3: Tasks — Bắt buộc chia nhỏ công việc

### Checklist Tasks bắt buộc
```
[ ] Mỗi task là một checkbox `- [ ]` rõ ràng
[ ] Mỗi task liên kết ngược tới User Story (US-1, US-2, ...)
[ ] Có Verification Checklist (AC met, tests pass, no regression)
[ ] User đã review và APPROVED file tasks
```

### Cập nhật tiến độ live
- Sau mỗi step → cập nhật `- [x]` trong file tasks
- Sau mỗi step → ghi Progress Log trong file design
- Chạy `bash .antigravity/hooks/post-step.sh "<task>" "<step>" "<status>"`
