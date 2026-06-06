import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Module as ModuleEntity, ModuleScope, ModuleStatusType } from '../entities/module.entity';
import { TaskModule } from '../entities/task-module.entity';
import type { ModuleQueryDto, CreateModuleDto, UpdateModuleDto, ModuleWithProgress } from './module.dto';

@Injectable()
export class ModuleService {
  constructor(
    @InjectRepository(ModuleEntity)
    private readonly moduleRepo: Repository<ModuleEntity>,
    @InjectRepository(TaskModule)
    private readonly taskModuleRepo: Repository<TaskModule>,
  ) {}

  /**
   * Trả về merged list: workspace modules + project modules
   * Progress computed tại query time bằng JOIN project_states.group = 'completed'
   * Sorted: scope ASC (workspace trước), sau đó end_date ASC
   */
  async findAllForProject(
    projectId: string,
    workspaceId: string,
    query?: ModuleQueryDto,
  ): Promise<ModuleWithProgress[]> {
    const qb = this.moduleRepo
      .createQueryBuilder('m')
      .leftJoin('task_modules', 'tm', 'tm.module_id = m.id')
      .leftJoin(
        'tasks',
        't',
        't.id = tm.task_id AND t.project_id = :pid',
        { pid: projectId },
      )
      .leftJoin(
        'project_states',
        'ps',
        'ps.id = t.state_id',
      )
      .select('m.*')
      .addSelect('COUNT(t.id)', 'taskCount')
      .addSelect(
        `COUNT(t.id) FILTER (WHERE ps."group" = 'completed')`,
        'completedCount',
      );

    // Scope filter
    if (query?.scope === 'workspace') {
      qb.where('m.scope = :ws AND m.workspace_id = :wid', {
        ws: 'workspace',
        wid: workspaceId,
      });
    } else if (query?.scope === 'project') {
      qb.where('m.scope = :proj AND m.project_id = :pid2', {
        proj: 'project',
        pid2: projectId,
      });
    } else {
      // Default: merged list (workspace + project)
      qb.where(
        '(m.scope = :ws AND m.workspace_id = :wid) OR (m.scope = :proj AND m.project_id = :pid2)',
        {
          ws: 'workspace',
          wid: workspaceId,
          proj: 'project',
          pid2: projectId,
        },
      );
    }

    // Optional status filter
    if (query?.status) {
      qb.andWhere('m.status = :status', { status: query.status });
    }

    qb.groupBy('m.id')
      .orderBy('m.scope', 'ASC')
      .addOrderBy('m.end_date', 'ASC');

    const rows = await qb.getRawMany();

    return rows.map((r) => ({
      id: r.id,
      scope: r.scope,
      workspaceId: r.workspace_id,
      projectId: r.project_id,
      name: r.name,
      description: r.description,
      status: r.status,
      startDate: r.start_date,
      endDate: r.end_date,
      createdBy: r.created_by,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      taskCount: parseInt(r.taskCount ?? '0', 10),
      completedCount: parseInt(r.completedCount ?? '0', 10),
      progress:
        parseInt(r.taskCount ?? '0', 10) > 0
          ? Math.round(
              (parseInt(r.completedCount ?? '0', 10) /
                parseInt(r.taskCount ?? '0', 10)) *
                100,
            )
          : 0,
    }));
  }

  /**
   * Trả về chỉ workspace-scoped modules (cho workspace admin management)
   * Sorted theo name ASC
   */
  async findAllForWorkspace(workspaceId: string): Promise<ModuleEntity[]> {
    return this.moduleRepo.find({
      where: { scope: 'workspace' as ModuleScope, workspaceId },
      order: { name: 'ASC' },
    });
  }

  /**
   * Tạo module mới
   * - scope='workspace': workspace_id required, project_id = NULL
   * - scope='project': project_id required, workspace_id required
   * Validate CHECK constraint scope và unique name
   */
  async create(
    scope: ModuleScope,
    workspaceId: string,
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
        where: { scope: 'workspace', workspaceId, name: dto.name },
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
      workspaceId,
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
          where: { scope: 'workspace', workspaceId: module.workspaceId, name: dto.name },
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

  /**
   * Batch gán tasks vào module — idempotent (ON CONFLICT DO NOTHING)
   * Trả về số tasks thực sự thêm mới và số đã tồn tại
   */
  async addTasks(
    moduleId: string,
    taskIds: string[],
  ): Promise<{ added: number; alreadyExists: number }> {
    // Verify module tồn tại
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

    if (!taskIds.length) {
      return { added: 0, alreadyExists: 0 };
    }

    // Batch INSERT với ON CONFLICT DO NOTHING (idempotent)
    const result = await this.taskModuleRepo
      .createQueryBuilder()
      .insert()
      .into(TaskModule)
      .values(
        taskIds.map((taskId) => ({
          taskId,
          moduleId,
        })),
      )
      .orIgnore() // ON CONFLICT DO NOTHING
      .execute();

    const added = result.identifiers.length;
    const alreadyExists = taskIds.length - added;

    return { added, alreadyExists };
  }

  /**
   * Gỡ một task khỏi module
   */
  async removeTask(moduleId: string, taskId: string): Promise<void> {
    const taskModule = await this.taskModuleRepo.findOne({
      where: { moduleId, taskId },
    });

    if (!taskModule) {
      throw new NotFoundException({
        statusCode: 404,
        error: 'Not Found',
        message: 'Task is not assigned to this module',
        errorCode: 'TASK_MODULE_NOT_FOUND',
        timestamp: new Date().toISOString(),
      });
    }

    await this.taskModuleRepo.remove(taskModule);
  }
}
