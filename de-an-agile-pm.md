# ĐỀ ÁN XÂY DỰNG ỨNG DỤNG QUẢN LÝ DỰ ÁN AGILE

## Thông tin chung

| Hạng mục | Nội dung |
|----------|----------|
| Tên dự án | Ứng dụng Quản lý Dự án Agile (Agile PM) |
| Phiên bản tài liệu | 1.0 |
| Ngày lập | 30/05/2026 |
| Đối tượng sử dụng | Scrum Master, Product Owner, Developer, QA, Stakeholder |
| Phạm vi áp dụng | Quản lý dự án phần mềm theo phương pháp Agile/Scrum |

---

## 1. Mục tiêu đề án

### 1.1 Mục tiêu tổng quát

Xây dựng một nền tảng quản lý dự án Agile toàn diện, tích hợp quản lý task, sprint, tài liệu, cộng tác nhóm và trí tuệ nhân tạo — phục vụ các đội phát triển phần mềm vận hành theo Scrum/Kanban.

### 1.2 Mục tiêu cụ thể

- Cung cấp đa dạng dạng xem (List, Kanban, Gantt, Calendar, Table, Mind map) trên cùng một bộ dữ liệu
- Hỗ trợ phân cấp công việc linh hoạt: Epic → Story → Task → Subtask
- Quản lý sprint với capacity planning, burndown chart và velocity tracking
- Tích hợp hệ thống tài liệu có version control và approval workflow
- Hỗ trợ AI trong ước lượng, phân rã task và tra cứu tài liệu
- Đảm bảo traceability từ yêu cầu → tài liệu → task → test → release

---

## 2. Phạm vi chức năng

### 2.1 Nhóm chức năng: Dạng xem Task

| # | Tính năng | Mô tả | Phân loại |
|---|-----------|--------|-----------|
| 1 | Multi-view switching | Chuyển đổi tức thì giữa List, Kanban, Gantt, Calendar, Table, Mind map — cùng dataset, không reload trang | Cốt lõi |
| 2 | Subtask & hierarchy | Phân cấp task không giới hạn: Epic → Story → Task → Subtask. Progress parent tự tính từ con | Cốt lõi |
| 3 | Trạng thái tùy chỉnh | Tạo workflow trạng thái riêng theo từng project type (Agile hoặc custom). Màu sắc, icon, thứ tự tùy chỉnh | Cốt lõi |
| 4 | Grouping & filter | Group task theo bất kỳ field nào, multi-level sort, filter builder, save & share view | Cốt lõi |
| 5 | Gantt dependencies | Dependency FS/SS/FF/SF, critical path highlight, baseline vs actual, milestone markers | Nâng cao |
| 6 | WIP limits & swimlane | Giới hạn WIP per column trên Kanban, swimlane theo assignee/epic/priority, visual warning khi vượt limit | Nâng cao |

#### Chi tiết tính năng Multi-view switching

- **List view**: Hiển thị dạng danh sách với subtask expand/collapse inline
- **Kanban view**: Drag-and-drop giữa các cột trạng thái
- **Gantt view**: Timeline với dependencies và drag-to-reschedule
- **Calendar view**: Hiển thị task theo ngày/tuần/tháng
- **Table view**: Dạng spreadsheet cho chỉnh sửa hàng loạt
- **Mind map view**: Trực quan hóa cấu trúc phân cấp

#### Chi tiết tính năng Subtask & hierarchy

- Epic → Story → Task → Subtask (không giới hạn cấp)
- Progress rollup tự động từ task con lên task cha
- Collapse/expand inline trên mọi view
- Kéo thả reorder và indent/outdent
- Breadcrumb navigation

---

### 2.2 Nhóm chức năng: Task & Custom Fields

