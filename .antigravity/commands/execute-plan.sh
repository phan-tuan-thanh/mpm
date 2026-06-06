#!/usr/bin/env bash
# execute-plan.sh — Thực thi tasks đã approved (kiểm tra đầy đủ 3-phase)
# Usage: bash commands/execute-plan.sh <tasks-file>

set -euo pipefail
TASKS_FILE="${1:-}"
[[ -z "$TASKS_FILE" ]] && { echo "Usage: $0 <tasks-file>"; exit 1; }
[[ -f "$TASKS_FILE" ]] || { echo "File không tồn tại: $TASKS_FILE"; exit 1; }

# Kiểm tra tasks file approved
if ! grep -q "Status: APPROVED" "$TASKS_FILE"; then
  echo "⛔ Tasks file chưa được duyệt!"
  echo "Chạy: bash .antigravity/commands/approve-plan.sh \"$TASKS_FILE\""
  exit 1
fi

# Lấy design ref từ tasks file
DESIGN_REF=$(grep "Design ref" "$TASKS_FILE" | sed 's/.*Design ref.*: *//' | sed 's/ .*//' | tr -d '|*' | xargs)
if [[ -n "$DESIGN_REF" && -f "$DESIGN_REF" ]]; then
  if ! grep -q "Status: APPROVED" "$DESIGN_REF"; then
    echo "⛔ Design file chưa được duyệt: $DESIGN_REF"
    exit 1
  fi
  echo "✅ Design file APPROVED: $DESIGN_REF"

  # Lấy requirements ref từ design file
  REQ_REF=$(grep "Requirements ref" "$DESIGN_REF" | sed 's/.*Requirements ref.*: *//' | sed 's/ .*//' | tr -d '|*' | xargs)
  if [[ -n "$REQ_REF" && -f "$REQ_REF" ]]; then
    if ! grep -q "Status: APPROVED" "$REQ_REF"; then
      echo "⛔ Requirements file chưa được duyệt: $REQ_REF"
      exit 1
    fi
    echo "✅ Requirements file APPROVED: $REQ_REF"
  fi
fi

echo "✅ Tasks file APPROVED: $TASKS_FILE"

# Lấy task title
TASK=$(head -1 "$TASKS_FILE" | sed 's/# Tasks — //')
bash .antigravity/hooks/pre-task.sh "$TASK"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 Bắt đầu thực thi: $TASK"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  📄 Tasks: $TASKS_FILE"
echo "  🏗️  Design: ${DESIGN_REF:-N/A}"
echo "  📋 Requirements: ${REQ_REF:-N/A}"
echo ""
echo "⚡ Agent sẽ:"
echo "  1. Thực hiện từng task theo thứ tự"
echo "  2. Cập nhật [x] trong tasks file sau mỗi step"
echo "  3. Ghi Progress Log vào design file"
echo "  4. Chạy post-step.sh sau mỗi step"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Hook kết thúc
trap 'bash .antigravity/hooks/post-task.sh "$TASK" "interrupted"' INT TERM
