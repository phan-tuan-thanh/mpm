#!/usr/bin/env bash
# new-skill.sh — Tạo một skill mới cho Agent từ template
# Usage: bash .antigravity/commands/new-skill.sh "Tên Skill"

set -euo pipefail

SKILL_NAME="${1:-}"
[[ -z "$SKILL_NAME" ]] && { echo "Usage: $0 <skill name>"; exit 1; }

SLUG=$(echo "$SKILL_NAME" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/-\+/-/g' | sed 's/^-//;s/-$//')
SKILL_FILE=".antigravity/skills/${SLUG}.skill.md"

if [[ -f "$SKILL_FILE" ]]; then
    echo "❌ Lỗi: Skill file đã tồn tại: $SKILL_FILE"
    exit 1
fi

TEMPLATE_FILE=".antigravity/templates/skill.md"
if [[ ! -f "$TEMPLATE_FILE" ]]; then
    echo "❌ Lỗi: Không tìm thấy template tại $TEMPLATE_FILE"
    exit 1
fi

sed "s/{{SKILL_NAME}}/$SKILL_NAME/g" "$TEMPLATE_FILE" > "$SKILL_FILE"

echo ""
echo "✨ Đã tạo skill mới thành công!"
echo "📂 Đường dẫn: $SKILL_FILE"
echo "➡️  Hãy mở file trên để cập nhật Quy trình & Trình kích hoạt (Trigger) cho skill."
echo ""
