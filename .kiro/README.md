# .kiro — Kiro Agent Configuration

Cấu hình chuẩn cho Kiro Agent: **Steering + Specs + Hooks**.

## Cấu trúc thực tế (Kiro IDE đọc được)

```
.kiro/
│
├── steering/                        ← Luôn được đọc (inclusion:always)
│   ├── product.md                   ← Tên, mô tả, glossary, compliance
│   ├── tech.md                      ← Toàn bộ tech stack
│   ├── structure.md                 ← Cấu trúc folder, doNotTouch list
│   ├── coding-standards.md          ← Chuẩn code + stack-specific
│   ├── api-standards.md             ← URL design, response format
│   ├── testing-standards.md         ← Test pyramid, coverage, naming
│   │
│   ├── init-project.md   [manual]   ← /init-project slash command
│   ├── start-task.md     [manual]   ← /start-task slash command
│   └── new-spec.md       [manual]   ← /new-spec slash command
│
├── specs/                           ← Đặc tả từng feature
│   ├── .template/
│   │   ├── requirements.md
│   │   ├── design.md
│   │   └── tasks.md
│   ├── user-authentication/         ← Ví dụ
│   └── payment-service/             ← Ví dụ
│
├── hooks/                           ← Extension: .kiro.hook (KHÔNG phải .json)
│   ├── security-scan-on-save.kiro.hook     ← fileSaved
│   ├── test-scaffold-on-create.kiro.hook   ← fileCreated
│   ├── doc-sync-on-save.kiro.hook          ← fileSaved
│   ├── code-review-manual.kiro.hook        ← manual → /code-review
│   ├── update-agent-manual.kiro.hook       ← manual → /update-agent
│   ├── show-context-manual.kiro.hook       ← manual → /show-context
│   ├── pre-task-checklist.kiro.hook        ← preTaskExecution
│   └── post-task-summary.kiro.hook         ← postTaskExecution
│
├── settings/
│   └── mcp.json                     ← MCP servers (bật trong Settings→MCP)
│
├── memory/
│   ├── context.json                 ← Trạng thái hiện tại (tự động cập nhật)
│   └── decisions.md                 ← Architecture Decision Log
│
└── plans/                           ← File kế hoạch (YYYY-MM-DD_task.md)
```

## Slash Commands (gõ / trong chat)

| Command | Loại | Tác dụng |
|---------|------|---------|
| `/init-project` | steering manual | Hỏi 6 nhóm thông tin, cập nhật steering/ |
| `/start-task` | steering manual | Làm rõ → tạo plan → thực thi |
| `/new-spec` | steering manual | Tạo spec feature mới từ template |
| `/code-review` | hook manual | Review file hiện tại theo steering/ |
| `/update-agent` | hook manual | Cập nhật nhanh một phần cấu hình |
| `/show-context` | hook manual | Tóm tắt ngữ cảnh dự án hiện tại |

## Thứ tự sử dụng

```
1. ./setup-kiro-agent.sh   ← Tạo cấu trúc này
2. /init-project            ← Điền thông tin dự án (quan trọng nhất)
3. /new-spec <feature>      ← Tạo spec cho feature đầu tiên
4. /start-task              ← Bắt đầu làm việc hàng ngày
5. /code-review             ← Review code bất cứ lúc nào
6. /update-agent            ← Khi stack/team thay đổi
```

## Nguyên tắc cốt lõi

1. **Hỏi trước, làm sau** — Luôn làm rõ ngữ cảnh trước khi thực thi
2. **Plan trước khi code** — Tạo `.kiro/plans/` và chờ approve
3. **Spec-driven** — Task liên kết với `specs/<feature>/` khi có thể
4. **Cập nhật context** — Sau mỗi task ghi vào `memory/context.json`
