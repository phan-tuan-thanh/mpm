import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { CurrentUser, RequestUser } from '../auth/decorators/current-user.decorator';
import { ProjectRoles } from '../auth/decorators/project-roles.decorator';
import { ProjectService } from './project.service';

@Controller('api/projects')
export class ProjectQueryController {
  constructor(private readonly projectService: ProjectService) {}

  @Get()
  async findAll(
    @CurrentUser() user: RequestUser,
    @Query('name') name?: string,
    @Query('status') status?: string,
    @Query('network') network?: string,
  ) {
    return this.projectService.findAll(user.id, { name, status, network }, user.systemRole);
  }

  @Get('by-key/:key')
  async findByKey(
    @Param('key') key: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectService.findByKey(key, user.id, user.systemRole);
  }

  @Get(':projectId')
  @ProjectRoles('Scrum_Master', 'Product_Owner', 'Developer', 'QA', 'Stakeholder')
  async findById(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectService.findById(projectId, user.id, user.systemRole);
  }
}
