# Module Lifecycle Enhancement

## Overview

Module hiện sử dụng workflow tập trung vào tiến độ công việc (`Backlog → In Progress → Paused → Completed → Cancelled`), không phản ánh vòng đời vận hành thực tế của một phân hệ nghiệp vụ.

**Mục tiêu:** Chuyển Module sang mô hình **Business Capability Lifecycle** để stakeholder có thể nhận biết trạng thái vận hành ngay lập tức.

---

## Business Lifecycle Model

### Trạng thái

| Status | Mô tả |
|---|---|
| `planning` | Đang phân tích hoặc chuẩn bị triển khai |
| `active` | Đang vận hành và tiếp tục phát triển |
| `maintenance` | Đang vận hành nhưng chủ yếu sửa lỗi / bảo trì |
| `suspended` | Tạm ngưng sử dụng, có thể kích hoạt lại |
| `deprecated` | Đã có giải pháp thay thế, chuẩn bị loại bỏ |
| `retired` | Ngừng hoạt động hoàn toàn *(terminal)* |
| `cancelled` | Bị hủy trước khi đưa vào vận hành *(terminal)* |

### Transition Rules

```
planning    → active, cancelled
active      → maintenance, suspended, deprecated
maintenance → active, suspended, deprecated
suspended   → active, deprecated, retired
deprecated  → retired
```

`retired` và `cancelled` là **terminal states** — không có transition nào được phép.

---

## Requirements

### REQ-1: Lifecycle States

**Mục tiêu:** Thay thế workflow cũ bằng lifecycle model mới.

**Acceptance Criteria:**

1. Hệ thống hỗ trợ đúng 7 trạng thái: `planning`, `active`, `maintenance`, `suspended`, `deprecated`, `retired`, `cancelled`.
2. Module mới tạo luôn khởi tạo ở trạng thái `planning`.
3. Trạng thái được lưu trữ bằng **strongly validated enumeration** — không chấp nhận giá trị ngoài danh sách.
4. Các trạng thái cũ (`backlog`, `in_progress`, `paused`, `completed`) không còn khả dụng cho cả việc chọn lẫn lưu trữ.

---

### REQ-2: Transition Validation

**Mục tiêu:** Đảm bảo mọi thay đổi trạng thái tuân theo lifecycle rules.

**Acceptance Criteria:**

1. Hệ thống validate tất cả transition theo lifecycle model đã định nghĩa.
2. Transition không hợp lệ bị từ chối với HTTP response chứa:
   ```json
   {
     "currentStatus": "planning",
     "requestedStatus": "retired",
     "allowedTransitions": ["active", "cancelled"]
   }
   ```
3. Concurrent updates không gây ra inconsistent state — áp dụng optimistic locking hoặc cơ chế tương đương.
4. Attempt chuyển trạng thái từ terminal state bị từ chối ngay — không phụ thuộc vào trạng thái target.

> **Lưu ý bổ sung:** REQ-2 là điều kiện tiên quyết của REQ-5 (UI) và REQ-6 (API). Validation logic phải nằm ở tầng domain/service, không phải ở UI hay API layer.

---

### REQ-3: Legacy Data Migration

**Mục tiêu:** Migrate dữ liệu hiện có sang lifecycle model mới mà không gián đoạn vận hành.

**Acceptance Criteria:**

1. Migration thực thi theo mapping sau:

   | Old Status | New Status |
   |---|---|
   | `backlog` | `planning` |
   | `in_progress` | `active` |
   | `paused` | `suspended` |
   | `completed` | `maintenance` |
   | `cancelled` | `cancelled` |
   | *(unknown)* | `planning` + logged |

2. Migration thực thi **atomically** — hoặc toàn bộ thành công, hoặc toàn bộ rollback.
3. Tất cả Module records được giữ nguyên — không có record nào bị xóa.
4. Giá trị unknown được log đầy đủ (module ID, giá trị gốc, timestamp) trước khi fallback về `planning`.

**Rollback Mapping:**

| New Status | Old Status |
|---|---|
| `planning` | `backlog` |
| `active` | `in_progress` |
| `suspended` | `paused` |
| `maintenance` | `completed` |
| `cancelled` | `cancelled` |
| `deprecated` | `completed` |
| `retired` | `completed` |

> **Lưu ý:** `deprecated` và `retired` đều rollback về `completed` — đây là mất mát thông tin có chủ ý, cần được ghi nhận trong migration notes.

---

### REQ-4: Lifecycle Visibility

**Mục tiêu:** Hiển thị trạng thái lifecycle rõ ràng cho người dùng nghiệp vụ.

**Acceptance Criteria:**

1. Mỗi trạng thái có label hiển thị và màu/icon phân biệt nhất quán trên toàn hệ thống.
2. Terminal states (`retired`, `cancelled`) được phân biệt rõ bằng visual treatment riêng (ví dụ: màu tối hơn, icon khóa, opacity giảm).
3. Danh sách Module hỗ trợ filter theo một hoặc nhiều trạng thái.
4. Khi filter không trả kết quả, UI hiển thị thông báo rõ ràng kèm action gợi ý (ví dụ: xóa filter, tạo Module mới).

---

### REQ-5: Lifecycle Management UI

**Mục tiêu:** UI chỉ cho phép người dùng thực hiện transition hợp lệ.

**Acceptance Criteria:**

1. Module mới tạo không có lựa chọn trạng thái — tự động là `planning`.
2. Dropdown/selector chỉ hiển thị các trạng thái hợp lệ theo lifecycle model — không có tùy chọn ẩn/disable.
3. Terminal states hiển thị dưới dạng read-only, không có control thay đổi trạng thái.
4. Khi transition thất bại, UI hiển thị thông báo actionable ghi rõ lý do và các bước tiếp theo.

---

### REQ-6: API Contract

**Mục tiêu:** Lifecycle rules được áp dụng nhất quán qua tất cả API endpoints.

**Acceptance Criteria:**

1. `POST /modules` luôn tạo Module với `status: "planning"` — client không được truyền giá trị khác.
2. `PATCH /modules/:id` validate transition trước khi lưu; trả lỗi theo format chuẩn (xem REQ-2).
3. `GET /modules` hỗ trợ query param `status` với multi-value filtering (`?status=active,maintenance`).
4. Response của Module resource luôn bao gồm `allowedTransitions`:
   ```json
   {
     "id": "...",
     "status": "active",
     "allowedTransitions": ["maintenance", "suspended", "deprecated"]
   }
   ```
   `allowedTransitions` là mảng rỗng với terminal states.
5. Giá trị `status` không hợp lệ trong request body bị từ chối với HTTP 422 và thông báo mô tả giá trị được chấp nhận.

---

## Non-Functional Requirements

| NFR | Requirement |
|---|---|
| **Auditability** | Mỗi lifecycle transition phải được ghi log với: previous status, new status, changed by, changed at, reason (optional). |
| **Backward Compatibility** | API consumers hiện có không phải thay đổi code sau migration — field names và response structure giữ nguyên; chỉ giá trị enumeration thay đổi theo migration mapping. |
| **Performance** | Lifecycle validation không tạo thêm latency đo lường được cho create/update/query operations trong điều kiện bình thường. |

---

## Future Enhancements *(out of scope)*

- Approval workflow cho transition (ví dụ: yêu cầu phê duyệt khi chuyển sang `deprecated`)
- `deprecation_date`, `retirement_date` fields
- `replacement_module_id` reference
- Lifecycle reporting dashboard
- SLA monitoring theo lifecycle state

