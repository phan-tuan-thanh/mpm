---
specName: user-authentication
version: 1.0
status: approved
---

# Design: User Authentication

## 1. Kiến trúc tổng quan

```
Client → POST /auth/login → AuthController → AuthService
                                                 ↓
                                           UserRepository (DB)
                                                 ↓
                                           JWTService → tokens
```

## 2. Data Model

```sql
-- Không cần bảng mới, dùng bảng users hiện có
ALTER TABLE users ADD COLUMN failed_login_attempts INT DEFAULT 0;
ALTER TABLE users ADD COLUMN locked_until TIMESTAMP NULL;

-- Bảng lưu refresh token (để revoke được)
CREATE TABLE refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  VARCHAR(64) NOT NULL UNIQUE,
  expires_at  TIMESTAMP NOT NULL,
  revoked_at  TIMESTAMP NULL,
  created_at  TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
```

## 3. API Contracts

### POST /api/v1/auth/login
```json
// Request
{ "email": "user@example.com", "password": "s3cr3t" }

// Response 200
{
  "success": true,
  "data": {
    "access_token": "eyJ...",
    "refresh_token": "eyJ...",
    "expires_in": 900
  }
}

// Response 401 — sai credential
{ "success": false, "error": { "code": "INVALID_CREDENTIALS", "message": "Email hoặc mật khẩu không đúng" } }

// Response 423 — tài khoản bị khóa
{ "success": false, "error": { "code": "ACCOUNT_LOCKED", "message": "Tài khoản tạm khóa, thử lại sau 15 phút" } }
```

## 4. Business Logic

- Mật khẩu hash bằng bcrypt (cost factor 12)
- Access token ký bằng RS256 (private key)
- Refresh token lưu hash SHA-256 vào DB (không lưu raw)
- Sau 5 lần sai → lock account 15 phút, đặt lại counter khi login thành công

## 5. Security

- Rate limit: 10 request/phút trên endpoint /auth/login
- HTTPS bắt buộc
- HttpOnly cookie cho refresh token (tránh XSS)
