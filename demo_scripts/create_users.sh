#!/bin/bash
# =============================================================================
# Agile PM — Demo Users Provisioning Script
# Tự động tạo các tài khoản demo tương ứng từng vai trò trong Authentik và CSDL.
# =============================================================================

set -e

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_ROOT"

# Read port from .env if available
if [ -f ".env" ]; then
  set -a
  source .env
  set +a
fi

echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║          Agile PM — Provision Demo Users                 ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

provision_user() {
  local email="$1"
  local username="$2"
  local display_name="$3"
  local system_role="$4"

  # Search in Authentik
  local search_response
  search_response=$(curl -s -H "Authorization: Bearer ak-bootstrap-token-for-api" "http://localhost:9000/api/v3/core/users/?search=$email")

  local pk
  local uuid
  pk=$(echo "$search_response" | node -e "
const readline = require('readline');
const rl = readline.createInterface({ input: process.stdin });
let data = '';
rl.on('line', (line) => data += line);
rl.on('close', () => {
  try {
    const json = JSON.parse(data);
    if (json.results && json.results.length > 0) {
      console.log(json.results[0].pk);
    }
  } catch (e) {}
});
")

  uuid=$(echo "$search_response" | node -e "
const readline = require('readline');
const rl = readline.createInterface({ input: process.stdin });
let data = '';
rl.on('line', (line) => data += line);
rl.on('close', () => {
  try {
    const json = JSON.parse(data);
    if (json.results && json.results.length > 0) {
      console.log(json.results[0].uuid);
    }
  } catch (e) {}
});
")

  if [ -z "$pk" ]; then
    echo -e "${BLUE}[INFO]${NC} Tạo user mới trong Authentik: $email..."
    local create_response
    create_response=$(curl -s -X POST \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer ak-bootstrap-token-for-api" \
      -d "{\"username\": \"$username\", \"name\": \"$display_name\", \"email\": \"$email\", \"is_active\": true}" \
      http://localhost:9000/api/v3/core/users/)

    pk=$(echo "$create_response" | node -e "
const readline = require('readline');
const rl = readline.createInterface({ input: process.stdin });
let data = '';
rl.on('line', (line) => data += line);
rl.on('close', () => {
  try {
    const json = JSON.parse(data);
    console.log(json.pk || '');
  } catch (e) {}
});
")

    uuid=$(echo "$create_response" | node -e "
const readline = require('readline');
const rl = readline.createInterface({ input: process.stdin });
let data = '';
rl.on('line', (line) => data += line);
rl.on('close', () => {
  try {
    const json = JSON.parse(data);
    console.log(json.uuid || '');
  } catch (e) {}
});
")

    if [ -z "$pk" ]; then
      echo -e "${RED}[ERROR]${NC} Không thể tạo user $email trong Authentik. Response:"
      echo "$create_response"
      exit 1
    fi

    # Set password
    curl -s -X POST \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer ak-bootstrap-token-for-api" \
      -d '{"password": "123ZXC!@#"}' \
      "http://localhost:9000/api/v3/core/users/$pk/set_password/" > /dev/null
    echo -e "${GREEN}[OK]${NC} Đã tạo user và đặt mật khẩu trong Authentik."
  else
    echo -e "${GREEN}[OK]${NC} User $email đã tồn tại trong Authentik (UUID: $uuid)."
  fi

  # Check and upsert in PostgreSQL database
  local db_user_exists
  db_user_exists=$(docker exec -i mpm-postgres psql -U mpm -d mpm -t -A -c "select count(*) from users where email = '$email';")

  if [ "$db_user_exists" = "0" ]; then
    echo -e "${BLUE}[INFO]${NC} Đang thêm user $email vào database..."
    docker exec -i mpm-postgres psql -U mpm -d mpm -c "
      insert into users (id, external_id, email, display_name, system_role, is_active, created_at, updated_at)
      values (gen_random_uuid(), '$uuid', '$email', '$display_name', '$system_role', true, now(), now());
    " > /dev/null
  else
    echo -e "${BLUE}[INFO]${NC} Đồng bộ thông tin user $email trong database..."
    docker exec -i mpm-postgres psql -U mpm -d mpm -c "
      update users set external_id = '$uuid', display_name = '$display_name', system_role = '$system_role'
      where email = '$email';
    " > /dev/null
  fi
}

provision_user "sm@demo.local" "sm" "Scrum Master" "User"
provision_user "po@demo.local" "po" "Product Owner" "User"
provision_user "ba1@demo.local" "ba1" "Business Analyst 1" "User"
provision_user "ba2@demo.local" "ba2" "Business Analyst 2" "User"
provision_user "ba3@demo.local" "ba3" "Business Analyst 3" "User"
provision_user "dev1@demo.local" "dev1" "Developer 1" "User"
provision_user "dev2@demo.local" "dev2" "Developer 2" "User"
provision_user "dev3@demo.local" "dev3" "Developer 3" "User"
provision_user "qa1@demo.local" "qa1" "QA 1" "User"
provision_user "qa2@demo.local" "qa2" "QA 2" "User"
provision_user "stakeholder1@demo.local" "stakeholder1" "Stakeholder 1" "User"

echo -e "\n${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║          Đã khởi tạo tài khoản demo THÀNH CÔNG!          ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
