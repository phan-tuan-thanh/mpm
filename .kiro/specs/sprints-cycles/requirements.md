# Requirements Document

## Introduction

Tài liệu này đặc tả yêu cầu cho chức năng **Sprints/Cycles** của ứng dụng Agile PM (MPM), được suy dẫn từ tài liệu thiết kế đã duyệt (`design.md`). Chức năng cung cấp khả năng quản lý chu kỳ làm việc Agile, tích hợp với các module Tasks và Projects hiện có.

Mỗi dự án có thể tự cấu hình thuật ngữ hiển thị (**Sprint** cho Scrum hoặc **Cycle** cho Kanban/Linear), trong khi tầng backend/database luôn lưu trữ thống nhất dưới thực thể `Sprint`. Hệ thống hỗ trợ: cấu hình số lượng Sprint active song song, vòng đời Sprint (planning → active → completed), gán task vào Sprint, lập kế hoạch dung lượng (capacity), biểu đồ Burndown dựa trên snapshot hàng ngày, báo cáo Velocity, và phân quyền theo vai trò cấp dự án.

Tài liệu tuân thủ các chuẩn EARS (Easy Approach to Requirements Syntax) và quy tắc chất lượng INCOSE. Các yêu cầu kiểm thử (acceptance criteria) được liên kết với 10 correctness properties trong tài liệu thiết kế nơi phù hợp.

## Glossary

- **Sprint_System**: Thành phần backend (`SprintModule`) chịu trách nhiệm quản lý vòng đời Sprint, gán task, dashboard.
- **Capacity_Service**: Thành phần tính toán dung lượng tổng/theo thành viên, actual used, và cảnh báo task chưa ước lượng.
- **Snapshot_Service**: Thành phần tạo/cập nhật snapshot và dựng dữ liệu Burndown.
- **Snapshot_Cron**: Global Cron Job chạy hàng ngày để chụp snapshot các Sprint đang active.
- **Authorization_Guard**: `ProjectRolesGuard` kết hợp `@ProjectRoles` kiểm soát quyền truy cập cấp dự án.
- **Sprint_UI**: Thành phần frontend Angular gồm Sprint Filter Dropdown, Capacity Indicator, và submenu Sprints.
- **Sprint**: Chu kỳ làm việc Agile thuộc một dự án; có trạng thái `planning`, `active`, hoặc `completed`.
- **Cycle**: Thuật ngữ hiển thị thay thế cho Sprint khi `terminology = 'cycle'` (bản chất dữ liệu là Sprint).
- **Story_Point (SP)**: Đơn vị ước lượng độ phức tạp của task (`estimate_value`).
- **Effective_SP**: Story Point hiệu dụng của task; bằng `estimate_value` nếu `> 0`, ngược lại bằng `1`.
- **Backlog**: Trạng thái task không thuộc Sprint nào (`sprint_id = null`).
- **Done_State**: Tập trạng thái task được coi là đã hoàn thành; hằng số `DONE_STATES` định nghĩa tại `apps/backend/src/sprint/types/sprint.types.ts`, bao gồm các `stateCategory` thuộc nhóm hoàn thành của hệ thống state hiện có (ví dụ: `completed`, `cancelled`). Giá trị chính xác phải đồng bộ với schema state của dự án.
- **Initial_Story_Points**: Tổng Effective_SP của task trong Sprint tại thời điểm start; bất biến sau khi active.
- **Initial_Tasks_Count**: Số task trong Sprint tại thời điểm start; bất biến sau khi active.
- **Velocity**: Số Story Point hoàn thành trung bình mỗi Sprint.
- **Burndown**: Biểu đồ theo dõi khối lượng công việc còn lại theo ngày (Story Points hoặc Task Count).
- **Project_Role**: Vai trò cấp dự án: `Scrum_Master`, `Product_Owner`, `Developer`, `QA`, `Stakeholder`.

## Requirements

### Requirement 1: Cấu hình thuật ngữ và Settings cấp dự án

**User Story:** Là một Scrum Master hoặc Product Owner, tôi muốn cấu hình thuật ngữ và các tham số Sprint cho từng dự án, để giao diện và hành vi phù hợp với phương pháp Agile mà đội áp dụng.

#### Acceptance Criteria

