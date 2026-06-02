import { Component, inject, computed } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { ProjectStore } from '../../state/project.store';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-project-settings',
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="p-6 max-w-5xl mx-auto space-y-6">
      <!-- Breadcrumbs -->
      <nav class="flex text-xs text-gray-500 font-semibold uppercase tracking-wider" aria-label="Breadcrumb">
        <ol class="inline-flex items-center space-x-1 md:space-x-2">
          <li class="inline-flex items-center">
            <a routerLink="/projects" class="hover:text-indigo-600 transition">Dự án</a>
          </li>
          <li>
            <div class="flex items-center gap-1">
              <i class="pi pi-chevron-right text-[10px] text-gray-400"></i>
              <span class="text-gray-400">{{ projectName() }}</span>
            </div>
          </li>
          <li>
            <div class="flex items-center gap-1">
              <i class="pi pi-chevron-right text-[10px] text-gray-400"></i>
              <span class="text-gray-400">Cấu hình</span>
            </div>
          </li>
        </ol>
      </nav>

      <!-- Title Header -->
      <div class="flex items-center gap-3">
        <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 text-lg font-bold shadow-sm">
          {{ projectKey() }}
        </div>
        <div>
          <h1 class="text-2xl font-extrabold tracking-tight text-gray-900">
            Cấu hình dự án: {{ projectName() }}
          </h1>
          <p class="mt-0.5 text-sm text-gray-500 font-medium">
            Quản lý cài đặt dự án, thành viên nhóm, và quyền truy cập.
          </p>
        </div>
      </div>

      <!-- Settings Tab Bar (Router-Based) -->
      <div class="border-b border-gray-200 flex gap-6 text-sm font-semibold">
        <a
          [routerLink]="['/projects', projectKey(), 'settings']"
          [routerLinkActiveOptions]="{ exact: true }"
          routerLinkActive="border-b-2 border-indigo-600 text-indigo-600"
          class="pb-3 text-gray-500 hover:text-gray-900 transition"
        >
          Cấu hình chung
        </a>
        <a
          [routerLink]="['/projects', projectKey(), 'settings', 'members']"
          routerLinkActive="border-b-2 border-indigo-600 text-indigo-600"
          class="pb-3 text-gray-500 hover:text-gray-900 transition"
        >
          Thành viên
        </a>
        <a
          [routerLink]="['/projects', projectKey(), 'settings', 'states']"
          routerLinkActive="border-b-2 border-indigo-600 text-indigo-600"
          class="pb-3 text-gray-500 hover:text-gray-900 transition"
        >
          Trạng thái
        </a>
        <a
          [routerLink]="['/projects', projectKey(), 'settings', 'estimates']"
          routerLinkActive="border-b-2 border-indigo-600 text-indigo-600"
          class="pb-3 text-gray-500 hover:text-gray-900 transition"
        >
          Ước lượng
        </a>
        <a
          [routerLink]="['/projects', projectKey(), 'settings', 'features']"
          routerLinkActive="border-b-2 border-indigo-600 text-indigo-600"
          class="pb-3 text-gray-500 hover:text-gray-900 transition"
        >
          Tính năng
        </a>
        <a
          [routerLink]="['/projects', projectKey(), 'settings', 'danger']"
          routerLinkActive="border-b-2 border-indigo-600 text-indigo-600"
          class="pb-3 text-gray-500 hover:text-gray-900 transition"
        >
          Danger Zone
        </a>
      </div>

      <!-- Nested views -->
      <div class="mt-4">
        <router-outlet />
      </div>
    </div>
  `,
})
export class ProjectSettingsComponent {
  readonly projectStore = inject(ProjectStore);

  readonly projectName = computed(() => {
    return this.projectStore.currentProject()?.name || 'Dự án';
  });

  readonly projectKey = computed(() => {
    return this.projectStore.currentProject()?.key || '';
  });
}
