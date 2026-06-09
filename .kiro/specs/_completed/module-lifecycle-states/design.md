
# Design: Module Lifecycle Enhancement

## Overview

Chuyển Module từ workflow tập trung vào tiến độ công việc (`backlog → in_progress → paused → completed → cancelled`) sang mô hình **Business Capability Lifecycle** 7 trạng thái, phản ánh trạng thái vận hành thực tế của phân hệ nghiệp vụ.

**Stack:** NestJS 11 · Angular 21 · PostgreSQL 17

---

## Scope of Change

| Layer | Thay đổi |
|---|---|
| Backend | Entity, DTO, lifecycle service, audit service, migration |
| Frontend | Status badge, transition selector, filter component |
| Database | Enum migration, data migration, version column, audit table |
| Shared types | `ModuleLifecycleStatus`, transition map, terminal status list |

---

## Key Design Decisions

| Quyết định | Lý do |
|---|---|
| Transition validation ở domain service, không phải controller/DTO | Đảm bảo consistency bất kể entry point — API, event, hay migration script |
| Optimistic locking qua `@VersionColumn` | Nhẹ hơn pessimistic locking; phù hợp với collaborative editing pattern |
| Audit log riêng (`module_lifecycle_logs`) | Tách biệt với general audit log; hỗ trợ lifecycle history query độc lập |
| Transition map dạng `Record<Status, Status[]>` trong shared types | Single source of truth cho cả backend validation lẫn frontend rendering |
| `allowedTransitions` trong mọi Module response | Client không cần duplicate logic — server là nguồn sự thật duy nhất |
| `status` bị ignore trong `CreateModuleDto` | Đảm bảo invariant "module mới luôn là planning" không phụ thuộc vào input |

---

## Architecture

```
┌─────────────────────────────────────┐
│          Frontend (Angular 21)       │
│  ModuleStatusBadge                   │
│  ModuleTransitionSelector            │
│  ModuleStatusFilter                  │
└──────────────┬──────────────────────┘
               │ HTTP
┌──────────────▼──────────────────────┐
│         Backend (NestJS 11)          │
│  ModuleController                    │
│    └─ ModuleLifecycleService         │  ← Domain layer: validation + transition
│         └─ ModuleLifecycleAudit      │  ← Fire-and-forget audit logging
│    └─ ModuleRepository               │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│        PostgreSQL 17                 │
│  modules (+ version column)          │
│  module_lifecycle_logs               │
└─────────────────────────────────────┘
```

### Request Flow: Lifecycle Transition

```
Client → PATCH /modules/:id { status: "active" }
  → Controller: extract userId, call lifecycleService.transition()
  → LifecycleService: findOne(id) with version
  → ValidationService: validate(currentStatus → targetStatus)
      ✗ InvalidTransitionException → 422 { currentStatus, requestedStatus, allowedTransitions }
      ✓ save(module) with optimistic lock check
          ✗ OptimisticLockVersionMismatchError → 409
          ✓ auditService.logTransition() [non-blocking]
            → 200 { ...module, allowedTransitions }
```

---

## Shared Types

```typescript
// libs/shared-types/src/module.types.ts

export type ModuleLifecycleStatus =
  | 'planning' | 'active' | 'maintenance' | 'suspended'
  | 'deprecated' | 'retired' | 'cancelled';

export const MODULE_LIFECYCLE_STATUSES = [
  'planning', 'active', 'maintenance', 'suspended',
  'deprecated', 'retired', 'cancelled',
] as const satisfies readonly ModuleLifecycleStatus[];

export const TERMINAL_STATUSES = ['retired', 'cancelled'] as const;

export const LIFECYCLE_TRANSITIONS: Record<ModuleLifecycleStatus, readonly ModuleLifecycleStatus[]> = {
  planning:    ['active', 'cancelled'],
  active:      ['maintenance', 'suspended', 'deprecated'],
  maintenance: ['active', 'suspended', 'deprecated'],
  suspended:   ['active', 'deprecated', 'retired'],
  deprecated:  ['retired'],
  retired:     [],
  cancelled:   [],
} as const;
```

> `as const satisfies` đảm bảo compile-time exhaustiveness — TypeScript báo lỗi nếu có status mới được thêm vào nhưng chưa có trong map.

---

## Backend Components

### ModuleLifecycleService

