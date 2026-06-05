# Plan: Task 29 — Wire ModuleModule vào AppModule

## Task ID
29. Backend — Wire ModuleModule vào AppModule

## Approach
Thay vì tạo file `module.module.ts` riêng (sẽ phức tạp vì cần shared entities & cross-module dependencies), sẽ đăng ký trực tiếp `ModuleController`, `WorkspaceModuleController`, và `ModuleService` vào `task.module.ts` hiện có — cùng pattern với LabelController/WorkspaceLabelController. Thêm `TaskModule` entity vào `TypeOrmModule.forFeature` vì service cần inject repository cho nó.

## Files sẽ sửa
- `apps/backend/src/task/task.module.ts` — thêm imports, controllers, providers

## Acceptance Criteria
- ModuleController, WorkspaceModuleController đăng ký trong controllers array
- ModuleService đăng ký trong providers array
- TaskModule entity đăng ký trong TypeOrmModule.forFeature
- Backend compile thành công

## Dependencies
- Task 26 (ModuleService) ✅ done
- Task 27 (ModuleController) ✅ done
- Task 25 (Module entity + TaskModule entity) ✅ done
