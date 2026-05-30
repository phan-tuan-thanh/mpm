---
inclusion: manual
---

# /init-project — Cấu hình dự án

Khi được gọi, hãy thu thập thông tin dự án theo 6 nhóm sau, hỏi từng nhóm và chờ trả lời trước khi sang nhóm tiếp theo.

## Nhóm A — Định danh
- Tên dự án?
- Mô tả mục đích (1–2 câu)?
- Loại hình: internal tool / customer-facing / API / mobile / data pipeline?

## Nhóm B — Stack & Framework
- Ngôn ngữ backend + phiên bản? (Java 17 / Node 20+TS / Python 3.12 / Go / C# .NET)
- Framework backend + phiên bản? (Spring Boot / Express / FastAPI / Gin / ASP.NET)
- Frontend? (React / Vue / Angular / Next.js / Không có)
- Mobile? (React Native / Flutter / Không có)
- Package manager? (npm / maven / gradle / pip / go mod)

## Nhóm C — Data & Infrastructure
- Database chính + phiên bản? (PostgreSQL / MySQL / Oracle / MongoDB…)
- Cache? (Redis / Không)
- Message Queue? (Kafka / RabbitMQ / AWS SQS / Không)
- Cloud platform? (AWS / GCP / Azure / On-premise / Hybrid)
- Container? (Docker / Kubernetes / Docker Compose / Không)
- CI/CD? (GitHub Actions / GitLab CI / Jenkins / Azure DevOps / Không)

## Nhóm D — Integrations
- Authentication? (JWT / OAuth2 / Keycloak / Azure AD / LDAP)
- API protocol? (REST / GraphQL / gRPC / SOAP)
- External services? (liệt kê tên hệ thống bên ngoài)
- Compliance? (PCI-DSS / SBV / HIPAA / ISO 27001 / Không)

## Nhóm E — Team & Process
- Số lượng developer?
- Git workflow? (Git Flow / GitHub Flow / Trunk-based)
- Test framework? (Jest / JUnit / pytest / Go test / Không có)
- Môi trường hiện tại? (dev / staging / prod)

## Nhóm F — Ràng buộc
- File/folder KHÔNG được tự ý sửa? (liệt kê path)
- Thuật ngữ nghiệp vụ đặc thù? (tên module, viết tắt nội bộ)
- Ngôn ngữ giao tiếp? (Tiếng Việt / English / Song ngữ)

## Sau khi thu thập đủ

Hiển thị bảng tóm tắt → chờ xác nhận → cập nhật tuần tự:
1. `steering/product.md` — tên, mô tả, glossary, compliance, ngôn ngữ
2. `steering/tech.md` — toàn bộ stack
3. `steering/structure.md` — doNotTouch list
4. `steering/coding-standards.md` — stack-specific rules
5. `memory/context.json` — environment, notes
6. `settings/mcp.json` — gợi ý MCP server phù hợp stack
