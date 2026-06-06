import {
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { JwtPayload } from '@mpm/shared-types';
import { TokenService } from './token.service';
import { SessionService } from './session.service';
import { AuthentikService } from './authentik.service';
import { UserProvisionService } from './user-provision.service';
import { User } from './entities/user.entity';
import { AuthEvent } from './constants/auth-events';
import type { AuthResult } from './auth.service';

/**
 * Auth OAuth Service — xử lý OAuth2 callback flow và logout
 *
 * Chịu trách nhiệm:
 * - OAuth2 callback: exchange code, validate ID token, upsert user, issue tokens
 * - Logout: revoke session, notify Authentik
 *
 * Dependencies:
 * - AuthentikService: HTTP calls đến Authentik OAuth2 provider
 * - UserProvisionService: upsert user và load project roles
 * - TokenService: sign/verify JWT tokens
 * - SessionService: quản lý sessions trong Redis
 */
@Injectable()
export class AuthOAuthService {
  private readonly logger = new Logger(AuthOAuthService.name);

  constructor(
    private readonly tokenService: TokenService,
    private readonly sessionService: SessionService,
    private readonly authentikService: AuthentikService,
    private readonly userProvisionService: UserProvisionService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  // ─── OAuth2 Callback ──────────────────────────────────────────────────────────

  /**
   * Xử lý OAuth2 callback từ Authentik
   *
   * Flow:
   * 1. Exchange authorization code lấy tokens từ Authentik (timeout 10s)
   * 2. Decode và validate ID token
   * 3. Upsert user trong PostgreSQL
   * 4. Load project roles
   * 5. Generate Access Token + Refresh Token
   * 6. Create session trong Redis
   *
   * @param code - Authorization code từ Authentik
   * @param state - State parameter (đã được validate ở client)
   * @param ipAddress - IP address của client
   * @param deviceInfo - User-Agent hoặc device info
   * @returns AuthResult chứa accessToken, refreshToken, sessionId
   * @throws UnauthorizedException nếu code không hợp lệ hoặc ID token invalid
   * @throws BadGatewayException nếu Authentik không phản hồi trong 10s
   */
  async handleCallback(
    code: string,
    state: string,
    ipAddress: string,
    deviceInfo: string,
  ): Promise<AuthResult> {
    // Bước 1: Exchange code với Authentik token endpoint
    const tokenResponse = await this.authentikService.exchangeCodeForTokens(code);

    // Bước 2: Decode và validate ID token claims
    const claims = this.authentikService.decodeAndValidateIdToken(tokenResponse.id_token);

    // Bước 3: Upsert user trong PostgreSQL
    const user = await this.userProvisionService.upsertUser(claims);

    // Bước 3b: Xóa forced-logout flag — user vừa re-authenticate thành công
    await this.sessionService.removeFromForcedLogout(user.id);

    // Bước 4: Load project roles cho user
    const projectRoles = await this.userProvisionService.loadProjectRoles(user.id);

    // Bước 5: Generate token pair
    const jwtPayload: Omit<JwtPayload, 'iat' | 'exp'> = {
      sub: user.id,
      email: user.email,
      systemRole: user.systemRole,
      projectRoles,
    };

    const accessToken = this.tokenService.signAccessToken(jwtPayload);
    const { token: refreshToken, hash: refreshTokenHash } =
      this.tokenService.generateRefreshToken();

    // Bước 6: Create session
    const session = await this.sessionService.createSession(
      user.id,
      deviceInfo,
      ipAddress,
      refreshTokenHash,
    );

    // Audit log: login thành công
    this.logAuditEvent(AuthEvent.LOGIN_SUCCESS, user.id, ipAddress, deviceInfo, {
      sessionId: session.sessionId,
    });

    return {
      accessToken,
      refreshToken,
      sessionId: session.sessionId,
    };
  }

  // ─── Logout ───────────────────────────────────────────────────────────────────

  /**
   * Đăng xuất — revoke session và notify Authentik
   *
   * Flow:
   * 1. Revoke session trong Redis (xóa session + blacklist refresh token)
   * 2. Notify Authentik end-session endpoint (timeout 5s, graceful)
   *
   * @param userId - ID người dùng
   * @param sessionId - Session cần revoke
   * @param ipAddress - IP address
   * @param deviceInfo - Device info
   */
  async logout(
    userId: string,
    sessionId: string,
    ipAddress: string,
    deviceInfo: string,
  ): Promise<void> {
    // Revoke session (xóa khỏi Redis + blacklist refresh token)
    await this.sessionService.revokeSession(userId, sessionId);

    // Notify Authentik end-session (graceful — không block nếu fail)
    await this.authentikService.notifyEndSession(userId);

    // Audit log
    this.logAuditEvent(AuthEvent.LOGOUT, userId, ipAddress, deviceInfo, {
      sessionId,
    });
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────────

  /**
   * Ghi audit log event
   *
   * Non-blocking — sử dụng Logger thay vì AuditService (sẽ wire sau).
   * Không throw exception nếu ghi log thất bại.
   */
  private logAuditEvent(
    eventType: string,
    userId: string,
    ipAddress: string,
    deviceInfo: string,
    metadata: Record<string, unknown>,
  ): void {
    this.logger.log({
      message: `[AUDIT] ${eventType}`,
      eventType,
      userId,
      ipAddress,
      userAgent: deviceInfo,
      timestamp: new Date().toISOString(),
      metadata,
    });
  }
}
