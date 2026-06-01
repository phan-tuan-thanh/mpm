import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RateLimitService } from './rate-limit.service';
import { RateLimitGuard } from './rate-limit.guard';

/**
 * Rate Limit Module — cung cấp rate limiting cho authentication endpoints
 *
 * Sử dụng Redis counter với TTL để giới hạn:
 * - Login attempts: max 5 / 15 min per IP
 * - Refresh requests: max 10 / 1 min per user
 *
 * Exports:
 * - RateLimitService: cho các module khác sử dụng (increment counter, check limit)
 * - RateLimitGuard: apply trên endpoint bằng @UseGuards(RateLimitGuard) + @RateLimit('login'|'refresh')
 *
 * Yêu cầu:
 * - Redis module đã được import ở root level (RedisModule.forRoot)
 * - ConfigService có các biến: RATE_LIMIT_LOGIN_MAX, RATE_LIMIT_LOGIN_WINDOW_SECONDS,
 *   RATE_LIMIT_REFRESH_MAX, RATE_LIMIT_REFRESH_WINDOW_SECONDS
 */
@Module({
  imports: [ConfigModule],
  providers: [RateLimitService, RateLimitGuard],
  exports: [RateLimitService, RateLimitGuard],
})
export class RateLimitModule {}
