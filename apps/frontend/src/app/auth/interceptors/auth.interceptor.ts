import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, filter, switchMap, take } from 'rxjs/operators';

import { TokenService } from '../services/token.service';
import { AuthService } from '../services/auth.service';

/**
 * Danh sách URL không cần attach Bearer token
 * (các auth endpoints public)
 */
const AUTH_SKIP_URLS: readonly string[] = [
  '/api/auth/login',
  '/api/auth/callback',
  '/api/auth/refresh',
];

/**
 * Kiểm tra URL có nằm trong danh sách skip không
 */
function shouldSkipAuth(url: string): boolean {
  return AUTH_SKIP_URLS.some((skipUrl) => url.includes(skipUrl));
}

/**
 * State quản lý concurrent refresh
 * Dùng BehaviorSubject để các request chờ kết quả refresh
 */
let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

/**
 * Auth Interceptor — Angular 19 functional interceptor
 *
 * Chức năng:
 * 1. Attach Bearer token vào mọi request (trừ auth endpoints)
 * 2. Handle 401: TOKEN_EXPIRED → refresh token, retry; khác → logout
 * 3. Handle 429: extract Retry-After header
 * 4. Concurrent refresh: chỉ 1 refresh request, các request khác chờ
 *
 * Validates: Requirements 3.3, 3.8, 3.9, 11.4
 */
export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {
  const tokenService = inject(TokenService);
  const authService = inject(AuthService);
  const router = inject(Router);

  // Skip auth header cho các auth endpoints
  if (shouldSkipAuth(req.url)) {
    return next(req);
  }

  // Attach Bearer token nếu có
  const accessToken = tokenService.getAccessToken();
  const authReq = accessToken ? addAuthHeader(req, accessToken) : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        return handle401Error(error, req, next, tokenService, authService, router);
      }

      if (error.status === 429) {
        return handle429Error(error);
      }

      return throwError(() => error);
    }),
  );
};

/**
 * Thêm Authorization header vào request
 */
function addAuthHeader(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`,
    },
  });
}

/**
 * Interface cho error response body từ backend
 */
interface ApiErrorResponse {
  statusCode: number;
  error: string;
  message: string;
  errorCode: string;
  timestamp: string;
}

/**
 * Xử lý HTTP 401 response
 *
 * - TOKEN_EXPIRED: trigger refresh token, retry request gốc
 * - Khác (TOKEN_INVALID, SESSION_REVOKED, TOKEN_MISSING): clear state, redirect to login
 *
 * Concurrent refresh: nếu refresh đang in-progress, queue request chờ kết quả
 */
function handle401Error(
  error: HttpErrorResponse,
  originalReq: HttpRequest<unknown>,
  next: HttpHandlerFn,
  tokenService: TokenService,
  authService: AuthService,
  router: Router,
): Observable<HttpEvent<unknown>> {
  const errorBody = error.error as ApiErrorResponse | null;
  const errorCode = errorBody?.errorCode ?? '';

  // Chỉ refresh khi TOKEN_EXPIRED
  if (errorCode === 'TOKEN_EXPIRED') {
    return handleTokenExpired(originalReq, next, tokenService, authService, router);
  }

  // Các lỗi 401 khác: clear state, redirect to login
  return handleAuthFailure(authService, router, error);
}

/**
 * Xử lý TOKEN_EXPIRED: refresh token và retry request
 * Concurrent protection: chỉ 1 refresh request tại một thời điểm
 */
function handleTokenExpired(
  originalReq: HttpRequest<unknown>,
  next: HttpHandlerFn,
  tokenService: TokenService,
  authService: AuthService,
  router: Router,
): Observable<HttpEvent<unknown>> {
  if (!isRefreshing) {
    // Bắt đầu refresh
    isRefreshing = true;
    refreshTokenSubject.next(null);

    return tokenService.refreshToken().pipe(
      switchMap((newToken: string) => {
        isRefreshing = false;
        refreshTokenSubject.next(newToken);

        // Retry request gốc với token mới
        return next(addAuthHeader(originalReq, newToken));
      }),
      catchError((refreshError: unknown) => {
        // Refresh thất bại: clear state, redirect to login
        isRefreshing = false;
        refreshTokenSubject.next(null);
        return handleAuthFailure(authService, router, refreshError);
      }),
    );
  }

  // Refresh đang in-progress: chờ kết quả từ request đầu tiên
  return refreshTokenSubject.pipe(
    filter((token): token is string => token !== null),
    take(1),
    switchMap((newToken: string) => {
      // Retry request gốc với token mới
      return next(addAuthHeader(originalReq, newToken));
    }),
  );
}

/**
 * Xử lý auth failure: clear tokens, redirect to login
 * Req 3.8: Khi refresh thất bại → xóa token, redirect to login
 */
function handleAuthFailure(
  authService: AuthService,
  router: Router,
  error: unknown,
): Observable<never> {
  authService.clearAuthState();
  router.navigate(['/auth/login']);
  return throwError(() => error);
}

/**
 * Xử lý HTTP 429 (Rate Limited)
 * Extract Retry-After header (giá trị tính bằng giây)
 * Req 9.3: Response 429 có Retry-After header
 */
function handle429Error(error: HttpErrorResponse): Observable<never> {
  const retryAfterHeader = error.headers.get('Retry-After');
  const retryAfterSeconds = retryAfterHeader ? parseInt(retryAfterHeader, 10) : 0;

  // Tạo enriched error với thông tin retry
  const enrichedError = {
    ...error,
    retryAfterSeconds: isNaN(retryAfterSeconds) ? 0 : retryAfterSeconds,
  };

  return throwError(() => enrichedError);
}
