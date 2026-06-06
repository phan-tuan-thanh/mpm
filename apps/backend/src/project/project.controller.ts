import { Body, Controller, Delete, Param, ParseUUIDPipe, Patch, Post, Req, BadRequestException } from '@nestjs/common';
import { Request } from 'express';
import { CurrentUser, RequestUser } from '../auth/decorators/current-user.decorator';
import { ProjectRoles } from '../auth/decorators/project-roles.decorator';
import { ProjectService } from './project.service';
import { CreateProjectDto, UpdateProjectDto } from './dto';
import { UpdateFeaturesDto } from '@mpm/shared-types';

@Controller('api/projects')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  private getIpUa(req: Request) {
    const f = req.headers['x-forwarded-for'];
    const ip = typeof f === 'string' ? f.split(',')[0].trim() : (req.ip ?? req.socket.remoteAddress ?? 'unknown');
    return { ip, ua: req.headers['user-agent'] ?? 'unknown' };
  }

  @Post()
  async create(@CurrentUser() user: RequestUser, @Body() dto: CreateProjectDto, @Req() req: Request) {
    const { ip, ua } = this.getIpUa(req);
    return this.projectService.create(user.id, dto, ip, ua);
  }

  @Patch(':projectId')
  @ProjectRoles('Scrum_Master')
  async update(@Param('projectId', ParseUUIDPipe) projectId: string, @CurrentUser() user: RequestUser, @Body() dto: UpdateProjectDto, @Req() req: Request) {
    const { ip, ua } = this.getIpUa(req);
    return this.projectService.update(projectId, user.id, dto, user.systemRole, ip, ua);
  }

  @Patch(':projectId/archive')
  @ProjectRoles('Scrum_Master')
  async archive(@Param('projectId', ParseUUIDPipe) projectId: string, @CurrentUser() user: RequestUser, @Req() req: Request) {
    const { ip, ua } = this.getIpUa(req);
    return this.projectService.archive(projectId, user.id, user.systemRole, ip, ua);
  }

  @Delete(':projectId')
  @ProjectRoles('Scrum_Master')
  async delete(@Param('projectId', ParseUUIDPipe) projectId: string, @CurrentUser() user: RequestUser, @Req() req: Request) {
    const { ip, ua } = this.getIpUa(req);
    await this.projectService.delete(projectId, user.id, user.systemRole, ip, ua);
    return { deleted: true };
  }

  @Delete()
  async bulkDelete(@CurrentUser() user: RequestUser, @Body('ids') ids: string[], @Req() req: Request) {
    if (!ids?.length) throw new BadRequestException('ids must be a non-empty array of UUIDs');
    const { ip, ua } = this.getIpUa(req);
    return this.projectService.bulkDelete(ids, user.id, user.systemRole, ip, ua);
  }

  @Post(':projectId/join')
  async join(@Param('projectId', ParseUUIDPipe) projectId: string, @CurrentUser() user: RequestUser, @Req() req: Request) {
    const { ip, ua } = this.getIpUa(req);
    return this.projectService.join(projectId, user.id, ip, ua);
  }

  @Patch(':projectId/features')
  @ProjectRoles('Scrum_Master')
  async updateFeatures(@Param('projectId', ParseUUIDPipe) projectId: string, @CurrentUser() user: RequestUser, @Body() dto: UpdateFeaturesDto, @Req() req: Request) {
    const { ip, ua } = this.getIpUa(req);
    return this.projectService.updateFeatures(projectId, user.id, dto, user.systemRole, ip, ua);
  }
}

