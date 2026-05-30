---
specName: payment-service
version: 1.0
status: draft
createdAt: 2025-06-01
---

# Requirements: Payment Service

## 1. Bối cảnh

Tích hợp cổng thanh toán để xử lý giao dịch từ người dùng cuối.

## 2. User Stories

```
As a customer
I want to pay for my order using card or e-wallet
So that I can complete my purchase

Acceptance Criteria:
  GIVEN a valid order and payment method
  WHEN  I confirm payment
  THEN  transaction is processed within 3 seconds
  AND   I receive confirmation email

  GIVEN a failed payment
  WHEN  gateway returns error
  THEN  order status stays "pending"
  AND   I can retry payment
```

## 3. Functional Requirements

| ID | Yêu cầu | Ưu tiên |
|----|---------|---------|
| FR-01 | Thanh toán qua thẻ Visa/MC | Must Have |
| FR-02 | Thanh toán qua ví điện tử | Should Have |
| FR-03 | Webhook nhận kết quả từ gateway | Must Have |
| FR-04 | Retry tự động (idempotent) | Must Have |
| FR-05 | Hoàn tiền (refund) | Should Have |
| FR-06 | Lịch sử giao dịch | Must Have |

## 4. Non-Functional Requirements

| Loại | Yêu cầu |
|------|---------|
| Reliability | Idempotent — không charge 2 lần cùng 1 order |
| Security | PCI-DSS compliant, không lưu raw card data |
| Audit | Log đầy đủ mọi giao dịch, bất biến |
