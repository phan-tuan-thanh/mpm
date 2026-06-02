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
import { CurrentUser, RequestUser } from '../auth/decorators/current-user.decorator';
import { ProjectRoles } from '../auth/decorators/project-roles.decorator';
import { TaskService } from './task.service';
import { ActivityService } from './activity/activity.service';
import { LabelService } from './label/label.service';
import type { TaskType, TaskPriority } from './entities/task.entity';

@Controller('api/projects/:projectId/tasks')
export class TaskController {
  constructor(
    private readonly taskService: TaskService,
    private readonly activityService: ActivityService,
    private readonly labelService: LabelService,
  ) {}

  // ─── Tasks ───────────────────────────────────────────────────────────────

  @Post()
  @ProjectRoles('Scrum_Master', 'Product_Owner', 'Developer', 'QA')
  async create(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: RequestUser,
    @Body() body: {
      title: string;
      type?: TaskType;
      priority?: TaskPriority;
      description?: string;
      stateId?: string;
      assigneeIds?: string[];
      labelIds?: string[];
      estimateValue?: number;
      startDate?: string;
      dueDate?: string;
      parentId?: string;
    },
  ) {
    return this.taskService.create(projectId, user.id, body);
  }

  @Get()
  @ProjectRoles('Scrum_Master', 'Product_Owner', 'Developer', 'QA', 'Stakeholder')
  async findAll(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query('types') types?: string,
    @Query('stateIds') stateIds?: string,
    @Query('priorities') priorities?: string,
    @Query('assigneeIds') assigneeIds?: string,
    @Query('labelIds') labelIds?: string,
    @Query('search') search?: string,
    @Query('groupBy') groupBy?: string,
    @Query('orderBy') orderBy?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('parentId') parentId?: string,
  ) {
    return this.taskService.findAll(projectId, {
      types: types?.split(',') as TaskType[] | undefined,
      stateIds: stateIds?.split(','),
      priorities: priorities?.split(',') as TaskPriority[] | undefined,
      assigneeIds: assigneeIds?.split(','),
      labelIds: labelIds?.split(','),
      search,
      groupBy,
      orderBy,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      parentId: parentId === 'null' ? null : parentId,
    });
  }

  @Get('search')
  @ProjectRoles('Scrum_Master', 'Product_Owner', 'Developer', 'QA', 'Stakeholder')
  async search(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query('q') query: string,
  ) {
    return this.taskService.search(projectId, query ?? '');
  }

  @Get(':taskId')
  @ProjectRoles('Scrum_Master', 'Product_Owner', 'Developer', 'QA', 'Stakeholder')
  async findById(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('taskId') taskId: string,
  ) {
    return this.taskService.findById(projectId, taskId);
  }

  @Patch('reorder')
  @ProjectRoles('Scrum_Master', 'Product_Owner')
  async reorder(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: RequestUser,
    @Body() body: { items: Array<{ taskId: string; backlogOrder: number }> },
  ) {
    await this.taskService.reorder(projectId, body.items, user.id);
    return { ok: true };
  }

  @Patch(':taskId')
  @ProjectRoles('Scrum_Master', 'Product_Owner', 'Developer', 'QA')
  async update(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @CurrentUser() user: RequestUser,
    @Body() body: Record<string, unknown>,
  ) {
    return this.taskService.update(projectId, taskId, user.id, body as any);
  }

  @Delete()
  @ProjectRoles('Scrum_Master', 'Product_Owner')
  async bulkDelete(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: RequestUser,
    @Body() body: { taskIds: string[] },
  ) {
    return this.taskService.bulkDelete(projectId, body.taskIds, user.id);
  }

  @Delete(':taskId')
  @ProjectRoles('Scrum_Master', 'Product_Owner')
  async delete(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @CurrentUser() user: RequestUser,
  ) {
    await this.taskService.delete(projectId, taskId, user.id);
    return { ok: true };
  }

  // ─── Activity / Comments ──────────────────────────────────────────────

  @Get(':taskId/activity')
  @ProjectRoles('Scrum_Master', 'Product_Owner', 'Developer', 'QA', 'Stakeholder')
  async getActivity(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.activityService.getTimeline(
      taskId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  // ─── Labels ───────────────────────────────────────────────────────────

  @Get('/labels')
  @ProjectRoles('Scrum_Master', 'Product_Owner', 'Developer', 'QA', 'Stakeholder')
  async getLabels(@Param('projectId', ParseUUIDPipe) projectId: string) {
    return this.labelService.findAll(projectId);
  }

  @Post('/labels')
  @ProjectRoles('Scrum_Master', 'Product_Owner')
  async createLabel(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: RequestUser,
    @Body() body: { name: string; color: string },
  ) {
    return this.labelService.create(projectId, user.id, body);
  }

  @Patch('/labels/:labelId')
  @ProjectRoles('Scrum_Master', 'Product_Owner')
  async updateLabel(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('labelId', ParseUUIDPipe) labelId: string,
    @Body() body: { name?: string; color?: string },
  ) {
    return this.labelService.update(labelId, projectId, body);
  }

  @Delete('/labels/:labelId')
  @ProjectRoles('Scrum_Master', 'Product_Owner')
  async deleteLabel(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('labelId', ParseUUIDPipe) labelId: string,
    @CurrentUser() user: RequestUser,
  ) {
    await this.labelService.delete(labelId, projectId, user.id);
    return { ok: true };
  }
}
