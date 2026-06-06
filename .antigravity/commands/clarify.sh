#!/usr/bin/env bash
# clarify.sh — Tạo file Solution Summary để agent trình bày trước khi thực thi
# Usage: bash commands/clarify.sh "Task description"

set -euo pipefail
TASK_DESC="${1:-}"
[[ -z "$TASK_DESC" ]] && { echo "Usage: $0 <task description>"; exit 1; }

SLUG=$(echo "$TASK_DESC" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/-\+/-/g' | sed 's/^-//;s/-$//' | cut -c1-40)
TS=$(date '+%Y%m%d-%H%M%S')
SUMMARY_FILE=".antigravity/context/solution-summary-${TS}-${SLUG}.md"

cat > "$SUMMARY_FILE" <<MD
# Solution Summary — $TASK_DESC
**Date**: $(date '+%Y-%m-%d %H:%M:%S')  |  **Task**: ${TS}-${SLUG}  |  **Status**: DRAFT

---

## 🎯 Hiểu của tôi về yêu cầu
> <!-- Agent điền: 1-2 câu tóm tắt ngắn gọn yêu cầu bằng ngôn ngữ của mình -->

## 💡 Giải pháp đề xuất

**Approach**: <!-- Hướng tiếp cận tổng thể -->

**Pattern / Kỹ thuật**: <!-- Design pattern, thư viện, thuật toán nếu có -->

**Lý do chọn giải pháp này**: <!-- So với các phương án khác -->

## ✅ Sẽ làm (In Scope)
- [ ] <!-- action 1 -->
- [ ] <!-- action 2 -->
- [ ] <!-- action 3 -->

## 🚫 Sẽ KHÔNG làm (Out of Scope)
- <!-- item 1 — lý do ngoài scope -->
- <!-- item 2 -->

## 📁 Files sẽ bị ảnh hưởng (sơ bộ)

| Action | File | Ghi chú |
|--------|------|---------|
| [NEW]    | | |
| [MODIFY] | | |
| [DELETE] | | |

## ⚠️ Rủi ro & Lưu ý
- <!-- risk 1, hoặc "Không có rủi ro đáng kể" nếu task đơn giản -->

## ❓ Câu hỏi còn lại (nếu có)
- <!-- câu hỏi 1, hoặc xóa section này nếu đã rõ -->

---

## 🔏 User Confirmation

| | |
|-|-|
| **Confirmed by** | _________________ |
| **Confirmed at** | _________________ |
| **Notes / Chỉnh sửa** | |
MD

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📐 Solution Summary scaffold đã tạo:"
echo "   $SUMMARY_FILE"
echo ""
echo "➡️  Tiếp theo:"
echo "  1. Điền nội dung Solution Summary"
echo "  2. Trình bày cho user"
echo "  3. Khi user chốt → approve: bash .antigravity/commands/approve-plan.sh \"$SUMMARY_FILE\""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
