import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { AuthEvent } from '../auth/constants/auth-events';

/** Kết quả kiểm tra rate limit */
export interface RateLimitResult {
  /** Cho phép request hay không */
  allowed: boolean;
  /** Số giây còn lại trong window (khi bị block) */
  retryAfter?: number;
}

/**
 * Rate Limit Service — quản lý rate limiting bằng Redis counter
 *
 * Sử dụng Redis INCR + EXPIRE để tạo atomic counter với TTL.
 * Khi counter vượt ngưỡng → reject request.
 *
 * Redis key patterns:
 * - rate:login:{ip} — counter login attempts per IP (TTL 15 min)
 * - rate:refresh:{userId} — counter refresh requests per user (TTL 1 min)
 *
 * Fail-closed: Nếu Redis không khả dụng → reject tất cả auth requests (HTTP 503)
 */
@Injectable()
export class RateLimitService {
  private readonly logger = new Logger(RateLimitService.name);

  /** Số lần login tối đa cho phép trong window */
  private readonly loginMax: number;
  /** Thời gian window cho login (giây) */
  private readonly loginWindowSeconds: number;
  /** Số lần refresh tối đa cho phép trong window */
  private readonly refreshMax: number;
  /** Thời gian window cho refresh (giây) */
  private readonly refreshWindowSeconds: number;

  constructor(
    @InjectRedis() private readonly redis: Redis,
    private readonly configService: ConfigService,
  ) {
    this.loginMax = this.configService.get<number>(
      'RATE_LIMIT_LOGIN_MAX',
      5,
    );
    this.loginWindowSeconds = this.configService.get<number>(
      'RATE_LIMIT_LOGIN_WINDOW_SECONDS',
      900,
    );
    this.refreshMax = this.configService.get<number>(
      'RATE_LIMIT_REFRESH_MAX',
      10,
    );
    this.refreshWindowSeconds = this.configService.get<number>(
      'RATE_LIMIT_REFRESH_WINDOW_SECONDS',
      60,
    );
  }

  /**
   * Kiểm tra rate limit cho login attempts theo IP
   *
   * @param ip - Địa chỉ IP client
   * @returns RateLimitResult — allowed: true nếu chưa vượt ngưỡng
   */
  async checkLoginRateLimit(ip: string): Promise<RateLimitResult> {
    const key = `rate:login:${ip}`;
    return this.checkRateLimit(key, this.loginMax, this.loginWindowSeconds);
  }

  /**
   * Kiểm tra rate limit cho refresh token requests theo userId
   *
   * @param userId - ID người dùng
   * @returns RateLimitResult — allowed: true nếu chưa vượt ngưỡng
   */
  async checkRefreshRateLimit(userId: string): Promise<RateLimitResult> {
    const key = `rate:refresh:${userId}`;
    return this.checkRateLimit(key, this.refreshMax, this.refreshWindowSeconds);
  }

  /**
   * Tăng counter login cho IP
   *
   * Sử dụng INCR + EXPIRE atomic:
   * - Nếu key chưa tồn tại → INCR tạo key với value 1, sau đó set EXPIRE
   * - Nếu key đã tồn tại → INCR tăng value, TTL giữ nguyên
   *
   * @param ip - Địa chỉ IP client
   */
  async incrementLoginCounter(ip: string): Promise<void> {
    const key = `rate:login:${ip}`;
    await this.incrementCounter(key, this.loginWindowSeconds);
  }

  /**
   * Tăng counter refresh cho userId
   *
   * @param userId - ID người dùng
   */
  async incrementRefreshCounter(userId: string): Promise<void> {
    const key = `rate:refresh:${userId}`;
    await this.incrementCounter(key, this.refreshWindowSeconds);
  }

  /**
   * Ghi audit log khi rate limit triggered
   *
   * Hiện tại sử dụng Logger. Khi AuditService sẵn sàng sẽ chuyển sang ghi PostgreSQL.
   *
   * @param type - Loại rate limit (login hoặc refresh)
   * @param identifier - IP address hoặc user ID
   * @param currentCount - Số lần thử tại thời điểm vi phạm
   */
  logRateLimitTriggered(
    type: 'login' | 'refresh',
    identifier: string,
    currentCount: number,
  ): void {
    const eventType =
      type === 'login' ? AuthEvent.RATE_LIMIT_LOGIN : AuthEvent.RATE_LIMIT_REFRESH;

    this.logger.warn(
      `Rate limit triggered: type=${eventType}, identifier=${identifier}, attempts=${currentCount}`,
    );
  }

  // ─── Private Helpers ────────────────────────────────────────────────────────

  /**
   * Kiểm tra rate limit chung cho một key
   *
   * @param key - Redis key
   * @param max - Số lần tối đa cho phép
   * @param windowSeconds - Thời gian window (giây)
   * @returns RateLimitResult
   */
  private async checkRateLimit(
    key: string,
    max: number,
    windowSeconds: number,
  ): Promise<RateLimitResult> {
    try {
      // Lấy giá trị counter hiện tại
      const countStr = await this.redis.get(key);
      const currentCount = countStr ? parseInt(countStr, 10) : 0;

      if (currentCount >= max) {
        // Đã vượt ngưỡng — tính retryAfter từ TTL còn lại
        const ttl = await this.redis.ttl(key);
        const retryAfter = ttl > 0 ? ttl : windowSeconds;

        return { allowed: false, retryAfter };
      }

      return { allowed: true };
    } catch (error: unknown) {
      // Redis unavailable → fail-closed
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Redis unavailable during rate limit check: ${message}`);
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
   * Tăng counter atomic với INCR + EXPIRE
   *
   * @param key - Redis key
   * @param windowSeconds - TTL cho key (giây)
   */
  private async incrementCounter(key: string, windowSeconds: number): Promise<void> {
    try {
      // INCR tạo key nếu chưa tồn tại (value = 1) hoặc tăng value
      const newCount = await this.redis.incr(key);

      // Chỉ set EXPIRE khi key vừa được tạo (count = 1)
      // Điều này đảm bảo TTL không bị reset mỗi lần increment
      if (newCount === 1) {
        await this.redis.expire(key, windowSeconds);
      }
    } catch (error: unknown) {
      // Redis unavailable → fail-closed
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Redis unavailable during rate limit increment: ${message}`);
      throw new ServiceUnavailableException({
        statusCode: 503,
        error: 'Service Unavailable',
        message: 'Authentication service temporarily unavailable',
        errorCode: 'REDIS_UNAVAILABLE',
        timestamp: new Date().toISOString(),
      });
    }
  }
}
