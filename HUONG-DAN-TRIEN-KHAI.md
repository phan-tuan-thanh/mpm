# Hướng dẫn triển khai lần đầu — Agile PM

Tài liệu này hướng dẫn cài đặt và chạy hệ thống **Agile PM** lần đầu trên máy phát triển (local).

---

## 1. Yêu cầu hệ thống

| Thành phần | Phiên bản tối thiểu | Ghi chú |
|-----------|---------------------|---------|
| Docker Desktop | mới nhất | Cần Docker Compose v2 (`docker compose`) |
| Node.js | **21+** | Khuyến nghị 22/24 LTS |
| npm | đi kèm Node | |
| OpenSSL | có sẵn trên macOS/Linux | Dùng để tạo cặp khóa RSA cho JWT |

Kiểm tra nhanh:

```bash
docker --version && docker compose version
node -v        # >= v21
openssl version
```

---

## 2. Kiến trúc & cổng dịch vụ

| Dịch vụ | Cổng | Mô tả |
|---------|------|-------|
| Frontend (Angular) | `4200` | Giao diện người dùng |
| Backend (NestJS) | `3000` | REST API tại `/api/*` |
| Authentik | `9000` (HTTP), `9443` (HTTPS) | Identity Provider (OAuth2/OIDC) |
| PostgreSQL | `5432` | CSDL chính + CSDL của Authentik |
| Redis | `6379` | Session / rate-limit / cache |

Luồng đăng nhập: Frontend → Authentik (OAuth2 Authorization Code) → callback về `/auth/callback` → Backend đổi `code` lấy token tại Authentik → Backend phát hành **JWT RS256** riêng cho ứng dụng.

---

## 3. Các bước triển khai lần đầu

### Bước 1 — Tạo file cấu hình `.env`

```bash
cp .env.example .env
```

Mở `.env` và **đổi tất cả mật khẩu mặc định** (`changeme_*`). Bắt buộc đổi:

- `POSTGRES_PASSWORD`
- `REDIS_PASSWORD`
- `AUTHENTIK_SECRET_KEY` — chuỗi ngẫu nhiên ≥ 50 ký tự, tạo bằng:
  ```bash
  openssl rand -base64 60
  ```

> `AUTHENTIK_CLIENT_ID` và `AUTHENTIK_CLIENT_SECRET` sẽ điền ở **Bước 3** sau khi tạo OAuth provider trong Authentik.

### Bước 2 — Khởi động hạ tầng (Docker)

```bash
./start.sh infra
```

Lệnh này sẽ:
- Tạo cặp khóa RSA (`keys/private.pem`, `keys/public.pem`) cho JWT nếu chưa có.
- Khởi động PostgreSQL, Redis, Authentik.
- Chờ các dịch vụ healthy (Authentik lần đầu có thể mất 1–2 phút).

### Bước 3 — Cấu hình Authentik (OAuth2 Provider)

Authentik cần được cấu hình **một lần** để ứng dụng đăng nhập được.

1. Mở `http://localhost:9000/if/flow/initial-setup/` để tạo tài khoản **admin** (`akadmin`) lần đầu.
2. Vào **Admin interface → Applications → Providers → Create → OAuth2/OpenID Provider**:
   - **Name**: `agile-pm-provider`
   - **Authorization flow**: `default-provider-authorization-explicit-consent`
   - **Client type**: `Confidential`
   - **Client ID**: `agile-pm-frontend`  ← **phải khớp** với frontend (xem Bước 4)
   - **Client Secret**: bấm sao chép lại để điền vào `.env`
   - **Redirect URIs**:
     ```
     http://localhost:4200/auth/callback
     ```
   - **Signing Key**: chọn certificate mặc định.
3. Vào **Applications → Create**:
   - **Name**: `Agile PM`
   - **Slug**: `agile-pm` (khớp với các URL `…/application/o/agile-pm/` trong `.env`)
   - **Provider**: chọn `agile-pm-provider` vừa tạo.
4. Tạo ít nhất một **User** (Directory → Users) để đăng nhập thử.
5. Quay lại `.env`, điền:
   ```env
   AUTHENTIK_CLIENT_ID=agile-pm-frontend
   AUTHENTIK_CLIENT_SECRET=<client secret vừa sao chép>
   ```

### Bước 4 — Kiểm tra cấu hình frontend

