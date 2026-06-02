---
specName: project-settings
version: 1.0
status: draft
createdAt: 2026-06-02
---

# Requirements: Project Settings Enhancement (Epic A+)

## Introduction

Tài liệu này mô tả các yêu cầu cho **Project Settings Enhancement (Epic A+)** — cập nhật đối tượng Project để tương đương Plane.so. Epic này **bắt buộc hoàn thành trước Epic B (Task Management)** vì:

1. **Custom States** thay thế hardcoded `task_state_enum` — bảng `tasks` ở Epic B sẽ dùng FK đến `project_states` thay vì enum cứng
2. **Estimate Configuration** ảnh hưởng đến cách render Estimate field trong Task Detail Panel
3. **Feature Flags** quyết định việc hiển thị/ẩn các module (Cycles, Modules, Views, Pages) trong navigation

> **Phụ thuộc ngược:** Epic B (task-management) sẽ được cập nhật: cột `tasks.state` chuyển từ `task_state_enum` sang `UUID FK → project_states.id`.

> **Chuẩn hiển thị UI:** Xem [`/kiro/steering/ui-standards.md`](../../steering/ui-standards.md)

## Glossary

- **Project_Network**: Chế độ hiển thị của project: `secret` (mặc định, chỉ members được mời mới thấy) hoặc `public` (toàn bộ workspace members đều có thể khám phá và tham gia)
- **Project_Lead**: Thành viên được chỉ định làm người phụ trách chính của project (không nhất thiết phải là Scrum_Master)
- **Project_Emoji**: Biểu tượng emoji (ví dụ: 🚀) hoặc tên icon dùng để nhận diện project nhanh trong sidebar và danh sách
- **Project_Cover**: Ảnh bìa tùy chỉnh hiển thị phía trên trang overview của project
- **Project_Timezone**: Múi giờ riêng của project, ảnh hưởng đến cách tính ngày trong Cycles (Epic C)
- **Project_State**: Trạng thái workflow tùy chỉnh của project, thay thế hardcoded enum; mỗi state thuộc một **State_Group**
- **State_Group**: Nhóm logic của state, không thể thay đổi: `backlog` | `unstarted` | `started` | `completed` | `cancelled` — dùng để lọc và thống kê xuyên suốt hệ thống
- **Default_State**: State được tự động gán cho Work_Item mới nếu không chỉ định state — mỗi project có đúng một Default_State
- **Estimate_Config**: Cấu hình hệ thống ước lượng của project: loại (Points/Categories/Time) và danh sách giá trị/nhãn
- **Feature_Flag**: Cờ bật/tắt module của project: Cycles, Modules, Views, Pages, Intake, Time Tracking
- **Project_Settings_Page**: Trang cài đặt project với nhiều tabs: General, Members, States, Labels, Estimates, Features, Danger Zone

## Requirements

### Requirement 1: Mở rộng thông tin cơ bản Project

**User Story:** Là một Scrum Master, tôi muốn cấu hình đầy đủ thông tin project như emoji, lead, network, timezone để team nhận diện và quản lý project dễ dàng hơn.

#### Acceptance Criteria

1. WHEN người dùng có Project_Role Scrum_Master hoặc System_Role Admin tạo project mới, THE Project_Service SHALL chấp nhận các fields bổ sung: emoji (1 ký tự emoji Unicode hoặc tên icon ≤ 30 ký tự, tùy chọn), network (`secret` | `public`, mặc định `secret`), lead_id (UUID user, phải là member của project hoặc NULL, tùy chọn), timezone (IANA timezone string, ví dụ `Asia/Ho_Chi_Minh`, mặc định `Asia/Ho_Chi_Minh`, tùy chọn)
2. WHEN project được tạo thành công, THE Project_Service SHALL tự động khởi tạo 6 default states cho project: Backlog (group: backlog), Todo (group: unstarted, is_default: true), In Progress (group: started), In Review (group: started), Done (group: completed), Cancelled (group: cancelled)
3. WHEN project được tạo thành công, THE Project_Service SHALL tự động khởi tạo Estimate_Config mặc định: type = `points`, values = `[0, 0.5, 1, 2, 3, 5, 8, 13, 21]` (Fibonacci)
4. WHEN người dùng cập nhật General settings của project, THE Project_Service SHALL cho phép thay đổi: name, description, emoji, network, lead_id, timezone — và ghi audit log `project_updated`
5. IF lead_id được chỉ định nhưng user đó không phải thành viên project, THEN THE Project_Service SHALL trả về HTTP 422 với error code `LEAD_NOT_MEMBER`
6. IF timezone không phải IANA timezone hợp lệ, THEN trả về HTTP 400 `INVALID_TIMEZONE`

