import { Injectable, Logger } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { randomUUID } from 'crypto';
import type { SessionData } from '@mpm/shared-types';

/** TTL cho session: 7 ngày (giây) */
const SESSION_TTL_SECONDS = 604800;

/** TTL cho forced-logout flag: 15 phút (giây) */
const FORCED_LOGOUT_TTL_SECONDS = 900;

/** Số session tối đa trả về khi list */
const MAX_SESSIONS_RETURNED = 50;

/**
 * Session Service — quản lý session trong Redis
 *
 * Redis key patterns:
 * - session:{userId}:{sessionId} — Hash chứa session data (TTL 7 ngày)
 * - refresh_blacklist:{tokenHash} — String flag cho revoked refresh token
 * - forced_logout:{userId} — String flag buộc user logout (TTL 15 phút)
 */
@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);

  constructor(
    @InjectRedis() private readonly redis: Redis,
  ) {}

  /**
   * Tạo session mới và lưu vào Redis
   *
   * @param userId - ID người dùng (UUID)
   * @param deviceInfo - Thông tin thiết bị (User-Agent)
   * @param ipAddress - Địa chỉ IP client
   * @param refreshTokenHash - Hash của refresh token liên kết
   * @returns SessionData đã tạo
   */
  async createSession(
    userId: string,
    deviceInfo: string,
    ipAddress: string,
    refreshTokenHash: string,
  ): Promise<SessionData> {
    const sessionId = randomUUID();
    const now = new Date().toISOString();

    const sessionData: SessionData = {
      sessionId,
      userId,
      deviceInfo,
      ipAddress,
      createdAt: now,
      lastActivity: now,
      refreshTokenHash,
    };

    const key = this.buildSessionKey(userId, sessionId);

    // Lưu session dưới dạng Redis Hash
    await this.redis.hset(key, {
      sessionId: sessionData.sessionId,
      userId: sessionData.userId,
      deviceInfo: sessionData.deviceInfo,
      ipAddress: sessionData.ipAddress,
      createdAt: sessionData.createdAt,
      lastActivity: sessionData.lastActivity,
      refreshTokenHash: sessionData.refreshTokenHash,
    });

    // Set TTL 7 ngày
    await this.redis.expire(key, SESSION_TTL_SECONDS);

    // Lưu mapping refresh_owner:{tokenHash} → userId để lookup nhanh khi refresh
    await this.redis.set(
      `refresh_owner:${refreshTokenHash}`,
      userId,
      'EX',
      SESSION_TTL_SECONDS,
    );

    this.logger.debug(
      `Session created: ${sessionId} for user ${userId}`,
    );

    return sessionData;
  }

  /**
   * Lấy thông tin session theo userId và sessionId
   *
   * @returns SessionData hoặc null nếu không tồn tại
   */
  async getSession(
    userId: string,
    sessionId: string,
  ): Promise<SessionData | null> {
    const key = this.buildSessionKey(userId, sessionId);
    const data = await this.redis.hgetall(key);

    // hgetall trả về object rỗng nếu key không tồn tại
    if (!data || Object.keys(data).length === 0) {
      return null;
    }

    return this.parseSessionData(data);
  }

  /**
   * Liệt kê tất cả sessions của user (tối đa 50)
   *
   * Sử dụng SCAN thay vì KEYS để tránh block Redis
   */
  async listSessions(userId: string): Promise<SessionData[]> {
    const pattern = `session:${userId}:*`;
    const sessions: SessionData[] = [];
    let cursor = '0';

    do {
      const [nextCursor, keys] = await this.redis.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        100,
      );
      cursor = nextCursor;

      for (const key of keys) {
        if (sessions.length >= MAX_SESSIONS_RETURNED) {
          break;
        }

        const data = await this.redis.hgetall(key);
        if (data && Object.keys(data).length > 0) {
          sessions.push(this.parseSessionData(data));
        }
      }
    } while (cursor !== '0' && sessions.length < MAX_SESSIONS_RETURNED);

    return sessions;
  }

  /**
   * Cập nhật thời gian hoạt động cuối của session
   */
  async updateLastActivity(
    userId: string,
    sessionId: string,
  ): Promise<void> {
    const key = this.buildSessionKey(userId, sessionId);
    const exists = await this.redis.exists(key);

    if (exists) {
      await this.redis.hset(key, 'lastActivity', new Date().toISOString());
    }
  }

  /**
   * Thu hồi session cụ thể
   *
   * - Xóa session khỏi Redis
   * - Thêm refresh token vào blacklist với TTL còn lại của session
   */
  async revokeSession(userId: string, sessionId: string): Promise<void> {
    const key = this.buildSessionKey(userId, sessionId);

    // Lấy refreshTokenHash trước khi xóa
    const refreshTokenHash = await this.redis.hget(key, 'refreshTokenHash');

    // Lấy TTL còn lại để dùng cho blacklist
    const remainingTtl = await this.redis.ttl(key);

    // Xóa session
    await this.redis.del(key);

    // Blacklist refresh token và xóa refresh_owner mapping
    if (refreshTokenHash) {
      const blacklistTtl = remainingTtl > 0 ? remainingTtl : SESSION_TTL_SECONDS;
      await this.blacklistRefreshToken(refreshTokenHash, blacklistTtl);
      await this.redis.del(`refresh_owner:${refreshTokenHash}`);
    }

    this.logger.debug(
      `Session revoked: ${sessionId} for user ${userId}`,
    );
  }

  /**
   * Tìm userId theo refresh token hash
   * Dùng key `refresh_owner:{tokenHash}` được tạo khi createSession
   *
   * Fallback (self-heal): nếu mapping chưa tồn tại (session tạo bởi code cũ
   * trước khi có refresh_owner), quét session:* để tìm session khớp
   * refreshTokenHash rồi backfill mapping. Tránh bắt user phải đăng nhập lại.
   */
  async findUserByRefreshTokenHash(tokenHash: string): Promise<string | null> {
    const owner = await this.redis.get(`refresh_owner:${tokenHash}`);
    if (owner) {
      return owner;
    }

    // Fallback: scan toàn bộ session keys để tìm hash khớp
    let cursor = '0';
    do {
      const [nextCursor, keys] = await this.redis.scan(
        cursor,
        'MATCH',
        'session:*',
        'COUNT',
        100,
      );
      cursor = nextCursor;

      for (const key of keys) {
        const hash = await this.redis.hget(key, 'refreshTokenHash');
        if (hash === tokenHash) {
          const userId = await this.redis.hget(key, 'userId');
          if (userId) {
            // Backfill mapping để lần sau lookup nhanh
            await this.redis.set(
              `refresh_owner:${tokenHash}`,
              userId,
              'EX',
              SESSION_TTL_SECONDS,
            );
            return userId;
          }
        }
      }
    } while (cursor !== '0');

    return null;
  }

  /**
   * Cập nhật refreshTokenHash sau khi rotate token
   * - Xóa mapping cũ, tạo mapping mới
   * - Cập nhật field trong session hash
   */
  async updateRefreshTokenHash(
    userId: string,
    sessionId: string,
    oldHash: string,
    newHash: string,
  ): Promise<void> {
    const key = this.buildSessionKey(userId, sessionId);

    // Cập nhật field trong session hash
    await this.redis.hset(key, 'refreshTokenHash', newHash);

    // Lưu mapping mới
    await this.redis.set(
      `refresh_owner:${newHash}`,
      userId,
      'EX',
      SESSION_TTL_SECONDS,
    );

    // Xóa mapping cũ (đã bị blacklist ở auth.service)
    await this.redis.del(`refresh_owner:${oldHash}`);
  }

  /**
   * Thu hồi tất cả sessions của user
   *
   * Sử dụng SCAN để tìm và xóa tất cả session keys,
   * đồng thời blacklist tất cả refresh tokens liên quan.
   */
  async revokeAllSessions(userId: string): Promise<void> {
    const pattern = `session:${userId}:*`;
    let cursor = '0';

    do {
      const [nextCursor, keys] = await this.redis.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        100,
      );
      cursor = nextCursor;

      for (const key of keys) {
        // Lấy refreshTokenHash trước khi xóa
        const refreshTokenHash = await this.redis.hget(key, 'refreshTokenHash');

        // Xóa session
        await this.redis.del(key);

        // Blacklist refresh token và xóa refresh_owner mapping
        if (refreshTokenHash) {
          await this.blacklistRefreshToken(refreshTokenHash, SESSION_TTL_SECONDS);
          await this.redis.del(`refresh_owner:${refreshTokenHash}`);
        }
      }
    } while (cursor !== '0');

    this.logger.debug(`All sessions revoked for user ${userId}`);
  }

  /**
   * Thêm user vào danh sách forced-logout
   *
   * User trong danh sách này sẽ bị reject mọi request
   * bất kể Access Token còn hạn hay không.
   * TTL = 15 phút (thời gian tối đa Access Token còn sống)
   */
  async addToForcedLogout(userId: string): Promise<void> {
    const key = `forced_logout:${userId}`;
    await this.redis.set(key, '1', 'EX', FORCED_LOGOUT_TTL_SECONDS);

    this.logger.debug(`User ${userId} added to forced-logout list`);
  }

  /**
   * Xóa user khỏi danh sách forced-logout (khi re-enable)
   */
  async removeFromForcedLogout(userId: string): Promise<void> {
    const key = `forced_logout:${userId}`;
    await this.redis.del(key);

    this.logger.debug(`User ${userId} removed from forced-logout list`);
  }

  /**
   * Kiểm tra user có đang bị forced-logout không
   */
  async isForceLoggedOut(userId: string): Promise<boolean> {
    const key = `forced_logout:${userId}`;
    const result = await this.redis.exists(key);
    return result === 1;
  }

  /**
   * Thêm refresh token vào blacklist
   *
   * @param tokenHash - Hash của refresh token cần blacklist
   * @param ttl - TTL tính bằng giây (thường = thời hạn còn lại của token)
   */
  async blacklistRefreshToken(tokenHash: string, ttl: number): Promise<void> {
    const key = `refresh_blacklist:${tokenHash}`;
    await this.redis.set(key, '1', 'EX', ttl);
  }

  /**
   * Kiểm tra refresh token có nằm trong blacklist không
   */
  async isRefreshTokenBlacklisted(tokenHash: string): Promise<boolean> {
    const key = `refresh_blacklist:${tokenHash}`;
    const result = await this.redis.exists(key);
    return result === 1;
  }

  // ─── Private Helpers ────────────────────────────────────────────────────────

  /**
   * Tạo Redis key cho session
   */
  private buildSessionKey(userId: string, sessionId: string): string {
    return `session:${userId}:${sessionId}`;
  }

  /**
   * Parse raw Redis hash data thành SessionData interface
   */
  private parseSessionData(data: Record<string, string>): SessionData {
    return {
      sessionId: data['sessionId'],
      userId: data['userId'],
      deviceInfo: data['deviceInfo'],
      ipAddress: data['ipAddress'],
      createdAt: data['createdAt'],
      lastActivity: data['lastActivity'],
      refreshTokenHash: data['refreshTokenHash'],
    };
  }
}
