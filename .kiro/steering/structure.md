---
inclusion: always
---

# Project Structure

## Cấu trúc thư mục

```
project-root/
├── .kiro/
│   ├── steering/          ← Ngữ cảnh luôn được đọc (product, tech, process)
│   ├── specs/             ← Đặc tả từng feature (requirements + design + tasks)
│   ├── hooks/             ← Tự động hóa: pre-commit, code-review, test-gen
│   ├── memory/            ← Shared context, decisions, glossary
│   └── plans/             ← File kế hoạch task (tự động tạo)
├── src/
├── docs/
└── README.md
```

## Quy tắc tổ chức file

- **Mỗi feature** có thư mục riêng trong `specs/<feature-name>/`
- **Plans** được đặt tên: `YYYY-MM-DD_<slug-task>.md`
- **Không** đặt business logic trong thư mục `.kiro/`

## File & Folder KHÔNG được tự động chỉnh sửa

```
# Danh sách này được /init-project điền tự động
# Ví dụ:
# config/production.yml
# certs/
# .env.prod
# migration/V*.sql (chỉ append, không sửa)
```

## Đường dẫn quan trọng

| Loại | Đường dẫn |
|------|-----------|
| Source code | `src/` |
| Tests | `tests/` |
| Config | `config/` |
| Docs | `docs/` |
| DB Migrations | `migrations/` |
| CI/CD | `.github/workflows/` hoặc `.gitlab-ci.yml` |
