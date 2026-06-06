import {
  Injectable,
  Logger,
  UnauthorizedException,
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

/** Kết quả xác thực thành công — trả về cho controller */
export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  sessionId: string;
}

/** TTL cho refresh token blacklist (7 ngày tính bằng giây) */
const REFRESH_TOKEN_TTL_SECONDS = 604_800;

/**
 * Auth Service — điều phối toàn bộ authentication flow
 *
 * Chịu trách nhiệm:
 * - OAuth2 callback: exchange code, validate ID token, upsert user, issue tokens
 * - Token refresh: rotation, blacklist old token
 * - Logout: revoke session, notify Authentik
 * - Token theft detection: full session invalidation
 * - Security event handling: forced-logout within 5 seconds
 *
 * Dependencies:
 * - AuthentikService: HTTP calls đến Authentik OAuth2 provider
 * - UserProvisionService: upsert user và load project roles
 * - TokenService: sign/verify JWT tokens
 * - SessionService: quản lý sessions trong Redis
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

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

  // ─── Token Refresh ────────────────────────────────────────────────────────────

  /**
   * Refresh tokens — token rotation
   *
   * Flow:
   * 1. Hash refresh token và check blacklist
   * 2. Nếu token đã bị blacklist → token theft detected → full invalidation
   * 3. Verify refresh token hợp lệ (tìm session chứa hash)
   * 4. Generate new token pair
   * 5. Blacklist old refresh token
   * 6. Update session với new refresh token hash
   *
   * @param refreshToken - Refresh token từ httpOnly cookie
   * @param ipAddress - IP address hiện tại
   * @param deviceInfo - Device info hiện tại
   * @returns AuthResult mới
   * @throws UnauthorizedException nếu token không hợp lệ hoặc bị revoke
   */
  async refreshTokens(
    refreshToken: string,
    ipAddress: string,
    deviceInfo: string,
  ): Promise<AuthResult> {
    const tokenHash = this.tokenService.hashToken(refreshToken);

    // Check blacklist — nếu token đã bị revoke → token theft
    const isBlacklisted = await this.sessionService.isRefreshTokenBlacklisted(tokenHash);
    if (isBlacklisted) {
      this.logger.warn('Revoked refresh token reuse detected');

      const userId = await this.sessionService.findUserByRefreshTokenHash(tokenHash);
      if (userId) {
        await this.handleTokenTheft(userId, ipAddress, deviceInfo);
      }

      throw new UnauthorizedException('TOKEN_INVALID');
    }

    // Tìm session chứa refresh token hash này
    const sessionInfo = await this.findSessionByRefreshTokenHash(tokenHash);
    if (!sessionInfo) {
      throw new UnauthorizedException('TOKEN_INVALID');
    }

    const { userId, sessionId } = sessionInfo;

    // Check forced-logout
    const isForceLoggedOut = await this.sessionService.isForceLoggedOut(userId);
    if (isForceLoggedOut) {
      throw new UnauthorizedException('SESSION_REVOKED');
    }

    // Load user data cho JWT payload
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('TOKEN_INVALID');
    }

    // Load project roles
    const projectRoles = await this.userProvisionService.loadProjectRoles(userId);

    // Generate new token pair
    const jwtPayload: Omit<JwtPayload, 'iat' | 'exp'> = {
      sub: user.id,
      email: user.email,
      systemRole: user.systemRole,
      projectRoles,
    };

    const newAccessToken = this.tokenService.signAccessToken(jwtPayload);
    const { token: newRefreshToken, hash: newRefreshTokenHash } =
      this.tokenService.generateRefreshToken();

    // Blacklist old refresh token
    await this.sessionService.blacklistRefreshToken(tokenHash, REFRESH_TOKEN_TTL_SECONDS);

    // Update session với new refresh token hash
    await this.updateSessionRefreshToken(userId, sessionId, newRefreshTokenHash);

    // Update last activity
    await this.sessionService.updateLastActivity(userId, sessionId);

    // Audit log
    this.logAuditEvent(AuthEvent.TOKEN_REFRESH, userId, ipAddress, deviceInfo, {
      sessionId,
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      sessionId,
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

  // ─── Token Theft Handling ─────────────────────────────────────────────────────

  /**
   * Xử lý token theft — full session invalidation
   *
   * Khi phát hiện refresh token đã revoke bị reuse:
   * 1. Revoke tất cả sessions của user
   * 2. Thêm user vào forced-logout list
   * 3. Ghi audit log
   *
   * @param userId - ID người dùng bị ảnh hưởng
   * @param ipAddress - IP address của request gây ra detection
   * @param deviceInfo - Device info
   */
  async handleTokenTheft(
    userId: string,
    ipAddress: string,
    deviceInfo: string,
  ): Promise<void> {
    this.logger.warn(`Token theft detected for user ${userId}`);

    await this.sessionService.revokeAllSessions(userId);
    await this.sessionService.addToForcedLogout(userId);

    this.logAuditEvent(AuthEvent.TOKEN_THEFT_DETECTED, userId, ipAddress, deviceInfo, {
      action: 'full_session_invalidation',
    });
  }

  // ─── Security Event Handling ──────────────────────────────────────────────────

  /**
   * Xử lý security event — full session invalidation within 5 seconds
   *
   * Triggered bởi:
   * - Password change từ Authentik
   * - Admin disable account
   * - Bất kỳ security event nào yêu cầu invalidation
   *
   * @param userId - ID người dùng
   * @param eventType - Loại event (từ AuthEvent constants)
   * @param ipAddress - IP address (optional, có thể là system event)
   * @param deviceInfo - Device info (optional)
   */
  async handleSecurityEvent(
    userId: string,
    eventType: string,
    ipAddress: string = 'system',
    deviceInfo: string = 'system',
  ): Promise<void> {
    this.logger.warn(
      `Security event "${eventType}" for user ${userId} — initiating full invalidation`,
    );

    await this.sessionService.revokeAllSessions(userId);
    await this.sessionService.addToForcedLogout(userId);

    this.logAuditEvent(eventType, userId, ipAddress, deviceInfo, {
      action: 'security_event_invalidation',
      trigger: eventType,
    });
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────────

  /**
   * Tìm session chứa refresh token hash
   *
   * Scan tất cả sessions để tìm session có refreshTokenHash khớp.
   * Trả về userId và sessionId nếu tìm thấy.
   */
  private async findSessionByRefreshTokenHash(
    tokenHash: string,
  ): Promise<{ userId: string; sessionId: string } | null> {
    const userId = await this.sessionService.findUserByRefreshTokenHash(tokenHash);
    if (!userId) {
      return null;
    }

    const sessions = await this.sessionService.listSessions(userId);
    const session = sessions.find((s) => s.refreshTokenHash === tokenHash);

    if (!session) {
      return null;
    }

    return { userId, sessionId: session.sessionId };
  }

  /**
   * Update session với refresh token hash mới (sau rotation)
   */
  private async updateSessionRefreshToken(
    userId: string,
    sessionId: string,
    newRefreshTokenHash: string,
  ): Promise<void> {
    const session = await this.sessionService.getSession(userId, sessionId);
    if (session) {
      await this.sessionService.updateRefreshTokenHash(
        userId,
        sessionId,
        session.refreshTokenHash,
        newRefreshTokenHash,
      );
    }
  }

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
