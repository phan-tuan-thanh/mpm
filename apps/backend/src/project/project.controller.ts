import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import { CurrentUser, RequestUser } from '../auth/decorators/current-user.decorator';
import { ProjectRoles } from '../auth/decorators/project-roles.decorator';
import { ProjectService } from './project.service';
import { CreateProjectDto, UpdateProjectDto } from './dto';
import { UpdateFeaturesDto } from '@mpm/shared-types';

@Controller('api/projects')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Post()
  async create(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateProjectDto,
    @Req() req: Request,
  ) {
    const ipAddress = this.extractIpAddress(req);
    const userAgent = req.headers['user-agent'] ?? 'unknown';
    return this.projectService.create(user.id, dto, ipAddress, userAgent);
  }

  @Get()
  async findAll(
    @CurrentUser() user: RequestUser,
    @Query('name') name?: string,
    @Query('status') status?: string,
    @Query('network') network?: string,
  ) {
    return this.projectService.findAll(
      user.id,
      { name, status, network },
      user.systemRole,
    );
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

  @Patch(':projectId')
  @ProjectRoles('Scrum_Master')
  async update(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateProjectDto,
    @Req() req: Request,
  ) {
    const ipAddress = this.extractIpAddress(req);
    const userAgent = req.headers['user-agent'] ?? 'unknown';
    return this.projectService.update(
      projectId,
      user.id,
      dto,
      user.systemRole,
      ipAddress,
      userAgent,
    );
  }

  @Patch(':projectId/archive')
  @ProjectRoles('Scrum_Master')
  async archive(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ) {
    const ipAddress = this.extractIpAddress(req);
    const userAgent = req.headers['user-agent'] ?? 'unknown';
    return this.projectService.archive(
      projectId,
      user.id,
      user.systemRole,
      ipAddress,
      userAgent,
    );
  }

  @Delete(':projectId')
  @ProjectRoles('Scrum_Master')
  async delete(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ) {
    const ipAddress = this.extractIpAddress(req);
    const userAgent = req.headers['user-agent'] ?? 'unknown';
    await this.projectService.delete(
      projectId,
      user.id,
      user.systemRole,
      ipAddress,
      userAgent,
    );
    return { deleted: true };
  }

  @Delete()
  async bulkDelete(
    @CurrentUser() user: RequestUser,
    @Body('ids') ids: string[],
    @Req() req: Request,
  ) {
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      throw new BadRequestException('ids must be a non-empty array of UUIDs');
    }
    const ipAddress = this.extractIpAddress(req);
    const userAgent = req.headers['user-agent'] ?? 'unknown';
    return this.projectService.bulkDelete(
      ids,
      user.id,
      user.systemRole,
      ipAddress,
      userAgent,
    );
  }

  @Post(':projectId/join')
  async join(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ) {
    const ipAddress = this.extractIpAddress(req);
    const userAgent = req.headers['user-agent'] ?? 'unknown';
    return this.projectService.join(projectId, user.id, ipAddress, userAgent);
  }

  @Patch(':projectId/features')
  @ProjectRoles('Scrum_Master')
  async updateFeatures(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateFeaturesDto,
    @Req() req: Request,
  ) {
    const ipAddress = this.extractIpAddress(req);
    const userAgent = req.headers['user-agent'] ?? 'unknown';
    return this.projectService.updateFeatures(
      projectId,
      user.id,
      dto,
      user.systemRole,
      ipAddress,
      userAgent,
    );
  }

  private extractIpAddress(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return req.ip ?? req.socket.remoteAddress ?? 'unknown';
  }
}
