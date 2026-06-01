import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Security Headers Middleware
 *
 * Thêm các security headers vào mọi response:
 * - X-Content-Type-Options: nosniff — chống MIME type sniffing
 * - X-Frame-Options: DENY — chống clickjacking
 * - Strict-Transport-Security: max-age=31536000; includeSubDomains — enforce HTTPS
 *
 * Validates: Requirements 12.4
 */
@Injectable()
export class SecurityHeadersMiddleware implements NestMiddleware {
  use(_req: Request, res: Response, next: NextFunction): void {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains',
    );

    next();
  }
}
