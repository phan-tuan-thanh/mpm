import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Module as ModuleEntity, ModuleScope } from '../entities/module.entity';
import { TaskModule } from '../entities/task-module.entity';
import { ModuleQueryService } from './module-query.service';
import { ModuleTaskService } from './module-task.service';
import type { CreateModuleDto, UpdateModuleDto, ModuleQueryDto, ModuleWithProgress } from './module.dto';

/**
 * Module Service — Facade điều phối CRUD modules và delegate sang sub-services
 *
 * Chịu trách nhiệm trực tiếp:
 * - create: tạo module mới (scope validation + name uniqueness)
 * - update: partial update module (scope + name validation)
 * - delete: xóa module (scope validation + count affected tasks)
 *
 * Delegate:
 * - findAllForProject / findAllForWorkspace → ModuleQueryService
 * - addTasks / removeTask → ModuleTaskService
 */
@Injectable()
export class ModuleService {
  constructor(
    @InjectRepository(ModuleEntity)
    private readonly moduleRepo: Repository<ModuleEntity>,
    @InjectRepository(TaskModule)
    private readonly taskModuleRepo: Repository<TaskModule>,
    private readonly queryService: ModuleQueryService,
    private readonly taskService: ModuleTaskService,
  ) {}

  // ─── Delegated Reads ──────────────────────────────────────────────────────────

  /** @see ModuleQueryService.findAllForProject */
  findAllForProject(
    projectId: string,
    workspaceId: string | null,
    query?: ModuleQueryDto,
  ): Promise<ModuleWithProgress[]> {
    return this.queryService.findAllForProject(projectId, workspaceId, query);
  }

  /** @see ModuleQueryService.findAllForWorkspace */
  findAllForWorkspace(workspaceId: string): Promise<ModuleEntity[]> {
    return this.queryService.findAllForWorkspace(workspaceId);
  }

  // ─── Delegated Task Assignment ────────────────────────────────────────────────

  /** @see ModuleTaskService.addTasks */
  addTasks(
    moduleId: string,
    taskIds: string[],
  ): Promise<{ added: number; alreadyExists: number }> {
    return this.taskService.addTasks(moduleId, taskIds);
  }

  /** @see ModuleTaskService.removeTask */
  removeTask(moduleId: string, taskId: string): Promise<void> {
    return this.taskService.removeTask(moduleId, taskId);
  }

  // ─── Core CRUD ────────────────────────────────────────────────────────────────

  /**
   * Tạo module mới
   * - scope='workspace': workspace_id required, project_id = NULL
   * - scope='project': project_id required, workspace_id required
   * Validate CHECK constraint scope và unique name
   */
  async create(
    scope: ModuleScope,
    workspaceId: string | null,
    projectId: string | null,
    userId: string,
    dto: CreateModuleDto,
  ): Promise<ModuleEntity> {
    // Validate scope consistency
    if (scope === 'workspace' && projectId) {
      throw new ConflictException('Workspace modules cannot have a project_id');
    }
    if (scope === 'project' && !projectId) {
      throw new ConflictException('Project modules require a project_id');
    }

    // Validate unique name trong cùng scope
    if (scope === 'workspace') {
      const existing = await this.moduleRepo.findOne({
        where: { scope: 'workspace', workspaceId: workspaceId!, name: dto.name },
      });
      if (existing) {
        throw new ConflictException({
          statusCode: 409,
          error: 'Conflict',
          message: `Module name "${dto.name}" already exists in this workspace`,
          errorCode: 'MODULE_NAME_EXISTS',
          timestamp: new Date().toISOString(),
        });
      }
    } else {
      const existing = await this.moduleRepo.findOne({
        where: { scope: 'project', projectId: projectId!, name: dto.name },
      });
      if (existing) {
        throw new ConflictException({
          statusCode: 409,
          error: 'Conflict',
          message: `Module name "${dto.name}" already exists in this project`,
          errorCode: 'MODULE_NAME_EXISTS',
          timestamp: new Date().toISOString(),
        });
      }
    }

    const module = this.moduleRepo.create({
      scope,
      workspaceId: workspaceId ?? null,
      projectId: scope === 'project' ? projectId : null,
      name: dto.name,
      description: dto.description ?? null,
      status: dto.status ?? 'backlog',
      startDate: dto.startDate ?? null,
      endDate: dto.endDate ?? null,
      createdBy: userId,
    });

    return this.moduleRepo.save(module);
  }

