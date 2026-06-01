import {
  Injectable,
  NestMiddleware,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response, NextFunction } from 'express';

/**
 * CORS Middleware
 *
 * Validate Origin header against allowed origins list từ environment variable ALLOWED_ORIGINS.
 * - Nếu origin nằm trong danh sách → set CORS headers cho phép
 * - Nếu origin không nằm trong danh sách → reject với HTTP 403, không set Access-Control-Allow-Origin
 * - Nếu request không có Origin header (same-origin, server-to-server) → cho phép đi qua
 *
 * Handles preflight (OPTIONS) requests properly.
 *
 * Validates: Requirements 12.5, 12.6
 */
@Injectable()
export class CorsMiddleware implements NestMiddleware {
  private readonly allowedOrigins: Set<string>;

  constructor(private readonly configService: ConfigService) {
    const originsEnv = this.configService.get<string>('ALLOWED_ORIGINS', '');
    this.allowedOrigins = new Set(
      originsEnv
        .split(',')
        .map((origin) => origin.trim())
        .filter((origin) => origin.length > 0),
    );
  }

  use(req: Request, res: Response, next: NextFunction): void {
    const origin = req.headers['origin'] as string | undefined;

    // Nếu không có Origin header (same-origin request, curl, server-to-server) → cho phép
    if (!origin) {
      next();
      return;
    }

    // Kiểm tra origin có trong danh sách cho phép không
    if (!this.allowedOrigins.has(origin)) {
      // Origin không được phép → HTTP 403, không set Access-Control-Allow-Origin
      throw new ForbiddenException({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Origin not allowed by CORS policy',
        errorCode: 'CORS_REJECTED',
        timestamp: new Date().toISOString(),
      });
    }

    // Origin hợp lệ → set CORS headers
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    );
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Authorization, Content-Type, Accept, X-Requested-With',
    );
    res.setHeader('Access-Control-Max-Age', '86400');

    // Handle preflight (OPTIONS) request — trả về 204 ngay
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }

    next();
  }
}
