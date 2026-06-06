import { UnauthorizedException, Logger } from '@nestjs/common';
import { SessionService } from './session.service';
import { TokenService } from './token.service';

export async function findSessionByRefreshTokenHash(
  sessionService: SessionService,
  tokenHash: string,
): Promise<{ userId: string; sessionId: string } | null> {
  const userId = await sessionService.findUserByRefreshTokenHash(tokenHash);
  if (!userId) {
    return null;
  }

  const sessions = await sessionService.listSessions(userId);
  const session = sessions.find((s) => s.refreshTokenHash === tokenHash);

  if (!session) {
    return null;
  }

  return { userId, sessionId: session.sessionId };
}

export async function updateSessionRefreshToken(
  sessionService: SessionService,
  userId: string,
  sessionId: string,
  newRefreshTokenHash: string,
): Promise<void> {
  const session = await sessionService.getSession(userId, sessionId);
  if (session) {
    await sessionService.updateRefreshTokenHash(
      userId,
      sessionId,
      session.refreshTokenHash,
      newRefreshTokenHash,
    );
  }
}

export async function verifyActiveSession(
  sessionService: SessionService,
  tokenHash: string,
): Promise<{ userId: string; sessionId: string }> {
  const sessionInfo = await findSessionByRefreshTokenHash(sessionService, tokenHash);
  if (!sessionInfo) {
    throw new UnauthorizedException('TOKEN_INVALID');
  }

  const isForceLoggedOut = await sessionService.isForceLoggedOut(sessionInfo.userId);
  if (isForceLoggedOut) {
    throw new UnauthorizedException('SESSION_REVOKED');
  }

  return sessionInfo;
}

export async function checkBlacklistedToken(
  sessionService: SessionService,
  tokenHash: string,
  logger: Logger,
  handleTokenTheftFn: (userId: string) => Promise<void>,
): Promise<void> {
  const isBlacklisted = await sessionService.isRefreshTokenBlacklisted(tokenHash);
  if (isBlacklisted) {
    logger.warn('Revoked refresh token reuse detected');
    const userId = await sessionService.findUserByRefreshTokenHash(tokenHash);
    if (userId) {
      await handleTokenTheftFn(userId);
    }
    throw new UnauthorizedException('TOKEN_INVALID');
  }
}

export async function rotateSessionTokens(
  sessionService: SessionService,
  tokenService: TokenService,
  userId: string,
  sessionId: string,
  oldTokenHash: string,
  jwtPayload: any,
  ttl: number,
): Promise<{ accessToken: string; refreshToken: string }> {
  const newAccessToken = tokenService.signAccessToken(jwtPayload);
  const { token: newRefreshToken, hash: newRefreshTokenHash } =
    tokenService.generateRefreshToken();

  await sessionService.blacklistRefreshToken(oldTokenHash, ttl);
  await updateSessionRefreshToken(sessionService, userId, sessionId, newRefreshTokenHash);
  await sessionService.updateLastActivity(userId, sessionId);

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
}
