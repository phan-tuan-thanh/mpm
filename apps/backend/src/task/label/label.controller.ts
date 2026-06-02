import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { CurrentUser, RequestUser } from '../../auth/decorators/current-user.decorator';
import { ProjectRoles } from '../../auth/decorators/project-roles.decorator';
import { LabelService } from './label.service';

@Controller('api/projects/:projectId/labels')
export class LabelController {
  constructor(private readonly labelService: LabelService) {}

  @Get()
  @ProjectRoles('Scrum_Master', 'Product_Owner', 'Developer', 'QA', 'Stakeholder')
  async findAll(@Param('projectId', ParseUUIDPipe) projectId: string) {
    return this.labelService.findAll(projectId);
  }

  @Post()
  @ProjectRoles('Scrum_Master', 'Product_Owner')
  async create(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: RequestUser,
    @Body() body: { name: string; color: string },
  ) {
    return this.labelService.create(projectId, user.id, body);
  }

  @Patch(':labelId')
  @ProjectRoles('Scrum_Master', 'Product_Owner')
  async update(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('labelId', ParseUUIDPipe) labelId: string,
    @Body() body: { name?: string; color?: string },
  ) {
    return this.labelService.update(labelId, projectId, body);
  }

  @Delete(':labelId')
  @ProjectRoles('Scrum_Master', 'Product_Owner')
  async delete(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('labelId', ParseUUIDPipe) labelId: string,
    @CurrentUser() user: RequestUser,
  ) {
    await this.labelService.delete(labelId, projectId, user.id);
    return { ok: true };
  }
}
