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
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CurrentUser, RequestUser } from '../../auth/decorators/current-user.decorator';
import { ProjectRoles } from '../../auth/decorators/project-roles.decorator';
import { LabelService } from './label.service';
import { Project } from '../../project/entities/project.entity';

@Controller('api/projects/:projectId/labels')
export class LabelController {
  constructor(
    private readonly labelService: LabelService,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
  ) {}

  /**
   * Resolve workspaceId từ project entity
   */
  private async resolveWorkspaceId(projectId: string): Promise<string | null> {
    const project = await this.projectRepo.findOne({
      where: { id: projectId },
      select: ['id', 'workspaceId'],
    });
    return project?.workspaceId ?? null;
  }

  @Get()
  @ProjectRoles('Scrum_Master', 'Product_Owner', 'Developer', 'QA', 'Stakeholder')
  async findAll(@Param('projectId', ParseUUIDPipe) projectId: string) {
    const workspaceId = await this.resolveWorkspaceId(projectId);
    if (workspaceId) {
      return this.labelService.findAllForProject(projectId, workspaceId);
    }
    // Fallback: nếu project chưa có workspaceId, chỉ trả về project labels
    return this.labelService.findAll(projectId);
  }

  @Post()
  @ProjectRoles('Scrum_Master', 'Product_Owner')
  async create(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: RequestUser,
    @Body() body: { name: string; color: string; isExclusive?: boolean },
  ) {
    const workspaceId = await this.resolveWorkspaceId(projectId);
    return this.labelService.create(body, {
      scope: 'project',
      workspaceId,
      projectId,
      userId: user.id,
    });
  }

  @Patch(':labelId')
  @ProjectRoles('Scrum_Master', 'Product_Owner')
  async update(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('labelId', ParseUUIDPipe) labelId: string,
    @CurrentUser() user: RequestUser,
    @Body() body: { name?: string; color?: string; isExclusive?: boolean },
  ) {
    return this.labelService.update(labelId, body, {
      projectId,
      userSystemRole: user.systemRole,
    });
  }

  @Delete(':labelId')
  @ProjectRoles('Scrum_Master', 'Product_Owner')
  async delete(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('labelId', ParseUUIDPipe) labelId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.labelService.delete(labelId, {
      projectId,
      userId: user.id,
      userSystemRole: user.systemRole,
    });
  }
}
