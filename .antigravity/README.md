# Antigravity AI Agent (v2.1 — Clarify + 3-Phase + Report)

Agent hỗ trợ với quy trình đầy đủ: **Clarify → Requirements → Design → Tasks → Execute → Review → Report**.

## Quy trình đầy đủ

```
📐 CLARIFY — Làm rõ yêu cầu + Solution Summary → User chốt
       ↓ (user confirmed)
📋 Phase 1: REQUIREMENTS — User Stories + Acceptance Criteria
       ↓ (approve)
🏗️  Phase 2: DESIGN — Architecture + File Map + Data Model
       ↓ (approve)
✅ Phase 3: TASKS — Task Breakdown (checkbox liên kết US)
       ↓ (approve)
🚀 EXECUTION — Code + Live Progress Update
       ↓
🔍 REVIEW — Đối chiếu AC + Verification Checklist
       ↓
📋 REPORT — Báo cáo tự động → lưu vào reports/
```

## Cấu trúc

```
.antigravity/
├── antigravity.config.yaml   # Cấu hình chính (v2.0)
├── rules/                    # Quy tắc hành vi (3-Phase)
│   ├── 00-core.md
│   ├── 01-requirements.md
│   ├── 02-design-tasks.md
│   └── 03-memory.md
├── hooks/                    # Lifecycle hooks
│   ├── pre-task.sh
│   ├── post-task.sh
│   ├── pre-design.sh        # Kiểm tra requirements approved
│   └── post-step.sh         # Cập nhật tiến độ live
├── mcp/                      # MCP configuration (3 gates)
│   ├── mcp.config.json
│   └── context-protocol.md
├── skills/                   # Khả năng agent
│   ├── clarify.skill.md      # Làm rõ + Solution Summary
│   ├── requirements.skill.md
│   ├── design.skill.md
│   ├── execute.skill.md
│   └── review.skill.md
├── commands/                 # Lệnh nhanh
│   ├── clarify.sh            # Tạo Solution Summary scaffold
│   ├── generate-report.sh    # Tạo báo cáo sau khi hoàn thành
│   ├── new-task.sh           # Tạo scaffold 3 file
│   ├── create-design.sh      # Tạo file design
│   ├── approve-plan.sh       # Approve bất kỳ phase
│   ├── execute-plan.sh       # Thực thi (kiểm tra 3 file)
│   ├── status.sh             # Trạng thái 3-phase
│   ├── new-skill.sh
│   └── init-project.sh       # Khởi tạo steering data
├── workflows/                # Quy trình tổng hợp
│   ├── standard-task.workflow.md
│   └── emergency-task.workflow.md
├── memory/                   # Shared context + Steering data
│   ├── project.context.json  # ← Steering data + file_size_limits
│   ├── session.context.json
│   ├── decisions.log.md
│   └── glossary.md
├── templates/                # Mẫu tài liệu
│   ├── solution-summary.md   # Template Solution Summary
│   ├── requirements.md       # Template User Stories + AC
│   ├── design.md             # Template Architecture + File Map
│   ├── tasks.md              # Template Task Breakdown
│   ├── report.md             # Template báo cáo
│   ├── review.md
│   └── skill.md
├── plans/                    # Design + Tasks files (tạo động)
├── context/                  # Requirements + Solution Summary (tạo động)
├── reports/                  # Báo cáo hoàn thành (tạo động)
└── logs/
    └── agent.log
```

## Sử dụng nhanh

```bash
# Khởi tạo steering data cho dự án
bash .antigravity/commands/init-project.sh

# Xem trạng thái
bash .antigravity/commands/status.sh

# Bắt đầu task mới: Clarify → tạo Solution Summary
bash .antigravity/commands/clarify.sh "Mô tả task của bạn"

# Sau khi user chốt → tạo scaffold 3-phase
bash .antigravity/commands/new-task.sh "Mô tả task của bạn"

# Approve từng phase
bash .antigravity/commands/approve-plan.sh ".antigravity/context/solution-summary-*.md"
bash .antigravity/commands/approve-plan.sh ".antigravity/context/requirements-*.md"
bash .antigravity/commands/approve-plan.sh ".antigravity/plans/*-design.md"
bash .antigravity/commands/approve-plan.sh ".antigravity/plans/*-tasks.md"

# Thực thi (sau khi cả 3 phase đều approved)
bash .antigravity/commands/execute-plan.sh ".antigravity/plans/*-tasks.md"

# Tạo báo cáo sau khi hoàn thành
bash .antigravity/commands/generate-report.sh ".antigravity/plans/*-tasks.md" success
```

## Nguyên tắc cốt lõi

1. 📐 **Clarify trước** — Làm rõ yêu cầu + Solution Summary → user chốt
2. 📋 **3-Phase bắt buộc** — Requirements → Design → Tasks trước khi code
3. 👤 **User Stories + AC** — Mọi yêu cầu đều chuẩn PROD
4. 🏗️ **Design trước code** — Architecture, File Map, Technical Decisions
5. ✅ **Task Breakdown** — Mỗi task liên kết User Story, cập nhật [x] live
6. ✋ **Approve từng phase** — Không skip, không giả định
7. 📋 **Report bắt buộc** — Báo cáo tự động sau mỗi task, lưu vào reports/
8. 📝 **Ghi log mọi thứ** — Mọi hành động đều có audit trail
9. 🧠 **Steering data** — Tuân thủ architecture, coding style, file size limits
