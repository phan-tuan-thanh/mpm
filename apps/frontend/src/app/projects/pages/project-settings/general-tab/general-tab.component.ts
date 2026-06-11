import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  standalone: true,
  selector: 'app-general-tab',
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
  ],
  template: `
    <div class="space-y-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-surface-0">
          Cài đặt dự án
        </h1>
        <p class="text-sm text-gray-500 dark:text-surface-400 mt-1">
          Quản lý thông tin chung, cấu hình sprint, trạng thái công việc, labels và các mức ưu tiên.
        </p>
      </div>

      <!-- Tab Navigation -->
      <div class="border-b border-surface-200 dark:border-surface-800 flex gap-6 text-sm font-semibold select-none">
        @for (tab of tabs; track tab.label) {
          <a
            [routerLink]="tab.route"
            [routerLinkActiveOptions]="{ exact: tab.exact }"
            routerLinkActive="text-primary border-b-2 border-primary -mb-px"
            class="pb-3 text-gray-500 hover:text-gray-900 dark:text-surface-400 dark:hover:text-surface-100 transition duration-150 cursor-pointer"
          >
            {{ tab.label }}
          </a>
        }
      </div>

      <!-- Tab Content Area -->
      <div class="flex-1">
        <router-outlet />
      </div>
    </div>
  `,
})
export class GeneralTabComponent {
  readonly tabs = [
    { label: 'Cấu hình chung', route: ['info'], exact: true },
    { label: 'Cấu hình Sprint', route: ['sprints'], exact: true },
    { label: 'Trạng thái', route: ['states'], exact: true },
    { label: 'Mức ưu tiên', route: ['priorities'], exact: true },
    { label: 'Labels', route: ['labels'], exact: true },
    { label: 'Ước lượng', route: ['estimates'], exact: true },
  ];
}
