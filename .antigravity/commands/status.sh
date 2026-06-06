#!/usr/bin/env bash
# status.sh — Hiển thị trạng thái tổng quan 3-Phase

set -euo pipefail
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 ANTIGRAVITY STATUS (3-Phase System)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

CTX_DIR=".antigravity/context"
PLAN_DIR=".antigravity/plans"

echo ""
echo "📋 Phase 1 — Requirements:"
echo "  DRAFT:    $(grep -rl 'Status: DRAFT'    "$CTX_DIR" 2>/dev/null | grep -c 'requirements' || echo 0)"
echo "  APPROVED: $(grep -rl 'Status: APPROVED' "$CTX_DIR" 2>/dev/null | grep -c 'requirements' || echo 0)"

echo ""
echo "🏗️  Phase 2 — Design:"
echo "  DRAFT:    $(grep -rl 'Status: DRAFT'    "$PLAN_DIR" 2>/dev/null | grep -c 'design' || echo 0)"
echo "  APPROVED: $(grep -rl 'Status: APPROVED' "$PLAN_DIR" 2>/dev/null | grep -c 'design' || echo 0)"
echo "  DONE:     $(grep -rl 'Status: DONE'     "$PLAN_DIR" 2>/dev/null | grep -c 'design' || echo 0)"

echo ""
echo "✅ Phase 3 — Tasks:"
echo "  DRAFT:    $(grep -rl 'Status: DRAFT'    "$PLAN_DIR" 2>/dev/null | grep -c 'tasks' || echo 0)"
echo "  APPROVED: $(grep -rl 'Status: APPROVED' "$PLAN_DIR" 2>/dev/null | grep -c 'tasks' || echo 0)"
echo "  DONE:     $(grep -rl 'Status: DONE'     "$PLAN_DIR" 2>/dev/null | grep -c 'tasks' || echo 0)"

echo ""
echo "🧠 Memory:"
MEM=".antigravity/memory"
[[ -f "$MEM/project.context.json" ]]  && echo "  ✅ project.context.json (steering data)" || echo "  ❌ project.context.json (chưa tạo)"
[[ -f "$MEM/session.context.json" ]]  && echo "  ✅ session.context.json"  || echo "  ❌ session.context.json (chưa tạo)"
[[ -f "$MEM/decisions.log.md" ]]      && echo "  ✅ decisions.log.md"      || echo "  ❌ decisions.log.md (chưa tạo)"

echo ""
echo "📜 Recent logs:"
tail -5 ".antigravity/logs/agent.log" 2>/dev/null || echo "  (chưa có log)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
