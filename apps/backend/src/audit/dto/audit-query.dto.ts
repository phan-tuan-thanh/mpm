import {
  IsOptional,
  IsUUID,
  IsString,
  IsInt,
  Min,
  Max,
  IsDateString,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Các giá trị hợp lệ cho event_type filter
 * Phải khớp với audit_event_type_enum trong PostgreSQL
 */
const VALID_EVENT_TYPES = [
  'login_success',
  'login_failed',
  'logout',
  'token_refresh',
  'token_refresh_failed',
  'token_theft_detected',
  'system_role_changed',
  'project_role_changed',
  'session_revoked',
  'all_sessions_revoked',
  'rate_limit_login',
  'rate_limit_refresh',
  'account_disabled',
  'account_enabled',
  'password_changed',
  'invitation_created',
  'invitation_accepted',
  'invitation_cancelled',
  'access_denied',
  'profile_updated',
] as const;

/**
 * DTO cho query parameters của GET /api/admin/audit-logs
 *
 * Hỗ trợ filter theo:
 * - user_id (UUID)
 * - event_type (audit_event_type_enum value)
 * - startDate / endDate (ISO 8601 date string)
 *
 * Pagination:
 * - page: số trang (default 1, min 1)
 * - pageSize: số records mỗi trang (default 20, min 1, max 100)
 */
export class AuditQueryDto {
  @IsOptional()
  @IsUUID('4', { message: 'userId must be a valid UUID v4' })
  userId?: string;

  @IsOptional()
  @IsString()
  @IsIn(VALID_EVENT_TYPES, {
    message: `eventType must be one of: ${VALID_EVENT_TYPES.join(', ')}`,
  })
  eventType?: string;

  @IsOptional()
  @IsDateString({}, { message: 'startDate must be a valid ISO 8601 date string' })
  startDate?: string;

  @IsOptional()
  @IsDateString({}, { message: 'endDate must be a valid ISO 8601 date string' })
  endDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;
}
