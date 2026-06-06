import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { JwtPayload } from '@mpm/shared-types';
import { TokenService } from './token.service';
import { SessionService } from './session.service';
import { UserProvisionService } from './user-provision.service';
import { User } from './entities/user.entity';
import { AuthEvent } from './constants/auth-events';
import type { AuthResult } from './auth.service';
import { logAuditEvent, handleTokenTheft, handleSecurityEvent } from './auth-token-operations.utils';
import { verifyActiveSession, rotateSessionTokens, checkBlacklistedToken } from './auth-token-session.utils';
/** TTL cho refresh token blacklist (7 ngày tính bằng giây) */
const REFRESH_TOKEN_TTL_SECONDS = 604_800;
/**
 * Auth Token Service — quản lý token refresh, theft detection và security events
 */
@Injectable()
export class AuthTokenService {
  private readonly logger = new Logger(AuthTokenService.name);
  constructor(
    private readonly tokenService: TokenService,
    private readonly sessionService: SessionService,
    private readonly userProvisionService: UserProvisionService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Refresh tokens — token rotation
   */
  async refreshTokens(
    refreshToken: string,
    ipAddress: string,
    deviceInfo: string,
  ): Promise<AuthResult> {
    const tokenHash = this.tokenService.hashToken(refreshToken);

    await checkBlacklistedToken(
      this.sessionService,
      tokenHash,
      this.logger,
      (userId) => this.handleTokenTheft(userId, ipAddress, deviceInfo),
    );

    const { userId, sessionId } = await verifyActiveSession(this.sessionService, tokenHash);
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('TOKEN_INVALID');
    }
    const projectRoles = await this.userProvisionService.loadProjectRoles(userId);
    const jwtPayload: Omit<JwtPayload, 'iat' | 'exp'> = {
      sub: user.id,
      email: user.email,
      systemRole: user.systemRole,
      projectRoles,
    };
    const tokens = await rotateSessionTokens(
      this.sessionService,
      this.tokenService,
      userId,
      sessionId,
      tokenHash,
      jwtPayload,
      REFRESH_TOKEN_TTL_SECONDS,
    );
    logAuditEvent(this.logger, AuthEvent.TOKEN_REFRESH, userId, ipAddress, deviceInfo, {
      sessionId,
    });
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      sessionId,
    };
  }

  /**
   * Xử lý token theft — full session invalidation
   */
  async handleTokenTheft(
    userId: string,
    ipAddress: string,
    deviceInfo: string,
  ): Promise<void> {
    await handleTokenTheft(this.sessionService, this.logger, userId, ipAddress, deviceInfo);
  }

  /**
   * Xử lý security event — full session invalidation within 5 seconds
   */
  async handleSecurityEvent(
    userId: string,
    eventType: string,
    ipAddress: string = 'system',
    deviceInfo: string = 'system',
  ): Promise<void> {
    await handleSecurityEvent(this.sessionService, this.logger, userId, eventType, ipAddress, deviceInfo);
  }
}
