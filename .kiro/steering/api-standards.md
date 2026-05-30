---
inclusion: fileMatch
filePatterns:
  - "src/api/**"
  - "src/routes/**"
  - "src/controllers/**"
  - "**/handler*"
  - "**/endpoint*"
---

# API Standards

## URL Design (REST)

```
Pattern : /api/v{N}/{resource}/{id}/{sub-resource}
Ví dụ   : /api/v1/users/123/orders

Quy tắc:
  - Danh từ số nhiều cho resource (users, orders, products)
  - Lowercase + dấu gạch ngang (kebab-case)
  - Version trong URL: /api/v1/...
  - Không dùng động từ trong URL (/getUser → GET /users/:id)
```

## HTTP Methods

| Method | Ý nghĩa | Idempotent |
|--------|---------|-----------|
| GET | Đọc | ✅ |
| POST | Tạo mới | ❌ |
| PUT | Replace toàn bộ | ✅ |
| PATCH | Cập nhật một phần | ✅ |
| DELETE | Xóa | ✅ |

## Response Format

```json
// Success
{
  "success": true,
  "data": { ... },
  "meta": { "page": 1, "total": 100 }
}

// Error
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Mô tả lỗi thân thiện với user",
    "details": [{ "field": "email", "message": "Invalid format" }]
  }
}
```

## HTTP Status Codes

| Code | Khi dùng |
|------|---------|
| 200 | Thành công (GET, PUT, PATCH) |
| 201 | Tạo mới thành công (POST) |
| 204 | Thành công, không có body (DELETE) |
| 400 | Request không hợp lệ |
| 401 | Chưa xác thực |
| 403 | Đã xác thực nhưng không có quyền |
| 404 | Không tìm thấy resource |
| 409 | Conflict (duplicate, optimistic lock) |
| 422 | Validation failed |
| 429 | Rate limit exceeded |
| 500 | Internal server error |

## Pagination

```
Query params: ?page=1&limit=20&sort=createdAt&order=desc
Response meta: { "page": 1, "limit": 20, "total": 150, "totalPages": 8 }
```

## Versioning Strategy

> _API versioning dùng URL path (/api/v1, /api/v2)_
> _Deprecated version cần thông báo trước ít nhất 3 tháng_

## Documentation

- Mọi endpoint phải có OpenAPI/Swagger spec
- Cập nhật spec trước hoặc cùng lúc với code
