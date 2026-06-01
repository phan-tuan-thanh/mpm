/**
 * Audit event types cho authentication & authorization
 *
 * Sử dụng const enum để tối ưu bundle size (inline tại compile time)
 * và đảm bảo type safety khi ghi audit log.
 */

/** Các loại sự kiện audit liên quan đến authentication */
export const AuthEvent = {
  /** Đăng nhập thành công qua Authentik */
  LOGIN_SUCCESS: 'login_success',
  /** Đăng nhập thất bại (code không hợp lệ, provider error, etc.) */
  LOGIN_FAILED: 'login_failed',
  /** Đăng xuất */
  LOGOUT: 'logout',
  /** Refresh token thành công */
  TOKEN_REFRESH: 'token_refresh',
  /** Refresh token thất bại */
  TOKEN_REFRESH_FAILED: 'token_refresh_failed',
  /** Phát hiện token theft (refresh token đã revoke bị reuse) */
  TOKEN_THEFT_DETECTED: 'token_theft_detected',
  /** Thay đổi System Role */
  SYSTEM_ROLE_CHANGED: 'system_role_changed',
  /** Thay đổi Project Role */
  PROJECT_ROLE_CHANGED: 'project_role_changed',
  /** Thu hồi session cụ thể */
  SESSION_REVOKED: 'session_revoked',
  /** Thu hồi tất cả sessions (security event) */
  ALL_SESSIONS_REVOKED: 'all_sessions_revoked',
  /** Rate limit triggered cho login */
  RATE_LIMIT_LOGIN: 'rate_limit_login',
  /** Rate limit triggered cho refresh */
  RATE_LIMIT_REFRESH: 'rate_limit_refresh',
  /** Tài khoản bị disable bởi Admin */
  ACCOUNT_DISABLED: 'account_disabled',
  /** Tài khoản được enable lại bởi Admin */
  ACCOUNT_ENABLED: 'account_enabled',
  /** Password change detected từ Authentik */
  PASSWORD_CHANGED: 'password_changed',
  /** Tạo invitation mới */
  INVITATION_CREATED: 'invitation_created',
  /** Invitation được accept */
  INVITATION_ACCEPTED: 'invitation_accepted',
  /** Invitation bị cancel */
  INVITATION_CANCELLED: 'invitation_cancelled',
  /** Truy cập bị từ chối (insufficient role) */
  ACCESS_DENIED: 'access_denied',
  /** Profile được cập nhật */
  PROFILE_UPDATED: 'profile_updated',
} as const;

/** Type cho giá trị của AuthEvent */
export type AuthEventType = (typeof AuthEvent)[keyof typeof AuthEvent];
