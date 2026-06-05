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
| Python 3 | có sẵn trên macOS/Linux | Dùng bởi script để parse JSON từ Authentik API |

Kiểm tra nhanh:

```bash
docker --version && docker compose version
node -v        # >= v21
openssl version
python3 --version
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
- `AUTHENTIK_SECRET_KEY` — chuỗi ngẫu nhiên ≥ 50 ký tự:
  ```bash
  openssl rand -base64 60
  ```
- `AUTHENTIK_CLIENT_SECRET` — chuỗi ngẫu nhiên ≥ 32 ký tự:
  ```bash
  openssl rand -hex 32
  ```
- `AUTHENTIK_CLIENT_ID` — để nguyên `agile-pm-frontend` hoặc đổi tùy ý (phải khớp với `environment.ts`).
- `INITIAL_ADMIN_EMAIL` — email tài khoản Authentik của bạn; user đó sẽ là System Admin khi đăng nhập lần đầu.

Các biến bootstrap (tự động tạo admin Authentik):

- `AUTHENTIK_BOOTSTRAP_PASSWORD` — password cho user `akadmin` (mặc định: `agile-pm-admin-2024`)
- `AUTHENTIK_BOOTSTRAP_EMAIL` — email cho `akadmin` (mặc định: `admin@agilepm.local`)
- `AUTHENTIK_BOOTSTRAP_TOKEN` — API token nội bộ dùng bởi script (mặc định: `ak-bootstrap-token-for-api`)

> **Không cần** cấu hình Authentik thủ công — Bootstrap tự tạo admin user và Blueprint tự tạo Provider + Application.

### Bước 2 — Khởi động hạ tầng (Docker)

```bash
./start.sh infra
```

Lệnh này sẽ thực hiện tự động:

1. **Tạo cặp khóa RSA** (`keys/private.pem`, `keys/public.pem`) cho JWT nếu chưa có.
2. **Khởi động Docker services**: PostgreSQL, Redis, Authentik server và worker.
3. **Chờ services healthy** (PostgreSQL, Redis, Authentik).
4. **Bootstrap Authentik admin** — tự động tạo user `akadmin` nhờ biến `AUTHENTIK_BOOTSTRAP_*` (không cần vào giao diện initial setup).
5. **Apply blueprint** — script tự kiểm tra và trigger re-apply [docker/plans/agile-pm.yaml](docker/plans/agile-pm.yaml) nếu provider chưa được tạo. Blueprint tạo:
   - **OAuth2/OpenID Provider** `agile-pm-provider` với `client_id` và `client_secret` từ `.env`
   - **Application** `agile-pm` với slug khớp với các URL trong `.env`

Khi hoàn tất, sẽ hiển thị:

```
[OK] Infrastructure sẵn sàng!
  PostgreSQL: localhost:5432
  Redis:      localhost:6379
  Authentik:  http://localhost:9000
```

#### Verify thành công

```bash
# OIDC endpoint phải trả JSON
curl -s http://localhost:9000/application/o/agile-pm/.well-known/openid-configuration | python3 -m json.tool | head -5

# Hoặc kiểm tra qua API
curl -s -H "Authorization: Bearer ak-bootstrap-token-for-api" \
  http://localhost:9000/api/v3/providers/oauth2/?search=agile | python3 -c "
import sys,json; d=json.load(sys.stdin); print('Providers:', d['pagination']['count'])"
```

### Bước 3 — Tạo user đăng nhập Agile PM

Mở Authentik Admin: `http://localhost:9000` → đăng nhập với:
- Username: `akadmin`
- Password: giá trị `AUTHENTIK_BOOTSTRAP_PASSWORD` trong `.env` (mặc định: `agile-pm-admin-2024`)

Tạo user mới (Directory → Users → Create):
- Email **phải khớp** với `INITIAL_ADMIN_EMAIL` trong `.env` nếu muốn user đó là System Admin khi đăng nhập Agile PM lần đầu.
- Set password cho user đó.

> Hoặc dùng trực tiếp `akadmin` — miễn email khớp với `INITIAL_ADMIN_EMAIL`.

### Bước 4 — Kiểm tra cấu hình frontend

File [apps/frontend/src/environments/environment.ts](apps/frontend/src/environments/environment.ts) phải khớp với Authentik:

```ts
authentik: {
  authorizeUrl: 'http://localhost:9000/application/o/authorize/',
  clientId: 'agile-pm-frontend',                       // = AUTHENTIK_CLIENT_ID trong .env
  redirectUri: 'http://localhost:4200/auth/callback',  // = AUTHENTIK_REDIRECT_URI trong .env
  scopes: 'openid profile email',
}
```

> Nếu đổi `clientId` hoặc slug, phải sửa đồng bộ ở cả ba nơi: `.env`, `environment.ts`, và blueprint sẽ tự cập nhật.

