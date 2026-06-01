import { Injectable, computed, inject } from '@angular/core';
import { AuthService, CurrentUser } from '../services/auth.service';

/**
 * Auth Store — Signal-based store cho auth state
 *
 * Minimal wrapper quanh AuthService, cung cấp reactive state
 * cho components thông qua Angular Signals.
 *
 * AuthService đã quản lý state nội bộ bằng Signals, store này
 * expose các computed signals dưới dạng public API thống nhất
 * cho toàn bộ feature module.
 *
 * Validates: Requirements 1.1, 1.6
 */
@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly authService = inject(AuthService);

  /** User đã authenticated hay chưa */
  readonly isAuthenticated = computed(() => this.authService.isAuthenticated());

  /** Thông tin user hiện tại (null nếu chưa authenticated) */
  readonly currentUser = computed<CurrentUser | null>(
    () => this.authService.currentUser()
  );

  /** Loading state cho auth operations */
  readonly isLoading = computed(() => this.authService.isLoading());

  /** Email của user hiện tại (tiện ích) */
  readonly userEmail = computed(() => this.currentUser()?.email ?? null);

  /** System role của user hiện tại */
  readonly systemRole = computed(() => this.currentUser()?.systemRole ?? null);

  /** Kiểm tra user có phải Admin không */
  readonly isAdmin = computed(() => this.currentUser()?.systemRole === 'Admin');
}
