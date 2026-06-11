# Custom Priority Configuration — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Cho phép mỗi project cấu hình mức ưu tiên (priority) riêng — thêm/bớt/đổi tên/màu/icon/thứ tự — lưu ở backend DB thay vì localStorage.

**Architecture:** Backend thêm bảng `project_priority` với entity/service/controller riêng, pattern giống `project_states`. Frontend refactor `PriorityConfigService` bỏ localStorage, thêm settings tab mới, 3 shared UI components (color picker, color pair, icon picker).

**Tech Stack:** NestJS + TypeORM (backend), Angular 18 Signals + PrimeNG v21 + CDK DragDrop (frontend), shared-types lib dùng chung.

---

## Task 1: Thêm `ProjectPriority` vào shared-types

**Files:**
- Modify: `libs/shared-types/src/project.types.ts`
- Modify: `libs/shared-types/src/task.types.ts`
- Modify: `libs/shared-types/src/index.ts` (nếu cần export)

**Step 1: Thêm interface `ProjectPriority` và các DTO vào `project.types.ts`**

Mở `libs/shared-types/src/project.types.ts`, thêm vào cuối file (trước dòng cuối):

```typescript
export interface ProjectPriority {
  id: string;
  projectId: string;
  name: string;
  value: string;
  colorLight: string;
  colorDark: string;
  icon: string;
  order: number;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePriorityDto {
  name: string;
  value: string;
  colorLight: string;
  colorDark: string;
  icon: string;
}

export interface UpdatePriorityDto {
  name?: string;
  colorLight?: string;
  colorDark?: string;
  icon?: string;
}

export interface ReorderPrioritiesDto {
  items: { priorityId: string; order: number }[];
}

export interface DeletePriorityDto {
  migrateToValue: string;
}
```

**Step 2: Đổi `TaskPriority` sang `string` trong `task.types.ts`**

File `libs/shared-types/src/task.types.ts`, dòng 4:

```typescript
// Trước:
export type TaskPriority = 'urgent' | 'high' | 'medium' | 'low' | 'none';

// Sau:
export type TaskPriority = string;
```

**Step 3: Kiểm tra build shared-types**

```bash
cd /Volumes/myssd/Working/github/mpm
npx nx build shared-types
```

Expected: build thành công, không có lỗi type.

**Step 4: Commit**

```bash
git add libs/shared-types/src/project.types.ts libs/shared-types/src/task.types.ts
git commit -m "feat(shared-types): add ProjectPriority interface and DTOs, relax TaskPriority to string"
```

---

## Task 2: Backend — Migration tạo bảng `project_priority`

**Files:**
- Create: `migrations/1749046000000-CreateProjectPriorityTable.ts`

**Step 1: Tạo migration file**

```typescript
// migrations/1749046000000-CreateProjectPriorityTable.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProjectPriorityTable1749046000000 implements MigrationInterface {
  name = 'CreateProjectPriorityTable1749046000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "project_priority" (
        "id"           UUID         NOT NULL DEFAULT gen_random_uuid(),
        "project_id"   UUID         NOT NULL,
        "name"         VARCHAR(50)  NOT NULL,
        "value"        VARCHAR(50)  NOT NULL,
        "color_light"  CHAR(7)      NOT NULL DEFAULT '#9CA3AF',
        "color_dark"   CHAR(7)      NOT NULL DEFAULT '#6B7280',
        "icon"         VARCHAR(100) NOT NULL DEFAULT 'pi pi-flag',
        "order"        SMALLINT     NOT NULL DEFAULT 0,
        "is_system"    BOOLEAN      NOT NULL DEFAULT FALSE,
        "created_at"   TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "updated_at"   TIMESTAMPTZ  NOT NULL DEFAULT now(),
        CONSTRAINT "PK_project_priority" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_project_priority_value" UNIQUE ("project_id", "value"),
        CONSTRAINT "FK_project_priority_project"
          FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_project_priority_project_id" ON "project_priority" ("project_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_project_priority_project_id"`);
    await queryRunner.query(`DROP TABLE "project_priority"`);
  }
}
```

**Step 2: Chạy migration**

```bash
cd /Volumes/myssd/Working/github/mpm
npx nx run backend:migration:run
```

Expected: `1749046000000-CreateProjectPriorityTable` executed successfully.

**Step 3: Commit**

```bash
git add migrations/1749046000000-CreateProjectPriorityTable.ts
git commit -m "feat(backend): add migration for project_priority table"
```

---

## Task 3: Backend — Entity `ProjectPriority`

**Files:**
- Create: `apps/backend/src/project/entities/project-priority.entity.ts`

**Step 1: Tạo entity**

```typescript
// apps/backend/src/project/entities/project-priority.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Project } from './project.entity';

@Entity('project_priority')
export class ProjectPriority {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'project_id', type: 'uuid' })
  projectId!: string;

  @Column({ type: 'varchar', length: 50 })
  name!: string;

  @Column({ type: 'varchar', length: 50 })
  value!: string;

  @Column({ name: 'color_light', type: 'char', length: 7, default: '#9CA3AF' })
  colorLight!: string;

  @Column({ name: 'color_dark', type: 'char', length: 7, default: '#6B7280' })
  colorDark!: string;

  @Column({ type: 'varchar', length: 100, default: 'pi pi-flag' })
  icon!: string;

  @Column({ type: 'smallint', default: 0 })
  order!: number;

  @Column({ name: 'is_system', type: 'boolean', default: false })
  isSystem!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project!: Project;
}
```

**Step 2: Commit**

```bash
git add apps/backend/src/project/entities/project-priority.entity.ts
git commit -m "feat(backend): add ProjectPriority entity"
```

---

## Task 4: Backend — DTOs

**Files:**
- Create: `apps/backend/src/project/priority/dto/create-priority.dto.ts`
- Create: `apps/backend/src/project/priority/dto/update-priority.dto.ts`
- Create: `apps/backend/src/project/priority/dto/reorder-priorities.dto.ts`
- Create: `apps/backend/src/project/priority/dto/delete-priority.dto.ts`

**Step 1: Tạo thư mục và các DTO**

```typescript
// apps/backend/src/project/priority/dto/create-priority.dto.ts
import { IsString, MaxLength, Matches } from 'class-validator';

export class CreatePriorityDto {
  @IsString() @MaxLength(50)
  name!: string;

  @IsString() @MaxLength(50) @Matches(/^[a-z0-9_-]+$/)
  value!: string;

