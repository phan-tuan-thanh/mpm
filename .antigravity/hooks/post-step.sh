#!/usr/bin/env bash
# post-step.sh — Chạy sau mỗi step trong execution
# Usage: bash hooks/post-step.sh "<task-slug>" "<step-number>" "<status: done|failed>"

set -euo pipefail
TASK="${1:-unknown}"
STEP="${2:-0}"
STATUS="${3:-done}"
TS=$(date '+%Y%m%d-%H%M%S')
LOG=".antigravity/logs/agent.log"

echo "[${TS}] [POST-STEP] Task=$TASK Step=$STEP Status=$STATUS" >> "$LOG"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Step $STEP: $STATUS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⚡ Nhắc nhở Agent:"
echo "  1. Cập nhật checkbox [x] trong file tasks tương ứng"
echo "  2. Ghi Progress Log vào file design"
echo "  3. Kiểm tra AC liên quan đã met chưa"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
