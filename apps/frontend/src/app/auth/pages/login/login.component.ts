import { Component, OnInit, signal, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../services/auth.service';

/**
 * Mã lỗi có thể nhận từ query params khi redirect back
 */
type AuthErrorCode =
  | 'invalid_state'
  | 'invalid_code'
  | 'provider_error'
  | 'timeout'
  | 'session_expired'
  | 'unknown';

/**
 * Ánh xạ error code → thông báo lỗi tiếng Việt cho người dùng
 */
const ERROR_MESSAGES: Record<AuthErrorCode, string> = {
  invalid_state: 'Phiên đăng nhập không hợp lệ. Vui lòng thử lại.',
  invalid_code: 'Mã xác thực không hợp lệ. Vui lòng thử lại.',
  provider_error: 'Lỗi từ nhà cung cấp xác thực. Vui lòng thử lại sau.',
  timeout: 'Hệ thống xác thực không phản hồi. Vui lòng thử lại sau.',
  session_expired: 'Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.',
  unknown: 'Đã xảy ra lỗi không xác định. Vui lòng thử lại.',
};

/**
 * Login Page — Standalone component hiển thị nút "Đăng nhập với Authentik"
 *
 * Flow:
 * 1. Hiển thị nút đăng nhập
 * 2. On click: generate state (crypto.randomUUID), save to sessionStorage
 * 3. Redirect đến Authentik authorize URL kèm state parameter
 * 4. Hiển thị error messages nếu redirect back với error query param
 *
 * Validates: Requirements 1.1, 1.2
 */
@Component({
  standalone: true,
  selector: 'app-login',
  template: `
    <div class="flex min-h-screen items-center justify-center bg-gray-50">
      <div class="w-full max-w-md space-y-8 rounded-xl bg-white p-8 shadow-lg">
        <!-- Header -->
        <div class="text-center">
          <h1 class="text-2xl font-bold tracking-tight text-gray-900">
            Agile PM
          </h1>
          <p class="mt-2 text-sm text-gray-600">
            Đăng nhập để tiếp tục
          </p>
        </div>

        <!-- Error message -->
        @if (errorMessage()) {
          <div
            class="rounded-md border border-red-200 bg-red-50 p-4"
            role="alert"
            aria-live="polite"
          >
            <div class="flex">
              <div class="flex-shrink-0">
                <svg
                  class="h-5 w-5 text-red-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fill-rule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                    clip-rule="evenodd"
                  />
                </svg>
              </div>
              <div class="ml-3">
                <p class="text-sm text-red-700">{{ errorMessage() }}</p>
              </div>
            </div>
          </div>
        }

        <!-- Login button -->
        <div>
          <button
            type="button"
            (click)="loginWithAuthentik()"
            class="flex w-full items-center justify-center gap-3 rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            <svg
              class="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z"
              />
            </svg>
            Đăng nhập với Authentik
          </button>

          <!-- Đăng nhập bằng tài khoản khác -->
          <button
            type="button"
            (click)="switchAccount()"
            class="mt-3 w-full text-center text-sm font-medium text-indigo-600 hover:text-indigo-500 hover:underline"
          >
            Đăng nhập bằng tài khoản khác
          </button>
        </div>
      </div>
    </div>
  `,
})
export class LoginComponent implements OnInit {
  private readonly authService = inject(AuthService);

  /** Signal chứa error message hiển thị cho user */
  readonly errorMessage = signal<string>('');

  constructor(private readonly route: ActivatedRoute) {}

  ngOnInit(): void {
    // Nếu vừa logout khỏi Authentik để đổi tài khoản → tự động bắt đầu login lại.
    // Lúc này Authentik không còn SSO session nên sẽ buộc hỏi tài khoản.
    if (localStorage.getItem('relogin_after_logout') === '1') {
      localStorage.removeItem('relogin_after_logout');
      this.loginWithAuthentik();
      return;
    }

    // Đọc error từ query params (nếu redirect back với error)
    const errorCode = this.route.snapshot.queryParamMap.get('error');
    const reason = this.route.snapshot.queryParamMap.get('reason');

    if (errorCode) {
      const code = errorCode as AuthErrorCode;
      this.errorMessage.set(ERROR_MESSAGES[code] ?? ERROR_MESSAGES['unknown']);
    } else if (reason === 'session_expired') {
      this.errorMessage.set(ERROR_MESSAGES['session_expired']);
    }
  }

  /**
   * Đăng nhập bằng tài khoản khác.
   *
   * Authentik bỏ qua prompt=select_account/login (hoặc gây loop), nên cách chắc
   * chắn để đổi user là: đăng xuất khỏi Authentik (end-session) trước, rồi quay
   * lại app và tự động bắt đầu login (ngOnInit sẽ phát hiện cờ relogin_after_logout).
   *
   * post_logout_redirect_uri trỏ về /auth/callback (đã đăng ký trong Authentik).
   * Callback không có code sẽ điều hướng về /auth/login, nơi auto-relogin chạy.
   */
  switchAccount(): void {
    this.authService.clearAuthState();
    localStorage.removeItem('mpm_logged_in');
    localStorage.setItem('relogin_after_logout', '1');

    const params = new URLSearchParams({
      post_logout_redirect_uri: environment.authentik.redirectUri,
    });
    window.location.href = `${environment.authentik.endSessionUrl}?${params.toString()}`;
  }

  /**
   * Khởi tạo OAuth2 flow:
   * 1. Generate state parameter (crypto.randomUUID) để chống CSRF
   * 2. Lưu state vào cookie Lax (+ sessionStorage fallback)
   * 3. Redirect đến Authentik authorize endpoint
   */
  loginWithAuthentik(): void {
    // Xóa auth state cũ để đảm bảo không còn session cũ nào ảnh hưởng
    this.authService.clearAuthState();
    localStorage.removeItem('mpm_logged_in');

    // Generate state parameter ngẫu nhiên
    const state = crypto.randomUUID();

    // Lưu state vào cookie Lax (first-party) thay vì sessionStorage.
    // sessionStorage bị một số trình duyệt (Brave) xóa khi redirect cross-site
    // qua OAuth (Authentik), gây state mismatch → phải đăng nhập 2 lần.
    // Cookie Lax tồn tại qua redirect. Giữ sessionStorage làm fallback.
    document.cookie = `oauth_state=${state}; path=/; max-age=600; samesite=lax`;
    sessionStorage.setItem('oauth_state', state);

    // Xây dựng authorize URL
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: environment.authentik.clientId,
      redirect_uri: environment.authentik.redirectUri,
      scope: environment.authentik.scopes,
      state: state,
    });

    const authorizeUrl = `${environment.authentik.authorizeUrl}?${params.toString()}`;

    // Redirect đến Authentik
    window.location.href = authorizeUrl;
  }
}