### Requirement 2: Network / Visibility

**User Story:** Là một Scrum Master, tôi muốn kiểm soát ai có thể khám phá và tham gia project, để bảo vệ dữ liệu nhạy cảm.

#### Acceptance Criteria

1. WHEN project có network = `secret`, THE Project_Service SHALL chỉ trả về project này trong danh sách dành cho users đã là thành viên hoặc System_Role Admin; users khác trong workspace không thể thấy project này qua bất kỳ API nào
2. WHEN project có network = `public`, THE Project_Service SHALL trả về project này trong danh sách cho tất cả workspace members (không cần là thành viên); users có thể tự join qua `POST /api/projects/:id/join` với Project_Role mặc định `Developer`
3. WHEN project được đổi từ `public` sang `secret`, THE Project_Service SHALL không tự động xóa members hiện tại — chỉ ngăn users mới tự join
4. WHEN người dùng tự join project public, THE Project_Service SHALL thêm họ với role `Developer`, ghi audit log `member_joined_public`
5. THE Project_Client SHALL hiển thị badge "Public" / "Secret" rõ ràng trên project card và trong General settings

### Requirement 3: Project Cover Image và Emoji

**User Story:** Là một Scrum Master, tôi muốn cá nhân hóa project bằng emoji và ảnh bìa để team dễ nhận biết.

#### Acceptance Criteria

1. WHEN người dùng chọn emoji cho project, THE Project_Client SHALL hiển thị emoji picker (grid các emoji thông dụng + search) và lưu ký tự emoji hoặc tên icon vào field `emoji`
2. WHEN người dùng upload cover image, THE Project_Service SHALL chấp nhận file image (jpg, png, webp) tối đa 5MB, resize về `1920×384px`, lưu vào `uploads/projects/{projectId}/cover.{ext}`, và trả về URL
3. IF cover image không phải định dạng image hoặc vượt 5MB, trả về HTTP 415 hoặc HTTP 413
4. WHEN người dùng xóa cover image, THE Project_Service SHALL xóa file và set `cover_image_url = NULL`
5. THE Project_Client SHALL hiển thị project emoji trong sidebar (thay icon mặc định), project card, và header trang project
6. WHEN project không có emoji, THE Project_Client SHALL hiển thị 2 chữ cái đầu của project name (dạng avatar text) làm fallback

### Requirement 4: Custom States

**User Story:** Là một Scrum Master, tôi muốn tùy chỉnh workflow states của project (tên, màu sắc, thứ tự) để phản ánh đúng quy trình làm việc của team.

#### Acceptance Criteria

1. THE Project_Service SHALL lưu trữ states của project trong bảng `project_states` thay vì hardcoded enum; mỗi state có: name (1–50 ký tự, unique trong project), color (hex `#RRGGBB`), group (một trong 5 State_Group cố định), is_default (boolean), order (integer cho thứ tự hiển thị)
2. WHEN người dùng có Project_Role Scrum_Master hoặc Admin tạo state mới, THE Project_Service SHALL INSERT vào `project_states` với order = MAX(order) + 1 trong project đó; mỗi project có tối đa **20 states**
3. WHEN người dùng cập nhật state (name, color, group, order), THE Project_Service SHALL UPDATE tương ứng; nếu thay đổi group, cập nhật luôn trên tất cả work items đang ở state đó trong background (async)
4. IF name state trùng với state khác trong cùng project, trả về HTTP 409 `STATE_NAME_EXISTS`
5. WHEN người dùng đổi Default_State, THE Project_Service SHALL set `is_default = false` cho state cũ, `is_default = true` cho state mới — trong một transaction; đảm bảo luôn có đúng một default state per project
6. WHEN người dùng xóa state, THE Project_Service SHALL kiểm tra: nếu còn work items đang dùng state này, từ chối với HTTP 422 `STATE_IN_USE` và trả về số lượng work items bị ảnh hưởng; nếu không có work items, cho phép xóa
7. WHEN người dùng muốn xóa state đang có work items, THE Project_Client SHALL đề xuất chọn state thay thế (migration) — sau khi migrate xong mới cho phép xóa
8. THE Project_Client SHALL hiển thị states grouped theo State_Group trong Settings > States tab; hỗ trợ drag & drop để thay đổi thứ tự trong cùng group
9. IF project chỉ còn 1 state, THE Project_Service SHALL không cho phép xóa state đó
10. System-defined State_Groups (`backlog`, `unstarted`, `started`, `completed`, `cancelled`) là bất biến — users không thể thêm/xóa group, chỉ thêm/xóa/sửa states trong group