| # | Tính năng | Mô tả | Phân loại |
|---|-----------|--------|-----------|
| 1 | Custom fields | 10+ loại field: Text, Number, Date, Dropdown, Multi-select, URL, File, Formula, Checkbox, Person | Cốt lõi |
| 2 | Labels & tags | Label màu tự do + tag có namespace (team:, domain:, version:). Dùng để filter, group và báo cáo | Cốt lõi |
| 3 | Priority & severity | 4 cấp ưu tiên (Critical/High/Medium/Low), severity riêng cho bug, hỗ trợ MoSCoW | Cốt lõi |
| 4 | Dependencies | Quan hệ blocks/blocked-by, related/duplicate. Badge đỏ trên list và kanban card. Dependency chain view | Cốt lõi |
| 5 | Time tracking | Timer start/stop, nhập tay time log, estimate vs actual, member timesheet, export CSV/Excel | Nâng cao |
| 6 | Automation rules | When/If/Then rules builder: auto-notify, auto-assign, webhook integration | Nâng cao |

#### Cấu trúc một Task (Task Anatomy)

```
┌─────────────────────────────────────────────────────┐
│ #EBZ-035 · Project: EBiz Payment v2.3               │
│                                                     │
│ Tích hợp API QR Payment (NAPAS)                     │
│                                                     │
│ [In progress] [backend] [payment] [critical]        │
│                                                     │
│ Mô tả: Tích hợp NAPAS QR gateway vào module        │
│ thanh toán, xử lý callback async và đảm bảo        │
│ idempotency cho retry logic...                      │
│                                                     │
│ Checklist: 2/3    │  Story points: 8                │
│ Progress: ████░   │  Due: 28/05/2025                │
│                                                     │
│ ─── Sidebar ───                                     │
│ Assignee: Tuan Thanh                                │
│ Sprint: Sprint 12                                   │
│ Epic: QR Payment                                    │
│ Version: v2.3                                       │
│ Custom: Môi trường → SIT → UAT                      │
│ Custom: Test evidence → TestPlan_QR.xlsx            │
└─────────────────────────────────────────────────────┘
```

---

### 2.3 Nhóm chức năng: Agile & Sprint

| # | Tính năng | Mô tả | Phân loại |
|---|-----------|--------|-----------|
| 1 | Backlog management | Backlog phân tầng Epic → Story, drag-drop priority, refinement session, story point estimation | Cốt lõi |
| 2 | Sprint planning | Kéo task từ backlog vào sprint, capacity vs SP tracker, sprint goal, velocity reference | Cốt lõi |
| 3 | Burndown & velocity | Burndown chart real-time, velocity history, cumulative flow diagram, team health score | Cốt lõi |
| 4 | Daily standup async | Form standup bất đồng bộ cho team phân tán | Cốt lõi |
| 5 | Retrospective board | 5+ template retro (Start/Stop/Continue, 4Ls, Mad/Sad/Glad), dot voting ẩn danh, action item tracking | Nâng cao |
| 6 | Release management | Quản lý version release, release readiness %, auto release notes, go-live checklist, approval workflow | Trọng điểm |

#### Quy trình Sprint

```
┌──────────┐    ┌──────────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ Backlog  │───▶│Sprint Planning│───▶│ Execution│───▶│  Review  │───▶│  Retro   │
│Refinement│    │  (Capacity)  │    │(Burndown)│    │  (Demo)  │    │(Actions) │
└──────────┘    └──────────────┘    └──────────┘    └──────────┘    └──────────┘
     │                                    │
     │         Velocity Reference         │
     └────────────────────────────────────┘
```

---

### 2.4 Nhóm chức năng: Tài liệu & Version Control

| # | Tính năng | Mô tả | Phân loại |
|---|-----------|--------|-----------|
| 1 | Document wiki | Wiki tích hợp trong project — rich text editor (Notion-style blocks), nhúng task, diagram, code block | Cốt lõi |
| 2 | Document versioning | Auto-version on save, diff viewer side-by-side, rollback 1-click, gắn doc với SW version | Trọng điểm |
| 3 | Approval workflow | Draft → Review → Approved → Published. Ký duyệt điện tử, comment inline, audit trail | Cốt lõi |
| 4 | Smart search | Full-text search nội dung, filter theo SW version/doc type/trạng thái/tác giả/ngày | Trọng điểm |
| 5 | Template library | Thư viện template chuẩn: SRS, SAD, SDD, Test Plan, Release Note, Meeting Minutes | Nâng cao |
| 6 | Traceability matrix | Ma trận liên kết: Req ↔ Task ↔ Doc ↔ Test case ↔ Version. Impact analysis khi yêu cầu thay đổi | Trọng điểm |

