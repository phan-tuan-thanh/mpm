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
import { PriorityService } from './priority.service';
import { CreatePriorityDto } from './dto/create-priority.dto';
import { UpdatePriorityDto } from './dto/update-priority.dto';
import { DeletePriorityDto } from './dto/delete-priority.dto';
import { ReorderPrioritiesDto } from './dto/reorder-priorities.dto';

@Controller('api/projects/:projectId/priorities')
export class PriorityController {
  constructor(private readonly priorityService: PriorityService) {}

  @Get()
  @ProjectRoles('Scrum_Master', 'Product_Owner', 'Developer', 'QA', 'Stakeholder')
  async findAll(@Param('projectId', ParseUUIDPipe) projectId: string) {
    const data = await this.priorityService.findAll(projectId);
    return { data };
  }

  @Post()
  @ProjectRoles('Scrum_Master')
  async create(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: CreatePriorityDto,
    @Req() req: Request,
  ) {
    const ipAddress = this.extractIpAddress(req);
    const userAgent = req.headers['user-agent'] ?? 'unknown';
    const data = await this.priorityService.create(projectId, user.id, dto, ipAddress, userAgent);
    return { data };
  }

  @Patch('reorder')
  @ProjectRoles('Scrum_Master')
  async reorder(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: ReorderPrioritiesDto,
    @Req() req: Request,
  ) {
    const ipAddress = this.extractIpAddress(req);
    const userAgent = req.headers['user-agent'] ?? 'unknown';
    const updated = await this.priorityService.reorder(
      projectId,
      user.id,
      dto,
      ipAddress,
      userAgent,
    );
    return { updated };
  }

  @Patch(':priorityId')
  @ProjectRoles('Scrum_Master')
  async update(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('priorityId', ParseUUIDPipe) priorityId: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdatePriorityDto,
    @Req() req: Request,
  ) {
    const ipAddress = this.extractIpAddress(req);
    const userAgent = req.headers['user-agent'] ?? 'unknown';
    const data = await this.priorityService.update(
      projectId,
      priorityId,
      user.id,
      dto,
      ipAddress,
      userAgent,
    );
    return { data };
  }

  @Delete(':priorityId')
  @ProjectRoles('Scrum_Master')
  async delete(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('priorityId', ParseUUIDPipe) priorityId: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: DeletePriorityDto,
    @Req() req: Request,
  ) {
    const ipAddress = this.extractIpAddress(req);
    const userAgent = req.headers['user-agent'] ?? 'unknown';
    await this.priorityService.delete(projectId, priorityId, user.id, dto, ipAddress, userAgent);
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
