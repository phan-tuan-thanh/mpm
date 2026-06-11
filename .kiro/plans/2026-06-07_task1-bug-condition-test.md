# Plan — Task 1: Viết test phơi bày Bug Condition (TRƯỚC khi fix)

Spec: `project-settings-tab-ui-consistency` (bugfix)
Date: 2026-06-07

## Task
**Property 1: Bug Condition** — Loại bỏ header cấp trang lặp & đồng nhất root spacing.
Viết test PHẢI FAIL trên code chưa fix (chứng minh bug tồn tại). Test sẽ được dùng lại ở task 3.5 để validate fix.

## Approach kỹ thuật
- Đây là bug thuần cấu trúc template Angular (sự hiện diện của `<h2>` tiêu đề cấp trang ở đầu template + token `space-y-*` của container gốc).
- Kiểm thử bằng cách lấy template của từng affected tab, render vào DOM (jsdom của jest), rồi truy vấn DOM:
  - Lấy template từ source: file `.html` (states, priorities) đọc trực tiếp; template inline (estimates, features, labels, members, danger-zone) trích từ chuỗi `template:` trong `.ts`.
  - Parse vào một phần tử DOM thật và query bằng DOM API.
- Lý do không dùng full TestBed render: 7 component có DI rất nặng (ProjectStore + ProjectService/HttpClient, AuthService, LabelStore, LayoutService, Router, PrimeNG services). Render đầy đủ dễ gãy vì lý do không liên quan đến bug. Cách parse template-source bám đúng vào thứ bị sửa (template), deterministic, và sẽ tự động chuyển FAIL→PASS khi template được sửa ở task 3.
- **Scoped PBT (fast-check)**: dùng `fc.constantFrom(...AFFECTED_TABS)` để iterate qua tập 7 tab; mỗi case deterministic (scope về 1 tab cụ thể) cho tái lập ổn định.

## Files
- Tạo: `apps/frontend/src/app/projects/pages/project-settings/project-settings-tab-consistency.spec.ts`
- Sửa: `apps/frontend/package.json` (thêm devDependency `fast-check`)

## Assertions (khớp Expected Behavior Property 1)
Cho mỗi affected tab:
1. KHÔNG còn `<h2>` chứa tiêu đề cấp trang ở đầu template (sẽ FAIL hiện tại).
2. Token root spacing của container ngoài cùng == `space-y-5` (sẽ FAIL với states/priorities/labels=`space-y-6`, features/members/danger-zone=`space-y-4`).

Page-level title text theo tab:
- states: "Trạng thái (States)" — priorities: "Mức ưu tiên" — estimates: "Ước lượng (Estimates)"
- features: "Tính năng (Feature Flags)" — labels: "Labels" — members: "Thành viên dự án" — danger-zone: "Danger Zone"

## Acceptance criteria
- Test đã viết, đã chạy trên code CHƯA fix.
- EXPECTED OUTCOME: Test FAILS (đúng — chứng minh bug). Ghi lại counterexamples.
- KHÔNG fix code/test khi fail ở bước này.

## Requirements
1.1, 1.2, 2.1, 2.2


## Kết quả (đã chạy trên code CHƯA fix)
EXPECTED OUTCOME đạt: Test **FAILS** (14/15 assertions fail) — chứng minh bug tồn tại. ✅

Counterexamples ghi nhận:
- Header cấp trang (`<h2>`) còn render ở cả 7 affected tab.
- Root spacing lệch chuẩn: states/priorities/labels=`space-y-6`, features/members/danger-zone=`space-y-4`.
- estimates đã `space-y-5` → 1 assertion (estimates root spacing) PASS, đúng như design dự đoán.
- fast-check shrunk counterexample: `states-tab`.

Infra thay đổi kèm theo:
- `apps/frontend/package.json`: thêm devDependency `fast-check@^3.23.2`.
- `apps/frontend/tsconfig.spec.json`: thêm `"node"` vào `types` (cho fs/path trong spec; additive, an toàn).

KHÔNG fix code/test ở bước này (đúng quy trình bug condition). Test sẽ được chạy lại ở task 3.5.
