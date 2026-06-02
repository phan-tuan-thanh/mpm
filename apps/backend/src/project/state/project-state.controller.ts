import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { CurrentUser, RequestUser } from '../../auth/decorators/current-user.decorator';
import { ProjectRoles } from '../../auth/decorators/project-roles.decorator';
import { ProjectStateService } from './project-state.service';
import {
  CreateStateDto,
  UpdateStateDto,
  ReorderStatesDto,
  MigrateStateDto,
} from '@mpm/shared-types';

@Controller('api/projects/:projectId/states')
export class ProjectStateController {
  constructor(private readonly stateService: ProjectStateService) {}

  @Get()
  @ProjectRoles('Scrum_Master', 'Product_Owner', 'Developer', 'QA', 'Stakeholder')
  async findAll(@Param('projectId', ParseUUIDPipe) projectId: string) {
    const data = await this.stateService.findAll(projectId);
    return { data };
  }

  @Post()
  @ProjectRoles('Scrum_Master')
  async create(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateStateDto,
    @Req() req: Request,
  ) {
    const ipAddress = this.extractIpAddress(req);
    const userAgent = req.headers['user-agent'] ?? 'unknown';
    return this.stateService.create(projectId, user.id, dto, ipAddress, userAgent);
  }

  @Patch('reorder')
  @ProjectRoles('Scrum_Master')
  async reorder(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: ReorderStatesDto,
    @Req() req: Request,
  ) {
    const ipAddress = this.extractIpAddress(req);
    const userAgent = req.headers['user-agent'] ?? 'unknown';
    const updated = await this.stateService.reorder(
      projectId,
      dto.items,
      user.id,
      ipAddress,
      userAgent,
    );
    return { updated };
  }

  @Patch(':stateId')
  @ProjectRoles('Scrum_Master')
  async update(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('stateId', ParseUUIDPipe) stateId: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateStateDto,
    @Req() req: Request,
  ) {
    const ipAddress = this.extractIpAddress(req);
    const userAgent = req.headers['user-agent'] ?? 'unknown';
    return this.stateService.update(
      projectId,
      stateId,
      user.id,
      dto,
      ipAddress,
      userAgent,
    );
  }

  @Delete(':stateId')
  @ProjectRoles('Scrum_Master')
  async delete(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('stateId', ParseUUIDPipe) stateId: string,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ) {
    const ipAddress = this.extractIpAddress(req);
    const userAgent = req.headers['user-agent'] ?? 'unknown';
    await this.stateService.delete(projectId, stateId, user.id, ipAddress, userAgent);
    return { success: true };
  }

  @Post('migrate')
  @ProjectRoles('Scrum_Master')
  async migrate(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: MigrateStateDto,
    @Req() req: Request,
  ) {
    const ipAddress = this.extractIpAddress(req);
    const userAgent = req.headers['user-agent'] ?? 'unknown';
    await this.stateService.migrate(
      projectId,
      dto.fromStateId,
      dto.toStateId,
      user.id,
      ipAddress,
      userAgent,
    );
    return { success: true };
  }

  private extractIpAddress(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return req.ip ?? req.socket.remoteAddress ?? 'unknown';
  }
}
