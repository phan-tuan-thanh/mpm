import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../auth/entities/user.entity';
import { ProjectMember } from '../auth/entities/project-member.entity';
import type { ProfileResponseDto } from './dto/profile-response.dto';
import type { UpdateProfileDto } from './dto/update-profile.dto';

/**
 * Profile Service — quản lý thông tin cá nhân người dùng
 *
 * Chức năng:
 * - Lấy profile kèm danh sách projects + roles
 * - Cập nhật display_name và/hoặc avatar_url
 * - Skip database write nếu không có thay đổi thực sự
 */
@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(ProjectMember)
    private readonly projectMemberRepository: Repository<ProjectMember>,
  ) {}

  /**
   * Lấy profile đầy đủ của user hiện tại
   *
   * Bao gồm: display_name, email, avatar_url, system_role, danh sách projects + roles
   *
   * @param userId - ID người dùng (từ JWT)
   * @returns ProfileResponseDto
   * @throws NotFoundException nếu user không tồn tại
   */
  async getProfile(userId: string): Promise<ProfileResponseDto> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const projectMembers = await this.projectMemberRepository.find({
      where: { userId },
    });

    return this.toProfileResponse(user, projectMembers);
  }

  /**
   * Cập nhật profile người dùng
   *
   * Logic:
   * 1. Load user hiện tại từ DB
   * 2. So sánh từng trường với data hiện tại
   * 3. Nếu không có thay đổi → trả về profile hiện tại (skip DB write)
   * 4. Nếu có thay đổi → update và save
   *
   * @param userId - ID người dùng (từ JWT)
   * @param dto - Dữ liệu cập nhật (partial)
   * @returns ProfileResponseDto — profile sau cập nhật
   * @throws NotFoundException nếu user không tồn tại
   */
  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<ProfileResponseDto> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // So sánh để xác định có thay đổi thực sự không
    let hasChanges = false;

    if (dto.displayName !== undefined && dto.displayName !== user.displayName) {
      user.displayName = dto.displayName;
      hasChanges = true;
    }

    if (dto.avatarUrl !== undefined && dto.avatarUrl !== user.avatarUrl) {
      user.avatarUrl = dto.avatarUrl;
      hasChanges = true;
    }

    // Skip DB write nếu không có thay đổi
    if (hasChanges) {
      await this.userRepository.save(user);
    }

    const projectMembers = await this.projectMemberRepository.find({
      where: { userId },
    });

    return this.toProfileResponse(user, projectMembers);
  }

  // ─── Private Helpers ────────────────────────────────────────────────────────

  /**
   * Chuyển đổi User entity + ProjectMember[] thành ProfileResponseDto
   */
  private toProfileResponse(
    user: User,
    projectMembers: ProjectMember[],
  ): ProfileResponseDto {
    return {
      id: user.id,
      displayName: user.displayName,
      email: user.email,
      avatarUrl: user.avatarUrl,
      systemRole: user.systemRole,
      projects: projectMembers.map((pm) => ({
        projectId: pm.projectId,
        role: pm.projectRole,
      })),
    };
  }
}
