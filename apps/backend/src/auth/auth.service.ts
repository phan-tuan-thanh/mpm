import { Injectable } from '@nestjs/common';
import { AuthOAuthService } from './auth-oauth.service';
import { AuthTokenService } from './auth-token.service';

/** Kết quả xác thực thành công — trả về cho controller */
export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  sessionId: string;
}

/**
 * Auth Service — Facade điều phối toàn bộ authentication flow
 *
 * Delegate đến các sub-services chuyên biệt:
 * - AuthOAuthService: OAuth2 callback flow và logout
 * - AuthTokenService: Token refresh, theft detection và security events
 *
 * Giữ interface public ổn định cho AuthController và các consumers khác.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly oauthService: AuthOAuthService,
    private readonly tokenSvc: AuthTokenService,
  ) {}

  // ─── OAuth2 Callback ──────────────────────────────────────────────────────────

  /** @see AuthOAuthService.handleCallback */
  async handleCallback(
    code: string,
    state: string,
    ipAddress: string,
    deviceInfo: string,
  ): Promise<AuthResult> {
    return this.oauthService.handleCallback(code, state, ipAddress, deviceInfo);
  }

  // ─── Token Refresh ────────────────────────────────────────────────────────────

  /** @see AuthTokenService.refreshTokens */
  async refreshTokens(
    refreshToken: string,
    ipAddress: string,
    deviceInfo: string,
  ): Promise<AuthResult> {
    return this.tokenSvc.refreshTokens(refreshToken, ipAddress, deviceInfo);
  }

  // ─── Logout ───────────────────────────────────────────────────────────────────

  /** @see AuthOAuthService.logout */
  async logout(
    userId: string,
    sessionId: string,
    ipAddress: string,
    deviceInfo: string,
  ): Promise<void> {
    return this.oauthService.logout(userId, sessionId, ipAddress, deviceInfo);
  }

  // ─── Token Theft Handling ─────────────────────────────────────────────────────

  /** @see AuthTokenService.handleTokenTheft */
  async handleTokenTheft(
    userId: string,
    ipAddress: string,
    deviceInfo: string,
  ): Promise<void> {
    return this.tokenSvc.handleTokenTheft(userId, ipAddress, deviceInfo);
  }

  // ─── Security Event Handling ──────────────────────────────────────────────────

  /** @see AuthTokenService.handleSecurityEvent */
  async handleSecurityEvent(
    userId: string,
    eventType: string,
    ipAddress: string = 'system',
    deviceInfo: string = 'system',
  ): Promise<void> {
    return this.tokenSvc.handleSecurityEvent(userId, eventType, ipAddress, deviceInfo);
  }
}