1. THE Sprint_System SHALL lưu cấu hình Sprint của mỗi dự án trong trường `projects.sprint_settings` gồm `terminology` (giá trị thuộc `{sprint, cycle}`), `maxActiveSprints` (số nguyên từ 1 đến 10), `defaultDurationWeeks` (giá trị thuộc `{1, 2, 4}`), và `capacityMode` (giá trị thuộc `{total, member-based}`).
2. WHEN một dự án mới được tạo mà không cung cấp `sprint_settings`, THE Sprint_System SHALL khởi tạo `sprint_settings` với giá trị mặc định `terminology=sprint`, `maxActiveSprints=1`, `defaultDurationWeeks=2`, và `capacityMode=total`.
3. WHEN một yêu cầu cập nhật settings hợp lệ được gửi bởi người dùng có vai trò `Scrum_Master` hoặc `Product_Owner`, THE Sprint_System SHALL lưu toàn bộ giá trị mới vào `projects.sprint_settings` và phản hồi `200 OK` kèm cấu hình đã lưu trong vòng 2 giây.
4. WHERE `terminology` được đặt là `cycle`, THE Sprint_UI SHALL hiển thị thuật ngữ "Cycle" trên sidebar, header, button, và tooltip thay cho "Sprint".
5. WHERE `terminology` được đặt là `sprint`, THE Sprint_UI SHALL hiển thị thuật ngữ "Sprint" trên sidebar, header, button, và tooltip.
6. IF một yêu cầu cập nhật settings được gửi với `terminology` ngoài tập `{sprint, cycle}`, THEN THE Sprint_System SHALL từ chối yêu cầu với phản hồi `400 Bad Request` chỉ rõ trường `terminology` không hợp lệ và giữ nguyên cấu hình hiện tại.
7. IF một yêu cầu cập nhật settings được gửi với `maxActiveSprints` không phải số nguyên hoặc nằm ngoài khoảng từ 1 đến 10, THEN THE Sprint_System SHALL từ chối yêu cầu với phản hồi `400 Bad Request` chỉ rõ trường `maxActiveSprints` không hợp lệ và giữ nguyên cấu hình hiện tại. *(Giới hạn trên 10 là safety cap nhằm tránh overload hệ thống; có thể nới rộng trong phiên bản sau.)*
8. IF một yêu cầu cập nhật settings được gửi với `defaultDurationWeeks` ngoài tập `{1, 2, 4}`, THEN THE Sprint_System SHALL từ chối yêu cầu với phản hồi `400 Bad Request` chỉ rõ trường `defaultDurationWeeks` không hợp lệ và giữ nguyên cấu hình hiện tại.
9. IF một yêu cầu cập nhật settings được gửi với `capacityMode` ngoài tập `{total, member-based}`, THEN THE Sprint_System SHALL từ chối yêu cầu với phản hồi `400 Bad Request` chỉ rõ trường `capacityMode` không hợp lệ và giữ nguyên cấu hình hiện tại.
10. IF người dùng không có vai trò `Scrum_Master` hoặc `Product_Owner` cố gắng cập nhật settings, THEN THE Authorization_Guard SHALL từ chối với phản hồi `403 Forbidden` và giữ nguyên cấu hình hiện tại.

### Requirement 2: Tạo Sprint

**User Story:** Là một Scrum Master hoặc Product Owner, tôi muốn tạo Sprint mới, để lập kế hoạch chu kỳ làm việc tiếp theo của đội.

#### Acceptance Criteria

1. WHEN một yêu cầu tạo Sprint thỏa toàn bộ điều kiện đầu vào ở các mục 3–8 được gửi tới một dự án đang tồn tại, THE Sprint_System SHALL tạo Sprint mới với `status = 'planning'` và trả về phản hồi `201 Created`.
2. WHEN một Sprint được tạo, THE Sprint_System SHALL gán Sprint đó thuộc duy nhất dự án được chỉ định trong đường dẫn yêu cầu (`projectId`).
3. IF yêu cầu tạo Sprint có `name` rỗng hoặc chỉ chứa ký tự khoảng trắng sau khi cắt khoảng trắng đầu/cuối, THEN THE Sprint_System SHALL từ chối yêu cầu với phản hồi `400 Bad Request` kèm thông báo lỗi cho biết `name` là bắt buộc.
4. IF yêu cầu tạo Sprint có `name` dài hơn 255 ký tự, THEN THE Sprint_System SHALL từ chối yêu cầu với phản hồi `400 Bad Request` kèm thông báo lỗi cho biết `name` vượt quá độ dài cho phép.
5. IF yêu cầu tạo Sprint có `targetCapacity` không phải số hoặc nhỏ hơn `0`, THEN THE Sprint_System SHALL từ chối yêu cầu với phản hồi `400 Bad Request` kèm thông báo lỗi cho biết `targetCapacity` phải là số không âm.
6. IF yêu cầu tạo Sprint cung cấp đồng thời `startDate` và `endDate` mà `endDate` sớm hơn `startDate`, THEN THE Sprint_System SHALL từ chối yêu cầu với phản hồi `400 Bad Request` kèm thông báo lỗi cho biết `endDate` phải bằng hoặc sau `startDate`.
7. IF yêu cầu tạo Sprint tham chiếu một dự án không tồn tại, THEN THE Sprint_System SHALL trả về phản hồi `404 Not Found`.
8. IF người dùng không có vai trò `Scrum_Master` hoặc `Product_Owner` cố gắng tạo Sprint, THEN THE Authorization_Guard SHALL từ chối với phản hồi `403 Forbidden`.

### Requirement 3: Cập nhật Sprint

**User Story:** Là một Scrum Master hoặc Product Owner, tôi muốn cập nhật thông tin Sprint, để điều chỉnh kế hoạch khi cần.

#### Acceptance Criteria

