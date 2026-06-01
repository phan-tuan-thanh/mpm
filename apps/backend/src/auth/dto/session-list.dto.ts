import { IsString, IsBoolean, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Thông tin một session đang hoạt động
 *
 * Validates: Requirements 2.4
 */
export class SessionInfoDto {
  /** Session ID (UUID) */
  @IsString()
  sessionId!: string;

  /** Thông tin thiết bị (User-Agent hoặc parsed device info) */
  @IsString()
  deviceInfo!: string;

  /** Địa chỉ IP của client */
  @IsString()
  ipAddress!: string;

  /** Thời gian tạo session (ISO 8601) */
  @IsString()
  createdAt!: string;

  /** Thời gian hoạt động cuối (ISO 8601) */
  @IsString()
  lastActivity!: string;

  /** Cờ đánh dấu session hiện tại */
  @IsBoolean()
  isCurrent!: boolean;
}

/**
 * DTO cho response danh sách sessions đang hoạt động
 *
 * Trả về tối đa 50 sessions của người dùng, mỗi session bao gồm
 * thông tin device, IP, thời gian, và cờ đánh dấu session hiện tại.
 *
 * Validates: Requirements 2.4
 */
export class SessionListDto {
  /** Danh sách sessions đang hoạt động */
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SessionInfoDto)
  sessions!: SessionInfoDto[];
}
