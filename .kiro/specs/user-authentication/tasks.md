---
specName: user-authentication
version: 1.0
status: in-progress
estimatedDays: 4
---

# Tasks: User Authentication

### Phase 1 — Backend
- [x] T01: Tạo migration bảng refresh_tokens
- [x] T02: Implement AuthService (login, logout, refresh)
- [ ] T03: Tạo AuthController + routes
- [ ] T04: Unit test AuthService
- [ ] T05: Integration test /auth/login endpoint

### Phase 2 — Security hardening
- [ ] T06: Rate limiting middleware
- [ ] T07: Account lock logic
- [ ] T08: Security test (brute force, token replay)

### Phase 3 — QA
- [ ] T09: Code review
- [ ] T10: Cập nhật OpenAPI spec