### Bước 5 — Chạy toàn bộ hệ thống

```bash
./start.sh
```

Lệnh `all` sẽ: khởi động infra → cài dependencies → chạy database migrations → khởi động backend → khởi động frontend.

Khi thấy:

```
Frontend:  http://localhost:4200
Backend:   http://localhost:3000
```

mở trình duyệt tại **http://localhost:4200** — sẽ chuyển tới trang đăng nhập với nút **"Đăng nhập với Authentik"**.

---

## 4. Lệnh thường dùng

```bash
./start.sh           # Khởi động toàn bộ (infra + backend + frontend)
./start.sh infra     # Chỉ khởi động Docker (Postgres/Redis/Authentik) + verify blueprint
./start.sh backend   # Chỉ khởi động backend (giả sử infra đã chạy)
./start.sh frontend  # Chỉ khởi động frontend
./start.sh stop      # Dừng tất cả (Docker + tiến trình nền)
```

> **Luôn chạy `./start.sh stop` trước khi khởi động lại** để tránh lỗi cổng bị chiếm (xem mục Xử lý sự cố).

---

## 5. Xử lý sự cố thường gặp

### Blueprint không tạo provider/app

**Triệu chứng**: `curl http://localhost:9000/application/o/agile-pm/.well-known/openid-configuration` trả 404 hoặc HTML.

**Nguyên nhân**: Race condition — worker apply blueprint trước khi default flows sẵn sàng.

**Fix**:
```bash
# Trigger re-apply thủ công
BLUEPRINT_PK=$(curl -s -H "Authorization: Bearer ak-bootstrap-token-for-api" \
  http://localhost:9000/api/v3/managed/blueprints/ | python3 -c "
import sys,json
for r in json.load(sys.stdin)['results']:
    if 'agile' in r.get('path',''): print(r['pk']); break
")

curl -X POST -H "Authorization: Bearer ak-bootstrap-token-for-api" \
  "http://localhost:9000/api/v3/managed/blueprints/$BLUEPRINT_PK/apply/"
```

Hoặc đơn giản hơn — chạy lại script:
```bash
./start.sh stop
./start.sh infra
```

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
- `clientId` ở `environment.ts` phải khớp Client ID của provider (`AUTHENTIK_CLIENT_ID` trong `.env`).
- `AUTHENTIK_CLIENT_SECRET` trong `.env` phải khớp provider.
- Slug application (`agile-pm`) phải khớp các URL trong `.env`.

### Authentik chưa sẵn sàng

Lần đầu Authentik cần migrate DB nội bộ, có thể mất 1-2 phút. Theo dõi:
```bash
docker logs -f mpm-authentik-server
```

### Migration database lỗi

Chạy lại thủ công:
```bash
npm --prefix apps/backend run migration:run
```

---

## 6. Đăng nhập Authentik Admin UI

| Field | Giá trị |
|-------|---------|
| URL | `http://localhost:9000` |
| Username | `akadmin` |
| Password | Giá trị `AUTHENTIK_BOOTSTRAP_PASSWORD` trong `.env` (mặc định: `agile-pm-admin-2024`) |

Từ Admin UI có thể:
- Xem/sửa Provider: Applications → Providers → `agile-pm-provider`
- Xem/sửa Application: Applications → `Agile PM`
- Quản lý users: Directory → Users
- Xem blueprints: System → Blueprints → `agile-pm-setup`

---

## 7. Dừng & dọn dẹp

```bash
./start.sh stop          # Dừng dịch vụ + container
```

Xóa sạch dữ liệu (Postgres/Redis volumes) để cài lại từ đầu:
```bash
docker compose -f docker/docker-compose.yml --env-file .env down -v
```

> ⚠️ Lệnh `down -v` xóa toàn bộ dữ liệu CSDL, bao gồm cấu hình Authentik — sẽ phải chạy lại `./start.sh infra` (bootstrap sẽ tự tạo lại admin và blueprint sẽ re-apply provider/app).

---

## 8. Tóm tắt flow khởi động

```
./start.sh infra
    │
    ├── 1. Check prerequisites (Docker, Node, OpenSSL)
    ├── 2. Load .env
    ├── 3. Generate RSA keys (nếu chưa có)
    ├── 4. docker compose up -d
    │       ├── PostgreSQL (healthy check)
    │       ├── Redis (healthy check)
    │       ├── Authentik Server (bootstrap admin user)
    │       └── Authentik Worker (apply blueprints)
    ├── 5. Wait services healthy
    └── 6. Ensure blueprint applied
            ├── Chờ 10s cho default blueprints
            ├── Check provider exists via API
            └── Nếu chưa → trigger re-apply → verify
```
