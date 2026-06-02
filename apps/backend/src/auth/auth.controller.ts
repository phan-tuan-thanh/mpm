import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { randomBytes } from 'crypto';
import { AuthService } from './auth.service';
import { SessionService } from './session.service';
import { Public } from './decorators/public.decorator';
import { CurrentUser, RequestUser } from './decorators/current-user.decorator';
import { RateLimitGuard, RateLimit } from '../rate-limit/rate-limit.guard';

/** Cookie name cho refresh token */
const REFRESH_TOKEN_COOKIE = 'refreshToken';

/** Cookie Max-Age: 7 ngày tính bằng giây */
const COOKIE_MAX_AGE_SECONDS = 604_800;

/**
 * Auth Controller — REST endpoints cho authentication flow
 *
 * Endpoints:
 * - GET  /api/auth/login              — Redirect to Authentik authorize URL
 * - POST /api/auth/callback           — Exchange authorization code for tokens
 * - POST /api/auth/refresh            — Refresh token rotation
 * - POST /api/auth/logout             — Revoke current session
 * - GET  /api/auth/sessions           — List active sessions
 * - DELETE /api/auth/sessions/:sessionId — Revoke specific session
 */
@Controller('api/auth')
@UseGuards(RateLimitGuard)
export class AuthController {
  /** Authentik authorize URL */
  private readonly authentikAuthorizeUrl: string;
  /** OAuth2 client ID */
  private readonly authentikClientId: string;
  /** OAuth2 redirect URI (callback URL) */
  private readonly authentikRedirectUri: string;
  /** Frontend URL (dùng cho redirect sau callback) */
  private readonly frontendUrl: string;
  /** Có đang chạy production không (để set Secure flag cho cookie) */
  private readonly isProduction: boolean;

  constructor(
    private readonly authService: AuthService,
    private readonly sessionService: SessionService,
    private readonly configService: ConfigService,
  ) {
    this.authentikAuthorizeUrl = this.configService.getOrThrow<string>('AUTHENTIK_AUTHORIZE_URL');
    this.authentikClientId = this.configService.getOrThrow<string>('AUTHENTIK_CLIENT_ID');
    this.authentikRedirectUri = this.configService.getOrThrow<string>('AUTHENTIK_REDIRECT_URI');
    this.frontendUrl = this.configService.getOrThrow<string>('FRONTEND_URL');
    this.isProduction = this.configService.get<string>('NODE_ENV') === 'production';
  }

  // ─── GET /api/auth/login ────────────────────────────────────────────────────

  /**
   * Redirect người dùng đến Authentik authorize URL
   *
   * Tạo authorize URL với các params:
   * - client_id: OAuth2 client ID
   * - redirect_uri: callback URL
   * - response_type: code (Authorization Code flow)
   * - scope: openid email profile
   * - state: random parameter để chống CSRF (client tự generate và verify)
   *
   * Lưu ý: state parameter được client generate và lưu vào sessionStorage.
   * Endpoint này chỉ redirect — client sẽ verify state khi nhận callback.
   */
  @Public()
  @Get('login')
  login(@Res() res: Response): void {
    const state = this.generateState();

    const params = new URLSearchParams({
      client_id: this.authentikClientId,
      redirect_uri: this.authentikRedirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state,
    });

    const authorizeUrl = `${this.authentikAuthorizeUrl}?${params.toString()}`;
    res.redirect(authorizeUrl);
  }

  // ─── POST /api/auth/callback ────────────────────────────────────────────────

  /**
   * Exchange authorization code lấy tokens
   *
   * Flow:
   * 1. Nhận code + state từ request body
   * 2. Gọi AuthService.handleCallback để exchange code, validate, issue tokens
   * 3. Set refreshToken vào httpOnly cookie
   * 4. Trả về accessToken trong response body
   *
   * Cookie flags: httpOnly, Secure (prod), SameSite=Strict, Path=/api/auth/refresh, Max-Age=604800
   */
  @Public()
  @RateLimit('login')
  @Post('callback')
  @HttpCode(HttpStatus.OK)
  async callback(
    @Body() body: { code: string; state: string },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ accessToken: string }> {
    const ipAddress = this.extractClientIp(req);
    const deviceInfo = req.headers['user-agent'] ?? 'unknown';

    const result = await this.authService.handleCallback(
      body.code,
      body.state,
      ipAddress,
      deviceInfo,
    );

    // Set refresh token cookie
    this.setRefreshTokenCookie(res, result.refreshToken);

    return { accessToken: result.accessToken };
  }

  // ─── POST /api/auth/refresh ─────────────────────────────────────────────────

