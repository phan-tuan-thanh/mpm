# Skill: Requirements (Phase 1)

## Mô tả
Thu thập yêu cầu, viết User Stories và Acceptance Criteria chuẩn PROD.

## Trigger
- Bất kỳ task mới nào được giao
- Khi context không đủ rõ ràng
- Khi phát hiện mâu thuẫn trong yêu cầu

## Quy trình

```
1. Tự động chạy lệnh: bash .antigravity/commands/new-task.sh "<task_description>" để tạo scaffold 3 file.
2. Đọc memory/project.context.json và session.context.json.
3. Xác định những gì đã biết vs chưa biết.
4. Phỏng vấn user để thu thập yêu cầu (tối đa 3 câu/lượt).
5. Soạn User Stories theo format: "As a [role], I want to [action], so that [benefit]".
6. Soạn Acceptance Criteria cho MỖI story: "Given [context], When [action], Then [result]".
7. Liệt kê Non-functional Requirements và Out of Scope.
8. Điền đầy đủ vào file context/requirements-<ts>.md.
9. Hiển thị cho user review.
10. Khi approved → chạy: bash .antigravity/commands/approve-plan.sh <requirements-file>
11. Chuyển sang skill: design.
```

## Output
- `context/requirements-<ts>.md` — tài liệu yêu cầu chuẩn PROD
- `memory/session.context.json` — context được cập nhật

## Template câu hỏi theo domain

### Coding task
- "Ngôn ngữ / framework nào đang dùng?"
- "Có test suite không? Coverage yêu cầu?"
- "CI/CD pipeline hiện tại là gì?"

### Data task
- "Schema / cấu trúc dữ liệu đầu vào?"
- "Volume dữ liệu dự kiến?"
- "Output format yêu cầu?"

### Design task
- "Target audience là ai?"
- "Brand guidelines / design system?"
- "Platform (web/mobile/print)?"
