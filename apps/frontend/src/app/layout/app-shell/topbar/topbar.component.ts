import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LayoutService } from '../../services/layout.service';
import { AuthService } from '../../../auth/services/auth.service';

@Component({
  standalone: true,
  selector: 'app-topbar',
  imports: [CommonModule],
  template: `
    <header class="w-full h-16 bg-white dark:bg-surface-900 border-b border-[#e2e8f0] dark:border-surface-800 flex items-center justify-between px-4 sm:px-6 transition-colors duration-200">
      <!-- Left side: Hamburger + Logo -->
      <div class="flex items-center gap-4">
        <button
          (click)="layoutService.toggleSidebar()"
          class="flex h-10 w-10 items-center justify-center rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-surface-800 transition duration-200 cursor-pointer"
          aria-label="Toggle menu"
        >
          <i class="pi pi-bars text-lg"></i>
        </button>

        <div class="flex items-center gap-2 overflow-hidden select-none">
          <div class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold shadow-md shadow-indigo-100 dark:shadow-none">
            A
          </div>
          <span class="text-xl font-bold tracking-tight bg-gradient-to-r from-indigo-600 to-indigo-800 dark:from-indigo-400 dark:to-indigo-500 bg-clip-text text-transparent">
            Agile PM
          </span>
        </div>
      </div>

      <!-- Right side: Actions & Profile -->
      <div class="flex items-center gap-3">
        <!-- Theme Toggle -->
        <button
          (click)="layoutService.toggleDarkMode()"
          class="flex h-10 w-10 items-center justify-center rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-surface-800 transition duration-200 cursor-pointer"
          [title]="layoutService.isDarkMode() ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'"
        >
          <i [class]="layoutService.isDarkMode() ? 'pi pi-sun text-lg text-yellow-500' : 'pi pi-moon text-lg'"></i>
        </button>

        <!-- Divider -->
        <div class="h-6 w-px bg-gray-200 dark:bg-surface-800"></div>

        <!-- Profile Avatar & Dropdown -->
        <div class="relative">
          <button
            (click)="toggleProfileMenu($event)"
            class="flex items-center gap-2 p-1 rounded-full hover:bg-gray-50 dark:hover:bg-surface-800 transition duration-200 cursor-pointer focus:outline-none"
          >
            <div class="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-sm shadow-sm select-none">
              {{ userInitials() }}
            </div>
          </button>

          <!-- Dropdown Menu -->
          @if (isProfileMenuOpen()) {
            <div 
              class="absolute right-0 mt-2 w-64 bg-white dark:bg-surface-900 border border-[#e2e8f0] dark:border-surface-800 rounded-xl shadow-xl py-2 z-50 animate-fadein"
              (click)="$event.stopPropagation()"
            >
              <div class="px-4 py-3 border-b border-[#f1f5f9] dark:border-surface-800">
                <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Tài khoản</p>
                <p class="text-sm font-semibold text-gray-800 dark:text-surface-0 truncate mt-1">{{ userEmail() }}</p>
                <p class="text-xs text-gray-400 dark:text-surface-400 mt-0.5">{{ userRole() }}</p>
              </div>

              <div class="py-1">
                <button
                  (click)="logout()"
                  class="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition duration-200 cursor-pointer text-left font-medium"
                >
                  <i class="pi pi-sign-out"></i>
                  <span>Đăng xuất</span>
                </button>
              </div>
            </div>
          }
        </div>
      </div>
    </header>
  `,
  styles: [`
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-fadein {
      animation: fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
  `]
})
export class TopbarComponent {
  readonly layoutService = inject(LayoutService);
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly isProfileMenuOpen = signal<boolean>(false);

  readonly userEmail = computed(() => {
    return this.authService.currentUser()?.email || 'user';
  });

  readonly userRole = computed(() => {
    return this.authService.currentUser()?.systemRole || 'User';
  });

  readonly userInitials = computed(() => {
    const email = this.userEmail();
    return email ? email.substring(0, 2).toUpperCase() : 'US';
  });

  constructor() {
    // Close profile menu on document click
    document.addEventListener('click', () => {
      this.isProfileMenuOpen.set(false);
    });
  }

  toggleProfileMenu(event: MouseEvent) {
    event.stopPropagation();
    this.isProfileMenuOpen.set(!this.isProfileMenuOpen());
  }

  logout() {
    this.isProfileMenuOpen.set(false);
    void this.authService.logout();
  }
}
