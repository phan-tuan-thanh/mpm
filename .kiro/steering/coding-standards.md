---
inclusion: always
---

# Coding Standards

<!-- /init-project bổ sung phần stack-specific tự động -->

## Nguyên tắc chung

- **Tên biến / hàm / class**: tiếng Anh, rõ nghĩa, không viết tắt tuỳ tiện
- **Comment nghiệp vụ**: tiếng Việt khi cần giải thích logic phức tạp
- **Không hardcode** secret, password, API key — dùng biến môi trường
- **Validate** tất cả input từ bên ngoài (user, API, file upload)
- **Log lỗi** nhưng không log dữ liệu nhạy cảm (PII, credentials)

## Git Conventions

```
Commit message: <type>(<scope>): <mô tả ngắn gọn bằng tiếng Anh>

Types:
  feat     — tính năng mới
  fix      — sửa lỗi
  refactor — cải thiện code, không đổi behavior
  test     — thêm / sửa test
  docs     — tài liệu
  chore    — công việc hạ tầng, build, config
  perf     — cải thiện performance

Ví dụ:
  feat(auth): add JWT refresh token endpoint
  fix(payment): handle timeout when calling external gateway
  docs(api): update OpenAPI spec for user endpoints
```

## Bảo mật (Security)

- Mã hóa dữ liệu nhạy cảm at-rest và in-transit
- Không trả về stack trace trong response production
- Dùng parameterized query — không ghép chuỗi SQL
- Rate limiting cho các endpoint public

## Stack-Specific Standards

<!-- /init-project hoặc /update-agent stack sẽ điền phần này -->

> _Chưa cấu hình — chạy `/init-project` để thiết lập theo stack thực tế_

### Template (sẽ được thay thế):

| Stack | Formatter | Linter | Style Guide |
|-------|-----------|--------|-------------|
| Java | — | Checkstyle | Google Java Style |
| TypeScript | Prettier | ESLint strict | Airbnb / project |
| Python | Black | Ruff / flake8 | PEP8 + type hints |
| Go | gofmt | golangci-lint | Effective Go |
| C# | — | StyleCop | Microsoft conventions |