#### Quy trình quản lý tài liệu

```
┌────────┐    ┌────────┐    ┌──────────┐    ┌───────────┐
│ Draft  │───▶│ Review │───▶│ Approved │───▶│ Published │
│(Soạn)  │    │(Duyệt) │    │(Ký duyệt)│    │(Phát hành)│
└────────┘    └────────┘    └──────────┘    └───────────┘
     │              │
     │   Reject     │
     └──────────────┘
         (Revision)
```

---

### 2.5 Nhóm chức năng: Cộng tác & AI

| # | Tính năng | Mô tả | Phân loại |
|---|-----------|--------|-----------|
| 1 | In-task comments | Comment trực tiếp trên task với @mention, thread reply, reaction, file attach | Cốt lõi |
| 2 | Notification center | Hub thông báo tập trung + email digest + Slack/Teams webhook + push mobile | Cốt lõi |
| 3 | Workload dashboard | Heatmap khối lượng per member, overload alert khi assign, capacity planning view | Cốt lõi |
| 4 | AI task assistant | AI gợi ý story point, tự viết acceptance criteria, phân rã task, detect duplicate | AI-powered |
| 5 | AI document Q&A | Hỏi đáp tự nhiên với toàn bộ kho tài liệu, summary, cross-doc insights, source citation | AI-powered |
| 6 | Analytics & reporting | Dashboard tổng hợp: sprint progress, velocity, defect rate, lead/cycle time. Auto PDF report | Nâng cao |

---

## 3. Kiến trúc tổng quan (đề xuất)

### 3.1 Kiến trúc hệ thống

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │   Web    │  │  Mobile  │  │  Desktop │  │   API    │       │
│  │  (SPA)   │  │(iOS/And) │  │ (Electron)│  │ Consumer │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                      API GATEWAY / BFF                           │
│         Authentication · Rate Limiting · Routing                 │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                     SERVICE LAYER                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │  Task    │  │  Sprint  │  │   Doc    │  │   AI     │       │
│  │ Service  │  │ Service  │  │ Service  │  │ Service  │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │  User    │  │  Notify  │  │Analytics │  │Automation│       │
│  │ Service  │  │ Service  │  │ Service  │  │ Service  │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                      DATA LAYER                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │PostgreSQL│  │  Redis   │  │  S3/Blob │  │Elastic   │       │
│  │(Primary) │  │ (Cache)  │  │ (Files)  │  │(Search)  │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Công nghệ đề xuất

| Tầng | Công nghệ | Lý do |
|------|-----------|-------|
| Frontend | React + TypeScript | Ecosystem lớn, component-based, phù hợp SPA phức tạp |
| State management | Zustand / TanStack Query | Nhẹ, hiệu năng cao cho real-time data |
| Backend | Node.js (NestJS) hoặc Go | NestJS cho tốc độ phát triển, Go cho hiệu năng |
| Database | PostgreSQL | ACID, JSON support, full-text search |
| Cache | Redis | Session, real-time, pub/sub |
| Search | Elasticsearch | Full-text search tài liệu |
| File storage | S3-compatible | Lưu trữ file đính kèm, tài liệu |
| AI | OpenAI API / Self-hosted LLM | Story point suggestion, document Q&A |
| Real-time | WebSocket (Socket.io) | Collaboration, notifications |
| CI/CD | GitHub Actions / GitLab CI | Automation pipeline |

---

## 4. Phân loại tính năng theo độ ưu tiên

