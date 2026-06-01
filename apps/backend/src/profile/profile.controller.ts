import {
  Controller,
  Get,
  Patch,
  Body,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/decorators/current-user.decorator';
import { ProfileService } from './profile.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import type { ProfileResponseDto } from './dto/profile-response.dto';

/**
 * Profile Controller — quản lý thông tin cá nhân người dùng
 *
 * Endpoints:
 * - GET  /api/profile — xem profile hiện tại
 * - PATCH /api/profile — cập nhật display_name và/hoặc avatar_url
 *
 * Tất cả endpoints yêu cầu authentication (JWT Auth Guard global).
 * Sử dụng @CurrentUser() để lấy thông tin user từ request context.
 */
@Controller('api/profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  /**
   * GET /api/profile — Lấy thông tin profile người dùng hiện tại
   *
   * Trả về: display_name, email, avatar_url, system_role, danh sách projects + roles
   */
  @Get()
  async getProfile(
    @CurrentUser() user: RequestUser,
  ): Promise<ProfileResponseDto> {
    return this.profileService.getProfile(user.id);
  }

  /**
   * PATCH /api/profile — Cập nhật thông tin cá nhân
   *
   * Body (partial):
   * - displayName: string (1-100 chars)
   * - avatarUrl: string (http/https URL, max 2048 chars)
   *
   * Trả về HTTP 400 với field-level errors nếu validation thất bại.
   * Skip DB write nếu không có thay đổi so với data hiện tại.
   */
  @Patch()
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  async updateProfile(
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateProfileDto,
  ): Promise<ProfileResponseDto> {
    return this.profileService.updateProfile(user.id, dto);
  }
}
