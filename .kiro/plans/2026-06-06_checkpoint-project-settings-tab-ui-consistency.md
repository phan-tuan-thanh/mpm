# Plan — Task 4 Checkpoint: project-settings-tab-ui-consistency

## Task ID & Tên
- **Task 4 (Checkpoint)** — Đảm bảo toàn bộ test pass; xác nhận không regression; xác nhận tính nhất quán spacing/header.
- Spec: `.kiro/specs/project-settings-tab-ui-consistency/` (specType: bugfix)

## Approach
Đây là task checkpoint (không implement code mới). Các bước:
1. Chạy 2 spec file của bugfix cùng nhau:
   - `project-settings-tab-consistency.spec.ts` (bug-condition, kỳ vọng 15/15)
   - `project-settings-tab-preservation.spec.ts` (preservation, kỳ vọng 28/28)
2. Chạy broader scope `src/app/projects/pages/project-settings` để soi regression.
3. Static integration check: đọc 7 tab templates đã sửa để xác nhận:
   - (a) không còn `<h2>` header cấp trang lặp ở đầu template
   - (b) root container dùng `space-y-5`
   - (c) `GeneralTabComponent`/`ProjectSettingsComponent` + `general-info-tab` KHÔNG bị sửa
4. `get_diagnostics` trên 7 file tab + 2 spec file.

## Files liên quan (chỉ đọc — không sửa)
- 7 affected tabs: states, priorities, estimates, features, labels, members, danger-zone
- 2 spec files: project-settings-tab-consistency.spec.ts, project-settings-tab-preservation.spec.ts
- Parent: general-tab.component, project-settings.component, general-info-tab (xác nhận unchanged)

## Acceptance Criteria
- Bug-condition 15/15 PASS + preservation 28/28 PASS
- Không regression mới trong các spec khác cùng scope
- Header/spacing consistency được xác nhận qua static check
- Không có lỗi TS/template trong 9 file

## Dependencies
- Wave 2 (Task 3.1–3.6) đã hoàn thành (đánh dấu [x] trong tasks.md). ✅
