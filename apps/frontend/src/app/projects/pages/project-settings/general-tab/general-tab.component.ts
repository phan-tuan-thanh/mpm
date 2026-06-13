import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { ProjectStore } from '../../../state/project.store';

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
          {{ t().title }}
        </h1>
        <p class="text-sm text-gray-500 dark:text-surface-400 mt-1">
          {{ t().subtitle }}
        </p>
      </div>

      <!-- Tab Navigation -->
      <div class="border-b border-surface-200 dark:border-surface-800 flex gap-6 text-sm font-semibold select-none">
        @for (tab of tabs(); track tab.label) {
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
  private readonly projectStore = inject(ProjectStore);

  readonly t = computed(() => {
    const isEn = this.projectStore.projectLanguage() === 'en';
    return isEn ? {
      title: 'Project Settings',
      subtitle: 'Manage general info, sprint configurations, workflow states, labels, and priorities.',
    } : {
      title: 'Cài đặt dự án',
      subtitle: 'Quản lý thông tin chung, cấu hình sprint, trạng thái công việc, labels và các mức ưu tiên.',
    };
  });

  readonly tabs = computed(() => {
    const isEn = this.projectStore.projectLanguage() === 'en';
    return isEn ? [
      { label: 'General Config', route: ['info'], exact: true },
      { label: 'Sprint Config', route: ['sprints'], exact: true },
      { label: 'States', route: ['states'], exact: true },
      { label: 'Priorities', route: ['priorities'], exact: true },
      { label: 'Labels', route: ['labels'], exact: true },
      { label: 'Estimates', route: ['estimates'], exact: true },
    ] : [
      { label: 'Cấu hình chung', route: ['info'], exact: true },
      { label: 'Cấu hình Sprint', route: ['sprints'], exact: true },
      { label: 'Trạng thái', route: ['states'], exact: true },
      { label: 'Mức ưu tiên', route: ['priorities'], exact: true },
      { label: 'Nhãn', route: ['labels'], exact: true },
      { label: 'Ước lượng', route: ['estimates'], exact: true },
    ];
  });
}