  @IsString() @Matches(/^#[0-9A-Fa-f]{6}$/)
  colorLight!: string;

  @IsString() @Matches(/^#[0-9A-Fa-f]{6}$/)
  colorDark!: string;

  @IsString() @MaxLength(100)
  icon!: string;
}
```

```typescript
// apps/backend/src/project/priority/dto/update-priority.dto.ts
import { IsString, MaxLength, Matches, IsOptional } from 'class-validator';

export class UpdatePriorityDto {
  @IsOptional() @IsString() @MaxLength(50)
  name?: string;

  @IsOptional() @IsString() @Matches(/^#[0-9A-Fa-f]{6}$/)
  colorLight?: string;

  @IsOptional() @IsString() @Matches(/^#[0-9A-Fa-f]{6}$/)
  colorDark?: string;

  @IsOptional() @IsString() @MaxLength(100)
  icon?: string;
}
```

```typescript
// apps/backend/src/project/priority/dto/reorder-priorities.dto.ts
import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class ReorderItem {
  priorityId!: string;
  order!: number;
}

export class ReorderPrioritiesDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => ReorderItem)
  items!: ReorderItem[];
}
```

```typescript
// apps/backend/src/project/priority/dto/delete-priority.dto.ts
import { IsString } from 'class-validator';

export class DeletePriorityDto {
  @IsString()
  migrateToValue!: string;
}
```

**Step 2: Commit**

```bash
git add apps/backend/src/project/priority/
git commit -m "feat(backend): add priority DTOs"
```

---

## Task 5: Backend — `PriorityService`

**Files:**
- Create: `apps/backend/src/project/priority/priority.service.ts`

**Step 1: Tạo service**

Pattern giống `ProjectStateService`. Chú ý: DELETE dùng `migrateToValue` (string value), không phải ID.

```typescript
// apps/backend/src/project/priority/priority.service.ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Not } from 'typeorm';
import { ProjectPriority } from '../entities/project-priority.entity';
import { Task } from '../../task/entities/task.entity';
import { AuditService } from '../../audit/audit.service';
import { CreatePriorityDto } from './dto/create-priority.dto';
import { UpdatePriorityDto } from './dto/update-priority.dto';
import { DeletePriorityDto } from './dto/delete-priority.dto';
import { ReorderPrioritiesDto } from './dto/reorder-priorities.dto';

export const DEFAULT_PRIORITIES = [
  { name: 'Urgent', value: 'urgent', colorLight: '#EF4444', colorDark: '#FCA5A5', icon: 'pi pi-flag', order: 1, isSystem: false },
  { name: 'High',   value: 'high',   colorLight: '#F97316', colorDark: '#FDBA74', icon: 'pi pi-flag', order: 2, isSystem: false },
  { name: 'Medium', value: 'medium', colorLight: '#EAB308', colorDark: '#FDE047', icon: 'pi pi-flag', order: 3, isSystem: false },
  { name: 'Low',    value: 'low',    colorLight: '#3B82F6', colorDark: '#93C5FD', icon: 'pi pi-flag', order: 4, isSystem: false },
  { name: 'None',   value: 'none',   colorLight: '#9CA3AF', colorDark: '#6B7280', icon: 'pi pi-flag', order: 5, isSystem: true  },
];

@Injectable()
export class PriorityService {
  constructor(
    @InjectRepository(ProjectPriority)
    private readonly repo: Repository<ProjectPriority>,
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
    private readonly auditService: AuditService,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(projectId: string): Promise<ProjectPriority[]> {
    return this.repo.find({
      where: { projectId },
      order: { order: 'ASC' },
    });
  }

  async create(projectId: string, userId: string, dto: CreatePriorityDto, ip: string, ua: string): Promise<ProjectPriority> {
    const existing = await this.repo.findOne({ where: { projectId, value: dto.value } });
    if (existing) {
      throw new ConflictException({
        statusCode: 409, error: 'Conflict',
        message: `Priority value "${dto.value}" already exists in this project`,
        errorCode: 'PRIORITY_VALUE_EXISTS', timestamp: new Date().toISOString(),
      });
    }

    const maxOrder = await this.repo.maximum('order', { projectId }) ?? 0;

    const priority = this.repo.create({ ...dto, projectId, order: (maxOrder as number) + 1 });
    const saved = await this.repo.save(priority);

    this.auditService.log('project_state_created' as any, userId, ip, ua, { projectId, priorityId: saved.id });
    return saved;
  }

  async update(projectId: string, priorityId: string, userId: string, dto: UpdatePriorityDto, ip: string, ua: string): Promise<ProjectPriority> {
    const priority = await this.repo.findOne({ where: { id: priorityId, projectId } });
    if (!priority) {
      throw new NotFoundException({
        statusCode: 404, error: 'Not Found', message: 'Priority not found',
        errorCode: 'PRIORITY_NOT_FOUND', timestamp: new Date().toISOString(),
      });
    }

    if (dto.name !== undefined) priority.name = dto.name;
    if (dto.colorLight !== undefined) priority.colorLight = dto.colorLight;
    if (dto.colorDark !== undefined) priority.colorDark = dto.colorDark;
    if (dto.icon !== undefined) priority.icon = dto.icon;

    const saved = await this.repo.save(priority);
    this.auditService.log('project_state_updated' as any, userId, ip, ua, { projectId, priorityId: saved.id });
    return saved;
  }

  async delete(projectId: string, priorityId: string, userId: string, dto: DeletePriorityDto, ip: string, ua: string): Promise<void> {
    const priority = await this.repo.findOne({ where: { id: priorityId, projectId } });
    if (!priority) {
      throw new NotFoundException({
        statusCode: 404, error: 'Not Found', message: 'Priority not found',
        errorCode: 'PRIORITY_NOT_FOUND', timestamp: new Date().toISOString(),
      });
    }

    if (priority.isSystem) {
      throw new ForbiddenException({
        statusCode: 403, error: 'Forbidden', message: 'System priorities cannot be deleted',
        errorCode: 'PRIORITY_IS_SYSTEM', timestamp: new Date().toISOString(),
      });
    }

    const count = await this.repo.count({ where: { projectId } });
    if (count <= 2) {
      throw new UnprocessableEntityException({
        statusCode: 422, error: 'Unprocessable Entity',
        message: 'Project must have at least 2 priorities',
        errorCode: 'MIN_PRIORITIES_REQUIRED', timestamp: new Date().toISOString(),
      });
    }

    const migrateTarget = await this.repo.findOne({ where: { projectId, value: dto.migrateToValue } });
    if (!migrateTarget) {
      throw new NotFoundException({
        statusCode: 404, error: 'Not Found', message: 'Migration target priority not found',
        errorCode: 'PRIORITY_NOT_FOUND', timestamp: new Date().toISOString(),
      });
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await queryRunner.manager
        .createQueryBuilder()
        .update(Task)
        .set({ priority: dto.migrateToValue })
        .where('priority = :val AND project_id = :projectId', { val: priority.value, projectId })
        .execute();

      await queryRunner.manager.remove(ProjectPriority, priority);
      await queryRunner.commitTransaction();

      this.auditService.log('project_state_deleted' as any, userId, ip, ua, {
        projectId, priorityId, value: priority.value, migratedTo: dto.migrateToValue,
      });
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async reorder(projectId: string, userId: string, dto: ReorderPrioritiesDto, ip: string, ua: string): Promise<number> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let count = 0;
      for (const item of dto.items) {
        const p = await queryRunner.manager.findOne(ProjectPriority, {
          where: { id: item.priorityId, projectId },
        });
        if (p) {
          p.order = item.order;
          await queryRunner.manager.save(ProjectPriority, p);
          count++;
        }
      }
      await queryRunner.commitTransaction();
      this.auditService.log('project_state_updated' as any, userId, ip, ua, { projectId, reorderedCount: count });
      return count;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async seedDefaults(projectId: string, queryRunner?: any): Promise<void> {
    const manager = queryRunner?.manager ?? this.repo.manager;
    for (const p of DEFAULT_PRIORITIES) {
      const priority = manager.create(ProjectPriority, { ...p, projectId });
      await manager.save(ProjectPriority, priority);
    }
  }
}
```

**Step 2: Commit**

```bash
git add apps/backend/src/project/priority/priority.service.ts
git commit -m "feat(backend): add PriorityService with CRUD + reorder + delete+migrate"
```

---

## Task 6: Backend — `PriorityController`

**Files:**
- Create: `apps/backend/src/project/priority/priority.controller.ts`

**Step 1: Tạo controller**

```typescript
// apps/backend/src/project/priority/priority.controller.ts
import {
  Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Req,
} from '@nestjs/common';
import { Request } from 'express';
import { CurrentUser, RequestUser } from '../../auth/decorators/current-user.decorator';
import { ProjectRoles } from '../../auth/decorators/project-roles.decorator';
import { PriorityService } from './priority.service';
import { CreatePriorityDto } from './dto/create-priority.dto';
import { UpdatePriorityDto } from './dto/update-priority.dto';
import { DeletePriorityDto } from './dto/delete-priority.dto';
import { ReorderPrioritiesDto } from './dto/reorder-priorities.dto';

@Controller('api/projects/:projectId/priorities')
export class PriorityController {
  constructor(private readonly service: PriorityService) {}

  private ip(req: Request): string {
    const fwd = req.headers['x-forwarded-for'];
    if (typeof fwd === 'string') return fwd.split(',')[0].trim();
    return req.ip ?? req.socket.remoteAddress ?? 'unknown';
  }

  @Get()
  @ProjectRoles('Scrum_Master', 'Product_Owner', 'Developer', 'QA', 'Stakeholder')
  async findAll(@Param('projectId', ParseUUIDPipe) projectId: string) {
    const data = await this.service.findAll(projectId);
    return { data };
  }

  @Post()
  @ProjectRoles('Scrum_Master')
  async create(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: CreatePriorityDto,
    @Req() req: Request,
  ) {
    return this.service.create(projectId, user.id, dto, this.ip(req), req.headers['user-agent'] ?? 'unknown');
  }

  @Patch('reorder')
  @ProjectRoles('Scrum_Master')
  async reorder(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: ReorderPrioritiesDto,
    @Req() req: Request,
  ) {
    const updated = await this.service.reorder(projectId, user.id, dto, this.ip(req), req.headers['user-agent'] ?? 'unknown');
    return { updated };
  }

  @Patch(':priorityId')
  @ProjectRoles('Scrum_Master')
  async update(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('priorityId', ParseUUIDPipe) priorityId: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdatePriorityDto,
    @Req() req: Request,
  ) {
    return this.service.update(projectId, priorityId, user.id, dto, this.ip(req), req.headers['user-agent'] ?? 'unknown');
  }

  @Delete(':priorityId')
  @ProjectRoles('Scrum_Master')
  async delete(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('priorityId', ParseUUIDPipe) priorityId: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: DeletePriorityDto,
    @Req() req: Request,
  ) {
    await this.service.delete(projectId, priorityId, user.id, dto, this.ip(req), req.headers['user-agent'] ?? 'unknown');
    return { success: true };
  }
}
```

**Step 2: Commit**

```bash
git add apps/backend/src/project/priority/priority.controller.ts
git commit -m "feat(backend): add PriorityController"
```

---

## Task 7: Backend — Đăng ký vào `ProjectModule` + seed khi tạo project

**Files:**
- Modify: `apps/backend/src/project/project.module.ts`
- Modify: `apps/backend/src/project/project-create.service.ts`

**Step 1: Cập nhật `project.module.ts`**

Thêm imports/controllers/providers cho `ProjectPriority`, `PriorityController`, `PriorityService`:

```typescript
// Thêm vào imports TypeOrmModule.forFeature([...]):
ProjectPriority,

// Thêm vào controllers: [...]:
PriorityController,

// Thêm vào providers: [...] và exports: [...]:
PriorityService,
```

Thêm import statements:
```typescript
import { ProjectPriority } from './entities/project-priority.entity';
import { PriorityController } from './priority/priority.controller';
import { PriorityService } from './priority/priority.service';
```

**Step 2: Seed priorities khi tạo project trong `project-create.service.ts`**

Inject `PriorityService` và sau đoạn seed states (sau `queryRunner.commitTransaction()`... không, trước!), thêm seed priorities TRONG transaction:

Tìm đoạn trong `ProjectCreateService.create()` sau khi seed states, ngay trước khi save `ProjectEstimateConfig`:

```typescript
// Sau đoạn seed states, trước khi save pec:
// Seed default priorities
await this.priorityService.seedDefaults(saved.id, queryRunner);
```

Thêm constructor injection:
```typescript
private readonly priorityService: PriorityService,
```

Và import `PriorityService`.

**Step 3: Chạy backend để kiểm tra khởi động**

```bash
npx nx serve backend
```

Expected: server starts without errors, endpoint `GET /api/projects/:id/priorities` accessible.

**Step 4: Commit**

```bash
git add apps/backend/src/project/project.module.ts apps/backend/src/project/project-create.service.ts
git commit -m "feat(backend): register PriorityModule, seed default priorities on project create"
```

---

## Task 8: Backend — Seed priorities cho projects hiện có (one-time migration)

**Files:**
- Create: `migrations/1749047000000-SeedDefaultPrioritiesForExistingProjects.ts`

Bảng mới nên projects đã tạo trước đó chưa có priorities. Migration này seed dữ liệu cho tất cả projects hiện có.

**Step 1: Tạo data migration**

```typescript
// migrations/1749047000000-SeedDefaultPrioritiesForExistingProjects.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

const DEFAULT_PRIORITIES = [
  { name: 'Urgent', value: 'urgent', color_light: '#EF4444', color_dark: '#FCA5A5', icon: 'pi pi-flag', order: 1, is_system: false },
  { name: 'High',   value: 'high',   color_light: '#F97316', color_dark: '#FDBA74', icon: 'pi pi-flag', order: 2, is_system: false },
  { name: 'Medium', value: 'medium', color_light: '#EAB308', color_dark: '#FDE047', icon: 'pi pi-flag', order: 3, is_system: false },
  { name: 'Low',    value: 'low',    color_light: '#3B82F6', color_dark: '#93C5FD', icon: 'pi pi-flag', order: 4, is_system: false },
  { name: 'None',   value: 'none',   color_light: '#9CA3AF', color_dark: '#6B7280', icon: 'pi pi-flag', order: 5, is_system: true  },
];

export class SeedDefaultPrioritiesForExistingProjects1749047000000 implements MigrationInterface {
  name = 'SeedDefaultPrioritiesForExistingProjects1749047000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const projects = await queryRunner.query(`SELECT id FROM projects`);
    for (const project of projects) {
      for (const p of DEFAULT_PRIORITIES) {
        await queryRunner.query(`
          INSERT INTO project_priority (project_id, name, value, color_light, color_dark, icon, "order", is_system)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (project_id, value) DO NOTHING
        `, [project.id, p.name, p.value, p.color_light, p.color_dark, p.icon, p.order, p.is_system]);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM project_priority WHERE value IN ('urgent','high','medium','low','none')`);
  }
}
```

**Step 2: Chạy migration**

```bash
npx nx run backend:migration:run
```

Expected: migration executed, priorities seeded for all existing projects.

**Step 3: Commit**

```bash
git add migrations/1749047000000-SeedDefaultPrioritiesForExistingProjects.ts
git commit -m "feat(backend): seed default priorities for existing projects"
```

---

## Task 9: Frontend — HTTP `PriorityService`

**Files:**
- Create: `apps/frontend/src/app/projects/services/priority.service.ts`

**Step 1: Tạo service**

Pattern giống các methods trong `project.service.ts` cho states.

```typescript
// apps/frontend/src/app/projects/services/priority.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  ProjectPriority,
  CreatePriorityDto,
  UpdatePriorityDto,
  ReorderPrioritiesDto,
  DeletePriorityDto,
} from '@mpm/shared-types';

@Injectable({ providedIn: 'root' })
export class PriorityService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/projects';

  getPriorities(projectId: string): Observable<{ data: ProjectPriority[] }> {
    return this.http.get<{ data: ProjectPriority[] }>(`${this.baseUrl}/${projectId}/priorities`);
  }

  createPriority(projectId: string, dto: CreatePriorityDto): Observable<ProjectPriority> {
    return this.http.post<ProjectPriority>(`${this.baseUrl}/${projectId}/priorities`, dto);
  }

  updatePriority(projectId: string, priorityId: string, dto: UpdatePriorityDto): Observable<ProjectPriority> {
    return this.http.patch<ProjectPriority>(`${this.baseUrl}/${projectId}/priorities/${priorityId}`, dto);
  }

  deletePriority(projectId: string, priorityId: string, dto: DeletePriorityDto): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(
      `${this.baseUrl}/${projectId}/priorities/${priorityId}`,
      { body: dto },
    );
  }

  reorderPriorities(projectId: string, dto: ReorderPrioritiesDto): Observable<{ updated: number }> {
    return this.http.patch<{ updated: number }>(
      `${this.baseUrl}/${projectId}/priorities/reorder`,
      dto,
    );
  }
}
```

**Step 2: Commit**

```bash
git add apps/frontend/src/app/projects/services/priority.service.ts
git commit -m "feat(frontend): add PriorityService HTTP client"
```

---

## Task 10: Frontend — Refactor `PriorityConfigService`

**Files:**
- Modify: `apps/frontend/src/app/tasks/services/priority-config.service.ts`

**Step 1: Viết lại service**

Bỏ localStorage hoàn toàn. Service mới dùng signal + gọi API qua `PriorityService`.

```typescript
// apps/frontend/src/app/tasks/services/priority-config.service.ts
import { Injectable, inject, signal, computed } from '@angular/core';
import { PriorityService } from '../../projects/services/priority.service';
import { ProjectPriority } from '@mpm/shared-types';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';

export const DEFAULT_PRIORITY_OPTIONS: ProjectPriority[] = [
  { id: '', projectId: '', name: 'Urgent', value: 'urgent', colorLight: '#EF4444', colorDark: '#FCA5A5', icon: 'pi pi-flag', order: 1, isSystem: false, createdAt: new Date(), updatedAt: new Date() },
  { id: '', projectId: '', name: 'High',   value: 'high',   colorLight: '#F97316', colorDark: '#FDBA74', icon: 'pi pi-flag', order: 2, isSystem: false, createdAt: new Date(), updatedAt: new Date() },
  { id: '', projectId: '', name: 'Medium', value: 'medium', colorLight: '#EAB308', colorDark: '#FDE047', icon: 'pi pi-flag', order: 3, isSystem: false, createdAt: new Date(), updatedAt: new Date() },
  { id: '', projectId: '', name: 'Low',    value: 'low',    colorLight: '#3B82F6', colorDark: '#93C5FD', icon: 'pi pi-flag', order: 4, isSystem: false, createdAt: new Date(), updatedAt: new Date() },
  { id: '', projectId: '', name: 'None',   value: 'none',   colorLight: '#9CA3AF', colorDark: '#6B7280', icon: 'pi pi-flag', order: 5, isSystem: true,  createdAt: new Date(), updatedAt: new Date() },
];

@Injectable({ providedIn: 'root' })
export class PriorityConfigService {
  private readonly priorityService = inject(PriorityService);
  private readonly _priorities = signal<Record<string, ProjectPriority[]>>({});

  loadPriorities(projectId: string): void {
    this.priorityService.getPriorities(projectId).pipe(
      catchError(() => of({ data: DEFAULT_PRIORITY_OPTIONS })),
    ).subscribe(res => {
      this._priorities.update(m => ({ ...m, [projectId]: res.data }));
    });
  }

  getOptions(projectId: string): ProjectPriority[] {
    return this._priorities()[projectId] ?? DEFAULT_PRIORITY_OPTIONS;
  }

  optionsSignal(projectId: string) {
    return computed(() => this._priorities()[projectId] ?? DEFAULT_PRIORITY_OPTIONS);
  }

  getConfig(projectId: string, value: string): ProjectPriority {
    const opts = this.getOptions(projectId);
    return opts.find(p => p.value === value)
      ?? DEFAULT_PRIORITY_OPTIONS.find(p => p.value === value)
      ?? DEFAULT_PRIORITY_OPTIONS[4];
  }
}
```

**Step 2: Tìm nơi dùng `PriorityOption` type cũ và cập nhật**

```bash
grep -rn "PriorityOption" apps/frontend/src --include="*.ts" | grep -v "node_modules"
```

Với mỗi file tìm thấy, thay `PriorityOption` → `ProjectPriority` (import từ `@mpm/shared-types`).

**Step 3: Build kiểm tra type**

```bash
npx nx build frontend --configuration=development 2>&1 | grep -i error | head -20
```

Expected: không có lỗi type liên quan đến `PriorityOption`.

**Step 4: Commit**

```bash
git add apps/frontend/src/app/tasks/services/priority-config.service.ts
git commit -m "feat(frontend): refactor PriorityConfigService to use API instead of localStorage"
```

---

## Task 11: Frontend — Cập nhật `task-detail-panel` bỏ inline edit

**Files:**
- Modify: `apps/frontend/src/app/tasks/components/task-detail-panel/task-detail-panel.component.ts`
- Modify: `apps/frontend/src/app/tasks/components/task-detail-panel/task-detail-panel.component.html` (nếu cần)

**Step 1: Xác định đoạn cần xóa**

```bash
grep -n "priorityEditMode\|priorityEditDraft\|savePriorityConfig\|resetPriorityConfig\|PriorityOption" \
  apps/frontend/src/app/tasks/components/task-detail-panel/task-detail-panel.component.ts
```

**Step 2: Xóa các phần liên quan đến inline edit trong `.ts`**

- Xóa `priorityEditMode = signal(false)`
- Xóa `priorityEditDraft = signal<PriorityOption[]>([])`
- Xóa các methods: `openPriorityEdit()`, `movePriorityUp()`, `movePriorityDown()`, `savePriorityConfig()`, `resetPriorityConfig()`
- Giữ lại: `priorityOptions = computed(...)` và `selectPriority()`

**Step 3: Xóa section edit UI trong `.html`**

Trong template, tìm `@if (!priorityEditMode())` và bỏ conditional — chỉ giữ phần hiển thị danh sách priorities đơn giản. Xóa nút "Tùy chỉnh..." và phần `@else` (edit mode).

**Step 4: Cập nhật `priorityOptions` dùng `ProjectPriority` type**

```typescript
protected readonly priorityOptions = computed(() =>
  this.priorityConfigService.optionsSignal(this.projectId())()
);
```

**Step 5: Build kiểm tra**

```bash
npx nx build frontend --configuration=development 2>&1 | grep -i error | head -20
```

**Step 6: Commit**

```bash
git add apps/frontend/src/app/tasks/components/task-detail-panel/
git commit -m "feat(frontend): remove inline priority customization from task-detail-panel"
```

---

## Task 12: Frontend — Shared `ColorPickerPanelComponent`

**Files:**
- Create: `apps/frontend/src/app/shared/components/color-picker-panel/color-picker-panel.component.ts`
- Create: `apps/frontend/src/app/shared/components/color-picker-panel/color-picker-panel.component.html`

**Step 1: Tạo component**

```typescript
// apps/frontend/src/app/shared/components/color-picker-panel/color-picker-panel.component.ts
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TooltipModule } from 'primeng/tooltip';

export const PRESET_COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16', '#22C55E',
  '#10B981', '#14B8A6', '#06B6D4', '#3B82F6', '#6366F1', '#8B5CF6',
  '#A855F7', '#EC4899', '#F43F5E', '#64748B', '#374151', '#111827',
  '#FBBF24', '#34D399', '#60A5FA', '#818CF8', '#C084FC', '#FB7185',
  '#FCA5A5', '#FDBA74', '#FDE047', '#86EFAC', '#93C5FD', '#A5B4FC',
  '#D8B4FE', '#FCA5A5', '#9CA3AF', '#6B7280', '#D1D5DB', '#FFFFFF',
];

@Component({
  standalone: true,
  selector: 'app-color-picker-panel',
  imports: [CommonModule, FormsModule, TooltipModule],
  templateUrl: './color-picker-panel.component.html',
})
export class ColorPickerPanelComponent {
  @Input() value = '#9CA3AF';
  @Output() valueChange = new EventEmitter<string>();

  readonly presets = PRESET_COLORS;
  hexInput = '';

  ngOnInit(): void {
    this.hexInput = this.value.replace('#', '');
  }

  selectPreset(color: string): void {
    this.value = color;
    this.hexInput = color.replace('#', '');
    this.valueChange.emit(color);
  }

  onHexInput(raw: string): void {
    const clean = raw.replace(/[^0-9A-Fa-f]/g, '').slice(0, 6);
    this.hexInput = clean;
    if (clean.length === 6) {
      this.value = '#' + clean.toUpperCase();
      this.valueChange.emit(this.value);
    }
  }

  isValidHex(hex: string): boolean {
    return /^[0-9A-Fa-f]{6}$/.test(hex);
  }
}
```

```html
<!-- color-picker-panel.component.html -->
<div class="p-2 w-52">
  <div class="grid grid-cols-6 gap-1 mb-2">
    @for (color of presets; track color) {
      <button
        type="button"
        class="w-7 h-7 rounded-md border-2 transition-transform hover:scale-110 focus:outline-none"
        [style.background-color]="color"
        [class.border-blue-500]="value === color"
        [class.border-transparent]="value !== color"
        (click)="selectPreset(color)"
        [pTooltip]="color"
        tooltipPosition="top"
      ></button>
    }
  </div>
  <div class="flex items-center gap-2 pt-2 border-t border-gray-200 dark:border-surface-700">
    <span class="text-gray-500 text-sm font-mono">#</span>
    <input
      type="text"
      class="flex-1 min-w-0 border border-gray-300 dark:border-surface-600 rounded px-2 py-1 text-sm font-mono uppercase bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-500"
      [ngModel]="hexInput"
      (ngModelChange)="onHexInput($event)"
      placeholder="EF4444"
      maxlength="6"
    />
    <span
      class="w-7 h-7 rounded border border-gray-300 dark:border-surface-600 flex-shrink-0"
      [style.background-color]="isValidHex(hexInput) ? '#' + hexInput : '#ccc'"
    ></span>
  </div>
</div>
```

**Step 2: Commit**

```bash
git add apps/frontend/src/app/shared/components/color-picker-panel/
git commit -m "feat(frontend): add ColorPickerPanelComponent"
```

---

## Task 13: Frontend — Shared `ColorPairPickerComponent`

**Files:**
- Create: `apps/frontend/src/app/shared/components/color-pair-picker/color-pair-picker.component.ts`
- Create: `apps/frontend/src/app/shared/components/color-pair-picker/color-pair-picker.component.html`

**Step 1: Tạo component wrapper**

```typescript
// apps/frontend/src/app/shared/components/color-pair-picker/color-pair-picker.component.ts
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PopoverModule } from 'primeng/popover';
import { ColorPickerPanelComponent } from '../color-picker-panel/color-picker-panel.component';

@Component({
  standalone: true,
  selector: 'app-color-pair-picker',
  imports: [CommonModule, PopoverModule, ColorPickerPanelComponent],
  templateUrl: './color-pair-picker.component.html',
})
export class ColorPairPickerComponent {
  @Input() light = '#9CA3AF';
  @Input() dark = '#6B7280';
  @Output() lightChange = new EventEmitter<string>();
  @Output() darkChange = new EventEmitter<string>();
}
```

```html
<!-- color-pair-picker.component.html -->
<div class="flex flex-col gap-2">
  <div class="flex items-center gap-2">
    <span class="text-xs text-gray-500 w-10">Light</span>
    <button
      type="button"
      class="w-6 h-6 rounded border border-gray-300 dark:border-surface-600 flex-shrink-0 hover:scale-110 transition-transform"
      [style.background-color]="light"
      (click)="lightPop.toggle($event)"
    ></button>
    <span class="text-xs font-mono text-gray-500">{{ light }}</span>
    <p-popover #lightPop>
      <app-color-picker-panel [value]="light" (valueChange)="lightChange.emit($event); light = $event" />
    </p-popover>
  </div>
  <div class="flex items-center gap-2">
    <span class="text-xs text-gray-500 w-10">Dark</span>
    <button
      type="button"
      class="w-6 h-6 rounded border border-gray-300 dark:border-surface-600 flex-shrink-0 hover:scale-110 transition-transform"
      [style.background-color]="dark"
      (click)="darkPop.toggle($event)"
    ></button>
    <span class="text-xs font-mono text-gray-500">{{ dark }}</span>
    <p-popover #darkPop>
      <app-color-picker-panel [value]="dark" (valueChange)="darkChange.emit($event); dark = $event" />
    </p-popover>
  </div>
</div>
```

**Step 2: Commit**

```bash
git add apps/frontend/src/app/shared/components/color-pair-picker/
git commit -m "feat(frontend): add ColorPairPickerComponent"
```

---

## Task 14: Frontend — Shared `IconPickerPanelComponent`

**Files:**
- Create: `apps/frontend/src/app/shared/components/icon-picker-panel/icon-picker.constants.ts`
- Create: `apps/frontend/src/app/shared/components/icon-picker-panel/icon-picker-panel.component.ts`
- Create: `apps/frontend/src/app/shared/components/icon-picker-panel/icon-picker-panel.component.html`

**Step 1: Tạo constants**

```typescript
// icon-picker.constants.ts
export interface IconGroup { label: string; icons: string[] }

export const ICON_GROUPS: IconGroup[] = [
  {
    label: 'Flag / Priority',
    icons: ['pi pi-flag', 'pi pi-bookmark', 'pi pi-star', 'pi pi-heart', 'pi pi-thumbs-up', 'pi pi-thumbs-down'],
  },
  {
    label: 'Alert',
    icons: ['pi pi-bolt', 'pi pi-exclamation-triangle', 'pi pi-exclamation-circle', 'pi pi-ban', 'pi pi-times-circle'],
  },
  {
    label: 'Status',
    icons: ['pi pi-check-circle', 'pi pi-times-circle', 'pi pi-clock', 'pi pi-spin pi-spinner', 'pi pi-pause-circle'],
  },
  {
    label: 'Arrow',
    icons: ['pi pi-arrow-up', 'pi pi-arrow-down', 'pi pi-arrow-right', 'pi pi-angle-double-up', 'pi pi-angle-double-down'],
  },
  {
    label: 'General',
    icons: ['pi pi-circle', 'pi pi-circle-fill', 'pi pi-minus', 'pi pi-ellipsis-h', 'pi pi-tag', 'pi pi-tags'],
  },
];
```

**Step 2: Tạo component**

```typescript
// icon-picker-panel.component.ts
import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PopoverModule } from 'primeng/popover';
import { InputTextModule } from 'primeng/inputtext';
import { ICON_GROUPS } from './icon-picker.constants';

@Component({
  standalone: true,
  selector: 'app-icon-picker-panel',
  imports: [CommonModule, FormsModule, PopoverModule, InputTextModule],
  templateUrl: './icon-picker-panel.component.html',
})
export class IconPickerPanelComponent {
  @Input() value = 'pi pi-flag';
  @Output() valueChange = new EventEmitter<string>();

  readonly groups = ICON_GROUPS;
  readonly search = signal('');

  get filteredGroups() {
    const q = this.search().toLowerCase();
    if (!q) return this.groups;
    return this.groups.map(g => ({
      ...g,
      icons: g.icons.filter(i => i.toLowerCase().includes(q)),
    })).filter(g => g.icons.length > 0);
  }

  select(icon: string): void {
    this.value = icon;
    this.valueChange.emit(icon);
  }
}
```

```html
<!-- icon-picker-panel.component.html -->
<div class="p-2 w-64">
  <input
    pInputText
    type="text"
    placeholder="Tìm icon..."
    class="w-full mb-2 text-sm"
    [ngModel]="search()"
    (ngModelChange)="search.set($event)"
  />
  <div class="max-h-52 overflow-y-auto space-y-3">
    @for (group of filteredGroups; track group.label) {
      <div>
        <p class="text-xs text-gray-400 uppercase tracking-wider mb-1">{{ group.label }}</p>
        <div class="flex flex-wrap gap-1">
          @for (icon of group.icons; track icon) {
            <button
              type="button"
              class="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-surface-700 transition-colors border-2"
              [class.border-blue-500]="value === icon"
              [class.border-transparent]="value !== icon"
              (click)="select(icon)"
              [title]="icon"
            >
              <i [class]="icon" class="text-sm"></i>
            </button>
          }
        </div>
      </div>
    }
  </div>
</div>
```

**Step 3: Commit**

```bash
git add apps/frontend/src/app/shared/components/icon-picker-panel/
git commit -m "feat(frontend): add IconPickerPanelComponent with grouped icon picker"
```

---

## Task 15: Frontend — `PrioritiesTabComponent`

**Files:**
- Create: `apps/frontend/src/app/projects/pages/project-settings/priorities-tab/priorities-tab.component.ts`
- Create: `apps/frontend/src/app/projects/pages/project-settings/priorities-tab/priorities-tab.component.html`
- Create: `apps/frontend/src/app/projects/pages/project-settings/priorities-tab/priorities-tab.component.css`

**Step 1: Tạo TypeScript component**

Pattern giống `StatesTabComponent`. Dùng CDK DragDrop cho kéo thả.

```typescript
// priorities-tab.component.ts
import { Component, OnInit, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { PopoverModule } from 'primeng/popover';
import { TooltipModule } from 'primeng/tooltip';
import { DragDropModule, CdkDragDrop } from '@angular/cdk/drag-drop';
import { MessageService } from 'primeng/api';
import { ProjectStore } from '../../../state/project.store';
import { PriorityService } from '../../../services/priority.service';
import { PriorityConfigService } from '../../../../tasks/services/priority-config.service';
import { AuthService } from '../../../../auth/services/auth.service';
import { ColorPairPickerComponent } from '../../../../shared/components/color-pair-picker/color-pair-picker.component';
import { IconPickerPanelComponent } from '../../../../shared/components/icon-picker-panel/icon-picker-panel.component';
import { ProjectPriority, CreatePriorityDto } from '@mpm/shared-types';

interface EditDraft {
  name: string;
  colorLight: string;
  colorDark: string;
  icon: string;
}

@Component({
  standalone: true,
  selector: 'app-priorities-tab',
  imports: [
    CommonModule, FormsModule, ButtonModule, DialogModule,
    InputTextModule, SelectModule, PopoverModule, TooltipModule,
    DragDropModule, ColorPairPickerComponent, IconPickerPanelComponent,
  ],
  templateUrl: './priorities-tab.component.html',
  styleUrl: './priorities-tab.component.css',
})
export class PrioritiesTabComponent implements OnInit {
  readonly projectStore = inject(ProjectStore);
  private readonly priorityService = inject(PriorityService);
  private readonly priorityConfigService = inject(PriorityConfigService);
  private readonly authService = inject(AuthService);
  private readonly messageService = inject(MessageService);

  readonly priorities = signal<ProjectPriority[]>([]);
  readonly isLoading = signal(false);

  // Inline edit state
  editingId = signal<string | null>(null);
  editDraft = signal<EditDraft>({ name: '', colorLight: '#9CA3AF', colorDark: '#6B7280', icon: 'pi pi-flag' });

  // Add form
  showAddForm = signal(false);
  addDraft = signal<CreatePriorityDto>({ name: '', value: '', colorLight: '#9CA3AF', colorDark: '#6B7280', icon: 'pi pi-flag' });

  // Delete dialog
  displayDeleteDialog = signal(false);
  priorityToDelete = signal<ProjectPriority | null>(null);
  migrationTargets = signal<ProjectPriority[]>([]);
  selectedMigrateValue = signal<string | null>(null);
  isDeleting = signal(false);

  // DnD
  draggedId: string | null = null;
  hoveredId: string | null = null;

  readonly isReadOnly = computed(() => {
    const project = this.projectStore.currentProject();
    if (!project) return true;
    const user = this.authService.currentUser();
    if (!user) return true;
    if (user.systemRole === 'Admin') return false;
    const member = this.projectStore.members().find(m => m.userId === user.id);
    return member?.projectRole !== 'Scrum_Master';
  });

  ngOnInit(): void {
    const project = this.projectStore.currentProject();
    if (project) {
      this.loadPriorities(project.id);
      this.projectStore.loadMembers(project.id);
    }
  }

  private loadPriorities(projectId: string): void {
    this.isLoading.set(true);
    this.priorityService.getPriorities(projectId).subscribe({
      next: res => {
        this.priorities.set(res.data);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.messageService.add({ severity: 'error', summary: 'Lỗi', detail: 'Không thể tải danh sách mức ưu tiên.' });
      },
    });
  }

  startEdit(p: ProjectPriority): void {
    this.editingId.set(p.id);
    this.editDraft.set({ name: p.name, colorLight: p.colorLight, colorDark: p.colorDark, icon: p.icon });
  }

  cancelEdit(): void {
    this.editingId.set(null);
  }

  saveEdit(p: ProjectPriority): void {
    const project = this.projectStore.currentProject();
    if (!project) return;
    const draft = this.editDraft();
    this.priorityService.updatePriority(project.id, p.id, draft).subscribe({
      next: () => {
        this.editingId.set(null);
        this.loadPriorities(project.id);
        this.priorityConfigService.loadPriorities(project.id);
        this.messageService.add({ severity: 'success', summary: 'Đã lưu', detail: `Cập nhật "${draft.name}" thành công.` });
      },
      error: err => {
        this.messageService.add({ severity: 'error', summary: 'Lỗi', detail: err.error?.message || 'Không thể cập nhật.' });
      },
    });
  }

  openDeleteDialog(p: ProjectPriority): void {
    this.priorityToDelete.set(p);
    this.migrationTargets.set(this.priorities().filter(x => x.id !== p.id));
    this.selectedMigrateValue.set(null);
    this.displayDeleteDialog.set(true);
  }

  confirmDelete(): void {
    const project = this.projectStore.currentProject();
    const p = this.priorityToDelete();
    const migrateToValue = this.selectedMigrateValue();
    if (!project || !p || !migrateToValue) return;

    this.isDeleting.set(true);
    this.priorityService.deletePriority(project.id, p.id, { migrateToValue }).subscribe({
      next: () => {
        this.isDeleting.set(false);
        this.displayDeleteDialog.set(false);
        this.priorityToDelete.set(null);
        this.loadPriorities(project.id);
        this.priorityConfigService.loadPriorities(project.id);
        this.messageService.add({ severity: 'success', summary: 'Đã xóa', detail: 'Xóa và chuyển công việc thành công.' });
      },
      error: err => {
        this.isDeleting.set(false);
        this.messageService.add({ severity: 'error', summary: 'Lỗi', detail: err.error?.message || 'Không thể xóa.' });
      },
    });
  }

  submitAdd(): void {
    const project = this.projectStore.currentProject();
    if (!project) return;
    const draft = this.addDraft();
    if (!draft.name.trim() || !draft.value.trim()) return;

    this.priorityService.createPriority(project.id, {
      ...draft,
      value: draft.value.toLowerCase().replace(/\s+/g, '-'),
    }).subscribe({
      next: () => {
        this.showAddForm.set(false);
        this.addDraft.set({ name: '', value: '', colorLight: '#9CA3AF', colorDark: '#6B7280', icon: 'pi pi-flag' });
        this.loadPriorities(project.id);
        this.priorityConfigService.loadPriorities(project.id);
        this.messageService.add({ severity: 'success', summary: 'Thành công', detail: `Đã thêm "${draft.name}".` });
      },
      error: err => {
        this.messageService.add({ severity: 'error', summary: 'Lỗi', detail: err.error?.message || 'Không thể thêm.' });
      },
    });
  }

  onDragStart(id: string): void { this.draggedId = id; }
  onDragEnd(): void {
    setTimeout(() => { this.draggedId = null; this.hoveredId = null; }, 100);
  }

  onDrop(_event: CdkDragDrop<ProjectPriority[]>): void {
    if (this.isReadOnly()) return;
    const project = this.projectStore.currentProject();
    if (!project) return;

    const dragId = this.draggedId;
    const hoverId = this.hoveredId;
    this.draggedId = null;
    this.hoveredId = null;

    if (!dragId || !hoverId || dragId === hoverId) return;

    const list = [...this.priorities()];
    const fromIdx = list.findIndex(p => p.id === dragId);
    if (fromIdx === -1) return;
    const [dragged] = list.splice(fromIdx, 1);
    const toIdx = list.findIndex(p => p.id === hoverId);
    list.splice(toIdx === -1 ? list.length : toIdx, 0, dragged);

    this.priorities.set(list);

    this.priorityService.reorderPriorities(project.id, {
      items: list.map((p, i) => ({ priorityId: p.id, order: i + 1 })),
    }).subscribe({
      next: () => {
        this.loadPriorities(project.id);
        this.priorityConfigService.loadPriorities(project.id);
      },
      error: () => {
        this.loadPriorities(project.id);
        this.messageService.add({ severity: 'error', summary: 'Lỗi sắp xếp', detail: 'Không thể lưu thứ tự.' });
      },
    });
  }
}
```

**Step 2: Tạo HTML template**

Tham khảo layout từ design doc, dùng cùng Tailwind class pattern như `states-tab.component.html`.

```html
<!-- priorities-tab.component.html -->
<div class="space-y-6">
  <div class="flex justify-between items-center">
    <div>
      <h2 class="text-base font-bold text-gray-900 dark:text-surface-0">Mức ưu tiên</h2>
      <p class="text-xs text-gray-400 dark:text-surface-500 mt-0.5">Kéo để sắp xếp thứ tự hiển thị.</p>
    </div>
    @if (!isReadOnly()) {
      <button pButton type="button" icon="pi pi-plus" label="Thêm mức"
        class="p-button-outlined p-button-sm font-semibold text-xs py-1"
        (click)="showAddForm.set(true)">
      </button>
    }
  </div>

  <!-- Priority list -->
  <div cdkDropList (cdkDropListDropped)="onDrop($event)" class="space-y-1">
    @for (p of priorities(); track p.id) {
      <div
        cdkDrag
        [cdkDragDisabled]="isReadOnly() || !!editingId()"
        class="flex items-center gap-3 px-3 py-2 rounded-lg border border-gray-200 dark:border-surface-700 bg-white dark:bg-surface-900 group"
        [class.opacity-50]="draggedId === p.id"
        (cdkDragStarted)="onDragStart(p.id)"
        (cdkDragEnded)="onDragEnd()"
        (mouseenter)="hoveredId = p.id"
      >
        <!-- Drag handle -->
        @if (!isReadOnly()) {
          <i class="pi pi-bars text-gray-300 dark:text-surface-600 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity" cdkDragHandle></i>
        }
        @if (isReadOnly()) {
          <i class="pi pi-lock text-gray-300 dark:text-surface-600"></i>
        }

        @if (editingId() === p.id) {
          <!-- Inline edit row -->
          <div class="flex items-center gap-2 flex-1">
            <app-color-pair-picker
              [light]="editDraft().colorLight"
              [dark]="editDraft().colorDark"
              (lightChange)="editDraft.update(d => ({ ...d, colorLight: $event }))"
              (darkChange)="editDraft.update(d => ({ ...d, colorDark: $event }))"
            />
            <p-popover #iconPop>
              <app-icon-picker-panel
                [value]="editDraft().icon"
                (valueChange)="editDraft.update(d => ({ ...d, icon: $event })); iconPop.hide()"
              />
            </p-popover>
            <button type="button" class="w-8 h-8 flex items-center justify-center rounded border border-gray-200 dark:border-surface-600 hover:bg-gray-50 dark:hover:bg-surface-800"
              (click)="iconPop.toggle($event)">
              <i [class]="editDraft().icon" class="text-sm"></i>
            </button>
            <input pInputText type="text" class="flex-1 text-sm"
              [ngModel]="editDraft().name"
              (ngModelChange)="editDraft.update(d => ({ ...d, name: $event }))"
            />
          </div>
          <div class="flex gap-1">
            <button pButton type="button" icon="pi pi-check" class="p-button-text p-button-sm p-button-success" (click)="saveEdit(p)"></button>
            <button pButton type="button" icon="pi pi-times" class="p-button-text p-button-sm p-button-secondary" (click)="cancelEdit()"></button>
          </div>
        } @else {
          <!-- Display row -->
          <span class="w-4 h-4 rounded-full flex-shrink-0 border border-gray-200 dark:border-surface-600"
            [style.background-color]="p.colorLight"></span>
          <i [class]="p.icon" class="text-sm" [style.color]="p.colorLight"></i>
          <span class="flex-1 text-sm font-medium text-gray-800 dark:text-surface-100">{{ p.name }}</span>
          @if (p.isSystem) {
            <i class="pi pi-lock text-xs text-gray-400" pTooltip="Không thể xóa mục hệ thống"></i>
          }
          @if (!isReadOnly()) {
            <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button pButton type="button" icon="pi pi-pencil" class="p-button-text p-button-sm" (click)="startEdit(p)"></button>
              @if (!p.isSystem) {
                <button pButton type="button" icon="pi pi-trash" class="p-button-text p-button-sm p-button-danger" (click)="openDeleteDialog(p)"></button>
              }
            </div>
          }
        }
      </div>
    }
  </div>

  <!-- Add form -->
  @if (showAddForm()) {
    <div class="p-4 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950 space-y-3">
      <h3 class="text-sm font-semibold text-gray-700 dark:text-surface-200">Thêm mức ưu tiên mới</h3>
      <div class="flex items-center gap-3">
        <app-color-pair-picker
          [light]="addDraft().colorLight"
          [dark]="addDraft().colorDark"
          (lightChange)="addDraft.update(d => ({ ...d, colorLight: $event }))"
          (darkChange)="addDraft.update(d => ({ ...d, colorDark: $event }))"
        />
        <p-popover #addIconPop>
          <app-icon-picker-panel
            [value]="addDraft().icon"
            (valueChange)="addDraft.update(d => ({ ...d, icon: $event })); addIconPop.hide()"
          />
        </p-popover>
        <button type="button" class="w-8 h-8 flex items-center justify-center rounded border border-gray-200 dark:border-surface-600 hover:bg-gray-100 dark:hover:bg-surface-800"
          (click)="addIconPop.toggle($event)">
          <i [class]="addDraft().icon" class="text-sm"></i>
        </button>
        <input pInputText type="text" placeholder="Tên (vd: Critical)" class="flex-1 text-sm"
          [ngModel]="addDraft().name"
          (ngModelChange)="addDraft.update(d => ({ ...d, name: $event, value: $event.toLowerCase().replace(/\s+/g, '-') }))"
        />
        <input pInputText type="text" placeholder="Slug (vd: critical)" class="w-32 text-sm font-mono"
          [ngModel]="addDraft().value"
          (ngModelChange)="addDraft.update(d => ({ ...d, value: $event }))"
        />
      </div>
      <div class="flex gap-2 justify-end">
        <button pButton type="button" label="Hủy" class="p-button-text p-button-sm" (click)="showAddForm.set(false)"></button>
        <button pButton type="button" label="Thêm" class="p-button-sm" (click)="submitAdd()"></button>
      </div>
    </div>
  }
</div>

<!-- Delete dialog -->
<p-dialog
  header="Xóa mức ưu tiên"
  [(visible)]="displayDeleteDialog"
  [modal]="true"
  [style]="{ width: '420px' }"
>
  @if (priorityToDelete()) {
    <div class="space-y-4">
      <p class="text-sm text-gray-600 dark:text-surface-300">
        Công việc đang dùng mức <strong>{{ priorityToDelete()!.name }}</strong> sẽ được chuyển sang:
      </p>
      <p-select
        [options]="migrationTargets()"
        optionLabel="name"
        optionValue="value"
        placeholder="Chọn mức thay thế..."
        [ngModel]="selectedMigrateValue()"
        (ngModelChange)="selectedMigrateValue.set($event)"
        class="w-full"
      />
    </div>
  }
  <ng-template pTemplate="footer">
    <button pButton type="button" label="Hủy" class="p-button-text" (click)="displayDeleteDialog.set(false)"></button>
    <button pButton type="button" label="Xác nhận xóa" class="p-button-danger"
      [disabled]="!selectedMigrateValue()"
      [loading]="isDeleting()"
      (click)="confirmDelete()">
    </button>
  </ng-template>
</p-dialog>
```

**Step 3: Tạo CSS trống**

```css
/* priorities-tab.component.css */
```

**Step 4: Commit**

```bash
git add apps/frontend/src/app/projects/pages/project-settings/priorities-tab/
git commit -m "feat(frontend): add PrioritiesTabComponent with inline edit, DnD, delete+migrate"
```

---

## Task 16: Frontend — Route + Sidebar + ProjectStore

**Files:**
- Modify: `apps/frontend/src/main.ts`
- Modify: `apps/frontend/src/app/layout/app-shell/sidebar/sidebar.component.ts`
- Modify: `apps/frontend/src/app/projects/state/project.store.ts`

**Step 1: Thêm route `priorities` vào `main.ts`**

Trong mảng `children` của path `settings`, sau entry `estimates`, thêm:

```typescript
{
  path: 'priorities',
  loadComponent: () =>
    import('./app/projects/pages/project-settings/priorities-tab/priorities-tab.component').then(
      (m) => m.PrioritiesTabComponent
    ),
  title: 'Mức ưu tiên — Agile PM',
},
```

**Step 2: Thêm menu item vào `sidebar.component.ts`**

Trong mảng `settingsSubItems`, sau entry `estimates`:

```typescript
{ label: 'Mức ưu tiên', icon: 'pi-flag', route: ['priorities'], exact: false, danger: false },
```

**Step 3: Cập nhật `project.store.ts` để load priorities**

Thêm:
- `import { PriorityConfigService } from '../../../tasks/services/priority-config.service';`  
  (hoặc relative path đúng)
- Inject `priorityConfigService = inject(PriorityConfigService)` 
- Trong `loadProject()` callback `onSuccess`, thêm: `this.priorityConfigService.loadPriorities(data.id);`
- Trong `setCurrentProject()`, thêm: `if (project) this.priorityConfigService.loadPriorities(project.id);`

**Step 4: Build và kiểm tra**

```bash
npx nx build frontend --configuration=development 2>&1 | grep -i error | head -20
```

Expected: 0 errors.

**Step 5: Commit**

```bash
git add apps/frontend/src/main.ts \
  apps/frontend/src/app/layout/app-shell/sidebar/sidebar.component.ts \
  apps/frontend/src/app/projects/state/project.store.ts
git commit -m "feat(frontend): add priorities route, sidebar item, and auto-load in ProjectStore"
```

---

## Task 17: Kiểm tra end-to-end thủ công

**Step 1: Khởi động dev server**

```bash
npx nx serve backend &
npx nx serve frontend
```

**Step 2: Checklist thủ công**

- [ ] Vào Settings → Mức ưu tiên → hiển thị 5 mức mặc định
- [ ] Kéo thả đổi thứ tự → reload → thứ tự được giữ
- [ ] Click ✎ → inline edit form xuất hiện; thay đổi tên/màu/icon → Lưu → list cập nhật
- [ ] Click 🗑 trên mức không phải system → dialog xuất hiện, chọn thay thế → Xác nhận → mục biến mất
- [ ] Click ✎ trên "None" (isSystem) → chỉ có nút Lưu, không có nút 🗑
- [ ] Thêm mức mới → hiện trong danh sách
- [ ] Mở task → popover priority → hiển thị đúng màu/icon theo DB
- [ ] Không còn nút "Tùy chỉnh..." trong popover priority của task

**Step 3: Commit cuối nếu có fix nhỏ**

```bash
git add -p
git commit -m "fix(frontend): priority tab UI polish"
```

---

## Tóm tắt thứ tự thực hiện

```
Task 1  → shared-types (foundation)
Task 2  → migration (DB schema)
Task 3  → entity
Task 4  → DTOs
Task 5  → PriorityService
Task 6  → PriorityController
Task 7  → ProjectModule + seeding
Task 8  → data migration existing projects
Task 9  → frontend HTTP service
Task 10 → refactor PriorityConfigService
Task 11 → remove inline edit from task-detail-panel
Task 12 → ColorPickerPanelComponent
Task 13 → ColorPairPickerComponent
Task 14 → IconPickerPanelComponent
Task 15 → PrioritiesTabComponent
Task 16 → route + sidebar + store
Task 17 → E2E manual testing
```

> Task 1-8 là backend-only, có thể chạy song song với Task 9-14 (frontend utilities) nếu muốn tăng tốc.
