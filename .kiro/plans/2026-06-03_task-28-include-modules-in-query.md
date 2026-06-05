# Task 28: Backend — Task Service: include modules trong query

## Task ID
28

## Approach
Thêm LEFT JOIN `task_modules → modules` vào `findAll()` trong `task.service.ts` để include `modules: TaskModuleRef[]` trong response.

Vì TypeORM `getManyAndCount()` trả entity đã hydrate relations, nhưng `task_modules` + `modules` chưa được define trong Task entity relations, ta có 2 hướng:

1. **Approach A**: Thêm `@ManyToMany(() => Module)` relation trên Task entity → dùng `leftJoinAndSelect`
2. **Approach B**: Sau khi query tasks, batch-fetch modules riêng rồi merge

Chọn **Approach A** vì:
- Hiệu quả hơn (1 query thay vì 2)
- Consistent với cách labels & assignees đang dùng
- Task entity cần thêm ManyToMany → modules thông qua join table `task_modules`

## Files sẽ tạo/sửa
- `apps/backend/src/task/entities/task.entity.ts` — thêm `@ManyToMany(() => Module)` relation
- `apps/backend/src/task/task.service.ts` — thêm `leftJoinAndSelect` cho modules trong `findAll()`; thêm scope filter
- `apps/backend/src/task/task.module.ts` — import Module entity vào TypeOrmModule.forFeature (nếu cần)

## Scope filter logic
Chỉ include modules visible trong project:
- module.scope = 'workspace' AND module.workspace_id = project.workspace_id
- OR module.scope = 'project' AND module.project_id = :projectId

## Acceptance criteria
- `GET /api/projects/:pid/tasks` response chứa `modules: TaskModuleRef[]` cho mỗi task
- Modules cross-workspace không bị leak
- Tasks không thuộc module nào có `modules: []`

## Dependencies
- Task 24 (migration CreateModules) ✅ done
- Task 25 (Module entity + shared types) ✅ done
- Task 26 (ModuleService) ✅ done
- Task 27 (ModuleController) ✅ done (wave 18)
