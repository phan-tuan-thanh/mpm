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
├── apps/
│   ├── backend/           ← NestJS API (monorepo structure)
│   └── frontend/          ← Angular 21 SPA
├── libs/                  ← Shared libraries (types, utils, DTOs)
├── docker/                ← Dockerfiles & docker-compose
├── docs/                  ← Tài liệu kỹ thuật & API docs
├── migrations/            ← Database migrations (TypeORM)
└── README.md
```

## Quy tắc tổ chức file

- **Mỗi feature** có thư mục riêng trong `specs/<feature-name>/`
- **Plans** được đặt tên: `YYYY-MM-DD_<slug-task>.md`
- **Không** đặt business logic trong thư mục `.kiro/`
- **Backend** theo module pattern của NestJS: `apps/backend/src/<module>/`
- **Frontend** theo Angular module/component structure: `apps/frontend/src/app/<feature>/`

## File & Folder KHÔNG được tự động chỉnh sửa

```
.env.prod
.env.staging
docker/production/
migrations/V*.sql (chỉ append, không sửa migration đã chạy)
```

## Đường dẫn quan trọng

| Loại | Đường dẫn |
|------|-----------|
| Backend source | `apps/backend/src/` |
| Frontend source | `apps/frontend/src/` |
| Shared libs | `libs/` |
| Tests backend | `apps/backend/test/` |
| Tests frontend | `apps/frontend/src/**/*.spec.ts` |
| Config | `apps/backend/src/config/` |
| Docs | `docs/` |
| DB Migrations | `migrations/` |
| Docker | `docker/` |
| CI/CD | `.github/workflows/` (roadmap) |