### 4.1 Phase 1 — MVP (3-4 tháng)

Tập trung vào các tính năng **Cốt lõi** để có sản phẩm sử dụng được:

- Multi-view switching (List + Kanban)
- Subtask & hierarchy
- Trạng thái tùy chỉnh
- Custom fields & labels
- Priority & dependencies
- Backlog management
- Sprint planning
- Burndown chart cơ bản
- In-task comments & notifications
- User authentication & authorization

### 4.2 Phase 2 — Enhanced (2-3 tháng)

Bổ sung tính năng **Nâng cao** và **Trọng điểm**:

- Gantt view với dependencies
- WIP limits & swimlane
- Time tracking
- Automation rules
- Document wiki & versioning
- Approval workflow tài liệu
- Workload dashboard
- Template library
- Analytics & reporting

### 4.3 Phase 3 — AI & Advanced (2-3 tháng)

Tích hợp AI và hoàn thiện:

- AI task assistant (story point, AC, breakdown)
- AI document Q&A
- Traceability matrix
- Release management
- Retrospective board
- Smart search nâng cao
- Calendar & Mind map view
- Mobile app

---

## 5. Demo minh họa (từ Blueprint)

### 5.1 Sprint Board — Ví dụ: Sprint 12 — EBiz Payment v2.3

#### Dạng xem List

| Task | Trạng thái | Priority | Assignee | SP |
|------|-----------|----------|----------|-----|
| **Tích hợp API QR Payment** `backend` `payment` | In progress | 🔴 High | TT | 8 |
| ↳ Kết nối NAPAS gateway | Done | 🔴 High | TT | 3 |
| ↳ Xử lý callback & webhook | In progress | 🟠 Med | LM | 3 |
| ↳ Unit test coverage 80% | To do | 🟠 Med | TT | 2 |
| **UI màn hình xác nhận thanh toán** `frontend` | Review | 🟠 Med | LM | 5 |
| ↳ Thiết kế Figma screen | Done | — | NH | 2 |
| ↳ Implement React component | Review | — | LM | 3 |
| Viết test plan UAT module QR `qa` | To do | 🟢 Low | NH | 3 |
| Fix lỗi timeout OTP xác thực `bug` | Blocked | 🔴 High | TT | 2 |

#### Dạng xem Kanban

```
┌──────────┐  ┌──────────┐  ┌───────────┐  ┌──────────┐  ┌──────────┐
│ Backlog  │  │  To do   │  │In progress│  │  Review  │  │   Done   │
│   (3)    │  │   (2)    │  │    (2)    │  │   (2)    │  │   (5)    │
├──────────┤  ├──────────┤  ├───────────┤  ├──────────┤  ├──────────┤
│#041      │  │#038      │  │#035       │  │#036      │  │#031      │
│Export PDF│  │Test plan │  │API QR Pay │  │UI xác    │  │DB schema │
│          │  │UAT       │  │           │  │nhận TT   │  │          │
│#042      │  │          │  │#039 🔴    │  │          │  │#032      │
│Rate limit│  │          │  │Fix OTP    │  │          │  │Setup SIT │
└──────────┘  └──────────┘  └───────────┘  └──────────┘  └──────────┘
```

#### Dạng xem Gantt (Timeline)

```
Task                    │ T5/W1  T5/W2  T5/W3  T5/W4  T6/W1  T6/W2
────────────────────────┼──────────────────────────────────────────
Thiết kế DB schema      │ ████
  ↳ ER diagram          │ ██
  ↳ Migration scripts   │   ██
Tích hợp API QR Payment │    ████████████
  ↳ Kết nối NAPAS       │    ██████
  ↳ Webhook handler     │         ████████
UI xác nhận thanh toán  │       ██████████
Test plan UAT           │                    ████████
Deploy SIT → UAT        │                          ████████
```

---

## 6. Rủi ro và giải pháp

