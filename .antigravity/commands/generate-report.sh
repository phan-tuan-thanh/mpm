#!/usr/bin/env bash
# generate-report.sh — Tạo báo cáo hoàn thành task, lưu vào reports/
# Usage: bash commands/generate-report.sh <tasks-file> [status: success|partial|failed]

set -euo pipefail
TASKS_FILE="${1:-}"
STATUS="${2:-success}"
[[ -z "$TASKS_FILE" ]] && { echo "Usage: $0 <tasks-file> [status]"; exit 1; }
[[ -f "$TASKS_FILE" ]] || { echo "❌ File không tồn tại: $TASKS_FILE"; exit 1; }

TS=$(date '+%Y%m%d-%H%M%S')
DATE_READABLE=$(date '+%Y-%m-%d %H:%M:%S')

# Lấy metadata từ tasks file
TASK_TITLE=$(head -1 "$TASKS_FILE" | sed 's/# Tasks — //')
TASK_ID=$(grep -o 'Task ID\*\*: [^ |]*' "$TASKS_FILE" | head -1 | sed 's/Task ID\*\*: //' || echo "unknown")
SLUG=$(echo "$TASK_TITLE" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/-\+/-/g' | sed 's/^-//;s/-$//' | cut -c1-40)

REPORT_FILE=".antigravity/reports/${TS}-${SLUG}.report.md"
LOG=".antigravity/logs/agent.log"

# ── Đếm tasks ──
TOTAL=$(grep -c '^- \[' "$TASKS_FILE" 2>/dev/null || echo 0)
DONE=$(grep -c '^- \[x\]' "$TASKS_FILE" 2>/dev/null || echo 0)
REMAINING=$((TOTAL - DONE))

# ── Lấy design ref ──
DESIGN_REF=$(grep -o 'Design ref\*\*: [^ |]*' "$TASKS_FILE" | head -1 | sed 's/Design ref\*\*: //' | tr -d '*' || echo "")

# ── Lấy requirements ref từ design file ──
REQ_REF=""
if [[ -n "$DESIGN_REF" && -f "$DESIGN_REF" ]]; then
  REQ_REF=$(grep -o 'Requirements ref\*\*: [^ |]*' "$DESIGN_REF" | head -1 | sed 's/Requirements ref\*\*: //' | tr -d '*' || echo "")
fi

# ── Đếm Acceptance Criteria ──
AC_TOTAL=0; AC_MET=0
if [[ -n "$REQ_REF" && -f "$REQ_REF" ]]; then
  AC_TOTAL=$(grep -c 'Given.*When.*Then' "$REQ_REF" 2>/dev/null || echo 0)
  AC_MET=$(grep -c '^\- \[x\].*Given' "$REQ_REF" 2>/dev/null || echo 0)
fi

# ── Lấy danh sách tasks đã làm / chưa làm ──
TASKS_DONE=$(grep '^- \[x\]' "$TASKS_FILE" 2>/dev/null | sed 's/^- \[x\] /  ✅ /' || echo "  (chưa có)")
TASKS_PENDING=$(grep '^- \[ \]' "$TASKS_FILE" 2>/dev/null | sed 's/^- \[ \] /  ⏳ /' || echo "  (không có)")

# ── Lấy File Map từ design ──
FILE_MAP="(Xem chi tiết tại: ${DESIGN_REF:-N/A})"
if [[ -n "$DESIGN_REF" && -f "$DESIGN_REF" ]]; then
  FILE_MAP=$(awk '/## 📁 File Map/,/^## /' "$DESIGN_REF" 2>/dev/null | grep '^\|' | grep -v 'Action\|---' || echo "$FILE_MAP")
fi

# ── Xác định status label ──
case "$STATUS" in
  success) STATUS_LABEL="✅ THÀNH CÔNG" ;;
  partial) STATUS_LABEL="⚠️  HOÀN THÀNH MỘT PHẦN" ;;
  failed)  STATUS_LABEL="❌ THẤT BẠI" ;;
  *)       STATUS_LABEL="$STATUS" ;;
esac

# ── Tạo file báo cáo ──
cat > "$REPORT_FILE" <<MD
# Báo cáo hoàn thành — $TASK_TITLE
**Task ID**: $TASK_ID  |  **Ngày**: $DATE_READABLE  |  **Trạng thái**: $STATUS_LABEL

---

## 📊 Tổng quan kết quả

| Chỉ số | Kết quả |
|--------|---------|
| Tasks hoàn thành | $DONE / $TOTAL |
| Tasks còn lại | $REMAINING |
| Acceptance Criteria met | $AC_MET / $AC_TOTAL |
| Trạng thái | $STATUS_LABEL |
| Thời gian hoàn thành | $DATE_READABLE |

---

## ✅ Công việc đã hoàn thành

$TASKS_DONE

## ⏳ Công việc chưa hoàn thành

$TASKS_PENDING

---

## 📁 Files đã thay đổi

$FILE_MAP

> Chi tiết: $DESIGN_REF

---

## 🎯 Acceptance Criteria

> Chi tiết: $REQ_REF

<!-- Agent điền: từng AC đã met hay chưa -->
| AC | Mô tả | Status |
|----|-------|--------|
| | | ✅/❌ |

---

## 🐛 Vấn đề gặp phải

> <!-- Agent điền: mô tả vấn đề nếu có, hoặc "Không có vấn đề đáng kể" -->

## 💡 Đề xuất bước tiếp theo

> <!-- Agent điền: 1-3 gợi ý hành động tiếp theo -->

---

## 📎 Tài liệu liên quan

| Loại | Đường dẫn |
|------|-----------|
| Requirements | ${REQ_REF:-N/A} |
| Design | ${DESIGN_REF:-N/A} |
| Tasks | $TASKS_FILE |
| Report | $REPORT_FILE |

---
*Báo cáo tạo tự động bởi Antigravity Agent v2.1*
MD

# Ghi log
echo "[${TS}] [REPORT] ${STATUS_LABEL} — ${REPORT_FILE}" >> "$LOG"

# ── Hiển thị summary cho user ──
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 BÁO CÁO HOÀN THÀNH: $TASK_TITLE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  $STATUS_LABEL"
echo "  ✅ Tasks     : $DONE/$TOTAL hoàn thành"
echo "  🎯 AC met    : $AC_MET/$AC_TOTAL criteria"
if (( REMAINING > 0 )); then
  echo "  ⏳ Còn lại  : $REMAINING tasks"
fi
echo "  📄 Báo cáo  : $REPORT_FILE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
