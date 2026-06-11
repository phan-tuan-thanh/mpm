# Plan — Task 2: Viết test Preservation (TRƯỚC khi fix)

Spec: `project-settings-tab-ui-consistency` (bugfix)
Date: 2026-06-07

## Task ID & Name
Task 2 — Viết test Preservation (Property 2: Preservation).
Quan sát hành vi baseline trên code CHƯA fix, viết test (gồm property-based với
fast-check) chụp lại các hành vi đó. Tests PHẢI PASS trên code chưa fix.

_Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

## Approach (observation-first, nhất quán với Task 1)
Task 1 dùng cách **đọc template source** (file `.html` hoặc inline template trong
`.ts`), render vào jsdom để truy vấn DOM, vì 7 component có DI nặng (ProjectStore,
ProjectService, AuthService, LabelStore, Router...) khiến TestBed render thật rất
phức tạp/giòn. Task 2 dùng lại cách tiếp cận ổn định này:

- **Section/card titles** (DOM query trên jsdom): "Workspace Template" (states),
  "Xem trước (Preview)" (estimates), "Nhận diện dự án" / "Mô tả" / "Thông tin dự án"
  (general-info). Nhất quán với Task 1 (query `<h2>`/`<h3>` theo textContent).
- **Action controls + handler binding** (so khớp trên template source string):
  vì cú pháp Angular `(click)="handler()"`, `[label]`, control-flow `@if` không
  render thành DOM chuẩn trong jsdom — string-match trên template là cách ĐÁNG TIN
  CẬY NHẤT để khẳng định nút hành động + binding handler được bảo toàn.
  - members: ô search "Tìm tên hoặc email..." → `onSearchChange`; nút "Thêm thành viên" → `showAddDialog()`
  - labels: bulk-delete → `confirmBulkDeleteProj()`; "bỏ chọn" → `clearProjSelection()` (guard `projSelected().size > 0`)
  - priorities: "Thêm mức" → `showAddForm.set(true)` (guard `!isReadOnly()`)
  - states: "Áp dụng lại template" → `onApplyTemplate()` (guard `isAdmin()`)
- **Handler method existence** (đọc component `.ts`): regex xác nhận method tồn tại
  trên class — proxy ổn định cho "handler được gọi đúng (spy)" trong điều kiện DI nặng.
- **Visibility guards** (PBT): mô hình hoá guard (`notReadOnly` / `hasSelection` /
  `isAdmin` / `always`), sinh ngẫu nhiên render-state để xác minh ngữ nghĩa hiển thị
  baseline (Requirement 3.1) + khẳng định token guard còn trong template.
- **general-info-tab unchanged**: section titles + spacing token `5` còn nguyên.

### Vì sao không dùng TestBed/spy thật
Note trong tasks.md cho phép "asserting bindings in template source" do ràng buộc
DI. Cách này ổn định, tái chạy được nguyên vẹn ở task 3.6, không phụ thuộc mock services.

## Files
- TẠO: `apps/frontend/src/app/projects/pages/project-settings/project-settings-tab-preservation.spec.ts`

## Tests (gồm property-based)
1. Action controls preserved (per-tab deterministic) — members/labels/priorities/states.
2. Handler bindings + method existence preserved.
3. Section/card titles preserved (states/estimates/general-info).
4. general-info-tab unchanged (titles + spacing).
5. PBT — iterate action controls: binding + handler tồn tại qua mọi run.
6. PBT — random render-state combos: ngữ nghĩa guard hiển thị baseline đúng + token guard còn.
7. PBT — random CRUD ops: action → handler mapping đúng (proxy spy).

## Acceptance Criteria
- Tests đã viết, chạy được trên code CHƯA fix.
- **EXPECTED OUTCOME**: Tests PASS (xác nhận baseline cần bảo toàn).
- File đặt tên để chạy lại nguyên vẹn ở task 3.6.

## Dependencies
Wave 1 — độc lập với Task 1. Không phụ thuộc task nào chưa done.
