# Task 3.1 — Bỏ khối header cấp trang ở các tab chỉ có tiêu đề

**Spec:** project-settings-tab-ui-consistency
**Task ID:** 3.1
**Ngày:** 2026-06-06

## Mô tả / Approach
Loại bỏ khối tiêu đề + mô tả **cấp trang** lặp lại ở đầu 4 tab con (states, estimates,
features, danger-zone). Ngữ cảnh tab đã được header chung của trang cha + thanh tab active
thể hiện. Chỉ xóa khối header; KHÔNG đụng nội dung phía sau, KHÔNG đổi root spacing token
(việc đó thuộc Task 3.3), KHÔNG đổi logic TypeScript.

## Files sẽ sửa
- `apps/frontend/src/app/projects/pages/project-settings/states-tab/states-tab.component.html`
  - Xóa wrapper `<div class="flex justify-between items-center">` chỉ-bọc-header + `<div><h2>Trạng thái (States)</h2><p>...</p></div>`
- `apps/frontend/src/app/projects/pages/project-settings/estimates-tab/estimates-tab.component.ts` (inline)
  - Xóa `<div><h2>Ước lượng (Estimates)</h2><p>...</p></div>`
- `apps/frontend/src/app/projects/pages/project-settings/features-tab/features-tab.component.ts` (inline)
  - Xóa comment `<!-- Header -->` + wrapper `<div class="flex items-start justify-between">` chỉ-bọc-header + nội dung
- `apps/frontend/src/app/projects/pages/project-settings/danger-zone-tab/danger-zone-tab.component.ts` (inline)
  - Xóa comment `<!-- Header -->` + `<div><h2>Danger Zone</h2><p>...</p></div>`

## Acceptance Criteria
- _Bug_Condition_: isBugCondition(tab) khi tab.rendersPageLevelTitle == true
- _Expected_Behavior_: NOT result.hasDuplicatePageHeader
- _Requirements_: 2.1
- Giữ nguyên các section/card, nút hành động cấp section ("Áp dụng lại template" states,
  "Xem trước (Preview)" estimates), logic CRUD (Preservation).
- Không lỗi cú pháp TypeScript/template.

## Dependencies
- Wave 1 (Task 1, 2) đã hoàn thành. Task 3.1 thuộc Wave 2.

## Verification
- Kiểm tra diagnostics 4 file sau khi sửa.
- Xác nhận không còn `<h2>` tiêu đề cấp trang ở đầu 4 tab.
