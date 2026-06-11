# Plan — Task 3.4: Giữ nguyên trang cha và tab chuẩn (verification / non-modification)

- **Spec:** project-settings-tab-ui-consistency (bugfix)
- **Task ID:** 3.4
- **Loại:** Verification / Non-modification (KHÔNG sửa code trừ khi phát hiện regression)
- **Requirements:** 3.3, 3.4, 3.5
- **Bug_Condition:** isBugCondition('general-info-tab') == false → không tác động

## Approach
Dùng git để xác minh phạm vi thay đổi của fix (tasks 3.1–3.3):
1. `git status` / `git diff --stat` trên thư mục `project-settings/`.
2. Xác nhận CHỈ 7 affected tab template bị sửa bởi fix, + 2 spec file mới + config.
3. Xác nhận parent (`GeneralTabComponent` / `ProjectSettingsComponent`) và tab chuẩn (`general-info-tab`) KHÔNG bị fix sửa.
4. Nếu có file parent/standard bị sửa nhầm → BÁO CÁO (không tự revert).

## Files dự kiến tạo/sửa
- Không sửa code. Chỉ tạo plan file này.

## Acceptance criteria
- 3.3: logic nghiệp vụ CRUD/dialog/toast/drag-drop/phân trang/lọc không đổi.
- 3.4: parent header chung + thanh tab + outlet + active indicator giữ nguyên.
- 3.5: general-info-tab (chuẩn) render và spacing không đổi.

## Dependencies
- Task 3.1, 3.2, 3.3 (đã done) — wave 2.

## Kết quả xác minh (điền sau khi chạy git)
- Fix (unstaged) chỉ chạm 7 affected tab template: states, priorities (html); danger-zone, estimates, features, members, labels (ts inline). Template-only, không đụng logic class. ✓
- general-info-tab.component.ts (chuẩn): KHÔNG xuất hiện trong git status → không đổi. ✓
- ⚠ general-tab.component.ts (PARENT): bị sửa ở trạng thái STAGED (đổi tiêu đề "Cấu hình dự án"→"Cài đặt dự án", chỉnh mô tả, thêm tab "Labels"). Thuộc change-set RIÊNG (tính năng Labels: kèm sidebar/backlog/main.ts staged + file labels-tab mới). KHÔNG do fix UI consistency. Báo cáo, không revert.
