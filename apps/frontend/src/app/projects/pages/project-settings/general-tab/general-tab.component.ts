import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { ProjectStore } from '../../../state/project.store';
import { CustomTranslationService } from '../../../../shared/services/custom-translation.service';

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
  private readonly customTrans = inject(CustomTranslationService);

  readonly t = computed(() => {
    const isEn = this.projectStore.projectLanguage() === 'en';
    return isEn ? {
      title: this.customTrans.t('general-tab.title', 'Project Settings'),
      subtitle: this.customTrans.t('general-tab.subtitle', 'Manage general info, sprint configurations, workflow states, labels, and priorities.'),
    } : {
      title: this.customTrans.t('general-tab.title', 'Cài đặt dự án'),
      subtitle: this.customTrans.t('general-tab.subtitle', 'Quản lý thông tin chung, cấu hình sprint, trạng thái công việc, nhãn và các mức ưu tiên.'),
    };
  });

  readonly tabs = computed(() => {
    const isEn = this.projectStore.projectLanguage() === 'en';
    return isEn ? [
      { label: this.customTrans.t('general-tab.tab.info', 'General Config'), route: ['info'], exact: true },
      { label: this.customTrans.t('general-tab.tab.workItems', 'Work Items'), route: ['work-items'], exact: true },
      { label: this.customTrans.t('general-tab.tab.sprints', 'Sprint Config'), route: ['sprints'], exact: true },
      { label: this.customTrans.t('general-tab.tab.states', 'States'), route: ['states'], exact: true },
      { label: this.customTrans.t('general-tab.tab.priorities', 'Priorities'), route: ['priorities'], exact: true },
      { label: this.customTrans.t('general-tab.tab.labels', 'Labels'), route: ['labels'], exact: true },
      { label: this.customTrans.t('general-tab.tab.estimates', 'Estimates'), route: ['estimates'], exact: true },
      { label: this.customTrans.t('general-tab.tab.language', 'Language'), route: ['language'], exact: true },
    ] : [
      { label: this.customTrans.t('general-tab.tab.info', 'Cấu hình chung'), route: ['info'], exact: true },
      { label: this.customTrans.t('general-tab.tab.workItems', 'Work Items'), route: ['work-items'], exact: true },
      { label: this.customTrans.t('general-tab.tab.sprints', 'Cấu hình Sprint'), route: ['sprints'], exact: true },
      { label: this.customTrans.t('general-tab.tab.states', 'Trạng thái'), route: ['states'], exact: true },
      { label: this.customTrans.t('general-tab.tab.priorities', 'Mức ưu tiên'), route: ['priorities'], exact: true },
      { label: this.customTrans.t('general-tab.tab.labels', 'Nhãn'), route: ['labels'], exact: true },
      { label: this.customTrans.t('general-tab.tab.estimates', 'Ước lượng'), route: ['estimates'], exact: true },
      { label: this.customTrans.t('general-tab.tab.language', 'Ngôn ngữ'), route: ['language'], exact: true },
    ];
  });
}