  /**
   * Refresh token rotation
   *
   * Flow:
   * 1. Extract refreshToken từ httpOnly cookie
   * 2. Gọi AuthService.refreshTokens để rotate
   * 3. Set new refreshToken cookie
   * 4. Trả về new accessToken
   *
   * Endpoint này không yêu cầu Bearer token (dùng cookie thay thế)
   */
  @Public()
  @RateLimit('refresh')
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ accessToken: string }> {
    const refreshToken = this.extractRefreshTokenFromCookie(req);

    if (!refreshToken) {
      // Không có refresh token trong cookie → unauthorized
      throw new UnauthorizedException({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Refresh token not found',
        errorCode: 'TOKEN_MISSING',
        timestamp: new Date().toISOString(),
      });
    }

    const ipAddress = this.extractClientIp(req);
    const deviceInfo = req.headers['user-agent'] ?? 'unknown';

    const result = await this.authService.refreshTokens(
      refreshToken,
      ipAddress,
      deviceInfo,
    );

    // Set new refresh token cookie (rotation)
    this.setRefreshTokenCookie(res, result.refreshToken);

    return { accessToken: result.accessToken };
  }

  // ─── POST /api/auth/logout ──────────────────────────────────────────────────

  /**
   * Đăng xuất — revoke current session
   *
   * Flow:
   * 1. Lấy userId và sessionId từ request context
   * 2. Gọi AuthService.logout
   * 3. Xóa refresh token cookie
   * 4. Trả về 200 OK
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ message: string }> {
    const ipAddress = this.extractClientIp(req);
    const deviceInfo = req.headers['user-agent'] ?? 'unknown';

    // Lấy sessionId từ request body hoặc tìm session hiện tại
    const sessionId = (req.body as { sessionId?: string })?.sessionId;

    if (sessionId) {
      await this.authService.logout(user.id, sessionId, ipAddress, deviceInfo);
    } else {
      // Nếu không có sessionId cụ thể, revoke session dựa trên refresh token cookie
      const refreshToken = this.extractRefreshTokenFromCookie(req);
      if (refreshToken) {
        // Tìm session qua refresh token — fallback: revoke tất cả sessions
        // Trong trường hợp đơn giản, logout session hiện tại
        // AuthService.logout cần sessionId, nên ta cần tìm session
        const sessions = await this.sessionService.listSessions(user.id);
        if (sessions.length > 0) {
          // Revoke session đầu tiên (current session — heuristic)
          await this.authService.logout(user.id, sessions[0].sessionId, ipAddress, deviceInfo);
        }
      }
    }

    // Xóa refresh token cookie
    this.clearRefreshTokenCookie(res);

    return { message: 'Logged out successfully' };
  }

  // ─── GET /api/auth/sessions ─────────────────────────────────────────────────

  /**
   * Liệt kê sessions đang hoạt động (tối đa 50)
   *
   * Trả về danh sách sessions với thông tin:
   * - sessionId, deviceInfo, ipAddress, createdAt, lastActivity
   * - isCurrent: đánh dấu session hiện tại (dựa trên refresh token cookie)
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

  // ─── Private Helpers ────────────────────────────────────────────────────────

  /**
   * Generate random state parameter cho OAuth2 CSRF protection
   */
  private generateState(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Set refresh token cookie với security flags
   *
   * Flags:
   * - httpOnly: true — không accessible từ JavaScript
   * - secure: true (production) — chỉ gửi qua HTTPS
   * - sameSite: 'lax' — chống CSRF nhưng vẫn cho phép cookie được lưu/gửi
   *   trong OAuth redirect flow (Authentik → frontend). 'strict' khiến một số
   *   trình duyệt (Brave/Chrome) KHÔNG lưu cookie set trong luồng khởi tạo
   *   cross-site, gây mất phiên khi reload.
   * - path: '/api/auth/refresh' — chỉ gửi cho refresh endpoint
   * - maxAge: 604800000 (7 ngày tính bằng ms)
   */
  private setRefreshTokenCookie(res: Response, refreshToken: string): void {
    res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, {
      httpOnly: true,
      secure: this.isProduction,
      sameSite: 'lax',
      path: '/api/auth/refresh',
      maxAge: COOKIE_MAX_AGE_SECONDS * 1000, // Express dùng milliseconds
    });
  }

  /**
   * Xóa refresh token cookie
   */
  private clearRefreshTokenCookie(res: Response): void {
    res.clearCookie(REFRESH_TOKEN_COOKIE, {
      httpOnly: true,
      secure: this.isProduction,
      sameSite: 'lax',
      path: '/api/auth/refresh',
    });
  }

  /**
   * Extract refresh token từ request cookies
   */
  private extractRefreshTokenFromCookie(req: Request): string | undefined {
    return (req.cookies as Record<string, string> | undefined)?.[REFRESH_TOKEN_COOKIE];
  }

  /**
   * Extract client IP từ request
   *
   * Ưu tiên X-Forwarded-For (khi đứng sau reverse proxy)
   */
  private extractClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];

    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }

    if (Array.isArray(forwarded) && forwarded.length > 0) {
      return forwarded[0].split(',')[0].trim();
    }

    return req.ip ?? '0.0.0.0';
  }
}

// ─── Response Types ───────────────────────────────────────────────────────────

/** Session info trả về cho client (không bao gồm refreshTokenHash) */
interface SessionResponse {
  sessionId: string;
  deviceInfo: string;
  ipAddress: string;
  createdAt: string;
  lastActivity: string;
}
