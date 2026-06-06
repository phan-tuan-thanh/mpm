#!/usr/bin/env bash
# pre-design.sh — Kiểm tra trước khi tạo design
# Usage: bash hooks/pre-design.sh
set -euo pipefail

CTX_DIR=".antigravity/context"
PLAN_DIR=".antigravity/plans"

# Kiểm tra requirements đã approved chưa
REQ_APPROVED=$(grep -rl "Status: APPROVED" "$CTX_DIR" 2>/dev/null | head -1 || true)
if [[ -z "$REQ_APPROVED" ]]; then
  echo "⚠️  Chưa có file requirements nào được APPROVED!"
  echo "   Hãy hoàn thành Phase 1 (Requirements) trước."
  echo "   Chạy: bash .antigravity/commands/approve-plan.sh <requirements-file>"
fi

# Kiểm tra design/tasks draft chưa xử lý
DRAFTS=$(grep -rl "Status: DRAFT" "$PLAN_DIR" 2>/dev/null || true)
if [[ -n "$DRAFTS" ]]; then
  DRAFT_COUNT=$(echo "$DRAFTS" | wc -l | tr -d ' ')
  echo "📋 Có $DRAFT_COUNT file DRAFT chưa xử lý:"
  echo "$DRAFTS" | head -5
fi

echo "✅ Pre-design check complete."