1. WHEN một yêu cầu cập nhật được gửi tới một Sprint tồn tại với mọi trường cung cấp hợp lệ (`name` dài từ 1 đến 255 ký tự, `goal` tối đa 1000 ký tự, `startDate` và `endDate` đúng định dạng ISO 8601 `YYYY-MM-DD`, `targetCapacity` là số từ `0` đến `999,999.99`), THE Sprint_System SHALL cập nhật các trường `name`, `goal`, `startDate`, `endDate`, hoặc `targetCapacity` được cung cấp và giữ nguyên các trường không xuất hiện trong yêu cầu.
2. THE Sprint_System SHALL không áp dụng bất kỳ thay đổi nào đối với trường `status` xuất hiện trong payload cập nhật và SHALL giữ nguyên giá trị `status` hiện tại của Sprint (chỉ thay đổi qua endpoint start/complete).
3. IF yêu cầu cập nhật có `name` rỗng hoặc dài hơn 255 ký tự, THEN THE Sprint_System SHALL từ chối yêu cầu với phản hồi `400 Bad Request` và giữ nguyên toàn bộ dữ liệu Sprint hiện tại.
4. IF yêu cầu cập nhật có `targetCapacity` nhỏ hơn `0` hoặc lớn hơn `999,999.99`, THEN THE Sprint_System SHALL từ chối yêu cầu với phản hồi `400 Bad Request` và giữ nguyên toàn bộ dữ liệu Sprint hiện tại.
5. IF yêu cầu cập nhật có `startDate` hoặc `endDate` sai định dạng ISO 8601 `YYYY-MM-DD`, hoặc có `startDate` lớn hơn `endDate`, THEN THE Sprint_System SHALL từ chối yêu cầu với phản hồi `400 Bad Request` và giữ nguyên toàn bộ dữ liệu Sprint hiện tại.
6. IF yêu cầu cập nhật tham chiếu một Sprint không tồn tại hoặc đã soft delete, THEN THE Sprint_System SHALL trả về phản hồi `404 Not Found`.
7. IF người dùng không có vai trò `Scrum_Master` hoặc `Product_Owner` cố gắng cập nhật Sprint, THEN THE Authorization_Guard SHALL từ chối với phản hồi `403 Forbidden`.

### Requirement 4: Xóa hàng loạt Sprint

**User Story:** Là một Scrum Master hoặc Product Owner, tôi muốn xóa nhiều Sprint cùng lúc, để dọn dẹp các Sprint không còn cần thiết mà vẫn giữ lại lịch sử velocity.

#### Acceptance Criteria

1. WHEN một yêu cầu xóa hàng loạt Sprint hợp lệ chứa danh sách từ 1 đến 100 Sprint ID được gửi, THE Sprint_System SHALL đặt `deletedAt = now()` cho mỗi Sprint được chọn và giữ lại bản ghi (soft delete) trong cơ sở dữ liệu để bảo toàn lịch sử velocity.
2. WHEN một Sprint được soft delete trong thao tác xóa hàng loạt, THE Sprint_System SHALL đặt `sprint_id = null` cho mọi task thuộc Sprint đó để giải phóng chúng về Backlog.
3. WHILE thực hiện xóa hàng loạt, THE Sprint_System SHALL thực thi toàn bộ thao tác trong một transaction duy nhất.
4. WHEN người dùng xác nhận thao tác xóa trên confirm dialog, THE Sprint_UI SHALL gửi yêu cầu xóa hàng loạt; trước khi gửi, THE Sprint_UI SHALL hiển thị confirm dialog ghi rõ số lượng chính xác các Sprint sẽ bị xóa, và IF người dùng hủy dialog, THEN THE Sprint_UI SHALL không gửi yêu cầu.
5. IF người dùng không có vai trò `Scrum_Master` hoặc `Product_Owner` cố gắng xóa Sprint, THEN THE Authorization_Guard SHALL từ chối với phản hồi `403 Forbidden`.
6. IF bất kỳ lỗi nào xảy ra trong khi thực hiện xóa hàng loạt, THEN THE Sprint_System SHALL rollback toàn bộ thao tác, giữ nguyên trạng thái `deletedAt` và `sprint_id` như trước khi nhận yêu cầu, và trả về phản hồi lỗi cho biết thao tác thất bại.
7. IF yêu cầu xóa hàng loạt có danh sách Sprint rỗng (0 phần tử) hoặc vượt quá 100 phần tử, THEN THE Sprint_System SHALL từ chối với phản hồi `400 Bad Request` và không thực hiện bất kỳ thao tác soft delete nào.
8. IF bất kỳ Sprint nào trong danh sách được chọn không tồn tại hoặc đã soft delete, THEN THE Sprint_System SHALL rollback toàn bộ thao tác và trả về phản hồi `404 Not Found`.

### Requirement 5: Khởi động Sprint (Start)

**User Story:** Là một Scrum Master hoặc Product Owner, tôi muốn khởi động Sprint, để bắt đầu chu kỳ làm việc và ghi nhận cam kết ban đầu cho báo cáo velocity.

#### Acceptance Criteria

1. WHEN một yêu cầu start được gửi tới Sprint có `status = 'planning'` và số Sprint có `status = 'active'` với `deletedAt = null` của dự án nhỏ hơn `maxActiveSprints`, THE Sprint_System SHALL đặt `status = 'active'`.
2. WHEN một Sprint được khởi động và `startDate` đang null, THE Sprint_System SHALL đặt `startDate` bằng timestamp hệ thống tại thời điểm xử lý yêu cầu start.
3. WHEN một Sprint được khởi động, THE Sprint_System SHALL ghi `initialStoryPoints` bằng tổng Effective_SP của các task trong Sprint tại thời điểm start, và bằng `0` nếu Sprint không có task nào.
4. WHEN một Sprint được khởi động, THE Sprint_System SHALL ghi `initialTasksCount` bằng số task trong Sprint tại thời điểm start, và bằng `0` nếu Sprint không có task nào.
5. IF số Sprint có `status = 'active'` với `deletedAt = null` của dự án đã bằng `maxActiveSprints` khi nhận yêu cầu start, THEN THE Sprint_System SHALL từ chối với phản hồi `400 Bad Request` và giữ nguyên `status`, `startDate`, `initialStoryPoints`, `initialTasksCount` của Sprint không thay đổi.
6. IF yêu cầu start được gửi tới Sprint có `status` khác `planning`, THEN THE Sprint_System SHALL từ chối với phản hồi `409 Conflict` và giữ nguyên `status`, `startDate`, `initialStoryPoints`, `initialTasksCount` của Sprint không thay đổi.
7. IF yêu cầu start tham chiếu một Sprint không tồn tại hoặc đã soft delete (`deletedAt` khác null), THEN THE Sprint_System SHALL trả về phản hồi `404 Not Found`.
8. WHILE một Sprint có `status = 'active'`, THE Sprint_System SHALL giữ nguyên giá trị `initialStoryPoints` và `initialTasksCount` bất kể thao tác thêm hoặc xóa task.
9. IF người dùng không có vai trò `Scrum_Master` hoặc `Product_Owner` cố gắng khởi động Sprint, THEN THE Authorization_Guard SHALL từ chối với phản hồi `403 Forbidden` và giữ nguyên `status` của Sprint không thay đổi.

