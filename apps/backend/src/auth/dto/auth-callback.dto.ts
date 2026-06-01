import { IsString, IsNotEmpty } from 'class-validator';

/**
 * DTO cho OAuth2 callback request
 *
 * Validate authorization code và state parameter từ Authentik redirect.
 * State parameter dùng để chống CSRF — phải khớp với giá trị client đã lưu.
 *
 * Validates: Requirements 1.2, 1.9
 */
export class AuthCallbackDto {
  /** Authorization code từ Authentik */
  @IsString()
  @IsNotEmpty()
  code!: string;

  /** State parameter — chống CSRF, phải khớp với giá trị đã lưu trong sessionStorage */
  @IsString()
  @IsNotEmpty()
  state!: string;
}
