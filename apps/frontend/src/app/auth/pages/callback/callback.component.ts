import { Component, OnInit, signal, inject } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { ErrorResponse } from '@mpm/shared-types';

/**
 * Mã lỗi phân loại cho callback errors
 */
type CallbackErrorCode = 'invalid_code' | 'provider_error' | 'timeout' | 'unknown';

/**
 * Ánh xạ error code → thông báo lỗi tiếng Việt
 */
const ERROR_MESSAGES: Record<CallbackErrorCode, string> = {
  invalid_code: 'Mã xác thực không hợp lệ hoặc đã hết hạn. Vui lòng thử đăng nhập lại.',
  provider_error: 'Lỗi từ nhà cung cấp xác thực. Vui lòng thử lại sau.',
  timeout: 'Hệ thống xác thực không phản hồi. Vui lòng thử lại sau.',
  unknown: 'Đã xảy ra lỗi trong quá trình xác thực. Vui lòng thử lại.',
};

/**
 * Response từ POST /api/auth/callback
 */
interface AuthCallbackResponse {
  accessToken: string;
}

/**
 * Callback Page — Xử lý OAuth2 callback từ Authentik
 *
 * Flow:
 * 1. Extract code và state từ URL query params
 * 2. Verify state matches sessionStorage value
 * 3. Call POST /api/auth/callback với code và state
 * 4. On success: store accessToken in memory, redirect to dashboard
 * 5. On error: hiển thị error message phân loại
 *
 * Validates: Requirements 1.2, 1.6, 1.7, 1.9, 1.10
 */
@Component({
  standalone: true,
  selector: 'app-callback',
  template: `
    <div class="flex min-h-screen items-center justify-center bg-gray-50">
      <div class="w-full max-w-md space-y-6 rounded-xl bg-white p-8 shadow-lg">
        @if (isLoading()) {
          <!-- Loading state -->
          <div class="text-center">
            <div
              class="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600"
              role="status"
              aria-label="Đang xử lý xác thực"
            ></div>
            <p class="mt-4 text-sm text-gray-600">
              Đang xử lý xác thực...
            </p>
          </div>
        } @else if (errorMessage()) {
          <!-- Error state -->
          <div class="text-center">
            <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <svg
                class="h-6 w-6 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                />
              </svg>
            </div>
            <h2 class="mt-4 text-lg font-semibold text-gray-900">
              Xác thực thất bại
            </h2>
            <p class="mt-2 text-sm text-gray-600" role="alert" aria-live="polite">
              {{ errorMessage() }}
            </p>
            <div class="mt-6">
              <button
                type="button"
                (click)="navigateToLogin()"
                class="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              >
                Quay lại đăng nhập
              </button>
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
export class CallbackComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  /** Signal: đang xử lý callback */
  readonly isLoading = signal<boolean>(true);

  /** Signal: error message hiển thị cho user */
  readonly errorMessage = signal<string>('');

  ngOnInit(): void {
    this.handleCallback();
  }

  /**
   * Quay lại trang login
   */
  navigateToLogin(): void {
    void this.router.navigate(['/auth/login']);
  }

  /**
   * Xử lý OAuth2 callback:
   * 1. Extract code & state từ query params
   * 2. Verify state matches sessionStorage
   * 3. Exchange code for tokens via backend
   * 4. Store token & redirect to dashboard
   */
  private handleCallback(): void {
    const code = this.route.snapshot.queryParamMap.get('code');
    const state = this.route.snapshot.queryParamMap.get('state');

    // Kiểm tra có code và state không
    if (!code || !state) {
      this.handleError('unknown');
      return;
    }

    // Verify state matches sessionStorage (chống CSRF — Requirement 1.9)
    const savedState = sessionStorage.getItem('oauth_state');

    if (!savedState || savedState !== state) {
      // State không khớp → redirect to login với error
      sessionStorage.removeItem('oauth_state');
      void this.router.navigate(['/auth/login'], {
        queryParams: { error: 'invalid_state' },
      });
      return;
    }

    // Xóa state khỏi sessionStorage (đã sử dụng)
    sessionStorage.removeItem('oauth_state');

    // Gọi backend để exchange code lấy tokens
    this.http
      .post<AuthCallbackResponse>('/api/auth/callback', { code, state })
      .subscribe({
        next: (response) => {
          // Lưu accessToken vào memory và cập nhật auth state
          this.authService.handleAuthSuccess(response.accessToken);
          this.isLoading.set(false);

          // Redirect to dashboard
          void this.router.navigate(['/dashboard']);
        },
        error: (error: HttpErrorResponse) => {
          this.isLoading.set(false);
          this.handleHttpError(error);
        },
      });
  }

  /**
   * Phân loại HTTP error và hiển thị message phù hợp
   */
  private handleHttpError(error: HttpErrorResponse): void {
    if (error.status === 0) {
      // Network error hoặc timeout
      this.handleError('timeout');
      return;
    }

    // Thử parse error response từ backend
    const errorResponse = error.error as Partial<ErrorResponse> | null;
    const errorCode = errorResponse?.errorCode;

    switch (errorCode) {
      case 'INVALID_CODE':
        this.handleError('invalid_code');
        break;
      case 'PROVIDER_TIMEOUT':
        this.handleError('timeout');
        break;
      case 'PROVIDER_ERROR':
        this.handleError('provider_error');
        break;
      default:
        // Phân loại dựa trên HTTP status
        if (error.status === 502) {
          this.handleError('timeout');
        } else if (error.status === 401) {
          this.handleError('invalid_code');
        } else {
          this.handleError('unknown');
        }
    }
  }

  /**
   * Set error message từ error code
   */
  private handleError(code: CallbackErrorCode): void {
    this.isLoading.set(false);
    this.errorMessage.set(ERROR_MESSAGES[code]);
  }
}
