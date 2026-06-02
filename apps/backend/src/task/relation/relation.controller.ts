import {
  Body,
  Controller,
  Delete,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { CurrentUser, RequestUser } from '../../auth/decorators/current-user.decorator';
import { ProjectRoles } from '../../auth/decorators/project-roles.decorator';
import { RelationService } from './relation.service';
import type { TaskRelationType } from '../entities/task-relation.entity';

@Controller('api/projects/:projectId/tasks/:taskId/relations')
export class RelationController {
  constructor(private readonly relationService: RelationService) {}

  @Post()
  @ProjectRoles('Scrum_Master', 'Product_Owner', 'Developer', 'QA')
  async create(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @CurrentUser() user: RequestUser,
    @Body() body: { targetTaskId: string; relationType: TaskRelationType },
  ) {
    return this.relationService.create(taskId, user.id, projectId, body);
  }

  @Delete(':relationId')
  @ProjectRoles('Scrum_Master', 'Product_Owner', 'Developer', 'QA')
  async delete(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Param('relationId', ParseUUIDPipe) relationId: string,
    @CurrentUser() user: RequestUser,
  ) {
    await this.relationService.delete(relationId, taskId, user.id);
    return { ok: true };
  }
}
