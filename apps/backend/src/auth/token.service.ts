import { Injectable, OnModuleInit, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readFileSync } from 'fs';
import { sign, verify, JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { randomBytes, createHash, timingSafeEqual } from 'crypto';
import type { JwtPayload } from '@mpm/shared-types';

/** Kết quả tạo refresh token: token gốc và hash SHA-256 */
export interface RefreshTokenResult {
  /** Token gốc (gửi cho client) */
  token: string;
  /** SHA-256 hash (lưu trong Redis) */
  hash: string;
}

/**
 * Token Service — quản lý JWT Access Token (RS256) và Refresh Token
 *
 * Chịu trách nhiệm:
 * - Ký và xác thực Access Token với RSA key pair
 * - Tạo Refresh Token ngẫu nhiên và hash SHA-256
 * - Load RSA keys từ filesystem khi khởi tạo module
 */
@Injectable()
export class TokenService implements OnModuleInit {
  private readonly logger = new Logger(TokenService.name);
  private privateKey!: string;
  private publicKey!: string;
  private accessTokenExpiry!: string;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    this.loadKeys();
    this.accessTokenExpiry = this.configService.get<string>(
      'JWT_ACCESS_TOKEN_EXPIRY',
      '15m',
    );
  }

  /**
   * Ký Access Token với RS256 private key
   *
   * @param payload - JWT payload chứa user claims (sub, email, systemRole, projectRoles)
   * @returns Signed JWT string
   */
  signAccessToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
    const now = Math.floor(Date.now() / 1000);
    const expiresInSeconds = this.parseExpiryToSeconds(this.accessTokenExpiry);

    const fullPayload: JwtPayload = {
      ...payload,
      iat: now,
      exp: now + expiresInSeconds,
    };

    return sign(fullPayload, this.privateKey, {
      algorithm: 'RS256',
    });
  }

  /**
   * Xác thực Access Token với RS256 public key
   *
   * @param token - JWT string cần verify
   * @returns Decoded JWT payload
   * @throws UnauthorizedException nếu token không hợp lệ hoặc hết hạn
   */
  verifyAccessToken(token: string): JwtPayload {
    try {
      const decoded = verify(token, this.publicKey, {
        algorithms: ['RS256'],
      });

      // verify() trả về string hoặc JwtPayload object
      if (typeof decoded === 'string') {
        throw new UnauthorizedException('TOKEN_INVALID');
      }

      return decoded as JwtPayload;
    } catch (error: unknown) {
      if (error instanceof TokenExpiredError) {
        throw new UnauthorizedException('TOKEN_EXPIRED');
      }
      if (error instanceof JsonWebTokenError) {
        throw new UnauthorizedException('TOKEN_INVALID');
      }
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('TOKEN_INVALID');
    }
  }

  /**
   * Tạo Refresh Token ngẫu nhiên và hash SHA-256
   *
   * Token gốc gửi cho client (lưu trong httpOnly cookie),
   * hash lưu trong Redis để so sánh khi verify.
   *
   * @returns Object chứa token gốc và SHA-256 hash
   */
  generateRefreshToken(): RefreshTokenResult {
    // Tạo random token 48 bytes → 64 hex chars (> 32 chars requirement)
    const token = randomBytes(48).toString('hex');
    const hash = this.hashToken(token);

    return { token, hash };
  }

  /**
   * Xác thực Refresh Token bằng cách so sánh hash
   *
   * @param token - Token gốc từ client
   * @param hash - Hash đã lưu trong Redis
   * @returns true nếu token khớp với hash
   */
  verifyRefreshToken(token: string, hash: string): boolean {
    const computedHash = this.hashToken(token);
    // Sử dụng timing-safe comparison để chống timing attack
    const bufA = Buffer.from(computedHash, 'utf-8');
    const bufB = Buffer.from(hash, 'utf-8');

    // timingSafeEqual yêu cầu cùng length
    if (bufA.length !== bufB.length) {
      return false;
    }

    return timingSafeEqual(bufA, bufB);
  }

  /**
   * Hash token bằng SHA-256
   *
   * @param token - Token cần hash
   * @returns Hex-encoded SHA-256 hash
   */
  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /**
   * Load RSA key pair từ filesystem
   * Đường dẫn được cấu hình qua environment variables
   */
  private loadKeys(): void {
    const privateKeyPath = this.configService.get<string>('JWT_PRIVATE_KEY_PATH');
    const publicKeyPath = this.configService.get<string>('JWT_PUBLIC_KEY_PATH');

    if (!privateKeyPath || !publicKeyPath) {
      throw new Error(
        'JWT_PRIVATE_KEY_PATH and JWT_PUBLIC_KEY_PATH must be configured',
      );
    }

    try {
      this.privateKey = readFileSync(privateKeyPath, 'utf-8');
      this.publicKey = readFileSync(publicKeyPath, 'utf-8');
      this.logger.log('RSA key pair loaded successfully');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(
        `Failed to load RSA keys: ${message}. ` +
          `Ensure JWT_PRIVATE_KEY_PATH (${privateKeyPath}) and ` +
          `JWT_PUBLIC_KEY_PATH (${publicKeyPath}) point to valid PEM files.`,
      );
    }
  }

  /**
   * Parse expiry string (e.g. "15m", "1h", "7d") thành seconds
   *
   * @param expiry - Chuỗi thời gian (e.g. "15m", "1h", "7d")
   * @returns Số giây tương ứng
   */
  private parseExpiryToSeconds(expiry: string): number {
    const match = expiry.match(/^(\d+)(s|m|h|d)$/);
    if (!match) {
      // Mặc định 15 phút nếu format không hợp lệ
      this.logger.warn(
        `Invalid JWT_ACCESS_TOKEN_EXPIRY format: "${expiry}", defaulting to 900s (15m)`,
      );
      return 900;
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 3600;
      case 'd':
        return value * 86400;
      default:
        return 900;
    }
  }
}
