# Workflow: Standard Task (v2.1 — Clarify + 3-Phase + Report)

## Tổng quan
Quy trình chuẩn: **Clarify → Requirements → Design → Tasks → Execute → Review → Report**.

```
┌──────────────────────────────────────────────────────────┐
│                    TASK NHẬN ĐƯỢC                         │
└───────────────────────────┬──────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────┐
│  1. LOAD MEMORY + STEERING                               │
│     🔧 HOOK: pre-task.sh                                 │
│     - Đọc project.context.json (steering data)           │
│     - Đọc session.context.json                           │
│     - Đọc decisions.log.md                               │
│     📟 CMD: status.sh                                    │
└───────────────────────────┬──────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────┐
│  1b. CLARIFY & CONFIRM ←───────────────────────────┐     │
│     - Phân tích yêu cầu: rõ / chưa rõ?             │     │
│     - Nếu chưa rõ → hỏi tối đa 3 câu               │     │
│     📟 CMD: clarify.sh → tạo solution-summary file  │     │
│     - Điền Solution Summary:                        │     │
│       • Hiểu của tôi về yêu cầu                    │     │
│       • Giải pháp đề xuất (approach, pattern)       │     │
│       • Sẽ làm / Sẽ KHÔNG làm                      │     │
│       • Files sẽ bị ảnh hưởng                      │     │
│       • Rủi ro                                      │     │
│     - Trình bày Solution Summary cho user           │     │
│                                                     │     │
│     ┌──────────────┐    ┌─────────────────────┐     │     │
│     │  User chốt?  │ No │ Chỉnh sửa & trình   │─────┘     │
│     │     Yes      │───▶│ bày lại             │           │
│     └──────┬───────┘    └─────────────────────┘           │
│     📟 CMD: approve-plan.sh <solution-summary-file>       │
└────────────┼─────────────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────┐
│  2. PHASE 1: REQUIREMENTS ←────────────────────────┐     │
│     📟 CMD: new-task.sh → tạo scaffold 3 file      │     │
│     - Viết User Stories                             │     │
│     - Viết Acceptance Criteria (Given/When/Then)    │     │
│     - Non-functional Requirements                   │     │
│     - Out of Scope                                  │     │
│     🔒 MCP: requirementsGate                        │     │
│                                                     │     │
│     ┌──────────────┐    ┌─────────────────────┐     │     │
│     │  Approved?   │ No │ Chỉnh sửa & review  │─────┘     │
│     │     Yes      │───▶│                     │           │
│     └──────┬───────┘    └─────────────────────┘           │
│     📟 CMD: approve-plan.sh <requirements-file>           │
└────────────┼─────────────────────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────────────────────┐
│  3. PHASE 2: DESIGN ←──────────────────────────────┐     │
│     🔧 HOOK: pre-design.sh (kiểm tra req approved) │     │
│     📟 CMD: create-design.sh                        │     │
│     - Đọc steering data từ project.context.json     │     │
│     - Architecture Overview                         │     │
│     - Data Model / API Contracts                    │     │
│     - File Map ([NEW] [MODIFY] [DELETE])            │     │
│     - Technical Decisions                           │     │
│     - Risks & Mitigation                            │     │
│     🔒 MCP: designGate                              │     │
│                                                     │     │
│     ┌──────────────┐    ┌─────────────────────┐     │     │
│     │  Approved?   │ No │ Chỉnh sửa & review  │─────┘     │
│     │     Yes      │───▶│                     │           │
│     └──────┬───────┘    └─────────────────────┘           │
│     📟 CMD: approve-plan.sh <design-file>                 │
└────────────┼─────────────────────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────────────────────┐
│  4. PHASE 3: TASKS ←───────────────────────────────┐     │
│     - Chia nhỏ thành sub-tasks checkbox             │     │
│     - Mỗi task liên kết US-1, US-2, ...            │     │
│     - Verification Checklist                        │     │
│     🔒 MCP: tasksGate                               │     │
│                                                     │     │
│     ┌──────────────┐    ┌─────────────────────┐     │     │
│     │  Approved?   │ No │ Chỉnh sửa & review  │─────┘     │
│     │     Yes      │───▶│                     │           │
│     └──────┬───────┘    └─────────────────────┘           │
│     📟 CMD: approve-plan.sh <tasks-file>                  │
└────────────┼─────────────────────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────────────────────┐
│  5. EXECUTION                                            │
│     📟 CMD: execute-plan.sh <tasks-file>                 │
│     - Thực hiện từng task theo thứ tự                    │
│     - SAU MỖI STEP:                                     │
│       • Cập nhật [x] trong tasks file                   │
│       • Ghi Progress Log vào design file                │
│       🔧 HOOK: post-step.sh                             │
│                                                         │
│     ┌──────────────┐    ┌──────────────────────┐        │
│     │  Step fail?  │ Yes│ Dừng → báo cáo → hỏi │        │
│     │     No       │───▶│ ý kiến user          │        │
│     └──────┬───────┘    └──────────────────────┘        │
└────────────┼────────────────────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────────────────────┐
│  6. REVIEW                                               │
│     - Đối chiếu kết quả với Acceptance Criteria          │
│     - Kiểm tra Verification Checklist                    │
│     📟 CMD: status.sh                                    │
└───────────────────────────┬──────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────┐
│  7. MEMORY UPDATE                                        │
│     🔧 HOOK: post-task.sh                                │
│     - Cập nhật decisions.log.md                          │
│     - Mark tasks file: Status: DONE                      │
└───────────────────────────┬──────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────┐
│  8. REPORT (BẮT BUỘC)                                    │
│     📟 CMD: generate-report.sh <tasks-file> <status>     │
│     - Tạo báo cáo đầy đủ → lưu vào reports/             │
│     - Hiển thị summary cho user:                        │
│       ✅ Tasks: X/Y  |  🎯 AC: X/Y  |  📁 N files       │
│     - Đề xuất bước tiếp theo                            │
│     - Hỏi: "Bạn có muốn tiếp tục với task khác không?"  │
└──────────────────────────────────────────────────────────┘
```

## Thời gian mỗi phase (ước tính)

| Phase | Thời gian điển hình |
|-------|---------------------|
| Load Memory + Steering | < 5s |
| Clarify & Confirm | 2-10 phút |
| Phase 1: Requirements | 5-15 phút |
| Phase 2: Design | 10-30 phút |
| Phase 3: Tasks | 5-10 phút |
| Execution | Tùy task |
| Review | 5-10 phút |
| Memory Update | < 1 phút |
| Report | < 1 phút (tự động) |
