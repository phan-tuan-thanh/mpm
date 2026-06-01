import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { switchMap, catchError, finalize, share } from 'rxjs/operators';
import { JwtPayload } from '@mpm/shared-types';

/**
 * Token Service — Quản lý Access Token trong memory
 *
 * - Access Token lưu trong private variable (KHÔNG dùng localStorage/sessionStorage)
 * - Decode JWT payload bằng base64 (không verify signature — server verify)
 * - Check token expiry (< 2 phút trước exp → cần refresh)
 * - Concurrent refresh protection: chỉ 1 refresh request tại một thời điểm
 *
 * Validates: Requirements 1.6, 3.3, 3.8, 3.9, 12.1
 */
@Injectable({ providedIn: 'root' })
export class TokenService {
  /** Access Token lưu trong memory — không bao giờ persist ra storage */
  private accessToken: string | null = null;

  /**
   * Observable đang thực hiện refresh (nếu có).
   * Dùng để đảm bảo chỉ 1 refresh request tại một thời điểm.
   */
  private refreshInProgress$: Observable<string> | null = null;

  constructor(private readonly http: HttpClient) {}

  /**
   * Lấy Access Token hiện tại từ memory
   */
  getAccessToken(): string | null {
    return this.accessToken;
  }

  /**
   * Lưu Access Token vào memory
   */
  setAccessToken(token: string): void {
    this.accessToken = token;
  }

  /**
   * Xóa tất cả tokens khỏi memory
   * Refresh Token cookie sẽ được xóa bởi server response (Set-Cookie với Max-Age=0)
   */
  clearTokens(): void {
    this.accessToken = null;
    this.refreshInProgress$ = null;
  }

  /**
   * Kiểm tra token có sắp hết hạn không (< 2 phút trước exp)
   * Trả về true nếu token sắp hết hạn hoặc đã hết hạn
   */
  isTokenExpiringSoon(): boolean {
    if (!this.accessToken) {
      return false;
    }

    const payload = this.decodePayload(this.accessToken);
    if (!payload) {
      return true;
    }

    const now = Math.floor(Date.now() / 1000);
    const twoMinutesInSeconds = 120;

    // Token hết hạn trong vòng 2 phút hoặc đã hết hạn
    return payload.exp - now < twoMinutesInSeconds;
  }

  /**
   * Decode JWT payload từ token (base64 decode, không verify signature)
   * Trả về null nếu token không hợp lệ
   */
  decodePayload(token: string): JwtPayload | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }

      const payloadBase64 = parts[1];
      // Xử lý base64url → base64 standard
      const base64 = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );

      const payload = JSON.parse(jsonPayload) as JwtPayload;

      // Validate required fields
      if (
        !payload.sub ||
        !payload.email ||
        !payload.systemRole ||
        !Array.isArray(payload.projectRoles) ||
        typeof payload.iat !== 'number' ||
        typeof payload.exp !== 'number'
      ) {
        return null;
      }

      return payload;
    } catch {
      return null;
    }
  }

  /**
   * Kiểm tra token đã hết hạn chưa
   */
  isTokenExpired(): boolean {
    if (!this.accessToken) {
      return true;
    }

    const payload = this.decodePayload(this.accessToken);
    if (!payload) {
      return true;
    }

    const now = Math.floor(Date.now() / 1000);
    return payload.exp <= now;
  }

  /**
   * Refresh token với concurrent protection
   * Chỉ 1 refresh request tại một thời điểm — các request khác chờ kết quả
   *
   * @returns Observable<string> — Access Token mới
   */
  refreshToken(): Observable<string> {
    // Nếu đang có refresh request → trả về observable đang chờ
    if (this.refreshInProgress$) {
      return this.refreshInProgress$;
    }

    // Tạo refresh request mới
    this.refreshInProgress$ = this.http
      .post<{ accessToken: string }>(
        '/api/auth/refresh',
        {},
        { withCredentials: true } // Gửi httpOnly cookie chứa Refresh Token
      )
      .pipe(
        switchMap((response) => {
          this.setAccessToken(response.accessToken);
          return of(response.accessToken);
        }),
        catchError((error: unknown) => {
          this.clearTokens();
          return throwError(() => error);
        }),
        finalize(() => {
          // Reset refresh state khi hoàn tất (success hoặc error)
          this.refreshInProgress$ = null;
        }),
        // share() đảm bảo tất cả subscribers nhận cùng kết quả
        share()
      );

    return this.refreshInProgress$;
  }
}