```typescript
// apps/backend/src/task/module/module-lifecycle.service.ts
@Injectable()
export class ModuleLifecycleService {
  constructor(
    private readonly moduleRepo: ModuleRepository,
    private readonly auditService: ModuleLifecycleAuditService,
  ) {}

  validateTransition(current: ModuleLifecycleStatus, target: ModuleLifecycleStatus): void {
    if (!LIFECYCLE_TRANSITIONS[current].includes(target)) {
      throw new InvalidTransitionException(current, target, [...LIFECYCLE_TRANSITIONS[current]]);
    }
  }

  getAllowedTransitions(status: ModuleLifecycleStatus): ModuleLifecycleStatus[] {
    return [...LIFECYCLE_TRANSITIONS[status]];
  }

  isTerminal(status: ModuleLifecycleStatus): boolean {
    return (TERMINAL_STATUSES as readonly string[]).includes(status);
  }

  async transition(
    moduleId: string,
    targetStatus: ModuleLifecycleStatus,
    userId: string,
    reason?: string,
  ): Promise<ModuleWithTransitions> {
    const module = await this.moduleRepo.findOneOrFail(moduleId);
    this.validateTransition(module.status, targetStatus);

    const previousStatus = module.status;
    module.status = targetStatus;

    const saved = await this.moduleRepo.save(module); // throws OptimisticLockVersionMismatchError on conflict

    this.auditService.logTransition({ moduleId, previousStatus, newStatus: targetStatus, changedBy: userId, reason });

    return { ...saved, allowedTransitions: this.getAllowedTransitions(saved.status) };
  }
}
```

### ModuleLifecycleAuditService

```typescript
@Injectable()
export class ModuleLifecycleAuditService {
  constructor(
    private readonly logRepo: ModuleLifecycleLogRepository,
    private readonly logger: Logger,
  ) {}

  logTransition(params: {
    moduleId: string;
    previousStatus: ModuleLifecycleStatus;
    newStatus: ModuleLifecycleStatus;
    changedBy: string;
    reason?: string;
  }): void {
    // Fire-and-forget: consistent với pattern của AuditService hiện tại
    this.logRepo.insert(params).catch(err =>
      this.logger.error('Failed to write lifecycle audit log', { ...params, err })
    );
  }
}
```

### DTOs

```typescript
export class CreateModuleDto {
  @IsString() @MaxLength(100)
  name!: string;

  @IsOptional() @IsObject()
  description?: Record<string, unknown> | null;

  @IsOptional() @IsDateString()
  startDate?: string | null;

  @IsOptional() @IsDateString()
  endDate?: string | null;

  // status intentionally absent — always initialized to 'planning'
}

export class UpdateModuleDto {
  @IsOptional() @IsIn(MODULE_LIFECYCLE_STATUSES)
  status?: ModuleLifecycleStatus;

  // other fields unchanged
}
```

### Exception Classes

```typescript
export class InvalidTransitionException extends UnprocessableEntityException {
  constructor(
    current: ModuleLifecycleStatus,
    requested: ModuleLifecycleStatus,
    allowed: ModuleLifecycleStatus[],
  ) {
    super({
      errorCode: 'INVALID_TRANSITION',
      message: `Cannot transition from '${current}' to '${requested}'`,
      currentStatus: current,
      requestedStatus: requested,
      allowedTransitions: allowed,
    });
  }
}

export class InvalidStatusValueException extends UnprocessableEntityException {
  constructor(value: string) {
    super({
      errorCode: 'INVALID_STATUS_VALUE',
      message: `'${value}' is not a valid module lifecycle status`,
      value,
      allowedValues: MODULE_LIFECYCLE_STATUSES,
    });
  }
}
```

> `statusCode`, `error`, `timestamp` bị loại khỏi payload — NestJS tự populate các field này qua `HttpException`. Tránh duplication và inconsistency.

---

## Data Models

### Module Entity

```typescript
@Entity('modules')
export class Module {
  @PrimaryGeneratedColumn('uuid') id!: string;

  @Column({ type: 'varchar', length: 10 })
  scope!: ModuleScope;

  @Column({ name: 'workspace_id', type: 'uuid', nullable: true })
  workspaceId!: string | null;

  @Column({ name: 'project_id', type: 'uuid', nullable: true })
  projectId!: string | null;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'jsonb', nullable: true })
  description!: Record<string, unknown> | null;

  @Column({ name: 'description_plain', type: 'text', nullable: true })
  descriptionPlain!: string | null;

  @Column({
    type: 'enum',
    enumName: 'module_lifecycle_status_enum',
    enum: MODULE_LIFECYCLE_STATUSES,
    default: 'planning',
  })
  status!: ModuleLifecycleStatus;

  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate!: string | null;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate!: string | null;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy!: string;

  @VersionColumn()
  version!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
```

