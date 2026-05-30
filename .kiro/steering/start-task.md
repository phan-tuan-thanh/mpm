---
inclusion: manual
---

# /start-task — Bắt đầu task mới

Khi được gọi, thực hiện theo quy trình sau:

## Bước 1 — Đọc context
1. Đọc `steering/product.md` và `steering/tech.md`
2. Đọc `memory/context.json` — xem task gần nhất và trạng thái
3. Nếu có `--spec <name>` → đọc `specs/<name>/requirements.md` và `design.md`

## Bước 2 — Làm rõ (PHẢI làm trước khi tiến hành)

Hỏi người dùng những gì còn thiếu:
- Phạm vi: file/module nào bị ảnh hưởng?
- Output mong đợi trông như thế nào?
- Có acceptance criteria cụ thể không?
- Có file nào KHÔNG được chỉnh sửa?
- Ràng buộc về thời gian / performance?

Nếu đã đủ thông tin → tóm tắt và hỏi xác nhận.

## Bước 3 — Tạo file kế hoạch

Tạo `.kiro/plans/YYYY-MM-DD_<slug>.md` với nội dung:

```
# Kế hoạch: <Tên task>
**Ngày:** | **Spec:** | **Ước tính:**

## Mục tiêu
## Các bước
- [ ] Bước 1
- [ ] Bước 2
## File sẽ thay đổi
| File | Loại | Ghi chú |
## Rủi ro
## Done criteria
## Rollback
```

Trình bày plan → chờ approve ("ok" / "bắt đầu" / "proceed").

## Bước 4 — Thực thi

Thực hiện từng bước, đánh dấu [x] khi xong.

## Bước 5 — Wrap-up

Cập nhật `memory/context.json`: lastTask, lastModifiedFiles, openIssues.
