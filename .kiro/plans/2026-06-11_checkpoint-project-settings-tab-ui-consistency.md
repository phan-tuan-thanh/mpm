# Plan — Task 4 Checkpoint: project-settings-tab-ui-consistency

## Task ID & Tên
- Spec: `project-settings-tab-ui-consistency` (bugfix)
- Task 4: Checkpoint — Đảm bảo toàn bộ test pass

## Approach
Đây là task verification (không thay đổi code). Các bước:
1. Chạy 2 spec file bugfix (bug-condition + preservation) → kỳ vọng 15/15 + 28/28 pass.
2. Chạy toàn bộ spec dưới `project-settings` để phát hiện regression.
3. Static integration check: đọc 7 tab template đã sửa, xác nhận (a) không còn `<h2>` header cấp trang ở đầu, (b) root container dùng `space-y-5`, (c) parent + general-info-tab không bị sửa.
4. `get_diagnostics` trên 7 file tab + 2 spec file.

## File sẽ tạo/sửa
- Chỉ tạo plan file này (verification task — không sửa source).

## Acceptance Criteria
- Bug-condition spec: 15/15 pass.
- Preservation spec: 28/28 pass.
- Không có regression mới dưới project-settings.
- Header/spacing consistency xác nhận qua static check.
- Diagnostics: 0 lỗi TS/template.
- _Requirements: 1.1, 1.2, 2.1, 2.2, 3.1, 3.2, 3.3, 3.4, 3.5_

## Dependencies
- Wave 2 (Task 3.1–3.6) đã done. Task 4 thuộc wave 3.

## Kết quả (2026-06-11)
- Bug-condition spec: **15/15 PASS** ✅
- Preservation spec: **28/28 PASS** ✅
- Tổng 2 spec chạy chung: 43/43 PASS.
- Toàn bộ `project-settings`: chỉ tồn tại 2 spec trên → 2 suites / 43 tests PASS. Không có spec pre-existing khác ⇒ không có regression collateral.
- Static check 7 tab template:
  - (a) Không còn `<h2>` header cấp trang ở đầu: ✅ cả 7 tab.
  - (b) Root container `space-y-5`: ✅ cả 7 tab.
  - (c) `project-settings.component.ts` & `general-info-tab.component.ts`: 0 thay đổi ✅.
    - `general-tab.component.ts`: CÓ thay đổi (đổi tiêu đề "Cấu hình dự án"→"Cài đặt dự án" + thêm tab nav "Labels"), nhưng đây là staged change từ commit "enhance project settings" trước đó, KHÔNG phải header-removal/spacing của bugfix này; không vi phạm scope fix (parent vẫn render header chung + thanh tab — đúng req 3.4).
- Diagnostics 7 tab + 2 spec: 0 lỗi TS/template ✅.

## Kết luận
Checkpoint PASS. Bug fixed (không header trang lặp + spacing đồng nhất `space-y-5`), không regression mới, consistency xác nhận.
