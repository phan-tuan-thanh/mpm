@.@# Implementation Plan

## Overview

Kế hoạch triển khai cho bugfix UI consistency của trang "Cài đặt dự án". Theo phương pháp luận bug condition: viết test phơi bày bug TRƯỚC khi fix (Bug Condition), viết test bảo toàn hành vi hiện hữu (Preservation), sau đó áp dụng fix và xác minh. Test dựa trên render component Angular qua TestBed + truy vấn DOM/class, kết hợp property-based testing (fast-check) cho preservation.

Các affected tabs (thư mục `apps/frontend/src/app/projects/pages/project-settings/`):
`states-tab`, `priorities-tab`, `estimates-tab`, `features-tab`, `labels-tab`, `members-tab`, `danger-zone-tab`. Chuẩn tham chiếu: `general-info-tab` với `STANDARD_ROOT_SPACING = space-y-5`.

## Tasks

- [x] 1. Viết test phơi bày Bug Condition (TRƯỚC khi fix)
  - **Property 1: Bug Condition** - Loại bỏ header cấp trang lặp & đồng nhất spacing
  - **CRITICAL**: Test này PHẢI FAIL trên code chưa fix — fail xác nhận bug tồn tại
  - **DO NOT attempt to fix the test or the code when it fails** — đây là kết quả mong đợi ở bước này
  - **NOTE**: Test này mã hóa hành vi đúng kỳ vọng — nó sẽ dùng lại để validate fix ở task 3.5
  - **GOAL**: Surface counterexamples chứng minh bug tồn tại (header trang lặp + spacing lệch)
  - **Scoped PBT Approach**: Với từng affected tab xác định (deterministic), scope property về các trường hợp cụ thể để tái lập ổn định, đồng thời chạy lặp qua tập 7 affected tabs
  - Thiết lập TestBed render từng affected tab; truy vấn DOM theo `isBugCondition(tab)` trong design:
    - states-tab: assert KHÔNG còn `<h2>` chứa "Trạng thái (States)" ở đầu template (sẽ FAIL)
    - features-tab: assert KHÔNG còn `<h2>` chứa "Tính năng (Feature Flags)" ở đầu template (sẽ FAIL)
    - priorities-tab / labels-tab / estimates-tab / members-tab / danger-zone-tab: assert KHÔNG còn khối tiêu đề + mô tả cấp trang ở đầu template (sẽ FAIL)
    - Với mọi affected tab: assert root spacing token của container ngoài cùng == `space-y-5` (sẽ FAIL với states/priorities/labels = `space-y-6`, features/members/danger-zone = `space-y-4`)
  - The test assertions phải khớp Expected Behavior Properties (Property 1) trong design: không header cấp trang lặp + root spacing == `space-y-5`
  - Chạy test trên code CHƯA fix
  - **EXPECTED OUTCOME**: Test FAILS (đúng — chứng minh bug tồn tại)
  - Ghi lại counterexamples để hiểu root cause:
    - Tồn tại `<h2>` tiêu đề cấp trang ở đầu các affected tab
    - Token `space-y-*` của root khác `space-y-5` (ví dụ `space-y-6` ở states)
  - Mark task complete khi test đã viết, đã chạy và failure đã được ghi lại
  - _Requirements: 1.1, 1.2, 2.1, 2.2_