### Requirement 6: Hoàn thành Sprint (Complete)

**User Story:** Là một Scrum Master hoặc Product Owner, tôi muốn hoàn thành Sprint và điều phối các task chưa xong, để đóng chu kỳ và chuyển công việc còn lại sang đích phù hợp.

#### Acceptance Criteria

1. WHEN một yêu cầu complete được gửi tới Sprint có `status = 'active'` và thỏa toàn bộ điều kiện điều phối task ở các mục 3–6, THE Sprint_System SHALL đặt `status = 'completed'`, `completedAt = now()`, và trả về phản hồi `200 OK`.
2. IF yêu cầu complete được gửi tới Sprint có `status` khác `active`, THEN THE Sprint_System SHALL từ chối với phản hồi `409 Conflict` và giữ nguyên `status` của Sprint không thay đổi.
3. IF Sprint còn task chưa hoàn thành (task có trạng thái không thuộc Done_State) và yêu cầu complete cung cấp đồng thời cả `targetSprintId` và `moveToBacklog`, THEN THE Sprint_System SHALL từ chối với phản hồi `400 Bad Request` kèm thông báo "Either targetSprintId or moveToBacklog must be specified, but not both".
4. IF Sprint còn task chưa hoàn thành (task có trạng thái không thuộc Done_State) và yêu cầu complete không cung cấp cả `targetSprintId` lẫn `moveToBacklog`, THEN THE Sprint_System SHALL từ chối với phản hồi `400 Bad Request` kèm thông báo "Either targetSprintId or moveToBacklog must be specified, but not both".
5. IF yêu cầu complete cung cấp `targetSprintId` trỏ tới Sprint có `status` khác `planning`, THEN THE Sprint_System SHALL từ chối với phản hồi `400 Bad Request` kèm thông báo "Target sprint must be in planning status".
6. IF yêu cầu complete cung cấp `targetSprintId` trỏ tới một Sprint không tồn tại, đã soft delete, hoặc không thuộc cùng dự án, THEN THE Sprint_System SHALL trả về phản hồi `404 Not Found`.
7. WHEN Sprint được hoàn thành với `targetSprintId` hợp lệ, THE Sprint_System SHALL gán `sprint_id = targetSprintId` cho mọi task chưa hoàn thành (trạng thái không thuộc Done_State).
8. WHEN Sprint được hoàn thành với `moveToBacklog = true`, THE Sprint_System SHALL đặt `sprint_id = null` cho mọi task chưa hoàn thành (trạng thái không thuộc Done_State).
9. WHEN Sprint được hoàn thành, THE Sprint_System SHALL giữ nguyên `sprint_id` của các task thuộc Done_State để bảo toàn dữ liệu lịch sử velocity.
10. WHEN Sprint được hoàn thành, THE Sprint_System SHALL giữ nguyên giá trị `initialStoryPoints` và `initialTasksCount`.
11. WHILE thực hiện complete, THE Sprint_System SHALL thực thi toàn bộ thao tác trong một transaction và rollback toàn bộ nếu có lỗi.
12. IF người dùng không có vai trò `Scrum_Master` hoặc `Product_Owner` cố gắng hoàn thành Sprint, THEN THE Authorization_Guard SHALL từ chối với phản hồi `403 Forbidden`.

### Requirement 7: Gán task vào Sprint

**User Story:** Là một thành viên đội (Scrum Master, Product Owner, Developer, hoặc QA), tôi muốn gán task vào Sprint, để tổ chức công việc theo chu kỳ làm việc.

#### Acceptance Criteria

