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
import { LinkService } from './link.service';

@Controller('api/projects/:projectId/tasks/:taskId/links')
export class LinkController {
  constructor(private readonly linkService: LinkService) {}

  @Post()
  @ProjectRoles('Scrum_Master', 'Product_Owner', 'Developer', 'QA')
  async create(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @CurrentUser() user: RequestUser,
    @Body() body: { url: string; title?: string },
  ) {
    return this.linkService.create(taskId, user.id, body);
  }

  @Delete(':linkId')
  @ProjectRoles('Scrum_Master', 'Product_Owner', 'Developer', 'QA')
  async delete(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Param('linkId', ParseUUIDPipe) linkId: string,
    @CurrentUser() user: RequestUser,
  ) {
    await this.linkService.delete(linkId, taskId, user.id);
    return { ok: true };
  }
}
