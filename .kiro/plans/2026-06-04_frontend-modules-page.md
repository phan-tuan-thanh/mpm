# Plan: Task 31 — Frontend — Trang Modules

## Task ID
31. Frontend — Trang Modules

## Approach
Tạo page Modules tại `/projects/:key/modules` với 3 components:
1. **modules.component.ts** — Container page: fetch modules qua ModuleStore, chia 2 nhóm (workspace/project), nút thêm mới
2. **module-card.component.ts** — Card component hiển thị thông tin module: tên, status badge, progress bar, task count, ngày, icon scope
3. **module-form.component.ts** — Dialog tạo/sửa module (PrimeNG Dialog): form fields name, description, status, start_date, end_date

Route `/projects/:key/modules` thay thế FeaturePlaceholderComponent bằng ModulesComponent.

## Files tạo/sửa
- **CREATE**: `apps/frontend/src/app/tasks/pages/modules/modules.component.ts`
- **CREATE**: `apps/frontend/src/app/tasks/pages/modules/module-card.component.ts`
- **CREATE**: `apps/frontend/src/app/tasks/pages/modules/module-form.component.ts`
- **MODIFY**: `apps/frontend/src/main.ts` — cập nhật route `modules` loadComponent

## Dependencies
- Task 30 (ModuleStore, ModuleService) — ✅ Done
- Task 25 (shared-types: ProjectModule, ModuleStatus) — ✅ Done

## Acceptance Criteria
- Trang hiển thị 2 nhóm: "Workspace Modules" (icon pi-globe) và "Project Modules" (icon pi-folder)
- Mỗi card hiển thị: tên, status badge (màu theo status), progress bar, số tasks, start/end date
- Có thể tạo/sửa module qua dialog form
- Route `/projects/:key/modules` load đúng component (lazy-loaded)
