import { IsOptional, Length, MaxLength, IsUrl } from 'class-validator';

/**
 * DTO cho PATCH /api/profile — cập nhật thông tin cá nhân
 *
 * Cả hai trường đều optional (partial update).
 * Validate:
 * - display_name: 1-100 ký tự
 * - avatar_url: URL hợp lệ (http/https), tối đa 2048 ký tự
 */
export class UpdateProfileDto {
  @IsOptional()
  @Length(1, 100, {
    message: 'display_name must be between 1 and 100 characters',
  })
  displayName?: string;

  @IsOptional()
  @IsUrl(
    { protocols: ['http', 'https'], require_protocol: true },
    { message: 'avatar_url must be a valid URL with http or https protocol' },
  )
  @MaxLength(2048, {
    message: 'avatar_url must not exceed 2048 characters',
  })
  avatarUrl?: string;
}
