import {
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, OptimisticLockVersionMismatchError } from 'typeorm';
import { CurrentUser, RequestUser } from '../../auth/decorators/current-user.decorator';
import { ProjectRoles } from '../../auth/decorators/project-roles.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Project } from '../../project/entities/project.entity';
import { ModuleService } from './module.service';
import { MODULE_LIFECYCLE_STATUSES, type ModuleLifecycleStatus } from '@mpm/shared-types';
import { InvalidStatusValueException } from './module-lifecycle.exceptions';
import type { CreateModuleDto, UpdateModuleDto, ModuleQueryDto } from './module.dto';

// ─── Project-Scoped Module Controller ───────────────────────────────────────

/**
 * Module Controller — Project-scoped routes
 *
 * POST: status bị ignore — luôn là 'planning'
 * PATCH: nếu body có status → dùng lifecycleService.transition(); 409 nếu OptimisticLock
 * GET: hỗ trợ ?status=active,maintenance (multi-value)
 * Tất cả responses bao gồm allowedTransitions
 */
@Controller('api/projects/:projectId/modules')
export class ModuleController {
  constructor(
    private readonly moduleService: ModuleService,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
  ) {}

  private async resolveWorkspaceId(projectId: string): Promise<string | null> {
    const project = await this.projectRepo.findOne({
      where: { id: projectId },
      select: ['id', 'workspaceId'],
    });
    return project?.workspaceId ?? null;
  }

  /**
   * GET /api/projects/:projectId/modules
   * ?status=active,maintenance — multi-value filter
   */
  @Get()
  @ProjectRoles('Scrum_Master', 'Product_Owner', 'Developer', 'QA', 'Stakeholder')
  async findAll(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query('status') statusParam?: string,
    @Query('scope') scope?: string,
  ) {
    const workspaceId = await this.resolveWorkspaceId(projectId);
    const query: ModuleQueryDto = {};

    if (statusParam) {
      const statuses = statusParam.split(',').map((s) => s.trim()) as ModuleLifecycleStatus[];
      // Validate all status values
      for (const s of statuses) {
        if (!(MODULE_LIFECYCLE_STATUSES as readonly string[]).includes(s)) {
          throw new InvalidStatusValueException(s);
        }
      }
      query.status = statuses.length === 1 ? statuses[0] : statuses;
    }

    if (scope) query.scope = scope as ModuleQueryDto['scope'];
    return this.moduleService.findAllForProject(projectId, workspaceId, query);
  }

  /**
   * POST /api/projects/:projectId/modules
   * status bị ignore — luôn là 'planning'
   */
  @Post()
  @ProjectRoles('Scrum_Master', 'Product_Owner')
  async create(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateModuleDto,
  ) {
    if (dto.status && !(MODULE_LIFECYCLE_STATUSES as readonly string[]).includes(dto.status)) {
      throw new InvalidStatusValueException(dto.status);
    }
    const workspaceId = await this.resolveWorkspaceId(projectId);
    return this.moduleService.create('project', workspaceId, projectId, user.id, dto);
  }

  /**
   * PATCH /api/projects/:projectId/modules/:moduleId
   * status → lifecycleService.transition(); OptimisticLockVersionMismatchError → 409
   */
  @Patch(':moduleId')
  @ProjectRoles('Scrum_Master', 'Product_Owner')
  async update(
    @Param('projectId', ParseUUIDPipe) _projectId: string,
    @Param('moduleId', ParseUUIDPipe) moduleId: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateModuleDto,
  ) {
    // If status is being changed, route through lifecycle service
    if (dto.status !== undefined) {
      const targetStatus = dto.status;
      if (!(MODULE_LIFECYCLE_STATUSES as readonly string[]).includes(targetStatus)) {
        throw new InvalidStatusValueException(targetStatus);
      }

      try {
        const result = await this.moduleService.lifecycleService.transition(
          moduleId,
          targetStatus,
          user.id,
        );
        // If there are other fields to update, apply them too
        const { status: _s, ...nonStatusDto } = dto;
        const hasOtherFields = Object.keys(nonStatusDto).some(
          (k) => (nonStatusDto as any)[k] !== undefined,
        );
        if (hasOtherFields) {
          return this.moduleService.update(moduleId, user.id, nonStatusDto, {
            userSystemRole: user.systemRole,
          });
        }
        return result;
      } catch (err) {
        if (err instanceof OptimisticLockVersionMismatchError) {
          throw new ConflictException({
            errorCode: 'CONCURRENT_MODIFICATION',
            message: 'Module was modified by another request. Please refresh and try again.',
          });
        }
        throw err;
      }
    }

    return this.moduleService.update(moduleId, user.id, dto, {
      userSystemRole: user.systemRole,
    });
  }

