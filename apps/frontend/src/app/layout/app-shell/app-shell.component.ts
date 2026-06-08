import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterOutlet, ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { ProjectStore } from '../../projects/state/project.store';
import { LayoutService } from '../services/layout.service';
import { SidebarComponent } from './sidebar/sidebar.component';
import { TopbarComponent } from './topbar/topbar.component';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';

@Component({
  standalone: true,
  selector: 'app-app-shell',
  imports: [CommonModule, RouterOutlet, SidebarComponent, TopbarComponent],
  template: `
    <div class="flex flex-col h-screen w-screen overflow-hidden bg-[#fafbfe] dark:bg-surface-950 font-sans antialiased text-[#2d3748] dark:text-surface-100 transition-colors duration-200">
      <!-- Top Header Bar matching Sakai template -->
      <app-topbar class="flex-shrink-0" />

      <!-- Layout Body: Sidebar and Main Content -->
      <div class="flex flex-1 overflow-hidden w-full relative">
        @if (projectStore.isLoading() && isOnProjectDetail() && !projectStore.currentProject()) {
          <!-- Skeleton / Loading screen -->
          <div class="flex h-full w-full items-center justify-center bg-white dark:bg-surface-900 flex-1">
            <div class="text-center">
              <div class="h-12 w-12 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600"></div>
              <p class="mt-4 text-sm text-gray-500 dark:text-surface-400 font-medium">Đang tải dự án...</p>
            </div>
          </div>
        } @else if (projectStore.error()) {
          <!-- Error Page: Forbidden or Not Found -->
          <div class="flex h-full w-full flex-col items-center justify-center bg-white dark:bg-surface-900 p-6 text-center flex-1">
            <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 dark:bg-red-950/30 text-red-500">
              <svg class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.249-8.25-3.286zm0 13.036h.008v.008H12v-.008z" />
              </svg>
            </div>
            <h2 class="mt-6 text-2xl font-bold tracking-tight text-gray-900 dark:text-surface-0">Không có quyền truy cập</h2>
            <p class="mt-2 text-base text-gray-600 dark:text-surface-400">Bạn không phải là thành viên của dự án này hoặc dự án không tồn tại.</p>
            <div class="mt-8">
              <button
                (click)="goBack()"
                class="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition cursor-pointer"
              >
                Quay lại danh sách dự án
              </button>
            </div>
          </div>
        } @else {
          <!-- Static sidebar: flex-child that pushes content -->
          @if (layoutService.menuMode() === 'static') {
            <app-sidebar class="flex-shrink-0 h-full" />
          }

          <!-- Overlay sidebar: absolute, on top of content -->
          @if (layoutService.menuMode() === 'overlay') {
            <!-- Backdrop -->
            @if (layoutService.isOverlayOpen()) {
              <div
                class="absolute inset-0 z-40 bg-black/30"
                (click)="layoutService.closeOverlayMenu()"
              ></div>
            }
            <!-- Sidebar panel -->
            <div
              class="absolute left-0 top-0 h-full z-50 transition-transform duration-300"
              [class.-translate-x-full]="!layoutService.isOverlayOpen()"
              [class.translate-x-0]="layoutService.isOverlayOpen()"
            >
              <app-sidebar />
            </div>
          }

          <main
            class="flex-1 min-w-0 bg-surface-50 dark:bg-surface-950"
            [class.overflow-hidden]="layoutService.fullBleed()"
            [class.overflow-y-auto]="!layoutService.fullBleed()"
            [class.p-4]="!layoutService.fullBleed()"
            [class.sm:p-6]="!layoutService.fullBleed()"
          >
            <router-outlet />
          </main>
        }
      </div>
    </div>
  `,
})
export class AppShellComponent implements OnInit {
  readonly projectStore = inject(ProjectStore);
  readonly layoutService = inject(LayoutService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly isOnProjectDetail = signal<boolean>(false);

  ngOnInit(): void {
    // Lắng nghe params thay đổi khi chuyển route
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        this.updateCurrentProjectFromRoute();
      });

    // Chạy lần đầu khi load trang
    this.updateCurrentProjectFromRoute();
  }

  private updateCurrentProjectFromRoute(): void {
    const key = this.getRouteParam(this.route, 'key');
    this.isOnProjectDetail.set(!!key);
    if (key) {
      const current = this.projectStore.currentProject();
      if (!current || current.key !== key) {
        this.projectStore.loadProject(
          key,
          (project) => {
            this.projectStore.loadMembers(project.id);
          }
        );
      }
    } else {
      // Clear project và error khi không ở trang chi tiết dự án
      this.projectStore.setCurrentProject(null);
    }
  }

  private getRouteParam(route: ActivatedRoute, name: string): string | null {
    let currentRoute: ActivatedRoute | null = route;
    while (currentRoute) {
      const val = currentRoute.snapshot.paramMap.get(name);
      if (val) {
        return val;
      }
      currentRoute = currentRoute.firstChild;
    }
    return null;
  }

  goBack(): void {
    void this.router.navigate(['/projects']);
  }
}