File [apps/frontend/src/environments/environment.ts](apps/frontend/src/environments/environment.ts) phải khớp với Authentik:

```ts
authentik: {
  authorizeUrl: 'http://localhost:9000/application/o/authorize/',
  clientId: 'agile-pm-frontend',                       // = Client ID ở Bước 3
  redirectUri: 'http://localhost:4200/auth/callback',  // = Redirect URI ở Bước 3
  scopes: 'openid profile email',
}
```

> Nếu đổi `clientId` hoặc slug, phải sửa đồng bộ ở cả ba nơi: Authentik, `.env`, và `environment.ts`.

### Bước 5 — Chạy toàn bộ hệ thống

```bash
./start.sh
```

Lệnh `all` sẽ: cài dependencies → chạy database migrations → khởi động backend → khởi động frontend.

Khi thấy:

```
Frontend:  http://localhost:4200
Backend:   http://localhost:3000
```

mở trình duyệt tại **http://localhost:4200** — sẽ chuyển tới trang đăng nhập với nút **“Đăng nhập với Authentik”**.

---

## 4. Lệnh thường dùng

```bash
./start.sh           # Khởi động toàn bộ (infra + backend + frontend)
./start.sh infra     # Chỉ khởi động Docker (Postgres/Redis/Authentik)
./start.sh backend   # Chỉ khởi động backend
./start.sh frontend  # Chỉ khởi động frontend
./start.sh stop      # Dừng tất cả (Docker + tiến trình nền)
```

> **Luôn chạy `./start.sh stop` trước khi khởi động lại** để tránh lỗi cổng bị chiếm (xem mục Xử lý sự cố).

---

## 5. Xử lý sự cố thường gặp

### Trang `http://localhost:4200` trắng / mất giao diện
- **Nguyên nhân thường gặp**: dev server đang chạy được khởi động *trước khi* cấu hình CSS được thêm. Hãy **khởi động lại frontend**:
  ```bash
  ./start.sh stop && ./start.sh
  ```
- Dự án dùng **Tailwind CSS v4**, cần plugin `@tailwindcss/postcss` và file [apps/frontend/.postcssrc.json](apps/frontend/.postcssrc.json). Nếu giao diện không có style, kiểm tra hai thứ này tồn tại.
- Mở **DevTools → Console** của trình duyệt để xem lỗi runtime nếu vẫn trắng.

### `Error: listen EADDRINUSE: address already in use :::3000`
Một tiến trình backend cũ còn chiếm cổng. Giải phóng:
```bash
./start.sh stop
# hoặc thủ công:
lsof -nP -iTCP:3000 -sTCP:LISTEN -t | xargs kill
```
Tương tự với cổng `4200` (frontend) nếu cần.

### Build frontend lỗi `File 'src/main.ts' is missing from the TypeScript compilation`
Do `"noEmit": true` trong [apps/frontend/tsconfig.json](apps/frontend/tsconfig.json). Builder esbuild của Angular cần compiler **emit** output. Bỏ `noEmit` và đảm bảo có `"files": ["src/main.ts"]`.

### Đăng nhập báo lỗi / redirect sai
- Kiểm tra **Redirect URI** trong Authentik đúng `http://localhost:4200/auth/callback`.
- `clientId` ở `environment.ts` phải khớp Client ID của provider.
- `AUTHENTIK_CLIENT_ID` / `AUTHENTIK_CLIENT_SECRET` trong `.env` phải khớp provider.
- Slug application (`agile-pm`) phải khớp các URL trong `.env`.

### Authentik chưa sẵn sàng
Lần đầu Authentik cần migrate DB nội bộ, có thể mất vài phút. Theo dõi:
```bash
docker logs -f mpm-authentik-server
```

### Migration database lỗi
Chạy lại thủ công:
```bash
npm --prefix apps/backend run migration:run
```

---

## 6. Dừng & dọn dẹp

```bash
./start.sh stop          # Dừng dịch vụ + container
```

Xóa sạch dữ liệu (Postgres/Redis volumes) để cài lại từ đầu:
```bash
docker compose -f docker/docker-compose.yml --env-file .env down -v
```

> ⚠️ Lệnh `down -v` xóa toàn bộ dữ liệu CSDL, bao gồm cấu hình Authentik — sẽ phải làm lại Bước 3.
