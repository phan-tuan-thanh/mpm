import {
  Injectable,
  ConflictException,
  GoneException,
  NotFoundException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { Invitation } from './entities/invitation.entity';
import { ProjectMember } from '../auth/entities/project-member.entity';
import { User } from '../auth/entities/user.entity';
import type { CreateInvitationDto } from './dto/create-invitation.dto';
import type {
  InvitationResponseDto,
  InvitationListResponseDto,
} from './dto/invitation-response.dto';

/** Thời hạn invitation: 7 ngày (milliseconds) */
const INVITATION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

/** Số ký tự tối thiểu cho token (32 bytes → 64 hex chars) */
const TOKEN_BYTES = 32;

/** Số records tối đa mỗi trang */
const MAX_PAGE_SIZE = 50;

/**
 * Invitation Service — quản lý lifecycle invitation
 *
 * Chức năng:
 * - Tạo invitation mới (check duplicate, generate token)
 * - Accept invitation (verify token, check expiry, gán role)
 * - Cancel invitation (chỉ pending)
 * - List invitations (pagination)
 */
@Injectable()
export class InvitationService {
  constructor(
    @InjectRepository(Invitation)
    private readonly invitationRepository: Repository<Invitation>,
    @InjectRepository(ProjectMember)
    private readonly projectMemberRepository: Repository<ProjectMember>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Tạo invitation mới cho project
   *
   * Logic:
   * 1. Check email đã là member của project → 409 DUPLICATE_INVITATION
   * 2. Check email đã có pending invitation cho project → 409 DUPLICATE_INVITATION
   * 3. Generate token (crypto.randomBytes, 32 bytes → 64 hex chars)
   * 4. Set expires_at = now + 7 ngày
   * 5. Save invitation record
   *
   * @param projectId - ID project
   * @param dto - Email và project role
   * @param invitedBy - User ID của người mời
   * @returns InvitationResponseDto
   */
  async createInvitation(
    projectId: string,
    dto: CreateInvitationDto,
    invitedBy: string,
  ): Promise<InvitationResponseDto> {
    const emailLower = dto.email.toLowerCase();

    // Check 1: Email đã là member của project
    const existingMember = await this.findExistingMember(
      emailLower,
      projectId,
    );
    if (existingMember) {
      throw new ConflictException({
        statusCode: HttpStatus.CONFLICT,
        error: 'Conflict',
        message: 'Email đã là thành viên của project này',
        errorCode: 'DUPLICATE_INVITATION',
        timestamp: new Date().toISOString(),
      });
    }

    // Check 2: Email đã có pending invitation cho project
    const existingInvitation = await this.invitationRepository.findOne({
      where: {
        email: emailLower,
        projectId,
        status: 'pending',
      },
    });
    if (existingInvitation) {
      throw new ConflictException({
        statusCode: HttpStatus.CONFLICT,
        error: 'Conflict',
        message: 'Email đã có lời mời đang chờ xử lý cho project này',
        errorCode: 'DUPLICATE_INVITATION',
        timestamp: new Date().toISOString(),
      });
    }

    // Generate token và set expiry
    const token = crypto.randomBytes(TOKEN_BYTES).toString('hex');
    const expiresAt = new Date(Date.now() + INVITATION_EXPIRY_MS);

    const invitation = this.invitationRepository.create({
      projectId,
      email: emailLower,
      projectRole: dto.projectRole,
      token,
      status: 'pending',
      invitedBy,
      acceptedBy: null,
      expiresAt,
    });

    const saved = await this.invitationRepository.save(invitation);
    return this.toResponseDto(saved);
  }

  /**
   * Accept invitation bằng token
   *
   * Logic:
   * 1. Tìm invitation theo token
   * 2. Check status: accepted → 409, cancelled → 409, expired → 410
   * 3. Check expires_at: quá hạn → 410
   * 4. Gán project role cho user
   * 5. Mark invitation as accepted
   *
   * @param token - Invitation token
   * @param userId - User ID của người accept
   * @returns InvitationResponseDto
   */
  async acceptInvitation(
    token: string,
    userId: string,
  ): Promise<InvitationResponseDto> {
    const invitation = await this.invitationRepository.findOne({
      where: { token },
    });

    if (!invitation) {
      throw new NotFoundException({
        statusCode: HttpStatus.NOT_FOUND,
        error: 'Not Found',
        message: 'Invitation không tồn tại',
        errorCode: 'INVITATION_NOT_FOUND',
        timestamp: new Date().toISOString(),
      });
    }

    // Check trạng thái đã accepted
    if (invitation.status === 'accepted') {
      throw new ConflictException({
        statusCode: HttpStatus.CONFLICT,
        error: 'Conflict',
        message: 'Invitation đã được chấp nhận trước đó',
        errorCode: 'INVITATION_ALREADY_ACCEPTED',
        timestamp: new Date().toISOString(),
      });
    }

    // Check trạng thái cancelled
    if (invitation.status === 'cancelled') {
      throw new HttpException(
        {
          statusCode: HttpStatus.GONE,
          error: 'Gone',
          message: 'Invitation đã bị thu hồi',
          errorCode: 'INVITATION_CANCELLED',
          timestamp: new Date().toISOString(),
        },
        HttpStatus.GONE,
      );
    }

    // Check hết hạn (status expired hoặc quá expires_at)
    if (invitation.status === 'expired' || new Date() > invitation.expiresAt) {
      // Cập nhật status nếu chưa được đánh dấu expired
      if (invitation.status !== 'expired') {
        invitation.status = 'expired';
        await this.invitationRepository.save(invitation);
      }
      throw new GoneException({
        statusCode: HttpStatus.GONE,
        error: 'Gone',
        message: 'Invitation đã hết hạn',
        errorCode: 'INVITATION_EXPIRED',
        timestamp: new Date().toISOString(),
      });
    }

    // Gán project role cho user
    const existingMembership = await this.projectMemberRepository.findOne({
      where: { userId, projectId: invitation.projectId },
    });

    if (!existingMembership) {
      const projectMember = this.projectMemberRepository.create({
        userId,
        projectId: invitation.projectId,
        projectRole: invitation.projectRole,
      });
      await this.projectMemberRepository.save(projectMember);
    }

    // Mark invitation as accepted
    invitation.status = 'accepted';
    invitation.acceptedBy = userId;
    const saved = await this.invitationRepository.save(invitation);

    return this.toResponseDto(saved);
  }

  /**
   * Cancel invitation (chỉ pending)
   *
   * @param projectId - ID project
   * @param invitationId - ID invitation
   */
  async cancelInvitation(
    projectId: string,
    invitationId: string,
  ): Promise<void> {
    const invitation = await this.invitationRepository.findOne({
      where: { id: invitationId, projectId },
    });

    if (!invitation) {
      throw new NotFoundException({
        statusCode: HttpStatus.NOT_FOUND,
        error: 'Not Found',
        message: 'Invitation không tồn tại',
        errorCode: 'INVITATION_NOT_FOUND',
        timestamp: new Date().toISOString(),
      });
    }

    if (invitation.status !== 'pending') {
      throw new ConflictException({
        statusCode: HttpStatus.CONFLICT,
        error: 'Conflict',
        message: 'Chỉ có thể thu hồi invitation đang ở trạng thái pending',
        errorCode: 'INVALID_INVITATION_STATUS',
        timestamp: new Date().toISOString(),
      });
    }

    invitation.status = 'cancelled';
    await this.invitationRepository.save(invitation);
  }

  /**
   * List invitations của project với pagination
   *
   * @param projectId - ID project
   * @param page - Số trang (bắt đầu từ 1)
   * @param pageSize - Số records mỗi trang (max 50)
   * @returns InvitationListResponseDto
   */
  async listInvitations(
    projectId: string,
    page: number = 1,
    pageSize: number = 20,
  ): Promise<InvitationListResponseDto> {
    const effectivePageSize = Math.min(Math.max(pageSize, 1), MAX_PAGE_SIZE);
    const effectivePage = Math.max(page, 1);
    const skip = (effectivePage - 1) * effectivePageSize;

    const [invitations, total] = await this.invitationRepository.findAndCount({
      where: { projectId },
      order: { createdAt: 'DESC' },
      skip,
      take: effectivePageSize,
    });

    return {
      data: invitations.map((inv) => this.toResponseDto(inv)),
      total,
      page: effectivePage,
      pageSize: effectivePageSize,
    };
  }

  // ─── Private Helpers ────────────────────────────────────────────────────────

  /**
   * Kiểm tra email đã là member của project chưa
   * Cần join với User table vì ProjectMember lưu userId, không lưu email
   */
  private async findExistingMember(
    email: string,
    projectId: string,
  ): Promise<ProjectMember | null> {
    const user = await this.userRepository.findOne({
      where: { email },
    });

    if (!user) {
      return null;
    }

    return this.projectMemberRepository.findOne({
      where: { userId: user.id, projectId },
    });
  }

  /**
   * Chuyển đổi Invitation entity thành response DTO
   */
  private toResponseDto(invitation: Invitation): InvitationResponseDto {
    return {
      id: invitation.id,
      projectId: invitation.projectId,
      email: invitation.email,
      projectRole: invitation.projectRole,
      status: invitation.status,
      invitedBy: invitation.invitedBy,
      acceptedBy: invitation.acceptedBy,
      expiresAt: invitation.expiresAt.toISOString(),
      createdAt: invitation.createdAt.toISOString(),
      updatedAt: invitation.updatedAt.toISOString(),
    };
  }
}