  /**
   * Partial update module
   * - Workspace module: chỉ Workspace Admin (systemRole='Admin') mới sửa
   * - Project module: SM/PO được sửa
   * Validate name uniqueness nếu thay đổi
   */
  async update(
    moduleId: string,
    userId: string,
    dto: UpdateModuleDto,
    opts: { userSystemRole: string },
  ): Promise<ModuleEntity> {
    const module = await this.moduleRepo.findOne({ where: { id: moduleId } });
    if (!module) {
      throw new NotFoundException({
        statusCode: 404,
        error: 'Not Found',
        message: 'Module not found',
        errorCode: 'MODULE_NOT_FOUND',
        timestamp: new Date().toISOString(),
      });
    }

    // Scope validation: workspace module chỉ Admin mới sửa
    if (module.scope === 'workspace' && opts.userSystemRole !== 'Admin') {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Only Workspace Admin can edit workspace modules',
        errorCode: 'INSUFFICIENT_ROLE',
        timestamp: new Date().toISOString(),
      });
    }

    // Validate name uniqueness nếu thay đổi
    if (dto.name && dto.name !== module.name) {
      if (module.scope === 'workspace') {
        const existing = await this.moduleRepo.findOne({
          where: { scope: 'workspace', workspaceId: module.workspaceId!, name: dto.name },
        });
        if (existing) {
          throw new ConflictException({
            statusCode: 409,
            error: 'Conflict',
            message: `Module name "${dto.name}" already exists in this workspace`,
            errorCode: 'MODULE_NAME_EXISTS',
            timestamp: new Date().toISOString(),
          });
        }
      } else {
        const existing = await this.moduleRepo.findOne({
          where: { scope: 'project', projectId: module.projectId!, name: dto.name },
        });
        if (existing) {
          throw new ConflictException({
            statusCode: 409,
            error: 'Conflict',
            message: `Module name "${dto.name}" already exists in this project`,
            errorCode: 'MODULE_NAME_EXISTS',
            timestamp: new Date().toISOString(),
          });
        }
      }
      module.name = dto.name;
    }

    if (dto.description !== undefined) module.description = dto.description;
    if (dto.status !== undefined) module.status = dto.status;
    if (dto.startDate !== undefined) module.startDate = dto.startDate;
    if (dto.endDate !== undefined) module.endDate = dto.endDate;

    return this.moduleRepo.save(module);
  }

  /**
   * Xóa module — CASCADE task_modules (FK ON DELETE CASCADE)
   * Workspace module: chỉ Admin mới xóa; Project module: SM/PO
   * Trả về số task bị ảnh hưởng (gỡ khỏi module)
   */
  async delete(
    moduleId: string,
    userId: string,
    opts: { userSystemRole: string },
  ): Promise<{ deletedModuleId: string; affectedTaskCount: number }> {
    const module = await this.moduleRepo.findOne({ where: { id: moduleId } });
    if (!module) {
      throw new NotFoundException({
        statusCode: 404,
        error: 'Not Found',
        message: 'Module not found',
        errorCode: 'MODULE_NOT_FOUND',
        timestamp: new Date().toISOString(),
      });
    }

    // Scope validation: workspace module chỉ Admin mới xóa
    if (module.scope === 'workspace' && opts.userSystemRole !== 'Admin') {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Only Workspace Admin can delete workspace modules',
        errorCode: 'INSUFFICIENT_ROLE',
        timestamp: new Date().toISOString(),
      });
    }

    // Tính affectedTaskCount trước khi xóa
    const affectedTaskCount = await this.taskModuleRepo.count({
      where: { moduleId },
    });

    // Xóa module — task_modules sẽ cascade delete (FK ON DELETE CASCADE)
    await this.moduleRepo.remove(module);

    return { deletedModuleId: moduleId, affectedTaskCount };
  }
}
