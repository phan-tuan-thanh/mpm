import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Invitation } from './entities/invitation.entity';
import { ProjectMember } from '../auth/entities/project-member.entity';
import { User } from '../auth/entities/user.entity';
import { InvitationService } from './invitation.service';
import { InvitationController } from './invitation.controller';

/**
 * Invitation Module — quản lý lời mời tham gia project
 *
 * Cung cấp:
 * - POST   /api/projects/:projectId/invitations — tạo invitation
 * - GET    /api/projects/:projectId/invitations — list invitations (pagination)
 * - POST   /api/invitations/:token/accept — accept invitation
 * - DELETE /api/projects/:projectId/invitations/:id — cancel invitation
 *
 * Dependencies:
 * - TypeORM: Invitation, ProjectMember, User entities
 * - JWT Auth Guard (global) — bảo vệ tất cả endpoints
 * - Roles Guard — kiểm tra system role (Admin)
 * - Project Roles Guard — kiểm tra project role (Scrum_Master, Product_Owner)
 *
 * Exports:
 * - InvitationService: cho các module khác sử dụng (e.g., audit logging)
 */
@Module({
  imports: [TypeOrmModule.forFeature([Invitation, ProjectMember, User])],
  controllers: [InvitationController],
  providers: [InvitationService],
  exports: [InvitationService],
})
export class InvitationModule {}
