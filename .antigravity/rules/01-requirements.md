# Requirements Rule (Phase 1)

## Bắt buộc viết tài liệu yêu cầu chuẩn PROD

Trước khi chuyển sang Design, Agent PHẢI hoàn thành file requirements với đầy đủ:

### Checklist bắt buộc
```
[ ] ≥1 User Story theo format: "As a [role], I want to [action], so that [benefit]"
[ ] ≥1 Acceptance Criteria cho MỖI story theo format: "Given [context], When [action], Then [result]"
[ ] Non-functional Requirements (Performance, Security, Accessibility)
[ ] Out of Scope (những gì KHÔNG làm)
[ ] User đã review và APPROVED file requirements
```

### Tự động chạy lệnh khởi tạo
- Khi nhận task mới, Agent tự động chạy:
  `bash .antigravity/commands/new-task.sh "<mô tả task>"`
- Đọc nội dung file requirements mới tại `.antigravity/context/requirements-*.md` để điền.

### Mẫu User Story
```markdown
### US-1: Đăng nhập bằng email
> **As a** người dùng đã đăng ký,
> **I want to** đăng nhập bằng email và mật khẩu,
> **so that** tôi có thể truy cập tài khoản cá nhân.

#### Acceptance Criteria
- [ ] **Given** email và mật khẩu hợp lệ, **When** nhấn nút Login, **Then** chuyển hướng đến trang dashboard.
- [ ] **Given** email không tồn tại, **When** nhấn nút Login, **Then** hiển thị lỗi "Email không tồn tại".
- [ ] **Given** mật khẩu sai, **When** nhấn nút Login, **Then** hiển thị lỗi "Mật khẩu không đúng".
```

### Điều kiện chuyển phase
- Tất cả ô checklist đã được đánh dấu **VÀ**
- Người dùng đã approve file requirements
- Chạy: `bash .antigravity/commands/approve-plan.sh "<requirements-file>"`
