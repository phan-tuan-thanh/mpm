import { Logger } from '@nestjs/common';
import { SessionService } from './session.service';
import { AuthEvent } from './constants/auth-events';

export function logAuditEvent(
  logger: Logger,
  eventType: string,
  userId: string,
  ipAddress: string,
  deviceInfo: string,
  metadata: Record<string, unknown>,
): void {
  logger.log({
    message: `[AUDIT] ${eventType}`,
    eventType,
    userId,
    ipAddress,
    userAgent: deviceInfo,
    timestamp: new Date().toISOString(),
    metadata,
  });
}

export async function handleTokenTheft(
  sessionService: SessionService,
  logger: Logger,
  userId: string,
  ipAddress: string,
  deviceInfo: string,
): Promise<void> {
  logger.warn(`Token theft detected for user ${userId}`);

  await sessionService.revokeAllSessions(userId);
  await sessionService.addToForcedLogout(userId);

  logAuditEvent(logger, AuthEvent.TOKEN_THEFT_DETECTED, userId, ipAddress, deviceInfo, {
    action: 'full_session_invalidation',
  });
}

export async function handleSecurityEvent(
  sessionService: SessionService,
  logger: Logger,
  userId: string,
  eventType: string,
  ipAddress: string = 'system',
  deviceInfo: string = 'system',
): Promise<void> {
  logger.warn(
    `Security event "${eventType}" for user ${userId} — initiating full invalidation`,
  );

  await sessionService.revokeAllSessions(userId);
  await sessionService.addToForcedLogout(userId);

  logAuditEvent(logger, eventType, userId, ipAddress, deviceInfo, {
    action: 'security_event_invalidation',
    trigger: eventType,
  });
}
