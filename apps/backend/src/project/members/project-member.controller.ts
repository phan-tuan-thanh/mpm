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
} from '@nestjs/common';
import { Request } from 'express';
import { CurrentUser, RequestUser } from '../../auth/decorators/current-user.decorator';
import { ProjectRoles } from '../../auth/decorators/project-roles.decorator';
import { ProjectMemberService } from './project-member.service';
import { AddMemberDto, UpdateMemberRoleDto } from '../dto';

@Controller('api/projects/:projectId/members')
export class ProjectMemberController {
  constructor(private readonly projectMemberService: ProjectMemberService) {}

  @Get()
  @ProjectRoles('Scrum_Master', 'Product_Owner', 'Developer', 'QA', 'Stakeholder')
  async listMembers(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query('filter') filter?: string,
  ) {
    return this.projectMemberService.listMembers(projectId, filter);
  }

  @Post()
  @ProjectRoles('Scrum_Master')
  async addMember(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() actor: RequestUser,
    @Body() dto: AddMemberDto,
    @Req() req: Request,
  ) {
    const ipAddress = this.extractIpAddress(req);
    const userAgent = req.headers['user-agent'] ?? 'unknown';
    return this.projectMemberService.addMember(
      projectId,
      actor.id,
      dto,
      ipAddress,
      userAgent,
    );
  }

  @Patch(':userId')
  @ProjectRoles('Scrum_Master')
  async changeRole(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('userId', ParseUUIDPipe) targetUserId: string,
    @CurrentUser() actor: RequestUser,
    @Body() dto: UpdateMemberRoleDto,
    @Req() req: Request,
  ) {
    const ipAddress = this.extractIpAddress(req);
    const userAgent = req.headers['user-agent'] ?? 'unknown';
    return this.projectMemberService.changeRole(
      projectId,
      targetUserId,
      actor.id,
      dto,
      ipAddress,
      userAgent,
    );
  }

  @Delete(':userId')
  @ProjectRoles('Scrum_Master')
  async removeMember(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('userId', ParseUUIDPipe) targetUserId: string,
    @CurrentUser() actor: RequestUser,
    @Req() req: Request,
  ) {
    const ipAddress = this.extractIpAddress(req);
    const userAgent = req.headers['user-agent'] ?? 'unknown';
    await this.projectMemberService.removeMember(
      projectId,
      targetUserId,
      actor.id,
      ipAddress,
      userAgent,
    );
    return { removed: true };
  }

  private extractIpAddress(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return req.ip ?? req.socket.remoteAddress ?? 'unknown';
  }
}
