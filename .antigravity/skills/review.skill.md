# Skill: Review

## Mô tả
Kiểm tra kết quả sau khi thực thi, đối chiếu với Acceptance Criteria và cập nhật memory.

## Quy trình

```
1. Đọc file requirements → lấy danh sách Acceptance Criteria.
2. Đối chiếu từng AC với kết quả thực tế.
3. Kiểm tra Verification Checklist trong file tasks.
4. Tạo báo cáo review: context/review-<ts>.md.
5. Cập nhật memory/decisions.log.md.
6. Mark file tasks: Status: DONE.
7. Đề xuất cải tiến (nếu có).
8. Hỏi: "Bạn có muốn tiếp tục với task khác không?"
```

## Review Checklist
```
[ ] Tất cả AC trong requirements đã met
[ ] Tất cả tasks checkbox đã [x]
[ ] Code pass linting/formatting (theo coding_standards trong steering)
[ ] Tests pass (nếu có)
[ ] Không có regression
[ ] Progress Log đầy đủ trong file design
```