| # | Rủi ro | Mức độ | Giải pháp |
|---|--------|--------|-----------|
| 1 | Phạm vi chức năng quá rộng, khó kiểm soát timeline | Cao | Phân phase rõ ràng, MVP trước, iterate sau |
| 2 | Hiệu năng khi dữ liệu lớn (nhiều task, nhiều sprint) | Trung bình | Pagination, lazy loading, caching strategy |
| 3 | Real-time collaboration gây conflict | Trung bình | CRDT hoặc OT cho document editing, optimistic UI |
| 4 | Chi phí AI service | Trung bình | Rate limiting, caching AI responses, fallback to rule-based |
| 5 | Adoption — người dùng quen tool cũ | Cao | UX trực quan, import data từ Jira/Trello, onboarding flow |

---

## 7. Tiêu chí nghiệm thu

### 7.1 Tiêu chí chức năng

- Tất cả tính năng Cốt lõi hoạt động đúng theo mô tả
- Chuyển đổi giữa các view không mất dữ liệu
- Sprint planning tính đúng capacity và velocity
- Document versioning lưu đúng lịch sử và diff chính xác
- Notification gửi đúng người, đúng sự kiện

### 7.2 Tiêu chí phi chức năng

| Tiêu chí | Yêu cầu |
|----------|----------|
| Response time | < 200ms cho thao tác CRUD thông thường |
| Page load | < 2s cho initial load, < 500ms cho view switching |
| Concurrent users | Hỗ trợ tối thiểu 500 users đồng thời |
| Uptime | 99.5% |
| Data backup | Daily backup, RPO < 1 giờ |
| Security | OWASP Top 10 compliance, data encryption at rest & in transit |

---

## 8. Kế hoạch triển khai tổng quan

```
2026 Q3          2026 Q4          2027 Q1          2027 Q2
│                │                │                │
├── Phase 1 ────►├── Phase 2 ────►├── Phase 3 ────►│ Go-live
│   MVP          │   Enhanced     │   AI & Adv     │ Production
│                │                │                │
│ • List/Kanban  │ • Gantt        │ • AI assistant │
│ • Task CRUD    │ • Time track   │ • AI doc Q&A   │
│ • Sprint       │ • Automation   │ • Traceability │
│ • Comments     │ • Doc wiki     │ • Release mgmt │
│ • Auth         │ • Analytics    │ • Mobile app   │
└────────────────┴────────────────┴────────────────┘
```

---

## 9. Đội ngũ dự kiến

| Vai trò | Số lượng | Trách nhiệm |
|---------|----------|-------------|
| Product Owner | 1 | Định hướng sản phẩm, quản lý backlog |
| Scrum Master | 1 | Điều phối sprint, loại bỏ impediment |
| Frontend Developer | 2-3 | UI/UX implementation, multi-view |
| Backend Developer | 2-3 | API, business logic, integrations |
| Full-stack Developer | 1-2 | Cross-cutting features |
| AI/ML Engineer | 1 | AI features, model integration |
| QA Engineer | 1-2 | Testing, automation test |
| DevOps | 1 | CI/CD, infrastructure, monitoring |
| UX Designer | 1 | Wireframe, prototype, user research |

---

## 10. Kết luận

Đề án xây dựng ứng dụng Quản lý Dự án Agile nhắm đến việc tạo ra một công cụ toàn diện, hiện đại, tích hợp AI — phục vụ đội ngũ phát triển phần mềm vận hành theo Agile. Với cách tiếp cận phân phase và ưu tiên MVP, dự án đảm bảo:

1. **Giá trị sớm**: Sản phẩm sử dụng được ngay từ Phase 1
2. **Linh hoạt**: Điều chỉnh scope dựa trên feedback thực tế
3. **Khác biệt**: Tích hợp AI và document versioning — điểm mạnh so với các tool hiện có
4. **Mở rộng**: Kiến trúc microservice cho phép scale theo nhu cầu

---

*Tài liệu này được soạn dựa trên Blueprint ứng dụng quản lý dự án Agile — bao gồm chức năng, giao diện và tài liệu kỹ thuật.*
