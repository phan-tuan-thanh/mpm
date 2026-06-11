# Plan — Task 3.5: Xác minh test Bug Condition (task 1) giờ PASS

**Task ID:** 3.5
**Spec:** project-settings-tab-ui-consistency (bugfix)
**Ngày:** 2026-06-11

## Approach
Chạy lại CHÍNH test Bug Condition từ task 1 (`project-settings-tab-consistency.spec.ts`) trên code ĐÃ fix và xác nhận tất cả PASS.

Một lần chạy trước cho 13 passed / 2 failed (labels-tab root spacing trả về `null`).
Root cause (đã xác nhận, authorized fix): helper `analyzeTab` đọc `host.firstElementChild`
để tìm root container. Template inline của labels-tab bắt đầu bằng custom elements
tự đóng `<p-toast />` và `<p-confirmDialog />`. jsdom KHÔNG coi custom element là
self-closing (chỉ void/SVG), nên `<p-toast>` bọc toàn bộ phần sau nó →
`firstElementChild` = `<p-toast>` (không có class `space-y-*`) → trả về `null`.
Root `<div class="space-y-5">` thực tế trong template là đúng.

## Files sẽ sửa
- `apps/frontend/src/app/projects/pages/project-settings/project-settings-tab-consistency.spec.ts`
  — CHỈ sửa helper định vị root (DOM-querying), không đụng assertion / tabs / expected values / numRuns.

## Authorized fix (minimal, robustness)
Thay `host.firstElementChild` bằng `host.querySelector('[class*="space-y-"]')` —
tìm phần tử ĐẦU TIÊN theo document order có class `space-y-*`. Vì root container là
ancestor của nội dung bên trong nên nó xuất hiện trước trong document order → được
chọn đúng cho cả 7 tab. Kèm comment giải thích giới hạn parse custom-element của jsdom.

## STRICT CONSTRAINTS
- KHÔNG weaken/remove/relax assertion: `expect(hasDuplicatePageHeader).toBe(false)`
  và `expect(rootSpacingToken).toBe('space-y-5')` (+ PBT equivalents) giữ nguyên.
- KHÔNG đổi list tabs, expected values, numRuns, cấu trúc test.

## Acceptance criteria (Requirements 2.1, 2.2)
- Không header cấp trang lặp ở mọi affected tab.
- root spacing token == `space-y-5` ở mọi affected tab.
- EXPECTED OUTCOME: ALL tests PASS.

## Verify
`cd apps/frontend && npx jest src/app/projects/pages/project-settings/project-settings-tab-consistency.spec.ts`

## Kết quả thực thi (2026-06-11)
- Trước fix helper: **13 passed / 2 failed** (labels-tab root spacing → `null`) — đúng như mô tả.
- Sau fix helper (`querySelector('[class*="space-y-"]')`): **15 passed / 0 failed**.
- Xác nhận root spacing == `space-y-5` cho cả 7 affected tab (states/priorities/estimates/features/labels/members/danger-zone), không false positive/negative.
- Assertion giữ nguyên 100%; chỉ sửa cách định vị root element.
- **EXPECTED OUTCOME đạt:** Test PASS → bug đã fix (không header trang lặp + root spacing đồng nhất).
