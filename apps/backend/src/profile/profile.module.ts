import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../auth/entities/user.entity';
import { ProjectMember } from '../auth/entities/project-member.entity';
import { ProfileService } from './profile.service';
import { ProfileController } from './profile.controller';

/**
 * Profile Module — quản lý thông tin cá nhân người dùng
 *
 * Cung cấp:
 * - GET /api/profile — xem profile (display_name, email, avatar_url, system_role, projects)
 * - PATCH /api/profile — cập nhật display_name và/hoặc avatar_url
 *
 * Dependencies:
 * - TypeORM: User entity, ProjectMember entity
 * - JWT Auth Guard (global) — bảo vệ tất cả endpoints
 *
 * Exports:
 * - ProfileService: cho các module khác sử dụng nếu cần
 */
@Module({
  imports: [TypeOrmModule.forFeature([User, ProjectMember])],
  controllers: [ProfileController],
  providers: [ProfileService],
  exports: [ProfileService],
})
export class ProfileModule {}
