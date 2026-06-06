import {
  Controller,
  Get,
  Delete,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SessionService } from './session.service';
import { CurrentUser, RequestUser } from './decorators/current-user.decorator';

/** Session info trả về cho client (không bao gồm refreshTokenHash) */
export interface SessionResponse {
  sessionId: string;
  deviceInfo: string;
  ipAddress: string;
  createdAt: string;
  lastActivity: string;
}

/**
 * Auth Session Controller — quản lý sessions đang hoạt động
 *
 * Endpoints:
 * - GET    /api/auth/sessions              — Liệt kê active sessions
 * - DELETE /api/auth/sessions/:sessionId  — Thu hồi session cụ thể
 */
@Controller('api/auth')
export class AuthSessionController {
  constructor(private readonly sessionService: SessionService) {}

  // ─── GET /api/auth/sessions ─────────────────────────────────────────────────

  /**
   * Liệt kê sessions đang hoạt động (tối đa 50)
   *
   * Trả về danh sách sessions với thông tin:
   * - sessionId, deviceInfo, ipAddress, createdAt, lastActivity
   */
  @Get('sessions')
  async listSessions(
    @CurrentUser() user: RequestUser,
  ): Promise<{ sessions: SessionResponse[] }> {
    const sessions = await this.sessionService.listSessions(user.id);

    const sessionResponses: SessionResponse[] = sessions.map((session) => ({
      sessionId: session.sessionId,
      deviceInfo: session.deviceInfo,
      ipAddress: session.ipAddress,
      createdAt: session.createdAt,
      lastActivity: session.lastActivity,
    }));

    return { sessions: sessionResponses };
  }

  // ─── DELETE /api/auth/sessions/:sessionId ───────────────────────────────────

  /**
   * Thu hồi session cụ thể
   *
   * Cho phép user revoke bất kỳ session nào của mình (ví dụ: session trên thiết bị khác)
   */
  @Delete('sessions/:sessionId')
  @HttpCode(HttpStatus.OK)
  async revokeSession(
    @CurrentUser() user: RequestUser,
    @Param('sessionId') sessionId: string,
  ): Promise<{ message: string }> {
    await this.sessionService.revokeSession(user.id, sessionId);

    return { message: 'Session revoked successfully' };
  }
}