1. WHEN một yêu cầu gán một task vào Sprint đích thuộc cùng dự án với task được gửi, THE Sprint_System SHALL đặt `sprint_id` của task đó bằng id của Sprint đích.
2. WHEN một yêu cầu thêm hàng loạt task (từ 1 đến tối đa 100 task mỗi yêu cầu) vào Sprint được gửi, THE Sprint_System SHALL đặt `sprint_id` của mọi task trong danh sách bằng id của Sprint đích.
3. WHEN một yêu cầu loại hàng loạt task (từ 1 đến tối đa 100 task mỗi yêu cầu) khỏi Sprint được gửi, THE Sprint_System SHALL đặt `sprint_id = null` cho mọi task trong danh sách.
4. IF yêu cầu gán task tham chiếu một Sprint hoặc task không tồn tại, đã soft delete, hoặc không thuộc cùng dự án, THEN THE Sprint_System SHALL trả về phản hồi `404 Not Found` và không thay đổi `sprint_id` của bất kỳ task nào.
5. WHERE người dùng có vai trò `Scrum_Master`, `Product_Owner`, `Developer`, hoặc `QA`, THE Authorization_Guard SHALL cho phép thao tác gán task vào Sprint.
6. IF người dùng không có vai trò trong tập `{Scrum_Master, Product_Owner, Developer, QA}` cố gắng gán task, THEN THE Authorization_Guard SHALL từ chối với phản hồi `403 Forbidden`.
7. IF một yêu cầu thêm hoặc loại hàng loạt chứa danh sách task rỗng hoặc nhiều hơn 100 task, THEN THE Sprint_System SHALL từ chối với phản hồi `400 Bad Request` và không thay đổi `sprint_id` của bất kỳ task nào.
8. WHILE thực hiện thao tác thêm hoặc loại hàng loạt task, THE Sprint_System SHALL thực thi toàn bộ thao tác trong một transaction và rollback toàn bộ nếu có lỗi.
9. IF yêu cầu gán task trỏ tới Sprint đích có `status = 'completed'`, THEN THE Sprint_System SHALL từ chối với phản hồi `409 Conflict` và không thay đổi `sprint_id` của bất kỳ task nào.

### Requirement 8: Lập kế hoạch dung lượng (Capacity Planning)

**User Story:** Là một Scrum Master, tôi muốn theo dõi dung lượng Sprint theo tổng hoặc theo từng thành viên, để cân đối khối lượng công việc và tránh quá tải.

#### Acceptance Criteria

1. WHERE `capacityMode = 'total'`, THE Capacity_Service SHALL tính dung lượng khả dụng (`availableCapacity`) của Sprint bằng tổng `targetCapacity`, với `targetCapacity` nằm trong khoảng `0` đến `9,999` SP.
2. WHERE `capacityMode = 'member-based'`, THE Capacity_Service SHALL tính dung lượng khả dụng bằng tổng `capacity` cấu hình của từng thành viên, với mỗi `capacity` nằm trong khoảng `0` đến `9,999` SP.
3. THE Capacity_Service SHALL tính Effective_SP của mỗi task bằng `estimate_value` khi `estimate_value > 0`, ngược lại bằng `1`.
4. WHEN tính `actualUsed` cho một thành viên, THE Capacity_Service SHALL trả về tổng Effective_SP của mọi task được gán cho thành viên đó trong Sprint, làm tròn tối đa 1 chữ số thập phân.
5. IF kết quả tính dung lượng (`availableCapacity` hoặc `actualUsed`) nhỏ hơn `0`, THEN THE Capacity_Service SHALL trả về giá trị `0`.
6. WHEN một Sprint chứa task chưa được ước lượng Story Point (`estimate_value` bằng `null` hoặc `<= 0`), THE Capacity_Service SHALL trả về số lượng task chưa ước lượng (`unestimatedTasksCount`).
7. WHEN `unestimatedTasksCount > 0`, THE Sprint_UI SHALL hiển thị cảnh báo (toast severity `warn`) kèm số lượng task chưa ước lượng.
8. IF một yêu cầu cập nhật capacity từng thành viên có `capacity` âm hoặc lớn hơn `9,999`, THEN THE Capacity_Service SHALL từ chối yêu cầu với phản hồi `400 Bad Request` kèm thông báo lỗi cho biết giá trị `capacity` không hợp lệ, và giữ nguyên giá trị `capacity` hiện tại.
9. WHEN dữ liệu Sprint được tải, THE Sprint_UI SHALL hiển thị Capacity Indicator dạng `actualUsed / capacity SP` (số hiển thị tối đa 1 chữ số thập phân) kèm thanh tiến trình trên Backlog/Board toolbar.
10. IF `actualUsed > capacity`, THEN THE Sprint_UI SHALL hiển thị Capacity Indicator ở trạng thái cảnh báo quá tải (over-capacity).

### Requirement 9: Dữ liệu biểu đồ Burndown

**User Story:** Là một thành viên đội, tôi muốn xem biểu đồ Burndown theo Story Points hoặc Task Count, để theo dõi tiến độ Sprint so với đường lý tưởng.

#### Acceptance Criteria

1. WHEN dữ liệu Burndown được yêu cầu cho một Sprint đã có `startDate` và `endDate`, THE Snapshot_Service SHALL trả về đúng một điểm dữ liệu cho mỗi ngày lịch từ `startDate` đến `endDate` (bao gồm cả hai mốc), tính theo múi giờ IANA của server (cấu hình qua biến môi trường `TZ`, ví dụ `Asia/Ho_Chi_Minh`) để nhất quán với `snapshot_date`, sắp xếp tăng dần theo ngày.
2. THE Snapshot_Service SHALL tính đường lý tưởng (ideal line) cho Story Points giảm tuyến tính từ `initialStoryPoints` tại ngày đầu xuống `0` tại ngày cuối, kẹp giá trị trong khoảng `0` đến `initialStoryPoints` và làm tròn tối đa 1 chữ số thập phân.
3. THE Snapshot_Service SHALL tính đường lý tưởng cho Task Count giảm tuyến tính từ `initialTasksCount` tại ngày đầu xuống `0` tại ngày cuối, kẹp giá trị trong khoảng `0` đến `initialTasksCount` và làm tròn về số nguyên.
4. THE Snapshot_Service SHALL bảo đảm chuỗi giá trị `idealStoryPoints` không tăng dần, trong đó giá trị mỗi ngày nhỏ hơn hoặc bằng giá trị ngày liền trước.
5. WHEN một ngày trong khoảng đã có snapshot, THE Snapshot_Service SHALL dùng giá trị actual của snapshot ngày đó; IF một ngày chưa có snapshot, THEN THE Snapshot_Service SHALL dùng giá trị actual của snapshot gần nhất trước đó (carry-forward), hoặc giá trị `initialStoryPoints`/`initialTasksCount` nếu chưa có snapshot nào trước đó.
6. WHEN người dùng chuyển đổi chế độ hiển thị Burndown, THE Sprint_UI SHALL vẽ lại biểu đồ theo chế độ được chọn, với chế độ Story Points là mặc định khi mở lần đầu và Task Count là chế độ thay thế.
7. IF dữ liệu Burndown được yêu cầu cho một Sprint chưa được khởi động (chưa có `startDate` hoặc `endDate`), THEN THE Snapshot_Service SHALL từ chối với phản hồi `409 Conflict` và không trả về dữ liệu Burndown.
8. WHILE một ngày trong khoảng nằm sau ngày hiện tại, THE Snapshot_Service SHALL trả về giá trị actual là null cho ngày đó và chỉ cung cấp giá trị đường lý tưởng.

