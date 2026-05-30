---
specName: FEATURE_NAME
version: 1.0
status: draft
---

# Design: FEATURE_NAME

## 1. Kiến trúc tổng quan

```
[Sơ đồ / mô tả luồng dữ liệu]
```

## 2. Data Model

```sql
-- Bảng mới hoặc thay đổi schema
```

## 3. API Contracts

### Endpoint: METHOD /api/v1/...

**Request:**
```json
{
  "field": "type"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {}
}
```

**Error cases:**
| Code | Khi nào | Response |
|------|---------|---------|

## 4. Business Logic

> _Mô tả các rule nghiệp vụ, validation, edge case_

## 5. Security Considerations

> _Authentication, authorization, data validation, encryption_

## 6. Performance Considerations

> _Index DB, caching strategy, async processing_

## 7. Dependencies

> _Library mới, service ngoài, internal module_

## 8. Migration Plan (nếu có)

> _Thay đổi breaking, migration script, rollback_
