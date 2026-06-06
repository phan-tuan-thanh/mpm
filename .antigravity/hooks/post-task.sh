#!/usr/bin/env bash
# post-task.sh — Chạy sau mỗi task: cập nhật log + tự động tạo báo cáo
# Usage: bash hooks/post-task.sh "<task_slug>" "<status: success|partial|failed>" [tasks-file]

set -euo pipefail
TASK="${1:-unknown}"
STATUS="${2:-success}"
TASKS_FILE="${3:-}"
TS=$(date '+%Y%m%d-%H%M%S')
LOG=".antigravity/logs/agent.log"
MEM=".antigravity/memory/decisions.log.md"

echo "[${TS}] [POST-TASK] $TASK => $STATUS" >> "$LOG"

# Cập nhật decisions log
cat >> "$MEM" <<MD

## [$TS] $TASK
- Status: $STATUS
- Ghi chú: (điền tự động hoặc thủ công)
MD

# Tự động generate report nếu có tasks file
if [[ -n "$TASKS_FILE" && -f "$TASKS_FILE" ]]; then
  echo ""
  echo "📊 Đang tạo báo cáo..."
  bash .antigravity/commands/generate-report.sh "$TASKS_FILE" "$STATUS"
else
  # Tìm tasks file gần nhất theo task slug
  LATEST_TASKS=$(find .antigravity/plans -name "*tasks*.md" 2>/dev/null | sort -r | head -1)
  if [[ -n "$LATEST_TASKS" ]]; then
    echo ""
    echo "📊 Đang tạo báo cáo từ: $LATEST_TASKS"
    bash .antigravity/commands/generate-report.sh "$LATEST_TASKS" "$STATUS"
  else
    echo "⚠️  Không tìm thấy tasks file để tạo báo cáo."
    echo "   Chạy thủ công: bash .antigravity/commands/generate-report.sh <tasks-file>"
  fi
fi
