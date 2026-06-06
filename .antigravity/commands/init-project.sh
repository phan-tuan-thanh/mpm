#!/usr/bin/env bash
# init-project.sh — Khởi tạo ngữ cảnh dự án và steering data
# Usage: bash .antigravity/commands/init-project.sh

set -euo pipefail

TS=$(date '+%Y%m%d-%H%M%S')
INIT_CTX_FILE=".antigravity/context/requirements-${TS}-init-project.md"

# Khởi chạy pre-task hook
bash .antigravity/hooks/pre-task.sh "Khởi tạo ngữ cảnh dự án & steering data"

cat > "$INIT_CTX_FILE" <<MD
# Requirements — Khởi tạo ngữ cảnh dự án
**Date**: $(date '+%Y-%m-%d %H:%M:%S')  |  **Task ID**: ${TS}-init-project  |  **Status**: DRAFT

---

## 📋 Tổng quan
> Khởi tạo thông tin dự án và steering data cho Agent.

## 👤 User Stories

### US-1: Cấu hình thông tin dự án
> **As a** developer, **I want to** cấu hình đầy đủ thông tin dự án, **so that** Agent hiểu rõ ngữ cảnh và tuân thủ quy tắc.

#### Acceptance Criteria
- [ ] **Given** file project.context.json rỗng, **When** hoàn thành phỏng vấn, **Then** tất cả trường trong file đều có giá trị.

## 📝 Câu hỏi phỏng vấn Steering Data
- [ ] Tên dự án và mục tiêu cốt lõi là gì?
- [ ] Tech stack chính (Language, Framework, Database, Infrastructure)?
- [ ] Quy định về coding style, commit message và branch naming?
- [ ] Architecture patterns (folder structure, design pattern, state management)?
- [ ] Testing strategy (framework, coverage minimum)?
- [ ] API conventions (REST/GraphQL, versioning, error format)?
- [ ] Môi trường chạy thử (Staging) và chạy thật (Production)?

---

## 🔏 Approval

| | |
|-|-|
| **Approved by** | _________________ |
| **Approved at** | _________________ |
MD

echo ""
echo "✨ Đã tạo file phỏng vấn ban đầu tại: $INIT_CTX_FILE"
echo "➡️  Bước tiếp theo: Hãy trả lời các câu hỏi trong file trên"
echo "   để Agent hoàn thiện file cấu hình project.context.json (steering data)"
echo ""
