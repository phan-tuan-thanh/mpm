# Plan: Task 3.3 — Đồng nhất root spacing về `space-y-5`

## Task ID & Tên
- **Task**: 3.3 Đồng nhất root spacing về `space-y-5` cho mọi affected tab
- **Spec**: project-settings-tab-ui-consistency (bugfix)

## Approach
Chỉ đổi token `space-y-*` của container ngoài cùng (root `<div>`) ở mỗi affected tab về `space-y-5`. KHÔNG đụng spacing nội bộ section/card, KHÔNG đụng logic TS, KHÔNG sửa spec files.

## Files sẽ sửa
- `states-tab/states-tab.component.html` — `space-y-6` → `space-y-5`
- `priorities-tab/priorities-tab.component.html` — `space-y-6` → `space-y-5`
- `labels-tab/labels-tab.component.ts` (inline, root sau `<p-confirmDialog />`) — `space-y-6` → `space-y-5`
- `features-tab/features-tab.component.ts` (inline) — `space-y-4` → `space-y-5`
- `members-tab/members-tab.component.ts` (inline) — `space-y-4` → `space-y-5`
- `danger-zone-tab/danger-zone-tab.component.ts` (inline) — `space-y-4` → `space-y-5`
- estimates-tab: đã `space-y-5`, KHÔNG đổi

## Acceptance Criteria
- _Bug_Condition_: tab.rootSpacingToken != 'space-y-5'
- _Expected_Behavior_: result.rootSpacingToken == 'space-y-5'
- _Requirements_: 2.2

## Dependencies
- 3.1, 3.2 (đã done) — header removal đã thực hiện trước.

## Verification
- get_diagnostics trên các file đã sửa.
- Chạy bug-condition spec `project-settings-tab-consistency.spec.ts` (không sửa).


## Kết quả thực thi

### Files đã sửa (6) — root `space-y-*` → `space-y-5`
- states-tab.component.html: `space-y-6` → `space-y-5` ✅
- priorities-tab.component.html: `space-y-6` → `space-y-5` ✅
- labels-tab.component.ts (root sau `<p-confirmDialog />`): `space-y-6` → `space-y-5` ✅
- features-tab.component.ts: `space-y-4` → `space-y-5` ✅
- members-tab.component.ts: `space-y-4` → `space-y-5` ✅
- danger-zone-tab.component.ts: `space-y-4` → `space-y-5` ✅
- estimates-tab: đã `space-y-5`, KHÔNG đổi ✅

### Diagnostics: sạch trên cả 6 file.

### Bug-condition spec (`project-settings-tab-consistency.spec.ts`): 13 passed / 2 failed
- 2 failure đều thuộc **labels-tab** (per-tab "root spacing token == space-y-5" + property-based shrink → labels-tab).
- Nguyên nhân: `analyzeTab` đọc `host.firstElementChild`. Template inline labels-tab mở đầu bằng `<p-toast />` + `<p-confirmDialog />` trước root `<div class="space-y-5">`. jsdom KHÔNG coi `<p-toast />` là tự đóng (chỉ void/SVG) → `firstElementChild` trở thành `<p-toast>` bao toàn bộ → `rootSpacingToken` = `null` thay vì `space-y-5`.
- Đây là giới hạn của spec test (protected, không được sửa), KHÔNG phải lỗi fix. Fix spacing của labels-tab đúng theo hướng dẫn cấu trúc.
- Cần user/orchestrator quyết định ở task 3.5 (verify) về việc điều chỉnh analyzer trong spec, vì spec là file protected.