### ModuleLifecycleLog Entity

```typescript
@Entity('module_lifecycle_logs')
@Index('idx_mlcl_module_id', ['moduleId'])
@Index('idx_mlcl_changed_at', ['changedAt'])
export class ModuleLifecycleLog {
  @PrimaryGeneratedColumn('uuid') id!: string;

  @Column({ name: 'module_id', type: 'uuid' })
  moduleId!: string;

  @Column({ name: 'previous_status', type: 'enum', enumName: 'module_lifecycle_status_enum' })
  previousStatus!: ModuleLifecycleStatus;

  @Column({ name: 'new_status', type: 'enum', enumName: 'module_lifecycle_status_enum' })
  newStatus!: ModuleLifecycleStatus;

  @Column({ name: 'changed_by', type: 'uuid' })
  changedBy!: string;

  @Column({ name: 'changed_at', type: 'timestamptz', default: () => 'now()' })
  changedAt!: Date;

  @Column({ type: 'text', nullable: true })
  reason!: string | null;

  @ManyToOne(() => Module, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'module_id' })
  module!: Module;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'changed_by' })
  changedByUser!: User | null;
}
```

> `changedByUser` relation để `nullable: true` vì `ON DELETE SET NULL` — user có thể bị xóa sau khi log được tạo.

---

## Database Migration

Migration chia 2 bước để dễ review và rollback độc lập.

### Step 1: Enum + Data Migration

```sql
-- 1. Tạo enum mới
CREATE TYPE module_lifecycle_status_enum AS ENUM (
  'planning', 'active', 'maintenance', 'suspended',
  'deprecated', 'retired', 'cancelled'
);

-- 2. Thêm column tạm
ALTER TABLE modules ADD COLUMN status_new module_lifecycle_status_enum;

-- 3. Migrate dữ liệu (unknown → planning với logging qua application layer)
UPDATE modules SET status_new = CASE status::text
  WHEN 'backlog'     THEN 'planning'::module_lifecycle_status_enum
  WHEN 'in_progress' THEN 'active'::module_lifecycle_status_enum
  WHEN 'paused'      THEN 'suspended'::module_lifecycle_status_enum
  WHEN 'completed'   THEN 'maintenance'::module_lifecycle_status_enum
  WHEN 'cancelled'   THEN 'cancelled'::module_lifecycle_status_enum
  ELSE               'planning'::module_lifecycle_status_enum
END;

-- 4. Validate không có NULL trước khi swap
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM modules WHERE status_new IS NULL) THEN
    RAISE EXCEPTION 'Migration failed: NULL values in status_new';
  END IF;
END $$;

-- 5. Swap columns
ALTER TABLE modules DROP COLUMN status;
ALTER TABLE modules RENAME COLUMN status_new TO status;
ALTER TABLE modules ALTER COLUMN status SET NOT NULL;
ALTER TABLE modules ALTER COLUMN status SET DEFAULT 'planning';

-- 6. Drop enum cũ
DROP TYPE module_status_enum;

-- 7. Thêm version column
ALTER TABLE modules ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
```

### Step 2: Audit Table

```sql
CREATE TABLE module_lifecycle_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id       UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  previous_status module_lifecycle_status_enum NOT NULL,
  new_status      module_lifecycle_status_enum NOT NULL,
  changed_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  changed_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  reason          TEXT
);

CREATE INDEX idx_mlcl_module_id  ON module_lifecycle_logs(module_id);
CREATE INDEX idx_mlcl_changed_at ON module_lifecycle_logs(changed_at);
```

### Rollback

