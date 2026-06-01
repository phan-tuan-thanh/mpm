import {
  CanActivate,
  ExecutionContext,
  Injectable,
  HttpException,
  HttpStatus,
  Logger,
  SetMetadata,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { RateLimitService } from './rate-limit.service';
import type { RequestUser } from '../auth/decorators/current-user.decorator';

/** Loại rate limit có thể áp dụng cho endpoint */
export type RateLimitType = 'login' | 'refresh';

/** Metadata key cho rate limit decorator */
export const RATE_LIMIT_KEY = 'rate_limit_type';

/**
 * Decorator đánh dấu endpoint với loại rate limit
 *
 * @example
 * ```typescript
 * @RateLimit('login')
 * @Post('callback')
 * handleCallback() { ... }
 * ```
 */
export const RateLimit = (type: RateLimitType) =>
  SetMetadata(RATE_LIMIT_KEY, type);

/**
 * Rate Limit Guard — kiểm tra rate limit trước khi cho phép request
 *
 * Flow:
 * 1. Đọc metadata @RateLimit() từ endpoint
 * 2. Nếu không có metadata → cho phép (endpoint không cần rate limit)
 * 3. Kiểm tra rate limit dựa trên loại:
 *    - 'login': check theo IP address
 *    - 'refresh': check theo userId (từ request context)
 * 4. Nếu vượt ngưỡng → HTTP 429 với Retry-After header
 * 5. Nếu Redis unavailable → HTTP 503 (fail-closed)
 *
 * Ghi Audit_Log khi rate limit triggered.
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly rateLimitService: RateLimitService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Bước 1: Đọc metadata @RateLimit() từ handler hoặc class
    const rateLimitType = this.reflector.getAllAndOverride<RateLimitType | undefined>(
      RATE_LIMIT_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Bước 2: Không có metadata → endpoint không cần rate limit
    if (!rateLimitType) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();

    try {
      if (rateLimitType === 'login') {
        return await this.handleLoginRateLimit(request, context);
      }

      if (rateLimitType === 'refresh') {
        return await this.handleRefreshRateLimit(request, context);
      }

      // Loại rate limit không xác định → cho phép
      return true;
    } catch (error: unknown) {
      // Re-throw HttpException (429, 503)
      if (error instanceof HttpException) {
        throw error;
      }

      // Lỗi không mong đợi → fail-closed (503)
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Unexpected error in rate limit guard: ${message}`);
      throw new ServiceUnavailableException({
        statusCode: 503,
        error: 'Service Unavailable',
        message: 'Authentication service temporarily unavailable',
        errorCode: 'REDIS_UNAVAILABLE',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Xử lý rate limit cho login endpoint
   *
   * Kiểm tra theo IP address. Nếu vượt ngưỡng → 429.
   */
  private async handleLoginRateLimit(
    request: Request,
    _context: ExecutionContext,
  ): Promise<boolean> {
    const ip = this.extractClientIp(request);

    const result = await this.rateLimitService.checkLoginRateLimit(ip);

    if (!result.allowed) {
      // Ghi audit log
      this.rateLimitService.logRateLimitTriggered('login', ip, 0);

      throw new HttpException(
        {
          statusCode: 429,
          error: 'Too Many Requests',
          message: 'Too many login attempts. Please try again later.',
          errorCode: 'RATE_LIMIT_LOGIN',
          timestamp: new Date().toISOString(),
          retryAfter: result.retryAfter,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  /**
   * Xử lý rate limit cho refresh endpoint
   *
   * Kiểm tra theo userId từ request context.
   * Nếu user chưa authenticated (không có request.user) → cho phép
   * (JWT guard sẽ reject sau đó).
   */
  private async handleRefreshRateLimit(
    request: Request,
    _context: ExecutionContext,
  ): Promise<boolean> {
    const user = (request as Request & { user?: RequestUser }).user;

    // Nếu chưa có user context (guard chạy trước JWT guard) → dùng IP fallback
    // Tuy nhiên refresh endpoint thường đã có cookie → extract userId từ token
    if (!user?.id) {
      // Không có userId → không thể check refresh rate limit
      // Cho phép request đi tiếp, JWT guard sẽ xử lý authentication
      return true;
    }

    const result = await this.rateLimitService.checkRefreshRateLimit(user.id);

    if (!result.allowed) {
      // Ghi audit log
      this.rateLimitService.logRateLimitTriggered('refresh', user.id, 0);

      throw new HttpException(
        {
          statusCode: 429,
          error: 'Too Many Requests',
          message: 'Too many refresh token requests. Please try again later.',
          errorCode: 'RATE_LIMIT_REFRESH',
          timestamp: new Date().toISOString(),
          retryAfter: result.retryAfter,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  /**
   * Extract client IP từ request
   *
   * Ưu tiên X-Forwarded-For header (khi đứng sau reverse proxy),
   * fallback sang request.ip
   */
  private extractClientIp(request: Request): string {
    const forwarded = request.headers['x-forwarded-for'];

    if (typeof forwarded === 'string') {
      // X-Forwarded-For có thể chứa nhiều IP, lấy IP đầu tiên (client gốc)
      return forwarded.split(',')[0].trim();
    }

    if (Array.isArray(forwarded) && forwarded.length > 0) {
      return forwarded[0].split(',')[0].trim();
    }

    return request.ip ?? '0.0.0.0';
  }
}
