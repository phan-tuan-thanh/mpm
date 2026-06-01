# Plan: Task 1.1 — Docker Compose Services

## Task ID
1.1 — Tạo Docker Compose services cho PostgreSQL, Redis, và Authentik

## Approach
Tạo file `docker/docker-compose.yml` với 4 services:
- `postgres` (PostgreSQL 17)
- `redis` (Redis 7.x)
- `authentik-server` (Authentik server)
- `authentik-worker` (Authentik background worker)

Tạo `.env.example` tại project root với tất cả biến môi trường cần thiết.

## Files sẽ tạo
1. `docker/docker-compose.yml` — Docker Compose configuration
2. `.env.example` — Template biến môi trường

## Acceptance Criteria (từ Requirements)
- Req 1.1: Hệ thống cần Authentik làm Identity Provider
- Req 9.4: Rate Limiter sử dụng Redis
- Req 12.3: HTTPS enforcement (production)

## Dependencies
- Không có dependency (wave 0 trong dependency graph)

## Chi tiết kỹ thuật
- PostgreSQL 17 với volume persist data
- Redis 7.x với volume persist data
- Authentik server + worker chia sẻ cùng database và Redis
- Network riêng cho internal communication
- Environment variables cho tất cả credentials và connection strings
