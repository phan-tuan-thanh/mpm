---
specName: payment-service
version: 1.0
status: draft
---

# Design: Payment Service

## 1. Kiến trúc

```
Client → PaymentController → PaymentService → GatewayAdapter
                                   ↓                 ↓
                           TransactionRepo     [External Gateway]
                                   ↓
                           EventPublisher → OrderService (webhook)
```

## 2. Idempotency

Mỗi request thanh toán phải có `idempotency_key` (UUID).
PaymentService kiểm tra key trước khi gọi gateway:
- Key tồn tại → trả về kết quả cũ (không charge lại)
- Key mới → tạo transaction, gọi gateway, lưu kết quả

## 3. Data Model

```sql
CREATE TABLE transactions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id         UUID NOT NULL,
  idempotency_key  UUID NOT NULL UNIQUE,
  amount           DECIMAL(15,2) NOT NULL,
  currency         CHAR(3) NOT NULL DEFAULT 'VND',
  status           VARCHAR(20) NOT NULL,  -- pending|success|failed|refunded
  gateway          VARCHAR(50) NOT NULL,
  gateway_tx_id    VARCHAR(255),
  gateway_response JSONB,
  created_at       TIMESTAMP DEFAULT NOW(),
  updated_at       TIMESTAMP DEFAULT NOW()
);
```