### Requirement 10: Snapshot hàng ngày qua Cron Job

**User Story:** Là một system operator, tôi muốn hệ thống tự động chụp snapshot tiến độ Sprint mỗi ngày, để dựng dữ liệu Burndown chính xác mà không phụ thuộc thao tác thủ công.

#### Acceptance Criteria

1. WHEN đồng hồ hệ thống đạt mốc giờ chạy cấu hình cố định (mặc định 23:59 theo múi giờ của server) mỗi ngày, THE Snapshot_Cron SHALL khởi chạy và quét toàn bộ Sprint có `status = 'active'` trên tất cả dự án trong vòng tối đa 300 giây.
2. WHEN Snapshot_Cron xử lý một Sprint active, THE Snapshot_Service SHALL ghi `remainingStoryPoints` bằng tổng Effective_SP của các task có trạng thái không thuộc Done_State (làm tròn tối đa 1 chữ số thập phân, giá trị không âm).
3. WHEN Snapshot_Service ghi snapshot cho một Sprint active, THE Snapshot_Service SHALL ghi `remainingTasksCount` bằng số lượng task có trạng thái không thuộc Done_State (số nguyên không âm).
4. WHEN Snapshot_Cron chạy nhiều lần trong cùng một ngày cho cùng một Sprint, THE Snapshot_Service SHALL giữ đúng một bản ghi cho mỗi cặp `(sprint_id, snapshot_date)` thông qua thao tác upsert, trong đó `snapshot_date` là ngày theo múi giờ IANA của server (cấu hình qua biến môi trường `TZ`) tại thời điểm chạy.
5. IF việc chụp snapshot của một Sprint thất bại, THEN THE Snapshot_Cron SHALL ghi log lỗi kèm `sprint_id` và nguyên nhân, giữ nguyên (không tạo và không sửa) bản ghi snapshot hiện có của Sprint đó, và tiếp tục xử lý các Sprint còn lại.
6. WHILE không tồn tại Sprint nào có `status = 'active'`, THE Snapshot_Cron SHALL kết thúc lượt chạy mà không tạo bản ghi snapshot nào và ghi log thông tin số lượng Sprint đã xử lý bằng 0.

### Requirement 11: Báo cáo Velocity

**User Story:** Là một Scrum Master, tôi muốn xem báo cáo Velocity, để đánh giá năng lực giao hàng của đội qua các Sprint đã hoàn thành.

#### Acceptance Criteria

1. WHEN báo cáo Velocity được yêu cầu, THE Sprint_System SHALL trả về committed Story Points (`initialStoryPoints`) và completed Story Points (tổng Story Points của các task có trạng thái thuộc Done_State tại thời điểm Sprint kết thúc) cho mỗi Sprint có `status = 'completed'`, sắp xếp theo `completedAt` tăng dần.
2. THE Sprint_System SHALL tính average velocity bằng trung bình cộng completed Story Points của tất cả Sprint có `status = 'completed'`, làm tròn đến 1 chữ số thập phân.
3. IF không tồn tại Sprint nào có `status = 'completed'`, THEN THE Sprint_System SHALL trả về danh sách Sprint rỗng và average velocity bằng `0`.
4. THE Sprint_System SHALL bao gồm cả các Sprint đã soft delete (có `status = 'completed'`) trong dữ liệu lịch sử velocity và trong phép tính average velocity.
5. IF việc truy xuất dữ liệu velocity thất bại, THEN THE Sprint_System SHALL trả về thông báo lỗi cho biết không lấy được dữ liệu báo cáo và SHALL không trả về dữ liệu velocity một phần.
6. WHEN dữ liệu velocity được trả về thành công, THE Sprint_UI SHALL hiển thị biểu đồ cột so sánh Committed SP với Completed SP cho từng Sprint và hiển thị giá trị Average Velocity, với Story Points định dạng tối đa 1 chữ số thập phân.
7. WHILE báo cáo Velocity đang được tải, THE Sprint_UI SHALL hiển thị trạng thái loading (`p-skeleton`).

### Requirement 12: Sprint Filter trên Backlog/Board Toolbar

**User Story:** Là một thành viên đội, tôi muốn lọc task theo Sprint ngay trên Backlog/Board, để tập trung vào công việc của một Sprint cụ thể.

#### Acceptance Criteria

