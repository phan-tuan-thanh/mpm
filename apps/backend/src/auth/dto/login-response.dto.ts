/**
 * DTO cho login/callback response
 *
 * Trả về accessToken cho client lưu trong memory.
 * Refresh token được set qua httpOnly cookie (không nằm trong response body).
 *
 * Validates: Requirements 1.5, 1.6
 */
export class LoginResponseDto {
  /** JWT Access Token (RS256, thời hạn 15 phút) */
  accessToken!: string;
}
