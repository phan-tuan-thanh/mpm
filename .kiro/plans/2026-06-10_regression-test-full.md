# Plan: Task 36 — Regression Test toàn bộ

## Task ID
36. Regression test toàn bộ

## Approach
Thực hiện regression verification bao gồm:
1. Backend unit tests (`npm test -- --watchAll=false`)
2. Backend TypeScript compile check (`npx tsc --noEmit`)
3. Frontend build (`ng build --configuration=development`)
4. Code review backward compatibility

## Files cần verify (không sửa)
- `apps/backend/src/task/label/label.service.ts` — findAll(projectId) fallback
- `apps/backend/src/project/project.service.ts` — seed default states khi stateTemplate = 'blank'
- `apps/frontend/src/app/tasks/pages/backlog/task-list/task-list.component.ts` — optional chaining, cdkDrag without handle

## Acceptance Criteria
- Backend tests pass
- Backend tsc --noEmit pass (no compile errors)
- Frontend build pass
- Backward compatibility confirmed via code review:
  - label.service.ts has `findAll(projectId)` for legacy
  - project.service.ts seeds default states when stateTemplate = 'blank'
  - task-list.component.ts handles missing modules/labels with `?.`
  - cdkDrag without handle uses CDK default 5px threshold

## Dependencies
- Tasks 1–35 (all sprints completed)