1. WHEN người dùng mở Backlog/Board, THE Sprint_UI SHALL hiển thị Sprint Filter Dropdown trên toolbar với các lựa chọn theo thứ tự: All Sprints (chọn mặc định), Backlog (No Sprint), danh sách các Sprint có trạng thái `active` rồi đến `planning` (loại trừ Sprint có trạng thái `completed` và Sprint có `deletedAt` khác null), và một lối tắt tạo Sprint mới. *(Quyết định thiết kế: Sprint `completed` bị ẩn khỏi dropdown để giữ danh sách gọn; để xem task của sprint cũ, người dùng dùng trang Sprints List.)*
2. WHEN người dùng chọn một Sprint trong dropdown, THE Sprint_UI SHALL trong vòng 1 giây lọc danh sách task để chỉ hiển thị task có `sprint_id` bằng id của Sprint được chọn và cập nhật giá trị lựa chọn vào URL query param để có thể bookmark/chia sẻ link.
3. WHEN người dùng chọn Backlog (No Sprint), THE Sprint_UI SHALL chỉ hiển thị task có `sprint_id = null`.
4. WHEN người dùng chọn All Sprints, THE Sprint_UI SHALL hiển thị toàn bộ task không phân biệt `sprint_id`.
5. WHEN người dùng nhập từ khóa vào ô tìm kiếm Sprint trong dropdown, THE Sprint_UI SHALL áp dụng debounce 300ms và lọc danh sách Sprint theo so khớp không phân biệt chữ hoa/thường trên tên Sprint.
6. IF kết quả lọc theo Sprint hoặc theo từ khóa tìm kiếm không có phần tử nào khớp, THEN THE Sprint_UI SHALL hiển thị empty state với thông báo phân biệt rõ trường hợp "không có task/Sprint nào khớp bộ lọc".

### Requirement 13: Submenu Sprints độc lập và tuân thủ UI Standards

**User Story:** Là một thành viên đội, tôi muốn truy cập không gian quản lý Sprint chuyên sâu qua submenu riêng, để xem danh sách, dashboard, velocity và settings.

#### Acceptance Criteria

1. THE Sprint_UI SHALL cung cấp submenu Sprints trên sidebar gồm đúng 4 mục điều hướng theo thứ tự: List, Dashboard, Velocity, và Settings, trong đó mỗi mục dẫn đến một trang riêng biệt.
2. THE Sprint_UI SHALL hiển thị mọi giá trị chỉ-ngày theo định dạng `dd/MM/yyyy` và mọi giá trị ngày-giờ đầy đủ theo định dạng `dd/MM/yyyy HH:mm:ss`, dùng giờ địa phương của trình duyệt.
3. THE Sprint_UI SHALL hiển thị Story Points với tối đa 1 chữ số thập phân, hiển thị giá trị phần trăm với tối đa 2 chữ số thập phân kèm ký hiệu `%`, và dùng dấu phẩy phân cách phần nghìn cho phần nguyên của mọi số.
4. WHEN người dùng nhập vào ô text search trên trang Sprints List, THE Sprint_UI SHALL áp dụng bộ lọc sau khoảng debounce 300ms (±50ms) kể từ lần gõ phím cuối cùng.
5. THE Sprint_UI SHALL cung cấp trên trang Sprints List bộ lọc theo status và đồng bộ toàn bộ trạng thái lọc (text search và status) vào URL query params sao cho việc tải lại trang với cùng URL khôi phục đúng trạng thái lọc đó.
6. THE Sprint_UI SHALL hỗ trợ chọn nhiều Sprint trên trang Sprints List, và WHILE có tối thiểu 1 Sprint được chọn, THE Sprint_UI SHALL hiển thị thanh công cụ ghi rõ số lượng Sprint đã chọn cùng nút bulk delete.
7. WHEN người dùng kích hoạt bulk delete, THE Sprint_UI SHALL hiển thị confirm dialog ghi rõ số lượng Sprint sẽ bị xóa và chỉ gửi request xóa sau khi người dùng xác nhận.
8. IF người dùng hủy confirm dialog xóa, THEN THE Sprint_UI SHALL đóng dialog mà không gửi request xóa và giữ nguyên danh sách Sprint cùng trạng thái đã chọn.
9. WHEN danh sách Sprint trống do chưa có dữ liệu nào, THE Sprint_UI SHALL hiển thị empty state với thông điệp "chưa có dữ liệu" kèm CTA tạo Sprint mới.
10. WHEN danh sách Sprint trống do filter hiện tại không khớp kết quả nào, THE Sprint_UI SHALL hiển thị empty state với thông điệp "filter không khớp" kèm hành động xóa bộ lọc.
11. WHILE đang tải dữ liệu danh sách lần đầu, THE Sprint_UI SHALL hiển thị loading skeleton và ẩn skeleton ngay khi dữ liệu đã tải xong hoặc đã xác định danh sách trống.
12. WHEN một thao tác mutating hoàn tất thành công, THE Sprint_UI SHALL hiển thị toast notification severity `success` ở vị trí top-right với thời lượng 3000ms.
13. IF một thao tác mutating thất bại, THEN THE Sprint_UI SHALL hiển thị toast notification severity `error` ở vị trí top-right với thời lượng 5000ms và giữ nguyên dữ liệu trước thao tác.
14. WHEN xảy ra điều kiện conflict cần người dùng chú ý trong lúc thực hiện thao tác, THE Sprint_UI SHALL hiển thị toast notification severity `warn` ở vị trí top-right.
15. THE Sprint_UI SHALL áp dụng layout `flex flex-col h-full` cho mọi trang Sprint (List, Dashboard, Velocity, Settings), với toolbar cố định (`flex-shrink-0`, `px-6 py-3`, border-bottom) và vùng nội dung cuộn (`flex-1 overflow-y-auto px-6 py-4`); THE Sprint_UI SHALL KHÔNG sử dụng pattern `max-w-* mx-auto p-6` cho bố cục trang.
16. THE Sprint_UI SHALL thêm `dark:` Tailwind variant cho mọi class màu sắc theo bảng quy đổi chuẩn của dự án (ví dụ: `bg-white dark:bg-surface-900`, `text-gray-900 dark:text-surface-0`, `border-gray-200 dark:border-surface-700`); status badge Sprint SHALL dùng cặp màu phân biệt cho từng trạng thái (`planning`/`active`/`completed`) cả ở light và dark mode.
17. THE Sprint_UI SHALL đặt `[fluid]="false"` và `size="small"` trên mọi `pButton` trong toolbar và action bar; THE Sprint_UI SHALL KHÔNG áp `flex-1` hoặc `w-full` cho action/toggle button; ngoại lệ cho phép là nút submit chính ở cuối form.
18. THE Sprint_UI SHALL đảm bảo tích hợp Sprint Filter Dropdown không làm ảnh hưởng đến hành vi Drag-and-Drop hiện có trên Backlog/Board; IF bất kỳ tính năng DnD mới nào được thêm vào các trang Sprint, THE Sprint_UI SHALL tuân thủ 100% checklist DnD định nghĩa trong `CLAUDE.md` (bao gồm `[cdkDropListSortingDisabled]="true"`, ghost div, line indicator, không có `cdkDragHandle`, v.v.).