```sql
CREATE TYPE module_status_enum AS ENUM ('backlog', 'in_progress', 'paused', 'completed', 'cancelled');

ALTER TABLE modules ADD COLUMN status_old module_status_enum;
UPDATE modules SET status_old = CASE status::text
  WHEN 'planning'    THEN 'backlog'
  WHEN 'active'      THEN 'in_progress'
  WHEN 'suspended'   THEN 'paused'
  WHEN 'maintenance' THEN 'completed'
  WHEN 'cancelled'   THEN 'cancelled'
  WHEN 'deprecated'  THEN 'completed'  -- lossy: deprecated/retired → completed
  WHEN 'retired'     THEN 'completed'  -- lossy: recorded in migration notes
END::module_status_enum;

ALTER TABLE modules DROP COLUMN status;
ALTER TABLE modules RENAME COLUMN status_old TO status;
ALTER TABLE modules ALTER COLUMN status SET NOT NULL;
ALTER TABLE modules ALTER COLUMN status SET DEFAULT 'backlog';

DROP TABLE IF EXISTS module_lifecycle_logs;
DROP TYPE module_lifecycle_status_enum;
ALTER TABLE modules DROP COLUMN version;
```

> **Lưu ý:** `deprecated` và `retired` rollback về `completed` — thông tin lifecycle bị mất. Đây là mất mát có chủ ý, cần ghi nhận trong release notes.

---

## API Contract

| Endpoint | Thay đổi |
|---|---|
| `POST /modules` | `status` bị ignore trong request body; response luôn có `status: "planning"` |
| `PATCH /modules/:id` | `status` validated qua lifecycle rules; trả 422 nếu transition không hợp lệ |
| `GET /modules` | Query param `?status=active,maintenance` (multi-value) |
| Tất cả Module responses | Thêm field `allowedTransitions: ModuleLifecycleStatus[]` |

**Module Response Shape:**
```json
{
  "id": "...",
  "name": "...",
  "status": "active",
  "allowedTransitions": ["maintenance", "suspended", "deprecated"],
  "version": 3
}
```

---

## Frontend Components

### ModuleStatusBadgeComponent

```typescript
@Component({
  selector: 'app-module-status-badge',
  standalone: true,
  template: `
    <span [class]="badgeClass" [style.opacity]="config.opacity">
      <i [class]="config.icon"></i> {{ config.label }}
    </span>
  `,
})
export class ModuleStatusBadgeComponent {
  @Input() status!: ModuleLifecycleStatus;
  protected get config() { return STATUS_CONFIG[this.status]; }
}
```

### ModuleTransitionSelectorComponent

```typescript
@Component({
  selector: 'app-module-transition-selector',
  standalone: true,
})
export class ModuleTransitionSelectorComponent {
  @Input() currentStatus!: ModuleLifecycleStatus;
  @Input() allowedTransitions!: ModuleLifecycleStatus[];
  @Output() transitionRequested = new EventEmitter<ModuleLifecycleStatus>();

  protected get isTerminal(): boolean {
    return this.allowedTransitions.length === 0;
  }
}
```

### ModuleStatusFilterComponent

```typescript
@Component({
  selector: 'app-module-status-filter',
  standalone: true,
})
export class ModuleStatusFilterComponent {
  @Input() selectedStatuses: ModuleLifecycleStatus[] = [];
  @Output() filterChanged = new EventEmitter<ModuleLifecycleStatus[]>();
}
```

### Status Configuration

```typescript
export const STATUS_CONFIG: Record<ModuleLifecycleStatus, {
  label: string; color: string; icon: string; opacity: number;
}> = {
  planning:    { label: 'Đang lên kế hoạch', color: '#8B5CF6', icon: 'pi pi-clipboard',            opacity: 1.0 },
  active:      { label: 'Đang vận hành',      color: '#10B981', icon: 'pi pi-play',                 opacity: 1.0 },
  maintenance: { label: 'Bảo trì',            color: '#F59E0B', icon: 'pi pi-wrench',               opacity: 1.0 },
  suspended:   { label: 'Tạm ngưng',          color: '#6B7280', icon: 'pi pi-pause',                opacity: 1.0 },
  deprecated:  { label: 'Sắp loại bỏ',        color: '#EF4444', icon: 'pi pi-exclamation-triangle', opacity: 0.8 },
  retired:     { label: 'Đã ngừng',           color: '#374151', icon: 'pi pi-lock',                 opacity: 0.6 },
  cancelled:   { label: 'Đã hủy',             color: '#9CA3AF', icon: 'pi pi-times-circle',         opacity: 0.6 },
};
```

---

## Error Handling

### Backend

