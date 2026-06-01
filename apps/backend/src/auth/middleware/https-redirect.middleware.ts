import { Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response, NextFunction } from 'express';

/**
 * HTTPS Redirect Middleware
 *
 * Trong production, redirect mọi HTTP request sang HTTPS với HTTP 301.
 * Kiểm tra protocol qua:
 * - req.secure (Express built-in)
 * - X-Forwarded-Proto header (khi đứng sau reverse proxy/load balancer)
 *
 * Validates: Requirements 12.3
 */
@Injectable()
export class HttpsRedirectMiddleware implements NestMiddleware {
  private readonly isProduction: boolean;

  constructor(private readonly configService: ConfigService) {
    this.isProduction =
      this.configService.get<string>('NODE_ENV') === 'production';
  }

  use(req: Request, res: Response, next: NextFunction): void {
    // Chỉ enforce HTTPS trong production
    if (!this.isProduction) {
      next();
      return;
    }

    const isSecure = this.isRequestSecure(req);

    if (!isSecure) {
      // Redirect HTTP → HTTPS với 301 (Moved Permanently)
      const httpsUrl = `https://${req.headers['host'] ?? 'localhost'}${req.originalUrl}`;
      res.redirect(301, httpsUrl);
      return;
    }

    next();
  }

  /**
   * Kiểm tra request có đi qua HTTPS không
   *
   * Xét cả trường hợp đứng sau reverse proxy (X-Forwarded-Proto)
   */
  private isRequestSecure(req: Request): boolean {
    // Express built-in check
    if (req.secure) {
      return true;
    }

    // Check X-Forwarded-Proto header (reverse proxy)
    const forwardedProto = req.headers['x-forwarded-proto'];
    if (typeof forwardedProto === 'string') {
      return forwardedProto.toLowerCase() === 'https';
    }

    return false;
  }
}
