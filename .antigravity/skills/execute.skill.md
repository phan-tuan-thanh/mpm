# Skill: Execute

## Mô tả
Thực thi các task trong file tasks đã được approved, cập nhật tiến độ live.

## Điều kiện tiên quyết
- File requirements tồn tại với Status: APPROVED
- File design tồn tại với Status: APPROVED
- File tasks tồn tại với Status: APPROVED

## Quy trình

```
1. Kiểm tra cả 3 file (requirements + design + tasks) đều APPROVED.
2. Chạy: bash .antigravity/commands/execute-plan.sh "<đường dẫn tasks-file>".
3. Thực hiện từng task theo thứ tự trong file tasks.
4. SAU MỖI TASK HOÀN THÀNH:
   a. Cập nhật checkbox: - [ ] → - [x] trong file tasks.
   b. Ghi Progress Log vào file design (Time, Step, Result, Notes).
   c. Chạy: bash .antigravity/hooks/post-step.sh "<task-slug>" "<step>" "<done|failed>".
5. Nếu task thất bại:
   a. Dừng ngay.
   b. Báo cáo lỗi chi tiết.
   c. Đề xuất rollback hoặc fix.
   d. Hỏi người dùng cách tiếp tục.
6. Khi hoàn tất toàn bộ:
   a. Chạy: bash .antigravity/commands/status.sh để báo cáo.
   b. Chạy: bash .antigravity/hooks/post-task.sh "<task>" "success".
   c. Cập nhật memory/decisions.log.md.
   d. Kiểm tra Verification Checklist trong file tasks.
```

## Reporting format sau mỗi step

```
✅ Task N (US-X): <tên task>
   - Kết quả: <output ngắn gọn>
   - Thời gian: <thực tế>
   - Files changed: <danh sách>
   - AC met: <danh sách AC đã hoàn thành>
```
