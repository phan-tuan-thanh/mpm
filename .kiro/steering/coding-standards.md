# Coding Standards

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
- OWASP Top 10 compliance

## Stack-Specific Standards

### TypeScript / NestJS (Backend)

| Hạng mục | Quy tắc |
|----------|---------|
| Formatter | Prettier |
| Linter | ESLint (strict) |
| Style | NestJS conventions + Airbnb base |
| Test | Jest — unit + e2e |
| ORM | TypeORM với migration-based schema |

**Quy tắc NestJS:**
- Mỗi module chứa: controller, service, entity, DTO, spec file
- Dùng class-validator + class-transformer cho DTO validation
- Guard cho authorization, Interceptor cho logging/transform
- Exception filter tập trung xử lý lỗi
- Repository pattern cho data access

### Angular 19 (Frontend)

| Hạng mục | Quy tắc |
|----------|---------|
| Formatter | Prettier |
| Linter | ESLint (angular-eslint) |
| Style | Angular style guide official |
| Test | Jest (unit) + Cypress/Playwright (e2e) |
| CSS | Tailwind CSS utility-first |

**Quy tắc Angular:**
- Standalone components (Angular 19 default)
- Signals cho reactive state management
- Lazy loading cho feature modules
- Smart/Dumb component pattern
- Service cho business logic, component chỉ orchestrate
- RxJS cho async streams, Signals cho synchronous state

### Chung

- Strict TypeScript (`strict: true` trong tsconfig)
- Không dùng `any` — dùng `unknown` nếu cần
- Interface cho contract, Type cho union/intersection
- Enum dùng `const enum` hoặc string literal union
- Async/await thay vì callback
- Error handling: custom exception classes
