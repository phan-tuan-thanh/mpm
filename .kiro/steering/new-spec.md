---
inclusion: manual
---

# /new-spec — Tạo spec feature mới

Khi được gọi với `/new-spec <feature-name>`:

## Quy trình

1. Hỏi: "Mô tả ngắn về feature này (1–2 câu)?"
2. Hỏi: "User story chính là gì? (As a... I want... So that...)"
3. Hỏi: "Acceptance criteria cơ bản?"
4. Tạo thư mục `specs/<feature-name>/`
5. Copy và điền nội dung từ `specs/.template/`:
   - `requirements.md` — điền thông tin vừa thu thập
   - `design.md` — để skeleton, điền sau
   - `tasks.md` — để skeleton, điền sau
6. Trình bày `requirements.md` cho user review

## Sau khi tạo

Gợi ý bước tiếp theo:
1. Hoàn thiện `requirements.md` (user stories đầy đủ, FR/NFR)
2. Viết `design.md` (API contract, data model)
3. Implement: `/start-task --spec <feature-name> <mô tả>`
