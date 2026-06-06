# Context Protocol — Antigravity MCP (v2.0 — 3-Phase)

## Payload chuẩn gửi vào mỗi request

```json
{
  "agent": "Antigravity",
  "version": "2.0",
  "timestamp": "<ISO-8601>",
  "session_id": "<uuid>",
  "project_context": "<nội dung memory/project.context.json — bao gồm steering data>",
  "session_context": "<nội dung memory/session.context.json>",
  "phase_status": {
    "requirements": {
      "completed": false,
      "approved": false,
      "ref": "<đường dẫn file requirements>"
    },
    "design": {
      "completed": false,
      "approved": false,
      "ref": "<đường dẫn file design>"
    },
    "tasks": {
      "completed": false,
      "approved": false,
      "ref": "<đường dẫn file tasks>",
      "current_task": "<task đang thực thi>"
    }
  },
  "execution_status": {
    "total_tasks": 0,
    "completed_tasks": 0,
    "current_step": "<bước đang thực hiện>"
  }
}
```

## Các field bắt buộc

| Field | Bắt buộc | Mô tả |
|-------|----------|-------|
| agent | ✅ | Luôn là "Antigravity" |
| project_context | ✅ | Không được null — chứa steering data |
| phase_status.requirements.approved | ✅ | Phải là `true` trước khi chuyển Phase 2 |
| phase_status.design.approved | ✅ | Phải là `true` trước khi chuyển Phase 3 |
| phase_status.tasks.approved | ✅ | Phải là `true` trước khi execution |
| phase_status.requirements.ref | ✅ | Path đến file requirements |
| phase_status.design.ref | ✅ | Path đến file design |
| phase_status.tasks.ref | ✅ | Path đến file tasks |

## Execution Flow Gate

```
requirementsGate → designGate → tasksGate → EXECUTION
```

Nếu bất kỳ gate nào chưa pass, Agent PHẢI dừng và hoàn thành phase tương ứng.
