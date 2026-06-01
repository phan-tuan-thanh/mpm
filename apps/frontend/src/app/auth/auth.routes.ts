import { Routes } from '@angular/router';

/**
 * Auth Routes — Lazy-loaded routes cho authentication pages
 *
 * - /auth/login → Login page (nút "Đăng nhập với Authentik")
 * - /auth/callback → OAuth2 callback handler
 *
 * Sử dụng loadComponent cho lazy loading từng component riêng biệt.
 *
 * Validates: Requirements 1.1, 1.6
 */
export const AUTH_ROUTES: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/login.component').then((m) => m.LoginComponent),
    title: 'Đăng nhập — Agile PM',
  },
  {
    path: 'callback',
    loadComponent: () =>
      import('./pages/callback/callback.component').then(
        (m) => m.CallbackComponent
      ),
    title: 'Đang xác thực...',
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
];
