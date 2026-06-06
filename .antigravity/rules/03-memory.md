# Memory & Steering Rule

## Shared Context Memory

- `memory/project.context.json` — thông tin dự án + steering data (architecture, coding style, tech stack)
- `memory/session.context.json` — thông tin phiên làm việc hiện tại
- `memory/decisions.log.md`    — lịch sử quyết định quan trọng
- `memory/glossary.md`         — thuật ngữ dự án

## Steering Data (tích hợp trong project.context.json)

Agent PHẢI đọc các trường sau trong `project.context.json` trước khi viết design hoặc code:
- `architecture_patterns` — folder structure, design pattern, state management
- `coding_standards` — naming convention, formatting, linting
- `testing_strategy` — test framework, coverage minimum
- `api_conventions` — REST/GraphQL style, versioning, error format

## Tải context khi bắt đầu

Antigravity PHẢI:
1. Đọc toàn bộ file memory trước khi hỏi làm rõ, để tránh hỏi lại những gì đã biết.
2. Chạy `bash .antigravity/commands/status.sh` để đồng bộ và hiển thị trạng thái.

## Cập nhật context sau mỗi task

Sau khi hoàn thành, append vào `memory/decisions.log.md`:
```
## [YYYYMMDD] <Task title>
- Quyết định: ...
- Lý do: ...
- Kết quả: ...
```
