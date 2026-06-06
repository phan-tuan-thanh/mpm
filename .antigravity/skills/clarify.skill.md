# Skill: Clarify (Pre-Execute Protocol)

## Mô tả
Làm rõ yêu cầu, tóm tắt giải pháp và chờ user chốt trước khi thực thi bất kỳ thay đổi nào.

## Trigger
- Ngay khi nhận được task mới (trước Phase 1)
- Khi yêu cầu còn mơ hồ hoặc thiếu thông tin
- Khi scope thay đổi so với requirements đã approved

## Quy trình

```
1. Đọc memory/project.context.json (tech stack, coding standards, file size limits).
2. Đọc memory/decisions.log.md để tránh lặp quyết định cũ.
3. Phân tích yêu cầu: xác định rõ / chưa rõ.
4. Nếu chưa rõ → hỏi tối đa 3 câu theo format:
     ❓ [1/3] <câu hỏi quan trọng nhất>
     ❓ [2/3] ...
     ❓ [3/3] ...
5. Chạy: bash .antigravity/commands/clarify.sh "<task-description>"
   → Tạo file context/solution-summary-<ts>.md
6. Điền Solution Summary vào file:
   - Hiểu của tôi về yêu cầu
   - Giải pháp đề xuất (approach, pattern)
   - Sẽ làm / Sẽ KHÔNG làm
   - Files ảnh hưởng (sơ bộ)
   - Rủi ro
7. Trình bày Solution Summary cho user.
8. Chờ user phản hồi:
   - Nếu user yêu cầu chỉnh → cập nhật, trình bày lại
   - Nếu user chốt → chạy: bash .antigravity/commands/approve-plan.sh <solution-file>
9. Khi approved → chuyển sang skill: requirements.
```

## Output
- `context/solution-summary-<ts>.md` — Solution Summary đã được user approve
- Đây là điều kiện tiên quyết để bắt đầu Phase 1 (Requirements)
