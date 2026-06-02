import {
  Injectable,
  Logger,
  UnauthorizedException,
  BadGatewayException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { firstValueFrom, timeout, catchError } from 'rxjs';
import type { JwtPayload, ProjectRoleEntry } from '@mpm/shared-types';
import { TokenService } from './token.service';
import { SessionService } from './session.service';
import { User } from './entities/user.entity';
import { ProjectMember } from './entities/project-member.entity';
import { AuthEvent } from './constants/auth-events';

/** Kết quả xác thực thành công — trả về cho controller */
export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  sessionId: string;
}

/** Claims từ Authentik ID token */
interface AuthentikIdTokenClaims {
  sub: string;
  email: string;
  name?: string;
  preferred_username?: string;
  exp: number;
  iat: number;
}

/** Response từ Authentik token endpoint */
interface AuthentikTokenResponse {
  access_token: string;
  id_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
}

/** Timeout cho Authentik API calls (ms) */
const AUTHENTIK_TIMEOUT_MS = 10_000;

/** Timeout cho Authentik end-session call (ms) */
const END_SESSION_TIMEOUT_MS = 5_000;

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
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  /** Authentik configuration — loaded from environment */
  private readonly authentikTokenUrl: string;
  private readonly authentikEndSessionUrl: string;
  private readonly authentikClientId: string;
  private readonly authentikClientSecret: string;
  private readonly authentikRedirectUri: string;

  constructor(
    private readonly tokenService: TokenService,
    private readonly sessionService: SessionService,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(ProjectMember)
    private readonly projectMemberRepository: Repository<ProjectMember>,
  ) {
    this.authentikTokenUrl = this.configService.getOrThrow<string>('AUTHENTIK_TOKEN_URL');
    this.authentikEndSessionUrl = this.configService.getOrThrow<string>('AUTHENTIK_END_SESSION_URL');
    this.authentikClientId = this.configService.getOrThrow<string>('AUTHENTIK_CLIENT_ID');
    this.authentikClientSecret = this.configService.getOrThrow<string>('AUTHENTIK_CLIENT_SECRET');
    this.authentikRedirectUri = this.configService.getOrThrow<string>('AUTHENTIK_REDIRECT_URI');
  }

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
    const tokenResponse = await this.exchangeCodeForTokens(code);

    // Bước 2: Decode và validate ID token claims
    const claims = this.decodeAndValidateIdToken(tokenResponse.id_token);

    // Bước 3: Upsert user trong PostgreSQL
    const user = await this.upsertUser(claims);

    // Bước 3b: Xóa forced-logout flag — user vừa re-authenticate thành công
    // Flag này được set khi role thay đổi để buộc re-login; sau khi login xong phải clear
    await this.sessionService.removeFromForcedLogout(user.id);

    // Bước 4: Load project roles cho user
    const projectRoles = await this.loadProjectRoles(user.id);

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
      // Cần tìm userId từ token — decode session data
      // Token đã bị blacklist nghĩa là đã có session trước đó
      // Tìm user thông qua scan sessions (hoặc lưu metadata)
      // Trong trường hợp này, log warning và reject
      this.logger.warn('Revoked refresh token reuse detected');

      // Tìm userId từ sessions có refreshTokenHash khớp
      const userId = await this.findUserByRefreshTokenHash(tokenHash);
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
    const projectRoles = await this.loadProjectRoles(userId);

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
    await this.notifyAuthentikEndSession(userId);

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

    // Revoke tất cả sessions
    await this.sessionService.revokeAllSessions(userId);

    // Thêm vào forced-logout list (TTL 15 phút)
    await this.sessionService.addToForcedLogout(userId);

    // Audit log
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

    // Revoke tất cả sessions (bao gồm blacklist tất cả refresh tokens)
    await this.sessionService.revokeAllSessions(userId);

    // Thêm vào forced-logout list
    await this.sessionService.addToForcedLogout(userId);

    // Audit log
    this.logAuditEvent(eventType, userId, ipAddress, deviceInfo, {
      action: 'security_event_invalidation',
      trigger: eventType,
    });
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────────

  /**
   * Exchange authorization code với Authentik token endpoint
   *
   * @throws UnauthorizedException nếu code không hợp lệ
   * @throws BadGatewayException nếu Authentik timeout (10s)
   */
  private async exchangeCodeForTokens(code: string): Promise<AuthentikTokenResponse> {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: this.authentikClientId,
      client_secret: this.authentikClientSecret,
      redirect_uri: this.authentikRedirectUri,
    });

    try {
      const response = await firstValueFrom(
        this.httpService
          .post<AuthentikTokenResponse>(this.authentikTokenUrl, params.toString(), {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            timeout: AUTHENTIK_TIMEOUT_MS,
          })
          .pipe(
            timeout(AUTHENTIK_TIMEOUT_MS),
            catchError((error: unknown) => {
              throw error;
            }),
          ),
      );

      return response.data;
    } catch (error: unknown) {
      if (this.isTimeoutError(error)) {
        this.logger.error('Authentik token endpoint timeout (10s)');
        throw new BadGatewayException('PROVIDER_TIMEOUT');
      }

      // Authentik trả về lỗi (invalid code, etc.)
      this.logger.error(
        `Authentik token exchange failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new UnauthorizedException('INVALID_CODE');
    }
  }

  /**
   * Decode và validate ID token claims
   *
   * Lưu ý: Trong production, cần verify signature với Authentik JWKS.
   * Hiện tại decode payload và validate expiry.
   * Authentik đã verify token khi trả về từ token endpoint.
   *
   * @throws UnauthorizedException nếu token expired hoặc malformed
   */
  private decodeAndValidateIdToken(idToken: string): AuthentikIdTokenClaims {
    try {
      const parts = idToken.split('.');
      if (parts.length !== 3) {
        throw new UnauthorizedException('TOKEN_INVALID');
      }

      const payload = JSON.parse(
        Buffer.from(parts[1], 'base64url').toString('utf-8'),
      ) as AuthentikIdTokenClaims;

      // Validate required claims
      if (!payload.sub || !payload.email) {
        throw new UnauthorizedException('TOKEN_INVALID');
      }

      // Validate expiry
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < now) {
        throw new UnauthorizedException('TOKEN_EXPIRED');
      }

      return payload;
    } catch (error: unknown) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error(
        `ID token decode failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new UnauthorizedException('TOKEN_INVALID');
    }
  }

  /**
   * Upsert user trong PostgreSQL
   *
   * - Nếu user tồn tại (theo external_id): cập nhật email (Authentik là source of truth)
   * - Nếu user mới: tạo với systemRole = 'User' (default)
   *
   * @returns User entity (đã lưu)
   */
  private async upsertUser(claims: AuthentikIdTokenClaims): Promise<User> {
    let user = await this.userRepository.findOne({
      where: { externalId: claims.sub },
    });

    if (user) {
      // Cập nhật email nếu thay đổi (Authentik là source of truth cho email)
      let needsUpdate = false;

      if (user.email !== claims.email) {
        user.email = claims.email;
        needsUpdate = true;
      }

      // Cập nhật display name từ Authentik nếu user chưa tự set
      // (chỉ khi lần đầu hoặc display name trống)
      if (claims.name && !user.displayName) {
        user.displayName = claims.name;
        needsUpdate = true;
      }

      if (needsUpdate) {
        user = await this.userRepository.save(user);
      }

      return user;
    }

    // Đọc INITIAL_ADMIN_EMAIL từ ConfigService (optional)
    const initialAdminEmail = this.configService.get<string>('INITIAL_ADMIN_EMAIL');
    const isInitialAdmin =
      !!claims.email &&
      !!initialAdminEmail &&
      claims.email.toLowerCase() === initialAdminEmail.trim().toLowerCase();

    if (isInitialAdmin) {
      this.logger.log('[BOOTSTRAP] Initial admin created');
    }

    // Tạo user mới với role thích hợp
    const newUser = this.userRepository.create({
      externalId: claims.sub,
      email: claims.email,
      displayName: claims.name || claims.preferred_username || claims.email.split('@')[0],
      systemRole: isInitialAdmin ? 'Admin' : 'User',
      isActive: true,
    });

    return this.userRepository.save(newUser);
  }

  /**
   * Load project roles cho user từ PostgreSQL
   */
  private async loadProjectRoles(userId: string): Promise<ProjectRoleEntry[]> {
    const members = await this.projectMemberRepository.find({
      where: { userId },
    });

    return members.map((member) => ({
      projectId: member.projectId,
      role: member.projectRole,
    }));
  }

  /**
   * Tìm session chứa refresh token hash
   *
   * Scan tất cả sessions để tìm session có refreshTokenHash khớp.
   * Trả về userId và sessionId nếu tìm thấy.
   */
  private async findSessionByRefreshTokenHash(
    tokenHash: string,
  ): Promise<{ userId: string; sessionId: string } | null> {
    // Lấy tất cả session keys từ Redis thông qua SessionService
    // Vì SessionService không expose method này trực tiếp,
    // ta cần tìm user thông qua metadata hoặc scan
    // Workaround: dùng findUserByRefreshTokenHash rồi list sessions
    const userId = await this.findUserByRefreshTokenHash(tokenHash);
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
   * Tìm userId từ refresh token hash qua key `refresh_owner:{tokenHash}` trong Redis
   */
  private async findUserByRefreshTokenHash(
    tokenHash: string,
  ): Promise<string | null> {
    return this.sessionService.findUserByRefreshTokenHash(tokenHash);
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
   * Notify Authentik end-session endpoint
   *
   * Timeout 5 giây, graceful degradation — nếu fail thì vẫn hoàn tất logout local.
   */
  private async notifyAuthentikEndSession(userId: string): Promise<void> {
    try {
      await firstValueFrom(
        this.httpService
          .post(
            this.authentikEndSessionUrl,
            { user_id: userId },
            { timeout: END_SESSION_TIMEOUT_MS },
          )
          .pipe(
            timeout(END_SESSION_TIMEOUT_MS),
            catchError((error: unknown) => {
              throw error;
            }),
          ),
      );
    } catch (error: unknown) {
      // Graceful degradation — log warning nhưng không throw
      // Logout local đã hoàn tất, Authentik session sẽ expire tự nhiên
      this.logger.warn(
        `Authentik end-session notification failed for user ${userId}: ` +
          `${error instanceof Error ? error.message : 'Unknown error'}. ` +
          'Local logout completed successfully.',
      );

      // Audit log cảnh báo
      this.logAuditEvent(
        AuthEvent.LOGOUT,
        userId,
        'system',
        'system',
        {
          warning: 'authentik_end_session_failed',
          reason: error instanceof Error ? error.message : 'timeout_or_error',
        },
      );
    }
  }

  /**
   * Kiểm tra error có phải timeout không
   */
  private isTimeoutError(error: unknown): boolean {
    if (error instanceof Error) {
      const errorName = error.name;
      const errorMessage = error.message;
      return (
        errorName === 'TimeoutError' ||
        errorMessage.includes('timeout') ||
        errorMessage.includes('ETIMEDOUT') ||
        errorMessage.includes('ECONNABORTED')
      );
    }
    return false;
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
    // Sử dụng Logger cho audit events (AuditService sẽ được wire sau)
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
