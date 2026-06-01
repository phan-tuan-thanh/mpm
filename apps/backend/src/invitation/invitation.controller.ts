import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  Query,
  UsePipes,
  ValidationPipe,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { ProjectRoles } from '../auth/decorators/project-roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/decorators/current-user.decorator';
import { InvitationService } from './invitation.service';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import type {
  InvitationResponseDto,
  InvitationListResponseDto,
} from './dto/invitation-response.dto';

/**
 * Invitation Controller — quản lý lời mời tham gia project
 *
 * Endpoints:
 * - POST   /api/projects/:projectId/invitations — tạo invitation mới
 * - GET    /api/projects/:projectId/invitations — list invitations (pagination)
 * - POST   /api/invitations/:token/accept — accept invitation
 * - DELETE /api/projects/:projectId/invitations/:id — cancel invitation
 *
 * Authorization:
 * - Tạo/cancel: Admin (system role) hoặc Scrum_Master (project role)
 * - List: Admin, Scrum_Master, hoặc Product_Owner
 * - Accept: bất kỳ authenticated user
 */
@Controller('api')
export class InvitationController {
  constructor(private readonly invitationService: InvitationService) {}

  /**
   * POST /api/projects/:projectId/invitations
   *
   * Tạo invitation mới. Yêu cầu Admin hoặc Scrum_Master trong project.
   * Check duplicate: email đã là member hoặc có pending invitation → 409
   */
  @Post('projects/:projectId/invitations')
  @Roles('Admin')
  @ProjectRoles('Scrum_Master')
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  async createInvitation(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateInvitationDto,
    @CurrentUser() user: RequestUser,
  ): Promise<InvitationResponseDto> {
    return this.invitationService.createInvitation(projectId, dto, user.id);
  }

  /**
   * GET /api/projects/:projectId/invitations
   *
   * List invitations của project với pagination (max 50/page).
   * Yêu cầu Admin, Scrum_Master, hoặc Product_Owner.
   */
  @Get('projects/:projectId/invitations')
  @Roles('Admin')
  @ProjectRoles('Scrum_Master', 'Product_Owner')
  async listInvitations(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<InvitationListResponseDto> {
    const pageNum = page ? parseInt(page, 10) : 1;
    const pageSizeNum = pageSize ? parseInt(pageSize, 10) : 20;
    return this.invitationService.listInvitations(
      projectId,
      pageNum,
      pageSizeNum,
    );
  }

  /**
   * POST /api/invitations/:token/accept
   *
   * Accept invitation bằng token. Bất kỳ authenticated user.
   * Check: expired → 410, already accepted → 409
   *
   * Nếu user chưa đăng nhập, frontend sẽ redirect to login trước,
   * sau đó gọi lại endpoint này sau khi auth thành công.
   */
  @Post('invitations/:token/accept')
  @HttpCode(HttpStatus.OK)
  async acceptInvitation(
    @Param('token') token: string,
    @CurrentUser() user: RequestUser,
  ): Promise<InvitationResponseDto> {
    return this.invitationService.acceptInvitation(token, user.id);
  }

  /**
   * DELETE /api/projects/:projectId/invitations/:id
   *
   * Cancel pending invitation. Yêu cầu Admin hoặc Scrum_Master.
   */
  @Delete('projects/:projectId/invitations/:id')
  @Roles('Admin')
  @ProjectRoles('Scrum_Master')
  @HttpCode(HttpStatus.NO_CONTENT)
  async cancelInvitation(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.invitationService.cancelInvitation(projectId, id);
  }
}
