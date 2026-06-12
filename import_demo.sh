#!/bin/bash
# =============================================================================
# Agile PM — Demo Project Import Script
# Tự động tạo dự án TaskManager, các Epic, User Story và Tasks dựa trên
# các tài liệu thiết kế trong `.kiro/plans` và `docs/plans`.
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

PORT="${BACKEND_PORT:-3000}"
BACKEND_URL="http://localhost:$PORT"

echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║          Agile PM — Demo Import Script                   ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

# ─── 1. Generate JWT Token ─────────────────────────────────────────────────
# Email admin có thể truyền qua tham số 1 hoặc biến môi trường ADMIN_EMAIL.
# Ví dụ: ./import_demo.sh mpm_admin@local.host
ADMIN_EMAIL="${1:-${ADMIN_EMAIL:-mpm_admin@local.host}}"

# Backend load key theo cwd lúc khởi động nên có thể là keys/ ở root
# hoặc apps/backend/keys/. Thử từng candidate và verify bằng API call thật.
PRIVATE_KEY_CANDIDATES=("apps/backend/keys/private.pem" "keys/private.pem")
PRIVATE_KEY_PATH=""

# Tạo JWT token cho một user bất kỳ theo email (tra id + system_role từ CSDL).
# Usage: TOKEN=$(generate_token "user@example.com")
generate_token() {
  local email="$1"
  local row user_id system_role

  row=$(docker exec -i mpm-postgres psql -U mpm -d mpm -t -A -c \
    "select id, system_role from users where email = '$email';")

  if [ -z "$row" ]; then
    echo -e "${RED}[ERROR]${NC} Không tìm thấy user với email: $email trong CSDL." >&2
    return 1
  fi

  user_id="${row%%|*}"
  system_role="${row##*|}"

  # jsonwebtoken chỉ có trong node_modules của backend nên phải chạy từ đó
  (cd "$PROJECT_ROOT/apps/backend" && \
  JWT_KEY_PATH="$PROJECT_ROOT/$PRIVATE_KEY_PATH" \
  JWT_SUB="$user_id" JWT_EMAIL="$email" JWT_ROLE="$system_role" \
  node -e "
const fs = require('fs');
const jwt = require('jsonwebtoken');

try {
  const privateKey = fs.readFileSync(process.env.JWT_KEY_PATH, 'utf8');
  const payload = {
    sub: process.env.JWT_SUB,
    email: process.env.JWT_EMAIL,
    systemRole: process.env.JWT_ROLE,
    projectRoles: [],
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour validity
  };
  console.log(jwt.sign(payload, privateKey, { algorithm: 'RS256' }));
} catch (e) {
  console.error(e);
  process.exit(1);
}
")
}

echo -e "${BLUE}[INFO]${NC} Đang khởi tạo phiên làm việc cho: ${GREEN}$ADMIN_EMAIL${NC}..."
TOKEN=""
for candidate in "${PRIVATE_KEY_CANDIDATES[@]}"; do
  [ -f "$candidate" ] || continue
  PRIVATE_KEY_PATH="$candidate"
  candidate_token=$(generate_token "$ADMIN_EMAIL") || exit 1
  http_status=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $candidate_token" "$BACKEND_URL/api/projects")
  if [ "$http_status" = "200" ]; then
    TOKEN="$candidate_token"
    break
  fi
  echo -e "${YELLOW}[WARN]${NC} Key $candidate bị backend từ chối (HTTP $http_status), thử key khác..."
done

if [ -z "$TOKEN" ]; then
  echo -e "${RED}[ERROR]${NC} Không thể tạo JWT Token hợp lệ cho $ADMIN_EMAIL."
  echo -e "Hãy đảm bảo backend đang chạy và keys đã được khởi tạo qua ./start.sh."
  exit 1
fi
echo -e "${GREEN}[OK]${NC} JWT Token khởi tạo thành công (key: $PRIVATE_KEY_PATH)."

# ─── 2. Provision Demo Users (Run external script) ────────────────────────
if [ -f "demo_scripts/create_users.sh" ]; then
  ./demo_scripts/create_users.sh
else
  echo -e "${RED}[ERROR]${NC} Không tìm thấy file create_users.sh"
  exit 1
fi

get_db_user_id() {
  local email="$1"
  docker exec -i mpm-postgres psql -U mpm -d mpm -t -A -c "select id from users where email = '$email';"
}

SM_USER_ID=$(get_db_user_id "sm@demo.local")
PO_USER_ID=$(get_db_user_id "po@demo.local")
BA1_USER_ID=$(get_db_user_id "ba1@demo.local")
BA2_USER_ID=$(get_db_user_id "ba2@demo.local")
BA3_USER_ID=$(get_db_user_id "ba3@demo.local")
DEV1_USER_ID=$(get_db_user_id "dev1@demo.local")
DEV2_USER_ID=$(get_db_user_id "dev2@demo.local")
DEV3_USER_ID=$(get_db_user_id "dev3@demo.local")
QA1_USER_ID=$(get_db_user_id "qa1@demo.local")
QA2_USER_ID=$(get_db_user_id "qa2@demo.local")
STAKEHOLDER1_USER_ID=$(get_db_user_id "stakeholder1@demo.local")

echo -e "  Users Mapping:"
echo -e "    - Scrum Master: $SM_USER_ID"
echo -e "    - Product Owner: $PO_USER_ID"
echo -e "    - BA 1: $BA1_USER_ID"
echo -e "    - BA 2: $BA2_USER_ID"
echo -e "    - BA 3: $BA3_USER_ID"
echo -e "    - Dev 1: $DEV1_USER_ID"
echo -e "    - Dev 2: $DEV2_USER_ID"
echo -e "    - Dev 3: $DEV3_USER_ID"
echo -e "    - QA 1: $QA1_USER_ID"
echo -e "    - QA 2: $QA2_USER_ID"
echo -e "    - Stakeholder 1: $STAKEHOLDER1_USER_ID"

# ─── 3. Clean Up Existing Project if exists (Idempotency) ─────────────────
PROJECT_KEY="TM"
echo -e "${BLUE}[INFO]${NC} Kiểm tra xem project '$PROJECT_KEY' đã tồn tại chưa..."

EXISTING_PROJECT_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" "$BACKEND_URL/api/projects/by-key/$PROJECT_KEY" || true)
EXISTING_PROJECT_ID=$(echo "$EXISTING_PROJECT_RESPONSE" | node -e "
const readline = require('readline');
const rl = readline.createInterface({ input: process.stdin });
let data = '';
rl.on('line', (line) => data += line);
rl.on('close', () => {
  try {
    const json = JSON.parse(data);
    if (json && json.id) {
      console.log(json.id);
    }
  } catch (e) {}
});
")

if [ -n "$EXISTING_PROJECT_ID" ]; then
  echo -e "${YELLOW}[WARN]${NC} Phát hiện project '$PROJECT_KEY' đã tồn tại (ID: $EXISTING_PROJECT_ID). Đang dọn dẹp..."
  curl -s -X DELETE -H "Authorization: Bearer $TOKEN" "$BACKEND_URL/api/projects/$EXISTING_PROJECT_ID" > /dev/null
  echo -e "${GREEN}[OK]${NC} Đã xóa project cũ."
fi

# ─── 4. Create Project TaskManager ─────────────────────────────────────────
echo -e "${BLUE}[INFO]${NC} Đang tạo dự án mới: ${GREEN}TaskManager (key: $PROJECT_KEY)${NC}..."
CREATE_PROJECT_BODY='{
  "name": "TaskManager",
  "key": "TM",
  "description": {
    "type": "doc",
    "content": [
      {
        "type": "paragraph",
        "content": [
          {
            "type": "text",
            "text": "Dự án quản lý Task tập trung xây dựng theo các thiết kế trong mpm plans."
          }
        ]
      }
    ]
  },
  "emoji": "🎯",
  "stateTemplate": "blank"
}'

PROJECT_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "$CREATE_PROJECT_BODY" \
  "$BACKEND_URL/api/projects")

