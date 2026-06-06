import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { ProjectRoleEntry } from '@mpm/shared-types';
import { User } from './entities/user.entity';
import { ProjectMember } from './entities/project-member.entity';
import type { AuthentikIdTokenClaims } from './authentik.service';

/**
 * User Provision Service — quản lý lifecycle của User entity
 *
 * Chịu trách nhiệm:
 * - Upsert user khi đăng nhập OAuth2 (Authentik là source of truth cho email/displayName)
 * - Load project roles cho JWT payload
 *
 * Tách khỏi AuthService để tuân theo Single Responsibility Principle:
 * AuthService điều phối flow; UserProvisionService quản lý data.
 */
@Injectable()
export class UserProvisionService {
  private readonly logger = new Logger(UserProvisionService.name);

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(ProjectMember)
    private readonly projectMemberRepository: Repository<ProjectMember>,
  ) {}

  /**
   * Upsert user trong PostgreSQL
   *
   * Logic:
   * - Nếu user đã tồn tại (theo external_id từ Authentik):
   *   - Cập nhật email nếu thay đổi (Authentik là source of truth)
   *   - Cập nhật displayName nếu user chưa tự set (chưa có displayName)
   * - Nếu user mới:
   *   - Kiểm tra INITIAL_ADMIN_EMAIL → assign Admin role
   *   - Mặc định: systemRole = 'User'
   *
   * @param claims - Parsed claims từ Authentik ID token
   * @returns User entity đã được lưu
   */
  async upsertUser(claims: AuthentikIdTokenClaims): Promise<User> {
    let user = await this.userRepository.findOne({
      where: { externalId: claims.sub },
    });

    if (user) {
      let needsUpdate = false;

      // Cập nhật email nếu thay đổi (Authentik là source of truth cho email)
      if (user.email !== claims.email) {
        user.email = claims.email;
        needsUpdate = true;
      }

      // Cập nhật display name từ Authentik nếu user chưa tự set
      if (claims.name && !user.displayName) {
        user.displayName = claims.name;
        needsUpdate = true;
      }

      if (needsUpdate) {
        user = await this.userRepository.save(user);
      }

      return user;
    }

    // Đọc INITIAL_ADMIN_EMAIL từ ConfigService (optional)
    const initialAdminEmail = this.configService.get<string>('INITIAL_ADMIN_EMAIL');
    const isInitialAdmin =
      !!claims.email &&
      !!initialAdminEmail &&
      claims.email.toLowerCase() === initialAdminEmail.trim().toLowerCase();

    if (isInitialAdmin) {
      this.logger.log('[BOOTSTRAP] Initial admin created');
    }

    // Tạo user mới với role thích hợp
    const newUser = this.userRepository.create({
      externalId: claims.sub,
      email: claims.email,
      displayName: claims.name || claims.preferred_username || claims.email.split('@')[0],
      systemRole: isInitialAdmin ? 'Admin' : 'User',
      isActive: true,
    });

    return this.userRepository.save(newUser);
  }

  /**
   * Load project roles cho user từ PostgreSQL
   *
   * Được dùng khi build JWT payload để embed project roles vào token,
   * tránh phải query DB mỗi request.
   *
   * @param userId - ID người dùng
   * @returns Mảng ProjectRoleEntry [{projectId, role}]
   */
  async loadProjectRoles(userId: string): Promise<ProjectRoleEntry[]> {
    const members = await this.projectMemberRepository.find({
      where: { userId },
    });

    return members.map((member) => ({
      projectId: member.projectId,
      role: member.projectRole,
    }));
  }
}
