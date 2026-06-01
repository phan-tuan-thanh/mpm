import {
  Injectable,
  NotFoundException,
  ConflictException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectMember } from '../../auth/entities/project-member.entity';
import { User } from '../../auth/entities/user.entity';
import { SessionService } from '../../auth/session.service';
import { AuditService } from '../../audit/audit.service';
import { AuthEvent } from '../../auth/constants/auth-events';
import { AddMemberDto, UpdateMemberRoleDto } from '../dto';
import type { MemberResponse } from '@mpm/shared-types';

@Injectable()
export class ProjectMemberService {
  constructor(
    @InjectRepository(ProjectMember)
    private readonly projectMemberRepository: Repository<ProjectMember>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly sessionService: SessionService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Danh sách thành viên của project
   */
  async listMembers(projectId: string, filter?: string): Promise<MemberResponse[]> {
    const queryBuilder = this.projectMemberRepository.createQueryBuilder('pm')
      .innerJoinAndSelect('pm.user', 'user')
      .where('pm.projectId = :projectId', { projectId });

    if (filter) {
      queryBuilder.andWhere(
        '(user.displayName ILIKE :filter OR user.email ILIKE :filter)',
        { filter: `%${filter}%` },
      );
    }

    const members = await queryBuilder.getMany();

    return members.map((m) => ({
      userId: m.userId,
      displayName: m.user.displayName,
      email: m.user.email,
      avatarUrl: m.user.avatarUrl,
      projectRole: m.projectRole,
      joinedAt: m.createdAt,
    }));
  }

  /**
   * Thêm thành viên mới (Direct Add)
   */
  async addMember(
    projectId: string,
    actorId: string,
    dto: AddMemberDto,
    ipAddress: string,
    userAgent: string,
  ): Promise<MemberResponse> {
    // 1. Tra cứu user bằng email
    const targetUser = await this.userRepository.findOne({
      where: { email: dto.email },
    });

    if (!targetUser) {
      throw new NotFoundException({
        statusCode: 404,
        error: 'Not Found',
        message: `User with email ${dto.email} not found`,
        errorCode: 'USER_NOT_FOUND',
        timestamp: new Date().toISOString(),
      });
    }

    // 2. Check trùng member
    const existingMember = await this.projectMemberRepository.findOne({
      where: { projectId, userId: targetUser.id },
    });

    if (existingMember) {
      throw new ConflictException({
        statusCode: 409,
        error: 'Conflict',
        message: 'User is already a member of this project',
        errorCode: 'MEMBER_ALREADY_EXISTS',
        timestamp: new Date().toISOString(),
      });
    }

    // 3. Insert member
    const newMember = this.projectMemberRepository.create({
      projectId,
      userId: targetUser.id,
      projectRole: dto.projectRole,
    });

    const savedMember = await this.projectMemberRepository.save(newMember);

    // 4. Force target user to re-login to fetch new claims
    await this.sessionService.revokeAllSessions(targetUser.id);
    await this.sessionService.addToForcedLogout(targetUser.id);

    // 5. Ghi audit log
    this.auditService.log(
      AuthEvent.MEMBER_ADDED,
      actorId,
      ipAddress,
      userAgent,
      { projectId, targetUserId: targetUser.id },
    );

    return {
      userId: savedMember.userId,
      displayName: targetUser.displayName,
      email: targetUser.email,
      avatarUrl: targetUser.avatarUrl,
      projectRole: savedMember.projectRole,
      joinedAt: savedMember.createdAt,
    };
  }

  /**
   * Thay đổi vai trò thành viên
   */
  async changeRole(
    projectId: string,
    targetUserId: string,
    actorId: string,
    dto: UpdateMemberRoleDto,
    ipAddress: string,
    userAgent: string,
  ): Promise<MemberResponse> {
    // 1. Tìm member record
    const member = await this.projectMemberRepository.findOne({
      where: { projectId, userId: targetUserId },
      relations: ['user'],
    });

    if (!member) {
      throw new NotFoundException({
        statusCode: 404,
        error: 'Not Found',
        message: 'Member not found in this project',
        errorCode: 'MEMBER_NOT_FOUND',
        timestamp: new Date().toISOString(),
      });
    }

    if (member.projectRole === dto.projectRole) {
      return {
        userId: member.userId,
        displayName: member.user.displayName,
        email: member.user.email,
        avatarUrl: member.user.avatarUrl,
        projectRole: member.projectRole,
        joinedAt: member.createdAt,
      };
    }

    // 2. Bảo vệ Scrum_Master cuối cùng
    if (member.projectRole === 'Scrum_Master' && dto.projectRole !== 'Scrum_Master') {
      const scrumMastersCount = await this.projectMemberRepository.count({
        where: { projectId, projectRole: 'Scrum_Master' },
      });

      if (scrumMastersCount <= 1) {
        throw new UnprocessableEntityException({
          statusCode: 422,
          error: 'Unprocessable Entity',
          message: 'Project must have at least one Scrum Master.',
          errorCode: 'LAST_SCRUM_MASTER',
          timestamp: new Date().toISOString(),
        });
      }
    }

    // 3. Cập nhật role
    member.projectRole = dto.projectRole;
    const updatedMember = await this.projectMemberRepository.save(member);

    // 4. Force target user to re-login to fetch new claims
    await this.sessionService.revokeAllSessions(targetUserId);
    await this.sessionService.addToForcedLogout(targetUserId);

    // 5. Ghi audit log
    this.auditService.log(
      AuthEvent.MEMBER_ROLE_CHANGED,
      actorId,
      ipAddress,
      userAgent,
      { projectId, targetUserId, oldRole: member.projectRole, newRole: dto.projectRole },
    );

    return {
      userId: updatedMember.userId,
      displayName: member.user.displayName,
      email: member.user.email,
      avatarUrl: member.user.avatarUrl,
      projectRole: updatedMember.projectRole,
      joinedAt: updatedMember.createdAt,
    };
  }

  /**
   * Xóa thành viên khỏi dự án
   */
  async removeMember(
    projectId: string,
    targetUserId: string,
    actorId: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<void> {
    // 1. Tìm member record
    const member = await this.projectMemberRepository.findOne({
      where: { projectId, userId: targetUserId },
    });

    if (!member) {
      throw new NotFoundException({
        statusCode: 404,
        error: 'Not Found',
        message: 'Member not found in this project',
        errorCode: 'MEMBER_NOT_FOUND',
        timestamp: new Date().toISOString(),
      });
    }

    // 2. Bảo vệ Scrum_Master cuối cùng
    if (member.projectRole === 'Scrum_Master') {
      const scrumMastersCount = await this.projectMemberRepository.count({
        where: { projectId, projectRole: 'Scrum_Master' },
      });

      if (scrumMastersCount <= 1) {
        throw new UnprocessableEntityException({
          statusCode: 422,
          error: 'Unprocessable Entity',
          message: 'Project must have at least one Scrum Master.',
          errorCode: 'LAST_SCRUM_MASTER',
          timestamp: new Date().toISOString(),
        });
      }
    }

    // 3. Xóa member
    await this.projectMemberRepository.remove(member);

    // 4. Force target user to re-login to fetch new claims
    await this.sessionService.revokeAllSessions(targetUserId);
    await this.sessionService.addToForcedLogout(targetUserId);

    // 5. Ghi audit log
    this.auditService.log(
      AuthEvent.MEMBER_REMOVED,
      actorId,
      ipAddress,
      userAgent,
      { projectId, targetUserId },
    );
  }
}
