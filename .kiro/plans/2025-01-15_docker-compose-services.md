# Plan: Task 1.1 — Tạo Docker Compose services cho PostgreSQL, Redis, và Authentik

## Task Info
- **Task ID**: 1.1
- **Wave**: 0 (no dependencies)
- **Requirements**: 1.1, 9.4, 12.3

## Approach

Kiểm tra và hoàn thiện Docker Compose configuration cho các services cần thiết:
- PostgreSQL 17 (database chính + database cho Authentik)
- Redis 7.x (session, rate limiting, cache)
- Authentik Server (OAuth2/OIDC Identity Provider)
- Authentik Worker (background tasks)

## Files to Create/Modify

| File | Action | Mô tả |
|------|--------|--------|
| `docker/docker-compose.yml` | Modify | Thêm init script cho Authentik DB, verify config |
| `docker/init-db/01-create-authentik-db.sql` | Create | SQL script tạo database riêng cho Authentik |
| `.env.example` | Verify | Đã đầy đủ biến môi trường |

## Acceptance Criteria
- [x] Docker Compose file with postgres, redis, authentik-server, authentik-worker services
- [x] Services properly configured with environment variables for inter-service communication
- [x] `.env.example` file with all required environment variables documented
- [x] Services should use correct versions: PostgreSQL 17, Redis 7.x, Authentik latest
- [ ] PostgreSQL init script creates separate database for Authentik

## Notes
- Existing docker-compose.yml already has all 4 services configured correctly
- Existing .env.example already has all required environment variables
- Need to add init script to auto-create Authentik database on first run
