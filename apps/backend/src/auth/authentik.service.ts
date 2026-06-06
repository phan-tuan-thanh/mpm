import {
  Injectable,
  Logger,
  UnauthorizedException,
  BadGatewayException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, timeout, catchError } from 'rxjs';

/** Claims từ Authentik ID token */
export interface AuthentikIdTokenClaims {
  sub: string;
  email: string;
  name?: string;
  preferred_username?: string;
  exp: number;
  iat: number;
}

/** Response từ Authentik token endpoint */
export interface AuthentikTokenResponse {
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

/**
 * Authentik Service — đóng gói toàn bộ HTTP calls đến Authentik OAuth2 provider
 *
 * Chịu trách nhiệm:
 * - Exchange authorization code lấy tokens
 * - Notify Authentik end-session khi logout
 * - Decode và validate ID token JWT
 */
@Injectable()
export class AuthentikService {
  private readonly logger = new Logger(AuthentikService.name);

  /** Authentik OAuth2 endpoints — loaded from environment */
  private readonly tokenUrl: string;
  private readonly endSessionUrl: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.tokenUrl = this.configService.getOrThrow<string>('AUTHENTIK_TOKEN_URL');
    this.endSessionUrl = this.configService.getOrThrow<string>('AUTHENTIK_END_SESSION_URL');
    this.clientId = this.configService.getOrThrow<string>('AUTHENTIK_CLIENT_ID');
    this.clientSecret = this.configService.getOrThrow<string>('AUTHENTIK_CLIENT_SECRET');
    this.redirectUri = this.configService.getOrThrow<string>('AUTHENTIK_REDIRECT_URI');
  }

  /**
   * Exchange authorization code với Authentik token endpoint
   *
   * @param code - Authorization code từ Authentik callback
   * @returns AuthentikTokenResponse chứa access_token, id_token, refresh_token
   * @throws UnauthorizedException nếu code không hợp lệ
   * @throws BadGatewayException nếu Authentik timeout (10s)
   */
  async exchangeCodeForTokens(code: string): Promise<AuthentikTokenResponse> {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: this.clientId,
      client_secret: this.clientSecret,
      redirect_uri: this.redirectUri,
    });

    try {
      const response = await firstValueFrom(
        this.httpService
          .post<AuthentikTokenResponse>(this.tokenUrl, params.toString(), {
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
   * @param idToken - JWT ID token từ Authentik
   * @returns Parsed AuthentikIdTokenClaims
   * @throws UnauthorizedException nếu token expired hoặc malformed
   */
  decodeAndValidateIdToken(idToken: string): AuthentikIdTokenClaims {
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
   * Notify Authentik end-session endpoint khi user logout
   *
   * Timeout 5 giây, graceful degradation — nếu fail vẫn hoàn tất logout local.
   *
   * @param userId - ID người dùng (dùng cho logging)
   */
  async notifyEndSession(userId: string): Promise<void> {
    try {
      await firstValueFrom(
        this.httpService
          .post(
            this.endSessionUrl,
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
}