### Requirement 5: Estimate Configuration

**User Story:** Là một Scrum Master, tôi muốn cấu hình hệ thống ước lượng phù hợp với team (story points, T-shirt sizes, hoặc giờ).

#### Acceptance Criteria

1. THE Project_Service SHALL lưu Estimate_Config per project với: `estimate_type` (`points` | `categories` | `time`) và `values` (JSONB array)
   - **Points**: Mảng số (ví dụ: `[0, 0.5, 1, 2, 3, 5, 8, 13, 21]`); hỗ trợ templates: Fibonacci, Linear (1–10), Squares (1, 4, 9, 16, 25)
   - **Categories**: Mảng string (ví dụ: `["XS", "S", "M", "L", "XL", "XXL"]`); hỗ trợ templates: T-shirt sizes, Easy/Medium/Hard
   - **Time**: Mảng số giờ (ví dụ: `[0.5, 1, 2, 4, 8, 16]`)
2. WHEN người dùng thay đổi estimate_type, THE Project_Service SHALL cập nhật Estimate_Config và reset tất cả `estimate_value` của work items trong project thành NULL (async background job) với thông báo cảnh báo trước khi xác nhận
3. WHEN người dùng thêm/xóa/sửa giá trị trong `values`, THE Project_Service SHALL chỉ cập nhật Estimate_Config; work items giữ nguyên giá trị hiện tại (không reset)
4. `values` phải có tối thiểu 2 phần tử và tối đa 12 phần tử; với Points/Time các phần tử phải là số dương; với Categories các phần tử phải là string 1–20 ký tự; với Points phải không có giá trị trùng
5. THE Task_Client SHALL render Estimate field trong Task Detail Panel dựa theo Estimate_Config của project: Points → số input với dropdown; Categories → p-select với labels; Time → input giờ với dropdown
6. WHEN người dùng chọn estimate value không có trong `values` hiện tại (ví dụ sau khi admin xóa giá trị đó), THE Task_Client SHALL hiển thị giá trị cũ với indicator "giá trị không còn hợp lệ" và cho phép chọn lại

### Requirement 6: Feature Flags

**User Story:** Là một Scrum Master, tôi muốn bật/tắt từng module của project để giao diện không bị rối bởi các tính năng chưa dùng.

#### Acceptance Criteria

1. THE Project_Service SHALL lưu 6 feature flags trong bảng `projects`: `feature_cycles` (default: true), `feature_modules` (default: true), `feature_views` (default: true), `feature_pages` (default: true), `feature_intake` (default: false), `feature_time_tracking` (default: false)
2. WHEN Project_Role Scrum_Master hoặc Admin thay đổi feature flag, THE Project_Service SHALL UPDATE flag trong projects table và ghi audit log `project_features_updated`
3. WHEN feature_cycles = false, THE Project_Client SHALL ẩn "Cycles" khỏi sidebar navigation và tất cả UI liên quan đến cycle assignment trên work items của project đó
4. WHEN feature_modules = false, THE Project_Client SHALL ẩn "Modules" khỏi sidebar và module selector
5. WHEN feature_views = false, THE Project_Client SHALL ẩn "Views" khỏi sidebar
6. WHEN feature_pages = false, THE Project_Client SHALL ẩn "Pages" khỏi sidebar
7. WHEN feature_intake = false, THE Project_Client SHALL ẩn "Intake" khỏi sidebar và work item creation flow
8. WHEN feature_time_tracking = false, THE Project_Client SHALL ẩn time log input trong Task Detail Panel
9. IF người dùng truy cập URL của một module đã bị tắt (ví dụ `/projects/:key/cycles` khi feature_cycles = false), THE Project_Client SHALL redirect về `/projects/:key/backlog` với toast info "Tính năng Cycles chưa được bật cho project này"

### Requirement 7: Project Settings UI — Tabs mới

**User Story:** Là một Scrum Master, tôi muốn có trang settings tập trung với đầy đủ tabs để quản lý mọi khía cạnh của project.

#### Acceptance Criteria

