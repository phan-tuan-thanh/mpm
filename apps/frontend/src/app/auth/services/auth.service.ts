import { Injectable, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { SystemRole, ProjectRole, ProjectRoleEntry } from '@mpm/shared-types';
import { TokenService } from './token.service';

// Re-export để các consumer (guards, interceptors) import trực tiếp từ auth.service
export type { SystemRole, ProjectRole } from '@mpm/shared-types';

/**
 * Thông tin user hiện tại (decoded từ JWT payload)
 */
export interface CurrentUser {
  id: string;
  email: string;
  systemRole: SystemRole;
  projectRoles: ProjectRoleEntry[];
}

/**
 * Auth Service — Signal-based auth state management
 *
 * - isAuthenticated: computed signal dựa trên token có tồn tại hay không
 * - currentUser: signal chứa thông tin user từ decoded token
 * - isLoading: signal cho loading state trong quá trình auth operations
 * - Orchestrate login/logout/refresh flows
 *
 * Validates: Requirements 1.6, 3.3, 3.8, 11.4
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  /** Signal: thông tin user hiện tại (null nếu chưa authenticated) */
  private readonly currentUserSignal = signal<CurrentUser | null>(null);

  /** Signal: loading state cho auth operations */
  private readonly isLoadingSignal = signal<boolean>(false);

  /** Computed signal: user đã authenticated hay chưa */
  readonly isAuthenticated = computed(() => this.currentUserSignal() !== null);

  /** Computed signal: thông tin user hiện tại (read-only) */
  readonly currentUser = this.currentUserSignal.asReadonly();

  /** Computed signal: loading state (read-only) */
  readonly isLoading = this.isLoadingSignal.asReadonly();

  constructor(
    private readonly tokenService: TokenService,
    private readonly http: HttpClient,
    private readonly router: Router
  ) {}

  /**
   * Promise của lần initialize() đầu tiên — guard await để tránh race condition.
   * withEnabledBlockingInitialNavigation chạy initial navigation SONG SONG với
   * APP_INITIALIZER, nên guard có thể chạy trước khi refresh xong. Guard phải
   * await whenReady() để đảm bảo refresh hoàn tất trước khi kiểm tra auth.
   */
  private initPromise: Promise<void> | null = null;

  initialize(): Promise<void> {
    if (!this.initPromise) {
      this.initPromise = this.runInitialize();
    }
    return this.initPromise;
  }

  /**
   * Trả về promise hoàn tất khi initialize() (gồm cả refresh) đã xong.
   * Dùng trong authGuard.
   */
  whenReady(): Promise<void> {
    return this.initPromise ?? Promise.resolve();
  }

  private runInitialize(): Promise<void> {
    const token = this.tokenService.getAccessToken();
    if (token && !this.tokenService.isTokenExpired()) {
      this.updateUserFromToken(token);
      return Promise.resolve();
    } else if (localStorage.getItem('mpm_logged_in') === 'true') {
      // Chỉ thử refresh từ cookie nếu trước đó đã logged in thành công
      return new Promise<void>((resolve) => {
        this.isLoadingSignal.set(true);
        this.tokenService.refreshToken().subscribe({
          next: (newToken) => {
            this.updateUserFromToken(newToken);
            this.isLoadingSignal.set(false);
            resolve();
          },
          error: () => {
            this.clearAuthState();
            this.tokenService.clearTokens();
            localStorage.removeItem('mpm_logged_in'); // Xóa flag khi refresh thất bại
            this.isLoadingSignal.set(false);
            resolve(); // Vẫn resolve để app chạy tiếp, sẽ bị redirect sang trang login bởi guard
          },
        });
      });
    } else {
      this.clearAuthState();
      return Promise.resolve();
    }
  }

  /**
   * Xử lý sau khi OAuth callback thành công
   * Lưu token và cập nhật auth state
   */
  handleAuthSuccess(accessToken: string): void {
    this.tokenService.setAccessToken(accessToken);
    this.updateUserFromToken(accessToken);
    localStorage.setItem('mpm_logged_in', 'true');
  }

  /**
   * Đăng xuất — gọi API logout, xóa tokens, redirect to login
   */
  async logout(): Promise<void> {
    this.isLoadingSignal.set(true);

    try {
      const token = this.tokenService.getAccessToken();
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });
      }
    } catch {
      // Logout phía server thất bại → vẫn clear local state
    } finally {
      this.clearAuthState();
      this.tokenService.clearTokens();
      localStorage.removeItem('mpm_logged_in');
      this.isLoadingSignal.set(false);
      await this.router.navigate(['/auth/login']);
    }
  }

  /**
   * Refresh token và cập nhật auth state
   * Trả về Observable<string> (new access token)
   */
  refresh(): Observable<string> {
    this.isLoadingSignal.set(true);

    return this.tokenService.refreshToken().pipe(
      tap((newToken) => {
        this.updateUserFromToken(newToken);
        this.isLoadingSignal.set(false);
      }),
      catchError((error: unknown) => {
        this.handleAuthFailure();
        throw error;
      })
    );
  }

  /**
   * Xử lý khi auth thất bại (token expired, refresh failed, session revoked)
   * Xóa state và redirect to login trong vòng 2 giây (Requirement 3.8)
   */
  handleAuthFailure(): void {
    this.clearAuthState();
    this.tokenService.clearTokens();
    localStorage.removeItem('mpm_logged_in');
    this.isLoadingSignal.set(false);

    // Redirect to login ngay lập tức
    void this.router.navigate(['/auth/login'], {
      queryParams: { reason: 'session_expired' },
    });
  }

  /**
   * Kiểm tra user có một trong các system role được yêu cầu không (OR logic)
   */
  hasSystemRole(roles: SystemRole[]): boolean {
    const user = this.currentUserSignal();
    return user ? roles.includes(user.systemRole) : false;
  }

  /**
   * Kiểm tra user có một trong các project role được yêu cầu trong project cụ thể không
   */
  hasProjectRole(projectId: string, roles: ProjectRole[]): boolean {
    const user = this.currentUserSignal();
    if (!user) return false;

    const projectRole = user.projectRoles.find(
      (pr) => pr.projectId === projectId
    );
    if (!projectRole) return false;

    return roles.includes(projectRole.role);
  }

  /**
   * Kiểm tra user có một trong các project role được yêu cầu trong bất kỳ project nào không
   */
  hasAnyProjectRole(roles: ProjectRole[]): boolean {
    const user = this.currentUserSignal();
    if (!user) return false;

    return user.projectRoles.some((pr) => roles.includes(pr.role));
  }

  /**
   * Cập nhật user state từ decoded token
   */
  private updateUserFromToken(token: string): void {
    const payload = this.tokenService.decodePayload(token);
    if (payload) {
      this.currentUserSignal.set({
        id: payload.sub,
        email: payload.email,
        systemRole: payload.systemRole,
        projectRoles: payload.projectRoles,
      });
    } else {
      this.clearAuthState();
    }
  }

  /**
   * Xóa auth state
   */
  clearAuthState(): void {
    this.currentUserSignal.set(null);
  }


}