- [x] 2. Viết test Preservation (TRƯỚC khi fix)
  - **Property 2: Preservation** - Giữ nguyên nút hành động, tiêu đề section, logic nghiệp vụ và layout cha
  - **IMPORTANT**: Theo observation-first methodology — quan sát hành vi trên code CHƯA fix rồi mới viết test chụp lại
  - Quan sát và ghi nhận hành vi baseline trên code CHƯA fix cho các yếu tố KHÔNG thỏa điều kiện bug (`isBugCondition` == false):
    - members-tab: ô tìm kiếm + nút "Thêm thành viên" hiển thị và hoạt động (mở dialog / đổi filter)
    - labels-tab: cụm nút bulk-delete + "bỏ chọn" hiển thị khi có selection
    - priorities-tab: nút "Thêm mức" hiển thị và mở form thêm
    - states-tab: nút "Áp dụng lại template" cấp section hiển thị
    - Tiêu đề cấp section/card: "Workspace Template", tên nhóm trạng thái, "Xem trước (Preview)", "Nhận diện dự án", "Mô tả", "Thông tin dự án"
    - general-info-tab: nội dung và root spacing (đã là chuẩn) không đổi
  - Viết test bao gồm property-based test (fast-check) chụp lại các hành vi trên qua nhiều tổ hợp trạng thái:
    - Sinh ngẫu nhiên tổ hợp (quyền read-only/có quyền, kích thước danh sách rỗng/nhiều, có/không selection) và xác minh sự hiện diện + chức năng của nút hành động + tiêu đề section qua mọi tổ hợp
    - Sinh ngẫu nhiên thao tác CRUD giả lập và xác minh handler component được gọi đúng (spy) như trước fix
  - Chạy test trên code CHƯA fix
  - **EXPECTED OUTCOME**: Tests PASS (xác nhận baseline behavior cần bảo toàn)
  - Mark task complete khi tests đã viết, đã chạy và passing trên code chưa fix
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3. Fix loại bỏ header cấp trang lặp & đồng nhất root spacing ở 7 affected tabs

  - [x] 3.1 Bỏ khối header cấp trang ở các tab chỉ có tiêu đề (states, estimates, features, danger-zone)
    - states-tab (`states-tab/states-tab.component.html`): xóa khối `<div><h2>Trạng thái (States)</h2><p>...</p></div>` ở đầu template
    - estimates-tab (`estimates-tab/estimates-tab.component.ts`, template inline): xóa khối `<h2>Ước lượng (Estimates)</h2>` + mô tả
    - features-tab (`features-tab/features-tab.component.ts`, template inline): xóa khối `<h2>Tính năng (Feature Flags)</h2>` + mô tả
    - danger-zone-tab (`danger-zone-tab/danger-zone-tab.component.ts`, template inline): xóa khối `<h2>Danger Zone</h2>` + mô tả
    - KHÔNG đụng tới phần nội dung phía sau (section/card, nút hành động cấp section)
    - _Bug_Condition: isBugCondition(tab) khi tab.rendersPageLevelTitle == true (states, estimates, features, danger-zone)_
    - _Expected_Behavior: NOT result.hasDuplicatePageHeader (từ design Property 1)_
    - _Preservation: giữ nguyên tiêu đề cấp section/card và logic CRUD (Preservation Requirements)_
    - _Requirements: 2.1_

  - [x] 3.2 Tách header khỏi nút hành động ở các tab có nút cùng hàng (members, labels, priorities)
    - members-tab (`members-tab/members-tab.component.ts`, template inline): trong flex header chỉ xóa `<div>` chứa `<h2>Thành viên dự án</h2>` + mô tả; GIỮ NGUYÊN ô search + nút "Thêm thành viên"
    - labels-tab (`labels-tab/labels-tab.component.ts`, template inline): chỉ xóa `<div>` chứa `<h2>Labels</h2>` + mô tả; GIỮ NGUYÊN cụm nút bulk-delete + "bỏ chọn"
    - priorities-tab (`priorities-tab/priorities-tab.component.html`): chỉ xóa `<div>` chứa `<h2>Mức ưu tiên</h2>` + mô tả; GIỮ NGUYÊN nút "Thêm mức"
    - Nâng cụm nút hành động lên làm con trực tiếp của root (hoặc bỏ `justify-between` cho phù hợp) để vẫn hiển thị và hoạt động đúng
    - _Bug_Condition: isBugCondition(tab) khi header gộp chung flex-row với nút hành động (members, labels, priorities)_
    - _Expected_Behavior: NOT result.hasDuplicatePageHeader, đồng thời nút hành động vẫn render và hoạt động_
    - _Preservation: Requirements 3.1 — nút search/add/bulk-delete giữ nguyên chức năng_
    - _Requirements: 2.1, 3.1_

  - [x] 3.3 Đồng nhất root spacing về `space-y-5` cho mọi affected tab
    - `space-y-6` → `space-y-5`: states, priorities, labels
    - `space-y-4` → `space-y-5`: features, members, danger-zone
    - estimates: đã là `space-y-5`, giữ nguyên token (chỉ bỏ header ở 3.1)
    - KHÔNG thay đổi spacing nội bộ trong từng section/card
    - _Bug_Condition: isBugCondition(tab) khi tab.rootSpacingToken != STANDARD_ROOT_SPACING ('space-y-5')_
    - _Expected_Behavior: result.rootSpacingToken == STANDARD_ROOT_SPACING (từ design Property 1 / Fix Checking)_
    - _Preservation: giữ nguyên spacing nội bộ section/card (Preservation Requirements)_
    - _Requirements: 2.2_

  - [x] 3.4 Giữ nguyên trang cha và tab chuẩn (không thay đổi)
    - KHÔNG thay đổi `GeneralTabComponent` và `ProjectSettingsComponent` (header chung "Cài đặt dự án" + mô tả + thanh tab + router-outlet + chỉ báo tab active)
    - KHÔNG thay đổi `general-info-tab` (đã là chuẩn)
    - KHÔNG thay đổi logic TypeScript (signals, computed, services, store), dialog, toast, drag-drop, phân trang, lọc
    - _Bug_Condition: isBugCondition('general-info-tab') == false → không tác động_
    - _Expected_Behavior: render và hành vi giống hệt trước fix_
    - _Preservation: Requirements 3.3, 3.4, 3.5_
    - _Requirements: 3.3, 3.4, 3.5_

  - [x] 3.5 Xác minh test Bug Condition (task 1) giờ PASS
    - **Property 1: Expected Behavior** - Loại bỏ header cấp trang lặp & đồng nhất spacing
    - **IMPORTANT**: Chạy lại CHÍNH test từ task 1 — KHÔNG viết test mới
    - Test từ task 1 mã hóa hành vi đúng kỳ vọng; khi nó PASS nghĩa là expected behavior được thỏa
    - Chạy test Bug Condition từ task 1 trên code ĐÃ fix
    - **EXPECTED OUTCOME**: Test PASSES (xác nhận bug đã được fix: không header trang lặp + root spacing == `space-y-5`)
    - _Requirements: 2.1, 2.2_

  - [x] 3.6 Xác minh test Preservation (task 2) vẫn PASS
    - **Property 2: Preservation** - Giữ nguyên nút hành động, tiêu đề section, logic nghiệp vụ và layout cha
    - **IMPORTANT**: Chạy lại CHÍNH các test từ task 2 — KHÔNG viết test mới
    - Chạy các test Preservation (gồm property-based) từ task 2 trên code ĐÃ fix
    - **EXPECTED OUTCOME**: Tests PASS (xác nhận không có regression)
    - Xác nhận nút hành động, tiêu đề section, logic CRUD, header chung + thanh tab cha và general-info-tab giữ nguyên
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 4. Checkpoint - Đảm bảo toàn bộ test pass
  - Chạy toàn bộ test suite frontend liên quan (unit + property-based) và xác nhận tất cả pass
  - Thực hiện integration check: điều hướng qua từng tab con, xác nhận khoảng cách từ thanh tab xuống nội dung đồng nhất và không còn header trang lặp
  - Nếu phát sinh vấn đề hoặc câu hỏi, hỏi người dùng trước khi tiếp tục
  - _Requirements: 1.1, 1.2, 2.1, 2.2, 3.1, 3.2, 3.3, 3.4, 3.5_