| Scenario | HTTP | Error Code | Response |
|---|---|---|---|
| Transition không hợp lệ | 422 | `INVALID_TRANSITION` | `{ currentStatus, requestedStatus, allowedTransitions }` |
| Status value không hợp lệ | 422 | `INVALID_STATUS_VALUE` | `{ value, allowedValues }` |
| Optimistic lock conflict | 409 | `CONCURRENT_MODIFICATION` | `{ message }` |
| Module không tồn tại | 404 | `MODULE_NOT_FOUND` | `{ message }` |
| Audit log write failure | — | — | Non-blocking; logged to file, operation vẫn thành công |

### Frontend

| Scenario | Behavior |
|---|---|
| 422 invalid transition | Toast error: trạng thái hiện tại + danh sách cho phép. Refresh module data. |
| 409 concurrent modification | Toast warn. Auto-refresh module data. |
| 404 not found | Navigate về danh sách. Toast error. |
| Network error | Toast error + retry button. |

---

## Correctness Properties

Mỗi property là một invariant có thể được kiểm chứng bằng unit test và/hoặc property-based test.

| # | Property | Validates |
|---|---|---|
| P1 | Validator chấp nhận đúng 7 status hợp lệ; reject tất cả giá trị khác kể cả old statuses | REQ-1.1, 1.3, 1.4, 6.5 |
| P2 | Module creation luôn trả `status = "planning"` bất kể input | REQ-1.2, 6.1 |
| P3 | `validateTransition(a, b)` passes ↔ `b ∈ LIFECYCLE_TRANSITIONS[a]`; terminal states reject mọi target | REQ-2.1, 2.4, 6.2 |
| P4 | Error response của invalid transition chứa đúng `currentStatus`, `requestedStatus`, `allowedTransitions` | REQ-2.2 |
| P5 | Migration mapping đúng với mọi old status; unknown → `planning` | REQ-3.1 |
| P6 | Filter `?status=X,Y` trả đúng tập module có status ∈ {X, Y} | REQ-4.3, 6.3 |
| P7 | `allowedTransitions` trong response = `LIFECYCLE_TRANSITIONS[status]`; terminal → `[]` | REQ-5.2, 6.4 |

---

## Testing Strategy

### Unit Tests (Jest)

| Target | Cases |
|---|---|
| `validateTransition()` | Tất cả valid/invalid pairs (49 combinations) |
| `getAllowedTransitions()` | Correct return per status, bao gồm `[]` cho terminal |
| `isTerminal()` | True cho `retired`/`cancelled`, false cho 5 còn lại |
| Exception shape | `InvalidTransitionException`, `InvalidStatusValueException` |
| `CreateModuleDto` | `status` field bị strip/ignore |
| Migration mapping | 5 old statuses + unknown string fallback |
| `ModuleStatusBadgeComponent` | Render đúng config per status |
| `ModuleTransitionSelectorComponent` | Chỉ hiển thị allowed options; read-only khi terminal |

### Property-Based Tests (fast-check)

```typescript
// Ví dụ: P3 — transition correctness
fc.assert(fc.property(
  fc.constantFrom(...MODULE_LIFECYCLE_STATUSES),
  fc.constantFrom(...MODULE_LIFECYCLE_STATUSES),
  (current, target) => {
    const allowed = LIFECYCLE_TRANSITIONS[current].includes(target);
    const result = tryCatch(() => service.validateTransition(current, target));
    return allowed ? result.ok : result.err instanceof InvalidTransitionException;
  }
));
```

Mỗi property chạy tối thiểu 100 iterations. Tag: `[Feature: module-lifecycle] [Property: P{N}]`

### Integration Tests

| Test | Mô tả |
|---|---|
| Migration atomicity | Inject failure mid-migration; verify rollback hoàn toàn |
| Optimistic locking | 2 concurrent PATCH; verify một trả 409 |
| API contract | Full request/response cycle cho tất cả endpoints |
| Multi-value filter | `?status=active,maintenance` qua HTTP thực |
| Audit log | Sau transition, verify record tồn tại trong DB với đúng fields |

### E2E Tests (Playwright)

| Test | Mô tả |
|---|---|
| Module creation | Verify khởi tạo ở `planning`, không có status input |
| Transition flow | Chọn transition → verify UI cập nhật đúng |
| Terminal read-only | Verify không có transition controls cho `retired`/`cancelled` |
| Status filter | Chọn multiple statuses → verify kết quả đúng |
| Conflict toast | Simulate concurrent update → verify message thân thiện |

