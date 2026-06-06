#!/usr/bin/env bash
# pre-task.sh — Chạy trước mỗi task
# Usage: bash hooks/pre-task.sh "<task_description>"

set -euo pipefail
TASK="${1:-unknown task}"
TS=$(date '+%Y%m%d-%H%M%S')
LOG=".antigravity/logs/agent.log"

echo "[${TS}] [PRE-TASK] Starting: ${TASK}" >> "$LOG"

# Load shared context
if [[ -f ".antigravity/memory/project.context.json" ]]; then
  echo "📂 Project context (steering data) loaded."
fi

# Reminder: 3-Phase Documentation Required
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 ANTIGRAVITY — 3-Phase Documentation Required"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Task: $TASK"
echo ""
echo "Trước khi viết code, Agent PHẢI hoàn thành 3 phase:"
echo "  Phase 1: 📋 REQUIREMENTS — User Stories + Acceptance Criteria"
echo "  Phase 2: 🏗️  DESIGN      — Architecture + File Map + Data Model"
echo "  Phase 3: ✅ TASKS        — Task Breakdown (checkbox liên kết US)"
echo ""
echo "Mỗi phase phải được USER approve trước khi chuyển tiếp."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
