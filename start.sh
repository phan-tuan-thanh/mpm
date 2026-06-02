#!/bin/bash
# =============================================================================
# Agile PM — Start Script
# Khởi động toàn bộ hệ thống theo đúng thứ tự
#
# Thứ tự:
#   1. Kiểm tra prerequisites (Docker, Node.js)
#   2. Tạo file .env nếu chưa có
#   3. Tạo RSA key pair cho JWT nếu chưa có
#   4. Khởi động Docker services (PostgreSQL, Redis, Authentik)
#   5. Chờ services healthy
#   6. Chạy database migrations
#   7. Khởi động NestJS backend
#   8. Khởi động Angular frontend
#
# Usage:
#   ./start.sh          — Khởi động toàn bộ
#   ./start.sh infra    — Chỉ khởi động infrastructure (Docker)
#   ./start.sh backend  — Chỉ khởi động backend (giả sử infra đã chạy)
#   ./start.sh frontend — Chỉ khởi động frontend
#   ./start.sh stop     — Dừng tất cả services
# =============================================================================

set -e

# ─── Colors ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ─── Project root ─────────────────────────────────────────────────────────────
PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_ROOT"

# ─── Helper functions ──────────────────────────────────────────────────────────

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

# Giải phóng một cổng TCP bằng cách kill tiến trình đang LISTEN trên đó.
# Bắt theo cổng (không theo tên tiến trình) để bắt được cả tiến trình con mồ côi.
free_port() {
  local port="$1"
  local pids
  pids=$(lsof -nP -iTCP:"$port" -sTCP:LISTEN -t 2>/dev/null) || true
  if [ -n "$pids" ]; then
    log_warn "Cổng $port đang bị chiếm (PID: $(echo "$pids" | tr '\n' ' ')) — giải phóng..."
    echo "$pids" | xargs kill -9 2>/dev/null || true
    sleep 1
  fi
  return 0
}

# ─── 1. Check prerequisites ───────────────────────────────────────────────────

check_prerequisites() {
  log_info "Kiểm tra prerequisites..."

  # Docker
  if ! command -v docker &> /dev/null; then
    log_error "Docker chưa được cài đặt. Vui lòng cài Docker Desktop."
    exit 1
  fi

  # Docker Compose (v2)
  if ! docker compose version &> /dev/null; then
    log_error "Docker Compose v2 không khả dụng. Vui lòng cập nhật Docker Desktop."
    exit 1
  fi

  # Node.js
  if ! command -v node &> /dev/null; then
    log_error "Node.js chưa được cài đặt. Yêu cầu Node.js 21+."
    exit 1
  fi

  # Check Node.js version >= 21
  NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
  if [ "$NODE_VERSION" -lt 21 ]; then
    log_error "Node.js version phải >= 21. Hiện tại: $(node -v)"
    exit 1
  fi

  # npm
  if ! command -v npm &> /dev/null; then
    log_error "npm chưa được cài đặt."
    exit 1
  fi

  log_success "Prerequisites OK (Docker, Node.js $(node -v), npm $(npm -v))"
}

# ─── 2. Setup .env ────────────────────────────────────────────────────────────

setup_env() {
  if [ ! -f "$PROJECT_ROOT/.env" ]; then
    log_info "Tạo file .env từ .env.example..."
    cp "$PROJECT_ROOT/.env.example" "$PROJECT_ROOT/.env"
    log_warn "File .env đã được tạo. Hãy cập nhật các giá trị trước khi chạy production."
  else
    log_success ".env đã tồn tại"
  fi

  # Source .env để sử dụng trong script
  set -a
  source "$PROJECT_ROOT/.env"
  set +a
}

# ─── 3. Generate RSA keys ─────────────────────────────────────────────────────