## Task Dependency Graph

```json
{
  "waves": [
    {
      "wave": 1,
      "tasks": ["1", "2"],
      "description": "Viết test trước khi fix: Bug Condition (fail trên code chưa fix) và Preservation (pass trên code chưa fix). Hai task độc lập, có thể làm song song."
    },
    {
      "wave": 2,
      "tasks": ["3"],
      "description": "Áp dụng fix (3.1-3.4) và xác minh test (3.5 phụ thuộc Task 1, 3.6 phụ thuộc Task 2). Phụ thuộc wave 1."
    },
    {
      "wave": 3,
      "tasks": ["4"],
      "description": "Checkpoint: đảm bảo toàn bộ test pass. Phụ thuộc wave 2."
    }
  ]
}
```

## Notes

- Đây là bug thuần UI (template Angular), KHÔNG thay đổi logic nghiệp vụ.
- Chuẩn tham chiếu duy nhất: `general-info-tab` với `STANDARD_ROOT_SPACING = space-y-5`.
- Property-based testing dùng `fast-check`; render component qua Angular TestBed.
- Test Task 1 PHẢI fail trên code chưa fix (xác nhận bug); Test Task 2 PHẢI pass trên code chưa fix (baseline cần bảo toàn).
- Không sửa trang cha `GeneralTabComponent` / `ProjectSettingsComponent` và `general-info-tab`.
