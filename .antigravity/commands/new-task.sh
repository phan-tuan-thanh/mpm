#!/usr/bin/env bash
# new-task.sh — Khởi tạo task mới với scaffold 3-Phase
# Usage: bash commands/new-task.sh "Mô tả task"

set -euo pipefail
TASK_DESC="${1:-}"
[[ -z "$TASK_DESC" ]] && { echo "Usage: $0 <task description>"; exit 1; }

SLUG=$(echo "$TASK_DESC" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/-\+/-/g' | sed 's/^-//;s/-$//' | cut -c1-40)
TS=$(date '+%Y%m%d-%H%M%S')
REQ_FILE=".antigravity/context/requirements-${TS}-${SLUG}.md"
DESIGN_FILE=".antigravity/plans/${TS}-${SLUG}.design.md"
TASKS_FILE=".antigravity/plans/${TS}-${SLUG}.tasks.md"

# Chạy hook
bash .antigravity/hooks/pre-task.sh "$TASK_DESC"

# ── Phase 1: Requirements scaffold ──
cat > "$REQ_FILE" <<MD
# Requirements — $TASK_DESC
**Date**: $(date '+%Y-%m-%d %H:%M:%S')  |  **Task ID**: ${TS}-${SLUG}  |  **Status**: DRAFT

---

## 📋 Tổng quan yêu cầu
> <!-- Mô tả ngắn gọn mục tiêu nghiệp vụ của task này -->

## 👤 User Stories

### US-1: <!-- Tên story -->
> **As a** [vai trò], **I want to** [hành động], **so that** [lợi ích].

#### Acceptance Criteria
- [ ] **Given** [ngữ cảnh], **When** [hành động], **Then** [kết quả mong đợi]
- [ ] **Given** ..., **When** ..., **Then** ...

### US-2: <!-- Tên story -->
> **As a** [vai trò], **I want to** [hành động], **so that** [lợi ích].

#### Acceptance Criteria
- [ ] **Given** ..., **When** ..., **Then** ...

## 🔒 Non-functional Requirements
- [ ] Performance: <!-- Thời gian phản hồi, throughput -->
- [ ] Security: <!-- Xác thực, phân quyền, mã hóa -->
- [ ] Accessibility: <!-- WCAG, hỗ trợ đa ngôn ngữ -->

## 🚫 Out of Scope
- <!-- Những gì KHÔNG làm trong task này -->

---

## 🔏 Approval

| | |
|-|-|
| **Approved by** | _________________ |
| **Approved at** | _________________ |
| **Notes** | |
MD

# ── Phase 2: Design scaffold ──
cat > "$DESIGN_FILE" <<MD
# Design — $TASK_DESC
**Task ID**: ${TS}-${SLUG}  |  **Requirements ref**: $REQ_FILE  |  **Status**: DRAFT

---

## 🏗️ Architecture Overview
> <!-- Mô tả kiến trúc tổng quan, sơ đồ thành phần chính -->

## 📊 Data Model
> <!-- Schema, entities, relationships (nếu có) -->

## 🔌 API Contracts (nếu có)

| Method | Endpoint | Request | Response | Notes |
|--------|----------|---------|----------|-------|
| | | | | |

## 📁 File Map

| Action | File Path | Mô tả thay đổi |
|--------|-----------|-----------------|
| [NEW]    | | |
| [MODIFY] | | |
| [DELETE] | | |

## 🧠 Technical Decisions

| Quyết định | Lý do | Phương án thay thế đã cân nhắc |
|------------|-------|-------------------------------|
| | | |

## ⚠️ Risks & Mitigation

| Rủi ro | Xác suất | Tác động | Giảm thiểu |
|--------|----------|----------|------------|
| | | | |

## 📊 Progress Log
> Cập nhật sau mỗi step trong execution

| Time | Task | Result | Notes |
|------|------|--------|-------|
| | | | |

---

## 🔏 Approval

| | |
|-|-|
| **Approved by** | _________________ |
| **Approved at** | _________________ |
| **Notes** | |
MD

# ── Phase 3: Tasks scaffold ──
cat > "$TASKS_FILE" <<MD
# Tasks — $TASK_DESC
**Task ID**: ${TS}-${SLUG}  |  **Design ref**: $DESIGN_FILE  |  **Status**: DRAFT

---

## ✅ Task Breakdown

### US-1: <!-- Tên story liên kết -->
- [ ] Task 1.1: <!-- Mô tả task cụ thể -->
- [ ] Task 1.2: <!-- Mô tả task cụ thể -->
- [ ] Task 1.3: <!-- Mô tả task cụ thể -->

### US-2: <!-- Tên story liên kết -->
- [ ] Task 2.1: <!-- Mô tả task cụ thể -->
- [ ] Task 2.2: <!-- Mô tả task cụ thể -->

## 🧪 Verification Checklist
- [ ] Tất cả AC trong requirements đã met
- [ ] Code đã pass linting/formatting
- [ ] Tests đã pass (nếu có)
- [ ] Không có regression
- [ ] Progress Log trong design đầy đủ

## 📊 Progress Summary

| Tổng tasks | Hoàn thành | Còn lại | % |
|------------|------------|---------|---|
| | | | |

---

## 🔏 Approval

| | |
|-|-|
| **Approved by** | _________________ |
| **Approved at** | _________________ |
| **Notes** | |
MD

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✨ Scaffold 3-Phase đã tạo thành công!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  📋 Phase 1 — Requirements: $REQ_FILE"
echo "  🏗️  Phase 2 — Design:       $DESIGN_FILE"
echo "  ✅ Phase 3 — Tasks:        $TASKS_FILE"
echo ""
echo "➡️  Tiếp theo:"
echo "  1. Điền User Stories + AC vào file requirements"
echo "  2. Approve: bash .antigravity/commands/approve-plan.sh \"$REQ_FILE\""
echo "  3. Sau đó điền Design → approve → điền Tasks → approve → Execute"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
