# Task 18.1: Wire frontend và backend together

## Task ID
18.1

## Mô tả
Configure Angular proxy config cho development và environment files để frontend có thể giao tiếp với backend NestJS.

## Approach
1. Tạo `apps/frontend/proxy.conf.json` — proxy `/api` requests đến `http://localhost:3000`
2. Tạo `apps/frontend/src/environments/environment.prod.ts` — production environment với placeholder values
3. Verify environment.ts (dev) đã có đúng cấu hình

## Files sẽ tạo/sửa
- **Tạo mới**: `apps/frontend/proxy.conf.json`
- **Tạo mới**: `apps/frontend/src/environments/environment.prod.ts`

## Acceptance Criteria (từ Requirements 1.1, 1.6)
- Angular dev server proxy `/api` requests đến NestJS backend (http://localhost:3000)
- Tránh CORS issues trong development
- Environment files có đúng Authentik URLs và API base URL
- Production environment có placeholder values cho deployment

## Dependencies
- Task 15.x (Frontend Auth module core) — ✅ Done
- Task 16.x (Frontend Login/Callback pages) — ✅ Done
- Task 17 (Checkpoint verify frontend) — ✅ Done
