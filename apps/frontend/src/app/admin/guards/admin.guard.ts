import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../auth/services/auth.service';
import { MessageService } from 'primeng/api';

/**
 * Admin Guard — bảo vệ các route chỉ dành cho System Admin
 *
 * Kiểm tra xem systemRole của user hiện tại có phải là 'Admin' không.
 * Nếu không, hiển thị thông báo lỗi và redirect về trang chủ.
 */
export const adminGuard: CanActivateFn = async (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const messageService = inject(MessageService);

  // Đảm bảo thông tin user đã được khởi tạo/refresh xong
  await authService.whenReady();

  if (authService.currentUser()?.systemRole === 'Admin') {
    return true;
  }

  // Hiển thị toast thông báo không có quyền truy cập
  messageService.add({
    severity: 'error',
    summary: 'Không có quyền truy cập',
    detail: 'Bạn không có quyền truy cập trang này',
  });

  // Redirect về trang chủ
  return router.createUrlTree(['/']);
};