### Requirement 14: Phân quyền cấp dự án

**User Story:** Là một quản trị viên hệ thống, tôi muốn mọi thao tác Sprint được kiểm soát quyền theo vai trò cấp dự án, để bảo đảm an toàn và đúng trách nhiệm.

#### Acceptance Criteria

1. THE Authorization_Guard SHALL áp dụng kiểm tra quyền cấp dự án (`ProjectRolesGuard` + `@ProjectRoles`) cho 100% endpoint của Sprint_System, không có endpoint nào được miễn trừ.
2. WHERE người dùng có vai trò `Stakeholder`, THE Authorization_Guard SHALL cho phép truy cập các endpoint chỉ-đọc (GET) của Sprint.
3. IF người dùng có vai trò `Stakeholder` cố gắng thực hiện thao tác thay đổi (tạo, cập nhật, start, complete, xóa, hoặc cấu hình), THEN THE Authorization_Guard SHALL từ chối với phản hồi `403 Forbidden`.
4. IF một yêu cầu không kèm thông tin xác thực hợp lệ (thiếu, sai, hoặc hết hạn token), THEN THE Authorization_Guard SHALL từ chối với phản hồi `401 Unauthorized`.
5. IF một yêu cầu đã xác thực nhưng người dùng không có vai trò phù hợp của dự án, THEN THE Authorization_Guard SHALL từ chối với phản hồi `403 Forbidden`.
6. WHEN một yêu cầu chứa dữ liệu đầu vào, THE Sprint_System SHALL xác thực toàn bộ input bằng class-validator trước khi xử lý nghiệp vụ; IF input không hợp lệ, THEN THE Sprint_System SHALL trả về `400 Bad Request` chỉ rõ trường lỗi và không thay đổi dữ liệu.

### Requirement 15: Soft delete và bảo toàn lịch sử

**User Story:** Là một Scrum Master, tôi muốn dữ liệu Sprint đã xóa vẫn được bảo toàn cho lịch sử velocity, để báo cáo dài hạn không bị mất dữ liệu.

#### Acceptance Criteria

1. WHEN một Sprint bị xóa, THE Sprint_System SHALL đặt trường `deletedAt` bằng thời điểm thực hiện thao tác (timestamp của server) thay vì xóa vật lý bản ghi.
2. WHEN một Sprint bị xóa, THE Sprint_System SHALL chuyển tất cả task có `sprint_id` trỏ tới Sprint đó về Backlog bằng cách đặt `sprint_id = null`.
3. WHEN một Sprint bị xóa, THE Sprint_System SHALL thực hiện việc đặt `deletedAt` và giải phóng task liên quan như một thao tác nguyên tử (atomic), sao cho cả hai cùng thành công hoặc cùng không được áp dụng.
4. IF việc giải phóng task liên quan thất bại trong quá trình xóa Sprint, THEN THE Sprint_System SHALL hoàn tác toàn bộ thao tác xóa, giữ nguyên giá trị `deletedAt` và `sprint_id` ở trạng thái trước khi xóa, và trả về thông báo lỗi cho biết thao tác xóa không thành công.
5. IF người dùng yêu cầu xóa một Sprint đã có `deletedAt` khác null, THEN THE Sprint_System SHALL từ chối thao tác, giữ nguyên giá trị `deletedAt` hiện tại, và trả về thông báo lỗi cho biết Sprint đã bị xóa.
6. WHEN truy vấn danh sách Sprint thông thường, THE Sprint_System SHALL loại trừ mọi Sprint có `deletedAt` khác null.
7. WHEN truy vấn lịch sử velocity, THE Sprint_System SHALL bao gồm cả các Sprint có `deletedAt` khác null để bảo toàn dữ liệu báo cáo dài hạn.
