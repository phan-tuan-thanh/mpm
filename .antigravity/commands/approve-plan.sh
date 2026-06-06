#!/usr/bin/env bash
# approve-plan.sh — Duyệt file (requirements, design, hoặc tasks)
# Usage: bash commands/approve-plan.sh <path-to-file.md>

set -euo pipefail
FILE="${1:-}"
[[ -z "$FILE" ]] && { echo "Usage: $0 <file-path>"; exit 1; }
[[ -f "$FILE" ]] || { echo "❌ File không tồn tại: $FILE"; exit 1; }

# Nhận diện loại file
if echo "$FILE" | grep -q "requirements"; then
  TYPE="📋 REQUIREMENTS"
elif echo "$FILE" | grep -q "design"; then
  TYPE="🏗️  DESIGN"
elif echo "$FILE" | grep -q "tasks"; then
  TYPE="✅ TASKS"
else
  TYPE="📄 DOCUMENT"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "$TYPE — Review & Approve"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cat "$FILE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
read -rp "✅ Duyệt file này? [y/N] " CONFIRM

if [[ "$CONFIRM" =~ ^[Yy]$ ]]; then
  TS=$(date '+%Y-%m-%d %H:%M:%S')
  # Cập nhật Status
  if grep -q "Status: DRAFT" "$FILE"; then
    sed -i '' "s/Status: DRAFT/Status: APPROVED/" "$FILE" 2>/dev/null || \
    sed -i "s/Status: DRAFT/Status: APPROVED/" "$FILE"
  fi
  # Cập nhật Approval
  sed -i '' "s/| \*\*Approved by\*\* | _________________ |/| **Approved by** | ${USER:-agent} |/" "$FILE" 2>/dev/null || \
  sed -i "s/| \*\*Approved by\*\* | _________________ |/| **Approved by** | ${USER:-agent} |/" "$FILE"
  sed -i '' "s/| \*\*Approved at\*\* | _________________ |/| **Approved at** | $TS |/" "$FILE" 2>/dev/null || \
  sed -i "s/| \*\*Approved at\*\* | _________________ |/| **Approved at** | $TS |/" "$FILE"

  LOG=".antigravity/logs/agent.log"
  echo "[$(date '+%Y%m%d-%H%M%S')] [APPROVED] $FILE" >> "$LOG"

  echo ""
  echo "✅ $TYPE APPROVED: $FILE"

  # Hướng dẫn bước tiếp theo
  if echo "$FILE" | grep -q "requirements"; then
    echo "➡️  Tiếp theo: Điền file Design → approve"
  elif echo "$FILE" | grep -q "design"; then
    echo "➡️  Tiếp theo: Điền file Tasks → approve"
  elif echo "$FILE" | grep -q "tasks"; then
    echo "➡️  Tiếp theo: Bắt đầu Execution!"
    echo "   Chạy: bash .antigravity/commands/execute-plan.sh \"$FILE\""
  fi
else
  echo "❌ File không được duyệt. Chỉnh sửa và thử lại."
fi
