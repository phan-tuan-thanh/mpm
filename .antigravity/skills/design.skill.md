# Skill: Design (Phase 2)

## Mô tả
Phân tích kiến trúc, tạo file design và chia nhỏ task breakdown từ requirements đã approved.

## Trigger
- Sau khi skill:requirements hoàn tất và file requirements đã APPROVED
- Context đã đủ (checklist ✅)

## Điều kiện tiên quyết
- File requirements tồn tại với Status: APPROVED

## Quy trình

```
1. Chạy: bash .antigravity/hooks/pre-design.sh (kiểm tra requirements approved).
2. Đọc memory/project.context.json để lấy steering data (architecture, coding style, tech stack).
3. Đọc file requirements đã approved để hiểu User Stories + AC.
4. Soạn Design Analysis vào file plans/<ts>-<slug>.design.md:
   - Architecture Overview
   - Data Model (nếu có)
   - API Contracts (nếu có)
   - File Map ([NEW], [MODIFY], [DELETE])
   - Technical Decisions
   - Risks & Mitigation
5. Soạn Task Breakdown vào file plans/<ts>-<slug>.tasks.md:
   - Chia nhỏ thành sub-tasks checkbox
   - Mỗi task liên kết tới User Story (US-1, US-2, ...)
   - Verification Checklist
6. Hiển thị cho user review cả design và tasks.
7. Khi approved → chạy:
   bash .antigravity/commands/approve-plan.sh <design-file>
   bash .antigravity/commands/approve-plan.sh <tasks-file>
8. Chuyển sang skill: execute.
```

## Validation checklist

```
[ ] Architecture Overview rõ ràng
[ ] File Map đầy đủ (files tạo mới/sửa/xóa)
[ ] Technical Decisions có lý do
[ ] Risks đã được xác định
[ ] Tasks liên kết ngược tới User Stories
[ ] Mỗi task có checkbox
[ ] Verification Checklist tồn tại
```
