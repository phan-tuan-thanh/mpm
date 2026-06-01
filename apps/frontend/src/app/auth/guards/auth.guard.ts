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
export const authGuard: CanActivateFn = (route, state): boolean | UrlTree => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  // Redirect to login với returnUrl để quay lại sau khi đăng nhập
  const returnUrl = state.url;
  return router.createUrlTree(['/auth/login'], {
    queryParams: { returnUrl },
  });
};
