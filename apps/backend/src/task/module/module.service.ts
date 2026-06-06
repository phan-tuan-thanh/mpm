import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Module as ModuleEntity, ModuleScope } from '../entities/module.entity';
import { TaskModule } from '../entities/task-module.entity';
import { ModuleQueryService } from './module-query.service';
import { ModuleTaskService } from './module-task.service';
import type { CreateModuleDto, UpdateModuleDto, ModuleQueryDto, ModuleWithProgress } from './module.dto';
import { createModule } from './module-create.utils';
import { updateModule } from './module-update.utils';
import { deleteModule } from './module-delete.utils';

/**
 * Module Service — Facade điều phối CRUD modules và delegate sang sub-services
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
   */
  async create(
    scope: ModuleScope,
    workspaceId: string | null,
    projectId: string | null,
    userId: string,
    dto: CreateModuleDto,
  ): Promise<ModuleEntity> {
    return createModule(this.moduleRepo, scope, workspaceId, projectId, userId, dto);
  }

  /**
   * Partial update module
   */
  async update(
    moduleId: string,
    userId: string,
    dto: UpdateModuleDto,
    opts: { userSystemRole: string },
  ): Promise<ModuleEntity> {
    return updateModule(this.moduleRepo, moduleId, dto, opts);
  }

  /**
   * Xóa module — CASCADE task_modules (FK ON DELETE CASCADE)
   */
  async delete(
    moduleId: string,
    userId: string,
    opts: { userSystemRole: string },
  ): Promise<{ deletedModuleId: string; affectedTaskCount: number }> {
    return deleteModule(this.moduleRepo, this.taskModuleRepo, moduleId, opts);
  }
}
