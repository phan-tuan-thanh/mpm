import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { TokenService } from '../token.service';
import { SessionService } from '../session.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import type { RequestUser } from '../decorators/current-user.decorator';

/**
 * JWT Auth Guard — xác thực Access Token cho mọi protected endpoint
 *
 * Flow:
 * 1. Kiểm tra endpoint có @Public() → bỏ qua xác thực
 * 2. Extract Bearer token từ Authorization header
 * 3. Verify token (signature, expiry)
 * 4. Kiểm tra forced-logout list
 * 5. Gắn user info vào request context
 *
 * Error codes trả về:
 * - TOKEN_MISSING: Không có Authorization header
 * - TOKEN_EXPIRED: Token đã hết hạn
 * - TOKEN_INVALID: Signature sai hoặc format không hợp lệ
 * - SESSION_REVOKED: User nằm trong forced-logout list
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly tokenService: TokenService,
    private readonly sessionService: SessionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Bước 1: Kiểm tra @Public() decorator
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();

    // Bước 2: Extract Bearer token từ Authorization header
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      throw new UnauthorizedException({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Authorization header is missing or does not contain a Bearer token',
        errorCode: 'TOKEN_MISSING',
        timestamp: new Date().toISOString(),
      });
    }

    // Bước 3: Verify token (signature + expiry)
    const payload = this.verifyToken(token);

    // Bước 4: Kiểm tra forced-logout list
    const isForceLoggedOut = await this.sessionService.isForceLoggedOut(payload.sub);
    if (isForceLoggedOut) {
      this.logger.debug(
        `Request rejected: user ${payload.sub} is in forced-logout list`,
      );
      throw new UnauthorizedException({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Session has been revoked due to a security event',
        errorCode: 'SESSION_REVOKED',
        timestamp: new Date().toISOString(),
      });
    }

    // Bước 5: Gắn user info vào request context
    const user: RequestUser = {
      id: payload.sub,
      email: payload.email,
      systemRole: payload.systemRole,
      projectRoles: payload.projectRoles,
    };

    (request as Request & { user: RequestUser }).user = user;

    return true;
  }

  /**
   * Extract Bearer token từ Authorization header
   *
   * @returns Token string hoặc undefined nếu header không hợp lệ
   */
  private extractTokenFromHeader(request: Request): string | undefined {
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      return undefined;
    }

    const [type, token] = authHeader.split(' ');
    if (type !== 'Bearer' || !token) {
      return undefined;
    }

    return token;
  }

  /**
   * Verify token và map UnauthorizedException sang error codes phù hợp
   *
   * TokenService.verifyAccessToken() throws UnauthorizedException với message:
   * - 'TOKEN_EXPIRED' → map sang errorCode TOKEN_EXPIRED
   * - 'TOKEN_INVALID' → map sang errorCode TOKEN_INVALID
   */
  private verifyToken(token: string) {
    try {
      return this.tokenService.verifyAccessToken(token);
    } catch (error: unknown) {
      if (error instanceof UnauthorizedException) {
        const response = error.getResponse();
        const message =
          typeof response === 'string' ? response : (response as { message?: string }).message;

        if (message === 'TOKEN_EXPIRED') {
          throw new UnauthorizedException({
            statusCode: 401,
            error: 'Unauthorized',
            message: 'Access token has expired',
            errorCode: 'TOKEN_EXPIRED',
            timestamp: new Date().toISOString(),
          });
        }

        // TOKEN_INVALID hoặc bất kỳ lỗi nào khác từ TokenService
        throw new UnauthorizedException({
          statusCode: 401,
          error: 'Unauthorized',
          message: 'Access token is invalid',
          errorCode: 'TOKEN_INVALID',
          timestamp: new Date().toISOString(),
        });
      }

      // Lỗi không mong đợi — vẫn trả TOKEN_INVALID
      throw new UnauthorizedException({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Access token is invalid',
        errorCode: 'TOKEN_INVALID',
        timestamp: new Date().toISOString(),
      });
    }
  }
}
