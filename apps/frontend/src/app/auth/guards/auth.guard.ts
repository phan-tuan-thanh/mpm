import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Auth Guard — bảo vệ route yêu cầu xác thực.
 *
 * Nếu user chưa authenticated → redirect đến /login kèm returnUrl
 * để sau khi đăng nhập thành công có thể quay lại trang ban đầu.
 *
 * Sử dụng: trong route config
 * ```ts
 * { path: 'dashboard', canActivate: [authGuard], component: DashboardComponent }
 * ```
 *
 * Validates: Requirements 8.1
 */
export const authGuard: CanActivateFn = async (
  route,
  state,
): Promise<boolean | UrlTree> => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Chờ initialize() (gồm refresh từ cookie) hoàn tất trước khi kiểm tra.
  // Tránh race condition: withEnabledBlockingInitialNavigation chạy guard
  // song song với APP_INITIALIZER, nếu không chờ thì isAuthenticated() còn
  // false khi reload → văng login dù refresh đang chạy.
  await authService.whenReady();

  if (authService.isAuthenticated()) {
    return true;
  }

  // Redirect to login với returnUrl để quay lại sau khi đăng nhập
  const returnUrl = state.url;
  return router.createUrlTree(['/auth/login'], {
    queryParams: { returnUrl },
  });
};