PROJECT_ID=$(echo "$PROJECT_RESPONSE" | node -e "
const readline = require('readline');
const rl = readline.createInterface({ input: process.stdin });
let data = '';
rl.on('line', (line) => data += line);
rl.on('close', () => {
  try {
    const json = JSON.parse(data);
    console.log(json.id || '');
  } catch (e) {}
});
")

if [ -z "$PROJECT_ID" ]; then
  echo -e "${RED}[ERROR]${NC} Không thể tạo dự án TaskManager. Response từ server:"
  echo "$PROJECT_RESPONSE"
  exit 1
fi
echo -e "${GREEN}[OK]${NC} Đã tạo dự án thành công. ID: $PROJECT_ID"

# ─── 5. Add Users to Project Members ──────────────────────────────────────
echo -e "${BLUE}[INFO]${NC} Đang gán vai trò các thành viên vào dự án..."

add_project_member() {
  local u_id="$1"
  local p_role="$2"

  docker exec -i mpm-postgres psql -U mpm -d mpm -c "
    insert into project_members (id, user_id, project_id, project_role, created_at)
    values (gen_random_uuid(), '$u_id', '$PROJECT_ID', '$p_role', now());
  " > /dev/null
  echo -e "${GREEN}[OK]${NC} Đã thêm user làm $p_role cho project." >&2
}

# The creator ($ADMIN_EMAIL) is added automatically as Scrum_Master during project creation.
# We enroll the rest of the demo users.
add_project_member "$SM_USER_ID" "Scrum_Master"
add_project_member "$PO_USER_ID" "Product_Owner"
add_project_member "$BA1_USER_ID" "Developer"
add_project_member "$BA2_USER_ID" "Developer"
add_project_member "$BA3_USER_ID" "Developer"
add_project_member "$DEV1_USER_ID" "Developer"
add_project_member "$DEV2_USER_ID" "Developer"
add_project_member "$DEV3_USER_ID" "Developer"
add_project_member "$QA1_USER_ID" "QA"
add_project_member "$QA2_USER_ID" "QA"
add_project_member "$STAKEHOLDER1_USER_ID" "Stakeholder"
echo -e "${GREEN}[OK]${NC} Đã gán thành công tất cả thành viên."

# ─── 6. Query Project States ──────────────────────────────────────────────
echo -e "${BLUE}[INFO]${NC} Đang lấy danh sách states của dự án..."
STATES_JSON=$(curl -s -H "Authorization: Bearer $TOKEN" "$BACKEND_URL/api/projects/$PROJECT_ID/states")

parse_state_id() {
  local state_name="$1"
  echo "$STATES_JSON" | node -e "
const readline = require('readline');
const rl = readline.createInterface({ input: process.stdin });
let data = '';
rl.on('line', (line) => data += line);
rl.on('close', () => {
  try {
    const json = JSON.parse(data);
    let state;
    for (const key in json.data) {
      if (Array.isArray(json.data[key])) {
        const found = json.data[key].find(s => s.name === '$state_name');
        if (found) {
          state = found;
          break;
        }
      }
    }
    console.log(state ? state.id : '');
  } catch (e) {}
});
"
}

BACKLOG_STATE_ID=$(parse_state_id "Backlog")
TODO_STATE_ID=$(parse_state_id "Todo")
IN_PROGRESS_STATE_ID=$(parse_state_id "In Progress")
DONE_STATE_ID=$(parse_state_id "Done")

echo -e "  States mapping:"
echo -e "    - Backlog:     ${YELLOW}$BACKLOG_STATE_ID${NC}"
echo -e "    - Todo:        ${YELLOW}$TODO_STATE_ID${NC}"
echo -e "    - In Progress: ${YELLOW}$IN_PROGRESS_STATE_ID${NC}"
echo -e "    - Done:        ${YELLOW}$DONE_STATE_ID${NC}"

# Helper function to create tasks
create_task() {
  local title="$1"
  local type="$2"
  local state_id="$3"
  local parent_id="$4"
  local priority="$5"
  local estimate_value="$6"
  local assignee_ids_str="$7"
  local description_json="$8"

  # Escape double quotes for json string
  local escaped_title=$(echo "$title" | sed 's/"/\\"/g')

  local json_payload="{\"title\": \"$escaped_title\", \"type\": \"$type\""
  if [ -n "$state_id" ]; then
    json_payload="$json_payload, \"stateId\": \"$state_id\""
  fi
  if [ -n "$parent_id" ]; then
    json_payload="$json_payload, \"parentId\": \"$parent_id\""
  fi
  if [ -n "$priority" ]; then
    json_payload="$json_payload, \"priority\": \"$priority\""
  fi
  if [ -n "$estimate_value" ]; then
    json_payload="$json_payload, \"estimateValue\": $estimate_value"
  fi
  if [ -n "$assignee_ids_str" ]; then
    local assignee_json=$(echo "$assignee_ids_str" | node -e "
const readline = require('readline');
const rl = readline.createInterface({ input: process.stdin });
rl.on('line', (line) => {
  const ids = line.split(',').filter(Boolean);
  console.log(JSON.stringify(ids));
});
")
    json_payload="$json_payload, \"assigneeIds\": $assignee_json"
  fi
  if [ -n "$description_json" ]; then
    json_payload="$json_payload, \"description\": $description_json"
  fi
  json_payload="$json_payload}"

  local response
  response=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "$json_payload" \
    "$BACKEND_URL/api/projects/$PROJECT_ID/tasks")

  local task_id
  task_id=$(echo "$response" | node -e "
const readline = require('readline');
const rl = readline.createInterface({ input: process.stdin });
let data = '';
rl.on('line', (line) => data += line);
rl.on('close', () => {
  try {
    const json = JSON.parse(data);
    console.log(json.id || '');
  } catch (e) {}
});
")

  if [ -z "$task_id" ]; then
    echo -e "${RED}[ERROR]${NC} Lỗi khi tạo task: $title. Response:"
    echo "$response"
    exit 1
  fi

  echo "$task_id"
}

# Helper function to create modules
create_module() {
  local name="$1"
  local description_plain="$2"

  local escaped_name=$(echo "$name" | sed 's/"/\\"/g')
  local escaped_desc=$(echo "$description_plain" | sed 's/"/\\"/g')

  local desc_json="{\"type\": \"doc\", \"content\": [{\"type\": \"paragraph\", \"content\": [{\"type\": \"text\", \"text\": \"$escaped_desc\"}]}]}"
  local json_payload="{\"name\": \"$escaped_name\", \"description\": $desc_json, \"status\": \"planning\"}"

  local response
  response=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "$json_payload" \
    "$BACKEND_URL/api/projects/$PROJECT_ID/modules")

  local module_id
  module_id=$(echo "$response" | node -e "
const readline = require('readline');
const rl = readline.createInterface({ input: process.stdin });
let data = '';
rl.on('line', (line) => data += line);
rl.on('close', () => {
  try {
    const json = JSON.parse(data);
    console.log(json.id || '');
  } catch (e) {}
});
")

  if [ -z "$module_id" ]; then
    echo -e "${RED}[ERROR]${NC} Lỗi khi tạo module: $name. Response:"
    echo "$response"
    exit 1
  fi
  echo "$module_id"
}

# Helper function to create sprints
create_sprint() {
  local name="$1"
  local goal="$2"
  local start_date="$3"
  local end_date="$4"
  local target_capacity="$5"

  local escaped_name=$(echo "$name" | sed 's/"/\\"/g')
  local escaped_goal=$(echo "$goal" | sed 's/"/\\"/g')

  local json_payload="{\"name\": \"$escaped_name\""
  if [ -n "$escaped_goal" ]; then
    json_payload="$json_payload, \"goal\": \"$escaped_goal\""
  fi
  if [ -n "$start_date" ]; then
    json_payload="$json_payload, \"startDate\": \"$start_date\""
  fi
  if [ -n "$end_date" ]; then
    json_payload="$json_payload, \"endDate\": \"$end_date\""
  fi
  if [ -n "$target_capacity" ]; then
    json_payload="$json_payload, \"targetCapacity\": $target_capacity"
  fi
  json_payload="$json_payload}"

  local response
  response=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "$json_payload" \
    "$BACKEND_URL/api/projects/$PROJECT_ID/sprints")

  local sprint_id
  sprint_id=$(echo "$response" | node -e "
const readline = require('readline');
const rl = readline.createInterface({ input: process.stdin });
let data = '';
rl.on('line', (line) => data += line);
rl.on('close', () => {
  try {
    const json = JSON.parse(data);
    console.log(json.id || '');
  } catch (e) {}
});
")

  if [ -z "$sprint_id" ]; then
    echo -e "${RED}[ERROR]${NC} Lỗi khi tạo sprint: $name. Response:"
    echo "$response"
    exit 1
  fi
  echo "$sprint_id"
}

# Helper function to assign tasks to sprint
assign_tasks_to_sprint() {
  local sprint_id="$1"
  shift
  local task_ids=("$@")

  # Format array as JSON
  local task_ids_json=$(printf '%s\n' "${task_ids[@]}" | node -e "
const readline = require('readline');
const rl = readline.createInterface({ input: process.stdin });
const ids = [];
rl.on('line', (line) => {
  const clean = line.trim();
  if (clean) ids.push(clean);
});
rl.on('close', () => console.log(JSON.stringify(ids)));
")

  local json_payload="{\"taskIds\": $task_ids_json}"

  local response
  response=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "$json_payload" \
    "$BACKEND_URL/api/projects/$PROJECT_ID/sprints/$sprint_id/tasks")
}

# Helper function to assign tasks to module
assign_tasks_to_module() {
  local module_id="$1"
  shift
  local task_ids=("$@")

  # Format array as JSON
  local task_ids_json=$(printf '%s\n' "${task_ids[@]}" | node -e "
const readline = require('readline');
const rl = readline.createInterface({ input: process.stdin });
const ids = [];
rl.on('line', (line) => {
  const clean = line.trim();
  if (clean) ids.push(clean);
});
rl.on('close', () => console.log(JSON.stringify(ids)));
")

  local json_payload="{\"taskIds\": $task_ids_json}"

  local response
  response=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "$json_payload" \
    "$BACKEND_URL/api/projects/$PROJECT_ID/modules/$module_id/tasks")
}

# Helper function to start sprint
start_sprint() {
  local sprint_id="$1"

  local response
  response=$(curl -s -X POST \
    -H "Authorization: Bearer $TOKEN" \
    "$BACKEND_URL/api/projects/$PROJECT_ID/sprints/$sprint_id/start")

  local status
  status=$(echo "$response" | node -e "
const readline = require('readline');
const rl = readline.createInterface({ input: process.stdin });
let data = '';
rl.on('line', (line) => data += line);
rl.on('close', () => {
  try {
    const json = JSON.parse(data);
    console.log(json.status || '');
  } catch (e) {}
});
")

  if [ "$status" != "active" ]; then
    echo -e "${RED}[ERROR]${NC} Không thể kích hoạt sprint $sprint_id. Response:"
    echo "$response"
    exit 1
  fi
}

# Helper function to complete sprint
complete_sprint() {
  local sprint_id="$1"
  local move_to_backlog="$2" # true or false
  local target_sprint_id="$3"

  local json_payload="{}"
  if [ "$move_to_backlog" = "true" ]; then
    json_payload="{\"moveToBacklog\": true}"
  elif [ -n "$target_sprint_id" ]; then
    json_payload="{\"targetSprintId\": \"$target_sprint_id\"}"
  fi

  local response
  response=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "$json_payload" \
    "$BACKEND_URL/api/projects/$PROJECT_ID/sprints/$sprint_id/complete")

  local status
  status=$(echo "$response" | node -e "
const readline = require('readline');
const rl = readline.createInterface({ input: process.stdin });
let data = '';
rl.on('line', (line) => data += line);
rl.on('close', () => {
  try {
    const json = JSON.parse(data);
    console.log(json.status || '');
  } catch (e) {}
});
")

  if [ "$status" != "completed" ]; then
    echo -e "${RED}[ERROR]${NC} Không thể hoàn thành sprint $sprint_id. Response:"
    echo "$response"
    exit 1
  fi
}

# ─── 7. Create Project Modules ─────────────────────────────────────────────
echo -e "\n${BLUE}[INFO]${NC} Đang tạo các Modules dự án..."
MODULE_AUTH_ID=$(create_module "Core & Authentication" "Quản lý hệ thống đăng nhập, phân quyền và phiên làm việc.")
echo -e "  - Module Core & Authentication ID: $MODULE_AUTH_ID"

MODULE_TASK_ID=$(create_module "Task Management & Details" "Quản lý vòng đời task, subtask và thanh trạng thái chi tiết.")
echo -e "  - Module Task Management ID:        $MODULE_TASK_ID"

MODULE_MEMBER_ID=$(create_module "Project & Members" "Quản lý thành viên, lời mời tham gia và ma trận vai trò.")
echo -e "  - Module Project & Members ID:      $MODULE_MEMBER_ID"

MODULE_BACKLOG_ID=$(create_module "Backlog & Labels" "Quản lý backlog, nhãn dán workspace/project và kéo thả.")
echo -e "  - Module Backlog & Labels ID:       $MODULE_BACKLOG_ID"

MODULE_STATE_ID=$(create_module "State Templates & Settings" "Quản lý workspace state templates và đồng bộ cài đặt.")
echo -e "  - Module State Templates ID:        $MODULE_STATE_ID"

MODULE_MODULE_ID=$(create_module "Modules & Lifecycle" "Quản lý modules dự án và ghi nhận lịch sử chuyển đổi.")
echo -e "  - Module Modules & Lifecycle ID:    $MODULE_MODULE_ID"

MODULE_SPRINT_ID=$(create_module "Sprints, Cycles & Velocity" "Quản lý chu kỳ sprint, capacity planning, burndown chart và velocity.")
echo -e "  - Module Sprints & Cycles ID:       $MODULE_SPRINT_ID"

MODULE_COLLAB_ID=$(create_module "Collaboration & Comments" "Hệ thống bình luận phân cấp và thả biểu cảm emoji.")
echo -e "  - Module Collaboration ID:          $MODULE_COLLAB_ID"


# ─── 8. Create Sprints ─────────────────────────────────────────────────────
echo -e "\n${BLUE}[INFO]${NC} Đang tạo danh sách Sprints..."
SPRINT1_ID=$(create_sprint "Sprint 1: Core Authentication & Auth Guards" "Thiết lập bảo mật và xác thực cơ bản" "2026-03-09" "2026-03-22" 30)
echo -e "  - Sprint 1 (Completed) ID: $SPRINT1_ID"

SPRINT2_ID=$(create_sprint "Sprint 2: Task Management & Detail UI Optimization" "Xây dựng core tasks và khung hiển thị chi tiết" "2026-03-23" "2026-04-05" 35)
echo -e "  - Sprint 2 (Completed) ID: $SPRINT2_ID"

SPRINT3_ID=$(create_sprint "Sprint 3: Project & Member Management" "Quản lý thành viên và cấu hình phân quyền dự án" "2026-04-06" "2026-04-19" 30)
echo -e "  - Sprint 3 (Completed) ID: $SPRINT3_ID"

SPRINT4_ID=$(create_sprint "Sprint 4: Backlog UI & Scoped Labels" "Tối ưu hóa bộ lọc backlog và nhãn dán hai cấp độ" "2026-04-20" "2026-05-03" 40)
echo -e "  - Sprint 4 (Completed) ID: $SPRINT4_ID"

SPRINT5_ID=$(create_sprint "Sprint 5: Workspace State Templates & Settings UI Consistency" "Đồng nhất giao diện cài đặt và quy chuẩn mẫu trạng thái" "2026-05-04" "2026-05-17" 40)
echo -e "  - Sprint 5 (Completed) ID: $SPRINT5_ID"

SPRINT6_ID=$(create_sprint "Sprint 6: Modules Integration & Module Lifecycle" "Tách biệt modules và cài đặt luồng chuyển trạng thái module" "2026-05-18" "2026-05-31" 45)
echo -e "  - Sprint 6 (Completed) ID: $SPRINT6_ID"

SPRINT7_ID=$(create_sprint "Sprint 7: Sprints & Cycles & Read Mode" "Triển khai quản lý chu kỳ sprint và mô tả read mode" "2026-06-01" "2026-06-14" 45)
echo -e "  - Sprint 7 (Active) ID:    $SPRINT7_ID"

SPRINT8_ID=$(create_sprint "Sprint 8: Advanced Burndown Charts & Member Capacity Planning" "Biểu đồ Burndown nâng cao và quản lý capacity chi tiết" "2026-06-15" "2026-06-28" 45)
echo -e "  - Sprint 8 (Planning) ID:  $SPRINT8_ID"

SPRINT9_ID=$(create_sprint "Sprint 9: Task Comments Reactions & Real-time Collaboration" "Bình luận lồng nhau và thả biểu cảm emoji" "2026-06-29" "2026-07-12" 40)
echo -e "  - Sprint 9 (Planning) ID:  $SPRINT9_ID"


# ─── 9. Import Epics, User Stories & Tasks ───────────────────────────────
echo -e "\n${BLUE}[INFO]${NC} Đang tiến hành tạo các Epic, User Story và Tasks từ Specs..."

TOKEN="$TOKEN" \
BACKEND_URL="$BACKEND_URL" \
PROJECT_ID="$PROJECT_ID" \
TODO_STATE_ID="$TODO_STATE_ID" \
IN_PROGRESS_STATE_ID="$IN_PROGRESS_STATE_ID" \
DONE_STATE_ID="$DONE_STATE_ID" \
MODULE_AUTH_ID="$MODULE_AUTH_ID" \
MODULE_TASK_ID="$MODULE_TASK_ID" \
MODULE_MEMBER_ID="$MODULE_MEMBER_ID" \
MODULE_BACKLOG_ID="$MODULE_BACKLOG_ID" \
MODULE_STATE_ID="$MODULE_STATE_ID" \
MODULE_MODULE_ID="$MODULE_MODULE_ID" \
MODULE_SPRINT_ID="$MODULE_SPRINT_ID" \
MODULE_COLLAB_ID="$MODULE_COLLAB_ID" \
SPRINT1_ID="$SPRINT1_ID" \
SPRINT2_ID="$SPRINT2_ID" \
SPRINT3_ID="$SPRINT3_ID" \
SPRINT4_ID="$SPRINT4_ID" \
SPRINT5_ID="$SPRINT5_ID" \
SPRINT6_ID="$SPRINT6_ID" \
SPRINT7_ID="$SPRINT7_ID" \
SPRINT8_ID="$SPRINT8_ID" \
SPRINT9_ID="$SPRINT9_ID" \
SM_USER_ID="$SM_USER_ID" \
PO_USER_ID="$PO_USER_ID" \
BA1_USER_ID="$BA1_USER_ID" \
BA2_USER_ID="$BA2_USER_ID" \
BA3_USER_ID="$BA3_USER_ID" \
DEV1_USER_ID="$DEV1_USER_ID" \
DEV2_USER_ID="$DEV2_USER_ID" \
DEV3_USER_ID="$DEV3_USER_ID" \
QA1_USER_ID="$QA1_USER_ID" \
QA2_USER_ID="$QA2_USER_ID" \
STAKEHOLDER1_USER_ID="$STAKEHOLDER1_USER_ID" \
node demo_scripts/seeder.js

echo -e "\n${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     Nhập dữ liệu mẫu cho dự án TaskManager THÀNH CÔNG!   ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""




