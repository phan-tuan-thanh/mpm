#!/usr/bin/env bash
# create-design.sh — Tạo file design (nếu chưa tồn tại từ new-task.sh)
# Usage: bash commands/create-design.sh "Task description"

set -euo pipefail
TASK_DESC="${1:-unnamed task}"
SLUG=$(echo "$TASK_DESC" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/-\+/-/g' | sed 's/^-//;s/-$//' | cut -c1-40)
TS=$(date '+%Y%m%d-%H%M%S')

# Kiểm tra pre-design
bash .antigravity/hooks/pre-design.sh

# Kiểm tra xem đã có design file chưa
EXISTING=$(find .antigravity/plans -name "*${SLUG}*.design.md" 2>/dev/null | head -1)
if [[ -n "$EXISTING" ]]; then
  echo "📄 Design file đã tồn tại: $EXISTING"
  echo "   Hãy mở và chỉnh sửa file trên."
  exit 0
fi

DESIGN_FILE=".antigravity/plans/${TS}-${SLUG}.design.md"
TASKS_FILE=".antigravity/plans/${TS}-${SLUG}.tasks.md"

# Tìm file requirements liên quan
REQ_FILE=$(find .antigravity/context -name "requirements-*${SLUG}*.md" 2>/dev/null | head -1)
REQ_REF="${REQ_FILE:-<chưa tìm thấy — hãy chạy new-task.sh trước>}"

cat > "$DESIGN_FILE" <<MD
# Design — $TASK_DESC
**Task ID**: ${TS}-${SLUG}  |  **Requirements ref**: $REQ_REF  |  **Status**: DRAFT

---

## 🏗️ Architecture Overview
> <!-- Mô tả kiến trúc -->

## 📊 Data Model
> <!-- Schema, entities -->

## 📁 File Map

| Action | File Path | Mô tả thay đổi |
|--------|-----------|-----------------|
| [NEW]    | | |
| [MODIFY] | | |

## 🧠 Technical Decisions

| Quyết định | Lý do | Phương án thay thế |
|------------|-------|-------------------|
| | | |

## ⚠️ Risks & Mitigation

| Rủi ro | Xác suất | Tác động | Giảm thiểu |
|--------|----------|----------|------------|
| | | | |

## 📊 Progress Log

| Time | Task | Result | Notes |
|------|------|--------|-------|
| | | | |

---

## 🔏 Approval

| | |
|-|-|
| **Approved by** | _________________ |
| **Approved at** | _________________ |
MD

echo ""
echo "✅ Design file created: $DESIGN_FILE"
echo ""
echo "📌 Hãy:"
echo "  1. Điền đầy đủ thông tin thiết kế"
echo "  2. Review và approve: bash .antigravity/commands/approve-plan.sh \"$DESIGN_FILE\""
