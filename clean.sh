#!/bin/bash
# =============================================================================
# Agile PM — Clean Script
# Dừng tất cả các services và xóa sạch toàn bộ dữ liệu (Database, Redis, Keys)
# =============================================================================

set -e

# ─── Colors ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_ROOT"

log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[OK]${NC} $1"
}

log_warn() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

# Giải phóng một cổng TCP bằng cách kill tiến trình đang LISTEN trên đó
free_port() {
  local port="$1"
  local pids
  pids=$(lsof -nP -iTCP:"$port" -sTCP:LISTEN -t 2>/dev/null) || true
  if [ -n "$pids" ]; then
    echo "$pids" | xargs kill -9 2>/dev/null || true
  fi
}

echo ""
echo -e "${RED}╔══════════════════════════════════════════╗${NC}"
echo -e "${RED}║    Agile PM — DỪNG & DỌN DẸP HỆ THỐNG   ║${NC}"
echo -e "${RED}╚══════════════════════════════════════════╝${NC}"
echo ""

# 1. Load env để biết port cấu hình
if [ -f "$PROJECT_ROOT/.env" ]; then
  set -a
  source "$PROJECT_ROOT/.env"
  set +a
fi

# 2. Dừng các tiến trình Node.js chạy ngầm (NestJS & Angular)
log_info "Đang dừng các tiến trình Node.js (NestJS & Angular) chạy ngầm..."
pkill -f "nest start" 2>/dev/null || true
pkill -f "ng serve" 2>/dev/null || true

# Giải phóng cổng (tránh tiến trình con mồ côi)
free_port "${BACKEND_PORT:-3000}"
free_port 4200
log_success "Đã dừng các tiến trình Node.js và giải phóng cổng."

# 3. Dừng Docker services và XÓA SẠCH volumes (database, redis, authentik data)
log_info "Đang dừng Docker và xóa sạch Docker Volumes (Database, Redis, Authentik)..."
if [ -f "$PROJECT_ROOT/docker/docker-compose.yml" ]; then
  docker compose -f "$PROJECT_ROOT/docker/docker-compose.yml" \
    --env-file "$PROJECT_ROOT/.env" \
    down -v 2>/dev/null || true
fi
log_success "Đã xóa sạch Docker Volumes."

# 4. Xóa cặp khóa RSA (JWT Keys)
log_info "Đang xóa cặp khóa RSA (JWT Keys)..."
BACKEND_DIR="$PROJECT_ROOT/apps/backend"
PRIVATE_KEY_PATH="${JWT_PRIVATE_KEY_PATH:-./keys/private.pem}"
PUBLIC_KEY_PATH="${JWT_PUBLIC_KEY_PATH:-./keys/public.pem}"

if [[ "$PRIVATE_KEY_PATH" != /* ]]; then
  PRIVATE_KEY_PATH="$BACKEND_DIR/$PRIVATE_KEY_PATH"
fi
if [[ "$PUBLIC_KEY_PATH" != /* ]]; then
  PUBLIC_KEY_PATH="$BACKEND_DIR/$PUBLIC_KEY_PATH"
fi

rm -f "$PRIVATE_KEY_PATH" "$PUBLIC_KEY_PATH"
# Xóa thư mục chứa key nếu thư mục đó rỗng
rmdir "$(dirname "$PRIVATE_KEY_PATH")" 2>/dev/null || true
log_success "Đã xóa RSA keys."

# 5. Xóa thư mục uploads/tmp và các file tạm khác
log_info "Đang dọn dẹp các thư mục uploads và tệp tạm..."
rm -rf "$PROJECT_ROOT/apps/backend/uploads"
rm -rf "$PROJECT_ROOT/uploads"
log_success "Đã dọn dẹp thư mục uploads."

echo ""
log_success "Hoàn tất dọn dẹp! Toàn bộ dữ liệu hệ thống đã được xóa sạch."
log_info "Để khởi động lại hệ thống sạch từ đầu, hãy chạy lệnh: ./start.sh"
echo ""
