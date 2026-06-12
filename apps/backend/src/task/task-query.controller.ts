import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ProjectRoles } from '../auth/decorators/project-roles.decorator';
import { TaskService } from './task.service';
import { ActivityService } from './activity/activity.service';
import { GetActivityQueryDto } from './activity/dto/get-activity.dto';
import type { TaskType, TaskPriority } from './entities/task.entity';

@Controller('api/projects/:projectId/tasks')
export class TaskQueryController {
  constructor(
    private readonly taskService: TaskService,
    private readonly activityService: ActivityService,
  ) {}

  @Get()
  @ProjectRoles('Scrum_Master', 'Product_Owner', 'Developer', 'QA', 'Stakeholder')
  async findAll(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query('types') types?: string,
    @Query('stateIds') stateIds?: string,
    @Query('priorities') priorities?: string,
    @Query('assigneeIds') assigneeIds?: string,
    @Query('labelIds') labelIds?: string,
    @Query('moduleIds') moduleIds?: string,
    @Query('search') search?: string,
    @Query('groupBy') groupBy?: string,
    @Query('orderBy') orderBy?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('parentId') parentId?: string,
    @Query('sprintId') sprintId?: string,
  ) {
    return this.taskService.findAll(projectId, {
      types: types?.split(',') as TaskType[] | undefined,
      stateIds: stateIds?.split(','),
      priorities: priorities?.split(',') as TaskPriority[] | undefined,
      assigneeIds: assigneeIds?.split(','),
      labelIds: labelIds?.split(','),
      moduleIds: moduleIds?.split(','),
      search,
      groupBy,
      orderBy,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      parentId: parentId === 'null' ? null : parentId,
      sprintId,
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

  @Get(':taskId/children')
  @ProjectRoles('Scrum_Master', 'Product_Owner', 'Developer', 'QA', 'Stakeholder')
  async getChildren(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Query('depth') depthParam?: string,
  ) {
    const depth = depthParam ? Math.min(Math.max(parseInt(depthParam, 10) || 5, 1), 5) : 5;
    return this.taskService.getChildrenTree(projectId, taskId, depth);
  }

  @Get(':taskId/activity')
  @ProjectRoles('Scrum_Master', 'Product_Owner', 'Developer', 'QA', 'Stakeholder')
  async getActivity(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Query() query: GetActivityQueryDto,
  ) {
    return this.activityService.getFilteredActivity(
      taskId,
      query.type,
      query.page,
      query.limit,
    );
  }
}