1. THE Project_Client SHALL cập nhật trang `/projects/:key/settings` với 7 tabs: **General**, **Members**, **States**, **Labels**, **Estimates**, **Features**, **Danger Zone**
2. **Tab General** (cập nhật so với Epic A): Thêm fields Emoji (emoji picker), Network (toggle Public/Secret), Lead (member dropdown), Timezone (select IANA timezones); giữ nguyên Name, Description, Key (read-only); thêm section "Cover Image" với upload/delete
3. **Tab States**: Hiển thị states grouped theo State_Group; mỗi state có: color picker, name input (inline edit), group select, Default badge (click để set default), drag handle (reorder trong group), delete button; button "Thêm state" mở inline form; cảnh báo khi cố xóa state đang có work items
4. **Tab Labels**: Giữ nguyên từ Epic A — danh sách labels với color picker, name, task count, edit, delete; form thêm label mới
5. **Tab Estimates**: Radio buttons chọn estimate_type; sau khi chọn type, hiển thị template selector (nếu có) và custom values editor (add/remove/reorder values); preview cách estimate hiển thị trên work item; cảnh báo nếu đổi type sẽ reset tất cả estimates
6. **Tab Features**: Toggle switches cho 6 features với icon, tên, mô tả ngắn; Scrum_Master/Admin mới được toggle; các member khác thấy trạng thái nhưng không thể thay đổi
7. **Tab Danger Zone**: Giữ nguyên từ Epic A (Archive + Delete với confirm gõ key)

### Requirement 8: Project List và Sidebar — Cập nhật hiển thị

**User Story:** Là một thành viên, tôi muốn thấy emoji và thông tin lead của project trong danh sách và sidebar để nhận biết nhanh.

#### Acceptance Criteria

1. THE Project_Client SHALL cập nhật Project List page: thêm cột Emoji/Icon (hoặc hiển thị inline trong cột Tên), thêm cột Lead (avatar + name), thêm cột Network badge (Public/Secret)
2. THE Sidebar SHALL hiển thị project emoji (hoặc avatar text fallback) bên trái tên project trong Project_Switcher và navigation
3. WHEN người dùng truy cập danh sách project, THE Project_Service SHALL trả về thêm các fields: emoji, network, lead (userId, displayName, avatarUrl), feature flags, state counts (grouped by state_group)
4. THE Project_Client SHALL hiển thị network filter trong Project List: All / Public / Secret

### Requirement 9: Migrate Tasks sang Custom States

**User Story:** Là một developer, tôi cần hệ thống task dùng Custom States thay vì hardcoded enum để project settings có hiệu lực.

#### Acceptance Criteria

1. THE Task_Service SHALL thay thế cột `tasks.state` (kiểu `task_state_enum`) bằng `tasks.state_id` (UUID FK → `project_states.id` ON DELETE RESTRICT)
2. WHEN work item mới được tạo mà không chỉ định state, THE Task_Service SHALL tự động gán `state_id` = state có `is_default = true` của project tương ứng
3. WHEN lấy danh sách tasks hoặc task detail, THE Task_Service SHALL JOIN với `project_states` để trả về: `state: { id, name, color, group }` thay vì string enum cũ
4. WHEN query Backlog (tasks chưa có cycle), THE Task_Service SHALL filter dựa trên state_group chứ không phải state name cứng: `WHERE ps.group IN ('backlog', 'unstarted', 'started')` — đảm bảo custom state names không phá vỡ Backlog logic
5. THE Task_Client SHALL render state filter trong Backlog dựa trên states của project (lấy từ API) thay vì hardcoded options
6. Migration data: tất cả work items hiện tại (nếu có) phải được migrate `state` string → `state_id` UUID tương ứng với state cùng tên trong project

### Requirement 10: Phân quyền Project Settings

**User Story:** Là một Scrum Master, tôi muốn kiểm soát ai được phép thay đổi project settings.

#### Acceptance Criteria

1. THE Project_Service SHALL áp dụng permission matrix cho settings:

| Action | Scrum_Master | Product_Owner | Developer | QA | Stakeholder |
|--------|:---:|:---:|:---:|:---:|:---:|
| Xem Settings | ✓ | ✓ | ✓ | ✓ | ✗ |
| Sửa General | ✓ | ✗ | ✗ | ✗ | ✗ |
| Upload Cover | ✓ | ✗ | ✗ | ✗ | ✗ |
| Manage States | ✓ | ✗ | ✗ | ✗ | ✗ |
| Manage Labels | ✓ | ✓ | ✗ | ✗ | ✗ |
| Configure Estimates | ✓ | ✗ | ✗ | ✗ | ✗ |
| Toggle Features | ✓ | ✗ | ✗ | ✗ | ✗ |
| Manage Members | ✓ | ✗ | ✗ | ✗ | ✗ |
| Archive/Delete | ✓ | ✗ | ✗ | ✗ | ✗ |

2. System_Role Admin có toàn quyền trên mọi setting của mọi project
3. IF người dùng không có quyền truy cập Settings page, THE Project_Client SHALL ẩn link "Settings" trong sidebar
