import {
  Body,
  Controller,
  Delete,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { CurrentUser, RequestUser } from '../auth/decorators/current-user.decorator';
import { ProjectRoles } from '../auth/decorators/project-roles.decorator';
import { TaskService } from './task.service';
import type { TaskType, TaskPriority } from './entities/task.entity';

@Controller('api/projects/:projectId/tasks')
export class TaskController {
  constructor(
    private readonly taskService: TaskService,
  ) {}

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
}