generate_jwt_keys() {
  local BACKEND_DIR="$PROJECT_ROOT/apps/backend"

  # Đọc path từ .env; nếu là relative path thì resolve từ backend directory
  local PRIVATE_KEY_PATH="${JWT_PRIVATE_KEY_PATH:-./keys/private.pem}"
  local PUBLIC_KEY_PATH="${JWT_PUBLIC_KEY_PATH:-./keys/public.pem}"

  if [[ "$PRIVATE_KEY_PATH" != /* ]]; then
    PRIVATE_KEY_PATH="$BACKEND_DIR/$PRIVATE_KEY_PATH"
  fi
  if [[ "$PUBLIC_KEY_PATH" != /* ]]; then
    PUBLIC_KEY_PATH="$BACKEND_DIR/$PUBLIC_KEY_PATH"
  fi

  if [ -f "$PRIVATE_KEY_PATH" ] && [ -f "$PUBLIC_KEY_PATH" ]; then
    log_success "RSA key pair đã tồn tại ($(dirname "$PRIVATE_KEY_PATH" | sed "s|$PROJECT_ROOT/||"))"
    return
  fi

  if ! command -v openssl &> /dev/null; then
    log_error "openssl không tìm thấy. Vui lòng cài openssl để tạo RSA keys."
    exit 1
  fi

  log_info "Tạo RSA key pair (2048-bit) cho JWT RS256..."
  mkdir -p "$(dirname "$PRIVATE_KEY_PATH")"

  openssl genrsa -out "$PRIVATE_KEY_PATH" 2048 2>/dev/null
  openssl rsa -in "$PRIVATE_KEY_PATH" -pubout -out "$PUBLIC_KEY_PATH" 2>/dev/null

  chmod 600 "$PRIVATE_KEY_PATH"
  chmod 644 "$PUBLIC_KEY_PATH"

  log_success "RSA key pair đã tạo tại $(dirname "$PRIVATE_KEY_PATH" | sed "s|$PROJECT_ROOT/||")"
}

# ─── 4. Start Docker infrastructure ───────────────────────────────────────────

start_infra() {
  log_info "Khởi động Docker services (PostgreSQL, Redis, Authentik)..."

  docker compose -f "$PROJECT_ROOT/docker/docker-compose.yml" \
    --env-file "$PROJECT_ROOT/.env" \
    up -d

  log_success "Docker services đã khởi động"
}

# ─── 5. Wait for services healthy ─────────────────────────────────────────────

wait_for_services() {
  log_info "Chờ services healthy..."

  # Wait for PostgreSQL
  local retries=30
  while [ $retries -gt 0 ]; do
    if docker exec mpm-postgres pg_isready -U "${POSTGRES_USER:-mpm}" -d "${POSTGRES_DB:-mpm}" &>/dev/null; then
      break
    fi
    retries=$((retries - 1))
    sleep 2
  done

  if [ $retries -eq 0 ]; then
    log_error "PostgreSQL không khởi động được sau 60 giây"
    exit 1
  fi
  log_success "PostgreSQL healthy"

  # Wait for Redis
  retries=30
  while [ $retries -gt 0 ]; do
    if docker exec mpm-redis redis-cli -a "${REDIS_PASSWORD}" ping &>/dev/null; then
      break
    fi
    retries=$((retries - 1))
    sleep 2
  done

  if [ $retries -eq 0 ]; then
    log_error "Redis không khởi động được sau 60 giây"
    exit 1
  fi
  log_success "Redis healthy"

  # Wait for Authentik (optional — có thể mất vài phút lần đầu)
  log_info "Chờ Authentik khởi động (có thể mất 1-2 phút lần đầu)..."
  retries=60
  while [ $retries -gt 0 ]; do
    if curl -s -o /dev/null -w "%{http_code}" "http://localhost:${AUTHENTIK_PORT:-9000}/-/health/ready/" 2>/dev/null | grep -q "200\|204"; then
      break
    fi
    retries=$((retries - 1))
    sleep 3
  done

  if [ $retries -eq 0 ]; then
    log_warn "Authentik chưa sẵn sàng — có thể cần thêm thời gian. Tiếp tục..."
  else
    log_success "Authentik healthy"
  fi
}

# ─── 6. Install dependencies ──────────────────────────────────────────────────

install_deps() {
  log_info "Cài đặt dependencies..."

  # Root package.json (nếu có)
  if [ -f "$PROJECT_ROOT/package.json" ]; then
    npm install --prefix "$PROJECT_ROOT"
  fi

  # Backend
  if [ -f "$PROJECT_ROOT/apps/backend/package.json" ]; then
    log_info "  → Backend dependencies..."
    npm install --prefix "$PROJECT_ROOT/apps/backend"
  fi

  # Frontend
  if [ -f "$PROJECT_ROOT/apps/frontend/package.json" ]; then
    log_info "  → Frontend dependencies..."
    npm install --prefix "$PROJECT_ROOT/apps/frontend"
  fi

  log_success "Dependencies đã cài đặt"
}

# ─── 7. Run migrations ────────────────────────────────────────────────────────

run_migrations() {
  log_info "Chạy database migrations..."

  if [ -f "$PROJECT_ROOT/apps/backend/package.json" ]; then
    # Sử dụng TypeORM CLI qua npm script
    npm run --prefix "$PROJECT_ROOT/apps/backend" migration:run 2>/dev/null || {
      log_warn "Migration script chưa được cấu hình trong package.json. Bỏ qua."
    }
  else
    log_warn "Backend package.json chưa tồn tại. Bỏ qua migrations."
  fi
}

# ─── 8. Start backend ─────────────────────────────────────────────────────────

start_backend() {
  log_info "Khởi động NestJS backend (port ${BACKEND_PORT:-3000})..."

  if [ ! -f "$PROJECT_ROOT/apps/backend/package.json" ]; then
    log_warn "Backend package.json chưa tồn tại. Bỏ qua."
    return
  fi

  # Giải phóng cổng trước khi start (tránh EADDRINUSE do lần chạy trước còn sót)
  free_port "${BACKEND_PORT:-3000}"

  # Start in background
  cd "$PROJECT_ROOT/apps/backend"
  npm run start:dev &
  BACKEND_PID=$!
  cd "$PROJECT_ROOT"

  # Wait for backend to be ready
  local retries=30
  while [ $retries -gt 0 ]; do
    if curl -s -o /dev/null "http://localhost:${BACKEND_PORT:-3000}" 2>/dev/null; then
      break
    fi
    retries=$((retries - 1))
    sleep 2
  done

  if [ $retries -eq 0 ]; then
    log_warn "Backend chưa phản hồi — có thể cần thêm thời gian để compile."
  else
    log_success "Backend đang chạy tại http://localhost:${BACKEND_PORT:-3000}"
  fi
}

# ─── 9. Start frontend ────────────────────────────────────────────────────────

start_frontend() {
  log_info "Khởi động Angular frontend (port 4200)..."

  if [ ! -f "$PROJECT_ROOT/apps/frontend/package.json" ]; then
    log_warn "Frontend package.json chưa tồn tại. Bỏ qua."
    return
  fi

  # Giải phóng cổng 4200 trước khi start
  free_port 4200

  cd "$PROJECT_ROOT/apps/frontend"
  npm run start -- --proxy-config proxy.conf.json &
  FRONTEND_PID=$!
  cd "$PROJECT_ROOT"

  log_success "Frontend đang khởi động tại http://localhost:4200"
}

# ─── Stop all ─────────────────────────────────────────────────────────────────

stop_all() {
  log_info "Dừng tất cả services..."

  # Stop Docker services
  docker compose -f "$PROJECT_ROOT/docker/docker-compose.yml" \
    --env-file "$PROJECT_ROOT/.env" \
    down 2>/dev/null || true

  # Kill background processes
  pkill -f "nest start" 2>/dev/null || true
  pkill -f "ng serve" 2>/dev/null || true

  # Dọn dứt điểm theo cổng (bắt cả tiến trình con mồ côi mà pkill bỏ sót)
  free_port "${BACKEND_PORT:-3000}"
  free_port 4200

  log_success "Tất cả services đã dừng"
}

# ─── Main ──────────────────────────────────────────────────────────────────────

main() {
  echo ""
  echo -e "${BLUE}╔══════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║       Agile PM — Start Script            ║${NC}"
  echo -e "${BLUE}╚══════════════════════════════════════════╝${NC}"
  echo ""

  local MODE="${1:-all}"

  case "$MODE" in
    stop)
      stop_all
      ;;
    infra)
      check_prerequisites
      setup_env
      generate_jwt_keys
      start_infra
      wait_for_services
      echo ""
      log_success "Infrastructure sẵn sàng!"
      echo -e "  PostgreSQL: localhost:${POSTGRES_PORT:-5432}"
      echo -e "  Redis:      localhost:${REDIS_PORT:-6379}"
      echo -e "  Authentik:  http://localhost:${AUTHENTIK_PORT:-9000}"
      ;;
    backend)
      setup_env
      generate_jwt_keys
      install_deps
      run_migrations
      start_backend
      ;;
    frontend)
      setup_env
      install_deps
      start_frontend
      ;;
    all)
      check_prerequisites
      setup_env
      generate_jwt_keys
      start_infra
      wait_for_services
      install_deps
      run_migrations
      start_backend
      start_frontend

      echo ""
      echo -e "${GREEN}╔══════════════════════════════════════════╗${NC}"
      echo -e "${GREEN}║       Hệ thống đã khởi động!            ║${NC}"
      echo -e "${GREEN}╚══════════════════════════════════════════╝${NC}"
      echo ""
      echo -e "  ${BLUE}Frontend:${NC}  http://localhost:4200"
      echo -e "  ${BLUE}Backend:${NC}   http://localhost:${BACKEND_PORT:-3000}"
      echo -e "  ${BLUE}Authentik:${NC} http://localhost:${AUTHENTIK_PORT:-9000}"
      echo -e "  ${BLUE}PostgreSQL:${NC} localhost:${POSTGRES_PORT:-5432}"
      echo -e "  ${BLUE}Redis:${NC}     localhost:${REDIS_PORT:-6379}"
      echo ""
      echo -e "  Dừng hệ thống: ${YELLOW}./start.sh stop${NC}"
      echo ""

      # Keep script running (wait for background processes)
      wait
      ;;
    *)
      echo "Usage: ./start.sh [all|infra|backend|frontend|stop]"
      exit 1
      ;;
  esac
}

main "$@"
