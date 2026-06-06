import {
  Body,
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
import { Repository } from 'typeorm';
import { CurrentUser, RequestUser } from '../../auth/decorators/current-user.decorator';
import { ProjectRoles } from '../../auth/decorators/project-roles.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Project } from '../../project/entities/project.entity';
import { ModuleService } from './module.service';
import type { CreateModuleDto, UpdateModuleDto, ModuleQueryDto } from './module.dto';

// ─── Project-Scoped Module Controller ───────────────────────────────────────

/**
 * Module Controller — Project-scoped routes
 *
 * CRUD cho modules tại project level + task assignment.
 * - GET: any project member (all roles)
 * - POST/PATCH/DELETE + task assignment: Scrum_Master hoặc Product_Owner
 * workspaceId được resolve từ Project entity để merge workspace modules.
 */
@Controller('api/projects/:projectId/modules')
export class ModuleController {
  constructor(
    private readonly moduleService: ModuleService,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
  ) {}

  /**
   * Resolve workspaceId từ project entity
   */
  private async resolveWorkspaceId(projectId: string): Promise<string> {
    const project = await this.projectRepo.findOne({
      where: { id: projectId },
      select: ['id', 'workspaceId'],
    });
    return project?.workspaceId ?? '';
  }

  /**
   * GET /api/projects/:projectId/modules
   * Trả về merged list: workspace modules + project modules, kèm progress
   */
  @Get()
  @ProjectRoles('Scrum_Master', 'Product_Owner', 'Developer', 'QA', 'Stakeholder')
  async findAll(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query('status') status?: string,
    @Query('scope') scope?: string,
  ) {
    const workspaceId = await this.resolveWorkspaceId(projectId);
    const query: ModuleQueryDto = {};
    if (status) query.status = status as ModuleQueryDto['status'];
    if (scope) query.scope = scope as ModuleQueryDto['scope'];
    return this.moduleService.findAllForProject(projectId, workspaceId, query);
  }

  /**
   * POST /api/projects/:projectId/modules
   * Tạo project-scoped module mới
   */
  @Post()
  @ProjectRoles('Scrum_Master', 'Product_Owner')
  async create(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateModuleDto,
  ) {
    const workspaceId = await this.resolveWorkspaceId(projectId);
    return this.moduleService.create('project', workspaceId, projectId, user.id, dto);
  }

  /**
   * PATCH /api/projects/:projectId/modules/:moduleId
   * Partial update module — SM/PO cho project module; Admin cho workspace module
   */
  @Patch(':moduleId')
  @ProjectRoles('Scrum_Master', 'Product_Owner')
  async update(
    @Param('projectId', ParseUUIDPipe) _projectId: string,
    @Param('moduleId', ParseUUIDPipe) moduleId: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateModuleDto,
  ) {
    return this.moduleService.update(moduleId, user.id, dto, {
      userSystemRole: user.systemRole,
    });
  }

  /**
   * DELETE /api/projects/:projectId/modules/:moduleId
   * Xóa module — cascade task_modules; trả về { deletedModuleId, affectedTaskCount }
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
   * Batch gán tasks vào module — body { taskIds: string[] }
   * Trả về { added, alreadyExists }
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
   * Gỡ task khỏi module
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

/**
 * Workspace Module Controller
 *
 * CRUD cho workspace-scoped modules.
 * Tất cả routes yêu cầu System Role = Admin (Workspace Admin).
 */
@Controller('api/workspaces/:workspaceId/modules')
@Roles('Admin')
export class WorkspaceModuleController {
  constructor(private readonly moduleService: ModuleService) {}

  /**
   * GET /api/workspaces/:workspaceId/modules
   * Trả về tất cả workspace-scoped modules
   */
  @Get()
  async findAll(@Param('workspaceId', ParseUUIDPipe) workspaceId: string) {
    return this.moduleService.findAllForWorkspace(workspaceId);
  }

  /**
   * POST /api/workspaces/:workspaceId/modules
   * Tạo workspace-scoped module mới
   */
  @Post()
  async create(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateModuleDto,
  ) {
    return this.moduleService.create('workspace', workspaceId, null, user.id, dto);
  }

  /**
   * PATCH /api/workspaces/:workspaceId/modules/:moduleId
   * Cập nhật workspace module
   */
  @Patch(':moduleId')
  async update(
    @Param('workspaceId', ParseUUIDPipe) _workspaceId: string,
    @Param('moduleId', ParseUUIDPipe) moduleId: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateModuleDto,
  ) {
    return this.moduleService.update(moduleId, user.id, dto, {
      userSystemRole: user.systemRole,
    });
  }

  /**
   * DELETE /api/workspaces/:workspaceId/modules/:moduleId
   * Xóa workspace module — cascade task_modules
   * Trả về { deletedModuleId, affectedTaskCount }
   */
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
