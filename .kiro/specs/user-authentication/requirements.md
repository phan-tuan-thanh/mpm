---
specName: user-authentication
version: 1.0
status: approved
createdAt: 2025-06-01
---

# Requirements: User Authentication

## 1. Bối cảnh & Vấn đề

Hệ thống hiện tại chưa có cơ chế xác thực. Cần bổ sung authentication
để bảo vệ các API endpoint và quản lý phiên đăng nhập người dùng.

## 2. Mục tiêu

- Người dùng có thể đăng nhập bằng email + password
- Session được quản lý bằng JWT (access token + refresh token)
- Tốc độ login < 500ms (P95)

## 3. User Stories

```
As a registered user
I want to log in with my email and password
So that I can access protected features

Acceptance Criteria:
  GIVEN a valid email and password
  WHEN  I POST /api/v1/auth/login
  THEN  I receive access_token (15 phút) + refresh_token (7 ngày)

  GIVEN an invalid password (>5 lần liên tiếp)
  WHEN  I attempt to login
  THEN  account bị khóa tạm thời 15 phút
```

## 4. Functional Requirements

| ID | Yêu cầu | Ưu tiên |
|----|---------|---------|
| FR-01 | Login bằng email + password | Must Have |
| FR-02 | JWT access token (15 phút) | Must Have |
| FR-03 | Refresh token (7 ngày) | Must Have |
| FR-04 | Logout (revoke token) | Must Have |
| FR-05 | Khóa account sau 5 lần sai | Should Have |
| FR-06 | Đổi mật khẩu | Should Have |

## 5. Out of Scope

- Social login (Google, Facebook) — phase 2
- 2FA / MFA — phase 2
- SSO / SAML — phase 3
