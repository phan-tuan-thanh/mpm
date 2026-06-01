import { Component, inject } from '@angular/core';
import { AuthService } from '../auth/services/auth.service';

/**
 * Dashboard Page — trang đích sau khi đăng nhập thành công.
 *
 * Tạm thời hiển thị thông tin user hiện tại và nút đăng xuất.
 * Đây là placeholder để auth flow có nơi điều hướng tới; sẽ được thay
 * bằng dashboard thật khi các tính năng quản lý dự án được xây dựng.
 */
@Component({
  standalone: true,
  selector: 'app-dashboard',
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- Header -->
      <header class="border-b border-gray-200 bg-white">
        <div class="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <h1 class="text-lg font-semibold text-gray-900">Agile PM</h1>
          <button
            type="button"
            (click)="logout()"
            class="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
          >
            Đăng xuất
          </button>
        </div>
      </header>

      <!-- Content -->
      <main class="mx-auto max-w-5xl px-6 py-10">
        <div class="rounded-xl bg-white p-8 shadow-sm">
          <h2 class="text-2xl font-bold tracking-tight text-gray-900">
            Đăng nhập thành công 🎉
          </h2>

          @if (user(); as u) {
            <dl class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt class="text-sm font-medium text-gray-500">Email</dt>
                <dd class="mt-1 text-sm text-gray-900">{{ u.email }}</dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-gray-500">User ID</dt>
                <dd class="mt-1 break-all text-sm text-gray-900">{{ u.id }}</dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-gray-500">System Role</dt>
                <dd class="mt-1 text-sm text-gray-900">{{ u.systemRole }}</dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-gray-500">Project Roles</dt>
                <dd class="mt-1 text-sm text-gray-900">
                  {{ u.projectRoles.length }} project(s)
                </dd>
              </div>
            </dl>
          } @else {
            <p class="mt-4 text-sm text-gray-600">Đang tải thông tin người dùng…</p>
          }
        </div>
      </main>
    </div>
  `,
})
export class DashboardComponent {
  private readonly authService = inject(AuthService);

  /** Thông tin user hiện tại */
  readonly user = this.authService.currentUser;

  /** Đăng xuất và quay về trang login */
  logout(): void {
    void this.authService.logout();
  }
}
