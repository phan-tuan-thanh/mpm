import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { CurrentUser, RequestUser } from '../../auth/decorators/current-user.decorator';
import { ProjectRoles } from '../../auth/decorators/project-roles.decorator';
import { CommentService } from './comment.service';
import { CreateCommentDto, UpdateCommentDto } from '@mpm/shared-types';

@Controller('api/projects/:projectId/tasks/:taskId/comments')
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @Get()
  @ProjectRoles('Scrum_Master', 'Product_Owner', 'Developer', 'QA', 'Stakeholder')
  async findAll(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
  ) {
    return this.commentService.getComments(projectId, taskId);
  }

  @Post()
  @ProjectRoles('Scrum_Master', 'Product_Owner', 'Developer', 'QA', 'Stakeholder')
  async create(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @CurrentUser() user: RequestUser,
    @Body() body: CreateCommentDto,
  ) {
    return this.commentService.create(
      projectId,
      taskId,
      user.id,
      body.content,
      body.parentId
    );
  }

  @Patch(':commentId')
  @ProjectRoles('Scrum_Master', 'Product_Owner', 'Developer', 'QA', 'Stakeholder')
  async update(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @CurrentUser() user: RequestUser,
    @Body() body: UpdateCommentDto,
  ) {
    return this.commentService.update(projectId, taskId, commentId, user.id, body.content);
  }

  @Delete(':commentId')
  @ProjectRoles('Scrum_Master', 'Product_Owner', 'Developer', 'QA', 'Stakeholder')
  async delete(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @CurrentUser() user: RequestUser,
  ) {
    const callerRole = user.systemRole === 'Admin'
      ? 'Admin'
      : user.projectRoles?.find((r) => r.projectId === projectId)?.role;
    await this.commentService.delete(projectId, taskId, commentId, user.id, callerRole);
    return { ok: true };
  }

  @Put(':commentId/reactions/:emoji')
  @ProjectRoles('Scrum_Master', 'Product_Owner', 'Developer', 'QA', 'Stakeholder')
  async addReaction(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @Param('emoji') emoji: string,
    @CurrentUser() user: RequestUser,
  ) {
    await this.commentService.addReaction(projectId, taskId, commentId, user.id, emoji);
    return { ok: true };
  }

  @Delete(':commentId/reactions/:emoji')
  @ProjectRoles('Scrum_Master', 'Product_Owner', 'Developer', 'QA', 'Stakeholder')
  async removeReaction(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @Param('emoji') emoji: string,
    @CurrentUser() user: RequestUser,
  ) {
    await this.commentService.removeReaction(projectId, taskId, commentId, user.id, emoji);
    return { ok: true };
  }
}
