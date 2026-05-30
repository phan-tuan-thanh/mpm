# .kiro/hooks/ — Agent Hooks

## ⚠️ Quan trọng: Kiro IDE chỉ nhận file JSON, KHÔNG nhận file .md

Hooks phải là file `.json` theo format:
```json
{
  "name": "Tên hook",
  "description": "Mô tả",
  "eventType": "fileSaved",
  "filePatterns": ["src/**/*.ts"],
  "hookAction": "askAgent",
  "outputPrompt": "Prompt gửi cho agent khi trigger..."
}
```

## Event types hợp lệ

| eventType | Khi nào trigger |
|-----------|----------------|
| `fileSaved` | Sau khi lưu file khớp filePatterns |
| `fileCreated` | Khi tạo file mới khớp filePatterns |
| `fileDeleted` | Khi xóa file khớp filePatterns |
| `manual` | Bấm nút ▷ trong Kiro panel |
| `preTaskExecution` | Trước khi spec task bắt đầu |
| `postTaskExecution` | Sau khi spec task hoàn thành |
| `promptSubmit` | Khi user gửi prompt |
| `agentStop` | Khi agent kết thúc turn |
| `preToolUse` | Trước khi agent dùng tool |
| `postToolUse` | Sau khi agent dùng tool |

## hookAction hợp lệ

| hookAction | Mô tả |
|-----------|-------|
| `askAgent` | Gửi outputPrompt cho agent xử lý |
| `runCommand` | Chạy shell command (dùng field "command" thay vì "outputPrompt") |

## Cách load vào Kiro IDE

**Cách 1 — Tự động (nếu Kiro nhận):**
Kiro IDE đọc tất cả `.json` trong `.kiro/hooks/` khi mở project.

**Cách 2 — Thủ công qua UI:**
Kiro panel → Agent Hooks → nút `+` → Manually create a hook

**Cách 3 — Dùng AI:**
Kiro panel → Agent Hooks → nút `+` → Ask Kiro to create a hook
→ Mô tả hook bằng tiếng tự nhiên

## Các hooks đã tạo sẵn

| File | Trigger | Mục đích |
|------|---------|---------|
| `security-scan-on-save.json` | fileSaved (src/**) | Quét secret/vulnerability |
| `test-scaffold-on-create.json` | fileCreated (src/**) | Tạo test skeleton tự động |
| `doc-sync-on-save.json` | fileSaved (routes/controllers) | Kiểm tra docs cần cập nhật |
| `code-review-manual.json` | manual | Review code theo chuẩn steering |
| `pre-task-checklist.json` | preTaskExecution | Làm rõ ngữ cảnh trước task |
| `post-task-summary.json` | postTaskExecution | Tổng kết + cập nhật context |
