import {
  Body,
  Controller,
  Delete,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { CurrentUser, RequestUser } from '../../auth/decorators/current-user.decorator';
import { ProjectRoles } from '../../auth/decorators/project-roles.decorator';
import { ActivityService } from '../activity/activity.service';

@Controller('api/projects/:projectId/tasks/:taskId/comments')
export class CommentController {
  constructor(private readonly activityService: ActivityService) {}

  @Post()
  @ProjectRoles('Scrum_Master', 'Product_Owner', 'Developer', 'QA', 'Stakeholder')
  async create(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @CurrentUser() user: RequestUser,
    @Body() body: { content: string },
  ) {
    return this.activityService.addComment(taskId, user.id, body.content);
  }

  @Patch(':commentId')
  @ProjectRoles('Scrum_Master', 'Product_Owner', 'Developer', 'QA', 'Stakeholder')
  async update(
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @CurrentUser() user: RequestUser,
    @Body() body: { content: string },
  ) {
    return this.activityService.editComment(commentId, user.id, body.content);
  }

  @Delete(':commentId')
  @ProjectRoles('Scrum_Master', 'Product_Owner', 'Developer', 'QA', 'Stakeholder')
  async delete(
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @CurrentUser() user: RequestUser,
  ) {
    await this.activityService.deleteComment(commentId, user.id);
    return { ok: true };
  }
}
