---
specName: payment-service
version: 1.0
status: todo
estimatedDays: 8
---

# Tasks: Payment Service

### Phase 1 — Foundation
- [ ] T01: Tạo migration bảng transactions
- [ ] T02: Implement GatewayAdapter interface
- [ ] T03: Tích hợp gateway đầu tiên (sandbox)
- [ ] T04: Idempotency middleware

### Phase 2 — Core Flow
- [ ] T05: PaymentService (initiate, confirm, cancel)
- [ ] T06: Webhook handler (nhận callback từ gateway)
- [ ] T07: Event publish sang OrderService
- [ ] T08: Unit + Integration tests

### Phase 3 — Hardening
- [ ] T09: Retry logic với exponential backoff
- [ ] T10: Refund flow
- [ ] T11: Audit log (bất biến)
- [ ] T12: Load test (100 TPS)
