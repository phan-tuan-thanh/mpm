---
inclusion: fileMatch
filePatterns:
  - "**/*.test.*"
  - "**/*.spec.*"
  - "**/tests/**"
  - "**/test/**"
---

# Testing Standards

## Coverage Requirements

| Loại | Mức tối thiểu | Mục tiêu |
|------|--------------|---------|
| Unit test | 70% | 85% |
| Integration test | Bắt buộc cho API endpoints | — |
| E2E test | Bắt buộc cho happy path | — |

## Nguyên tắc viết test

- **Tên test**: mô tả hành vi, không mô tả implement
  ```
  ❌ test_getUserById()
  ✅ should_return_user_when_valid_id_provided()
  ✅ should_throw_404_when_user_not_found()
  ```
- **Cấu trúc AAA**: Arrange → Act → Assert
- Mỗi test chỉ kiểm tra **một behavior**
- Test phải **độc lập** — không phụ thuộc thứ tự chạy
- Dùng **factory / builder** để tạo test data, không hardcode

## Test Pyramid

```
          ┌─────┐
          │ E2E │  ← Ít nhất, chạy chậm (critical user journeys)
         ┌┴─────┴┐
         │ Integ │  ← Vừa phải (API, DB, service boundaries)
        ┌┴───────┴┐
        │  Unit   │  ← Nhiều nhất, chạy nhanh (business logic)
        └─────────┘
```

## Mocking Strategy

- Mock external services (HTTP, email, SMS, payment gateway)
- Không mock internal module trừ khi có lý do rõ ràng
- Dùng in-memory DB cho integration test (không dùng DB prod)

## Test Naming Convention

```
File: <module>.test.ts / <module>_test.go / test_<module>.py
Class: <Feature>Test / Test<Feature>
Method: test_<behavior>_when_<condition>_should_<expected>
```

## Test Framework

> _Được điền bởi /init-project theo stack thực tế_
> _Ví dụ: Jest (Node), JUnit 5 (Java), pytest (Python), Go test_

## CI Requirements

- Tất cả test phải pass trước khi merge
- Test không được phụ thuộc vào external service thật
- Thời gian chạy unit test < 5 phút