  /**
   * DELETE /api/projects/:projectId/modules/:moduleId
   */
  @Delete(':moduleId')
  @ProjectRoles('Scrum_Master', 'Product_Owner')
  async delete(
    @Param('projectId', ParseUUIDPipe) _projectId: string,
    @Param('moduleId', ParseUUIDPipe) moduleId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.moduleService.delete(moduleId, user.id, {
      userSystemRole: user.systemRole,
    });
  }

  /**
   * POST /api/projects/:projectId/modules/:moduleId/tasks
   */
  @Post(':moduleId/tasks')
  @ProjectRoles('Scrum_Master', 'Product_Owner')
  async addTasks(
    @Param('projectId', ParseUUIDPipe) _projectId: string,
    @Param('moduleId', ParseUUIDPipe) moduleId: string,
    @Body() body: { taskIds: string[] },
  ) {
    return this.moduleService.addTasks(moduleId, body.taskIds ?? []);
  }

  /**
   * DELETE /api/projects/:projectId/modules/:moduleId/tasks/:taskId
   */
  @Delete(':moduleId/tasks/:taskId')
  @ProjectRoles('Scrum_Master', 'Product_Owner')
  async removeTask(
    @Param('projectId', ParseUUIDPipe) _projectId: string,
    @Param('moduleId', ParseUUIDPipe) moduleId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
  ) {
    await this.moduleService.removeTask(moduleId, taskId);
  }
}

// ─── Workspace-Scoped Module Controller ─────────────────────────────────────

@Controller('api/workspaces/:workspaceId/modules')
@Roles('Admin')
export class WorkspaceModuleController {
  constructor(private readonly moduleService: ModuleService) {}

  @Get()
  async findAll(@Param('workspaceId', ParseUUIDPipe) workspaceId: string) {
    return this.moduleService.findAllForWorkspace(workspaceId);
  }

  @Post()
  async create(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateModuleDto,
  ) {
    if (dto.status && !(MODULE_LIFECYCLE_STATUSES as readonly string[]).includes(dto.status)) {
      throw new InvalidStatusValueException(dto.status);
    }
    return this.moduleService.create('workspace', workspaceId, null, user.id, dto);
  }

  @Patch(':moduleId')
  async update(
    @Param('workspaceId', ParseUUIDPipe) _workspaceId: string,
    @Param('moduleId', ParseUUIDPipe) moduleId: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateModuleDto,
  ) {
    if (dto.status !== undefined) {
      const targetStatus = dto.status;
      if (!(MODULE_LIFECYCLE_STATUSES as readonly string[]).includes(targetStatus)) {
        throw new InvalidStatusValueException(targetStatus);
      }

      try {
        const result = await this.moduleService.lifecycleService.transition(
          moduleId,
          targetStatus,
          user.id,
        );
        const { status: _s, ...nonStatusDto } = dto;
        const hasOtherFields = Object.keys(nonStatusDto).some(
          (k) => (nonStatusDto as any)[k] !== undefined,
        );
        if (hasOtherFields) {
          return this.moduleService.update(moduleId, user.id, nonStatusDto, {
            userSystemRole: user.systemRole,
          });
        }
        return result;
      } catch (err) {
        if (err instanceof OptimisticLockVersionMismatchError) {
          throw new ConflictException({
            errorCode: 'CONCURRENT_MODIFICATION',
            message: 'Module was modified by another request. Please refresh and try again.',
          });
        }
        throw err;
      }
    }

    return this.moduleService.update(moduleId, user.id, dto, {
      userSystemRole: user.systemRole,
    });
  }

  @Delete(':moduleId')
  async delete(
    @Param('workspaceId', ParseUUIDPipe) _workspaceId: string,
    @Param('moduleId', ParseUUIDPipe) moduleId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.moduleService.delete(moduleId, user.id, {
      userSystemRole: user.systemRole,
    });
  }
}
