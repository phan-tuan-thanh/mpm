import { Component, OnInit, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { ProjectStore } from '../../../projects/state/project.store';
import { LayoutService } from '../../services/layout.service';
import { AuthStore } from '../../../auth/state/auth.store';
import { CommonModule } from '@angular/common';
import { SelectModule } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import { ProjectListItem } from '@mpm/shared-types';

@Component({
  standalone: true,
  selector: 'app-sidebar',
  imports: [CommonModule, RouterLink, RouterLinkActive, SelectModule, FormsModule],
  template: `
    <div
      [class.w-64]="!layoutService.isCollapsed()"
      [class.w-16]="layoutService.isCollapsed()"
      class="flex h-full flex-col border-r border-[#e2e8f0] dark:border-surface-800 bg-white dark:bg-surface-900 text-gray-800 dark:text-surface-100 transition-all duration-300 ease-in-out select-none shadow-sm"
    >
      <!-- Project Switcher -->
      <div class="p-3 border-b border-[#f1f5f9] dark:border-surface-800 overflow-visible">
        @if (!layoutService.isCollapsed()) {
          <span class="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-surface-400 mb-2 px-1">Dự án</span>
          <p-select
            [options]="projectStore.projects()"
            [ngModel]="selectedProject()"
            optionLabel="name"
            placeholder="Chọn dự án"
            (onChange)="onProjectChange($event.value)"
            class="w-full text-sm"
            [style]="{ width: '100%' }"
            panelStyleClass="text-sm shadow-md"
          >
            <ng-template let-project pTemplate="selectedItem">
              <div class="flex items-center gap-2 text-gray-800 dark:text-surface-100 font-semibold truncate">
                @if (project.emoji) {
                  <span class="text-sm flex-shrink-0">{{ project.emoji }}</span>
                } @else {
                  <div class="flex h-5 w-5 items-center justify-center rounded bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 text-[10px] font-bold flex-shrink-0">
                    {{ project.name.slice(0, 2).toUpperCase() }}
                  </div>
                }
                <span class="truncate">{{ project.name }}</span>
              </div>
            </ng-template>
            <ng-template let-project pTemplate="item">
              <div class="flex items-center gap-2 py-1 text-gray-800 dark:text-surface-100">
                @if (project.emoji) {
                  <span class="text-sm flex-shrink-0">{{ project.emoji }}</span>
                } @else {
                  <div class="flex h-5 w-5 items-center justify-center rounded bg-gray-100 dark:bg-surface-800 text-gray-600 dark:text-surface-400 text-[10px] font-bold flex-shrink-0">
                    {{ project.name.slice(0, 2).toUpperCase() }}
                  </div>
                }
                <span>{{ project.name }}</span>
              </div>
            </ng-template>
          </p-select>
        } @else {
          <!-- Collapsed Icon Trigger -->
          <div class="flex justify-center py-2">
            <button
              (click)="layoutService.toggleSidebar()"
              class="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition duration-200 cursor-pointer"
              title="Chuyển dự án"
            >
              @if (projectStore.currentProject()?.emoji) {
                <span class="text-lg">{{ projectStore.currentProject()?.emoji }}</span>
              } @else {
                <i class="pi pi-folder-open text-lg"></i>
              }
            </button>
          </div>
        }
      </div>

      <!-- Nav Links -->
      <div class="flex-1 space-y-1 p-2 overflow-y-auto">
        <!-- Danh sách dự án (Always visible) -->
        <a
          routerLink="/projects"
          routerLinkActive="bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 font-semibold border-l-4 border-indigo-600"
          [routerLinkActiveOptions]="{ exact: true }"
          class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-600 dark:text-surface-400 hover:bg-gray-50 dark:hover:bg-surface-800 hover:text-gray-900 dark:hover:text-surface-100 transition duration-200"
          [title]="layoutService.isCollapsed() ? 'Danh sách dự án' : ''"
        >
          <i class="pi pi-list text-base"></i>
          @if (!layoutService.isCollapsed()) {
            <span>Danh sách dự án</span>
          }
        </a>

        @if (authStore.isAdmin()) {
          <a
            routerLink="/admin/users"
            routerLinkActive="bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 font-semibold border-l-4 border-indigo-600"
            [routerLinkActiveOptions]="{ exact: false }"
            class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-600 dark:text-surface-400 hover:bg-gray-50 dark:hover:bg-surface-800 hover:text-gray-900 dark:hover:text-surface-100 transition duration-200"
            [title]="layoutService.isCollapsed() ? 'Quản trị hệ thống' : ''"
          >
            <i class="pi pi-shield text-base"></i>
            @if (!layoutService.isCollapsed()) {
              <span>Quản trị</span>
            }
          </a>
        }

        @if (projectStore.currentProject()) {
          <!-- Divider -->
          <div class="my-2 border-t border-[#f1f5f9] dark:border-surface-800"></div>

          <!-- Board (Always visible) -->
          <a
            [routerLink]="['/projects', currentKey(), 'board']"
            routerLinkActive="bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 font-semibold border-l-4 border-indigo-600"
            [routerLinkActiveOptions]="{ exact: false }"
            class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-600 dark:text-surface-400 hover:bg-gray-50 dark:hover:bg-surface-800 hover:text-gray-900 dark:hover:text-surface-100 transition duration-200"
            [title]="layoutService.isCollapsed() ? 'Board' : ''"
          >
            <i class="pi pi-table text-base"></i>
            @if (!layoutService.isCollapsed()) {
              <span>Kanban Board</span>
            }
          </a>

          <!-- Backlog (Always visible) -->
          <a
            [routerLink]="['/projects', currentKey(), 'backlog']"
            routerLinkActive="bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 font-semibold border-l-4 border-indigo-600"
            [routerLinkActiveOptions]="{ exact: false }"
            class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-600 dark:text-surface-400 hover:bg-gray-50 dark:hover:bg-surface-800 hover:text-gray-900 dark:hover:text-surface-100 transition duration-200"
            [title]="layoutService.isCollapsed() ? 'Backlog' : ''"
          >
            <i class="pi pi-align-left text-base"></i>
            @if (!layoutService.isCollapsed()) {
              <span>Backlog</span>
            }
          </a>

          <!-- Sprints/Cycles (Conditional) -->
          @if (features().cycles) {
            <a
              [routerLink]="['/projects', currentKey(), 'cycles']"
              routerLinkActive="bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 font-semibold border-l-4 border-indigo-600"
              [routerLinkActiveOptions]="{ exact: false }"
              class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-600 dark:text-surface-400 hover:bg-gray-50 dark:hover:bg-surface-800 hover:text-gray-900 dark:hover:text-surface-100 transition duration-200"
              [title]="layoutService.isCollapsed() ? 'Sprints/Cycles' : ''"
            >
              <i class="pi pi-sync text-base"></i>
              @if (!layoutService.isCollapsed()) {
                <span>Sprints/Cycles</span>
              }
            </a>
          }

          <!-- Modules (Conditional) -->
          @if (features().modules) {
            <a
              [routerLink]="['/projects', currentKey(), 'modules']"
              routerLinkActive="bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 font-semibold border-l-4 border-indigo-600"
              [routerLinkActiveOptions]="{ exact: false }"
              class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-600 dark:text-surface-400 hover:bg-gray-50 dark:hover:bg-surface-800 hover:text-gray-900 dark:hover:text-surface-100 transition duration-200"
              [title]="layoutService.isCollapsed() ? 'Modules' : ''"
            >
              <i class="pi pi-box text-base"></i>
              @if (!layoutService.isCollapsed()) {
                <span>Modules</span>
              }
            </a>
          }

          <!-- Views (Conditional) -->
          @if (features().views) {
            <a
              [routerLink]="['/projects', currentKey(), 'views']"
              routerLinkActive="bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 font-semibold border-l-4 border-indigo-600"
              [routerLinkActiveOptions]="{ exact: false }"
              class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-600 dark:text-surface-400 hover:bg-gray-50 dark:hover:bg-surface-800 hover:text-gray-900 dark:hover:text-surface-100 transition duration-200"
              [title]="layoutService.isCollapsed() ? 'Custom Views' : ''"
            >
              <i class="pi pi-filter text-base"></i>
              @if (!layoutService.isCollapsed()) {
                <span>Custom Views</span>
              }
            </a>
          }

          <!-- Pages (Conditional) -->
          @if (features().pages) {
            <a
              [routerLink]="['/projects', currentKey(), 'pages']"
              routerLinkActive="bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 font-semibold border-l-4 border-indigo-600"
              [routerLinkActiveOptions]="{ exact: false }"
              class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-600 dark:text-surface-400 hover:bg-gray-50 dark:hover:bg-surface-800 hover:text-gray-900 dark:hover:text-surface-100 transition duration-200"
              [title]="layoutService.isCollapsed() ? 'Pages' : ''"
            >
              <i class="pi pi-file text-base"></i>
              @if (!layoutService.isCollapsed()) {
                <span>Pages (Tài liệu)</span>
              }
            </a>
          }

          <!-- Intake (Conditional) -->
          @if (features().intake) {
            <a
              [routerLink]="['/projects', currentKey(), 'intake']"
              routerLinkActive="bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 font-semibold border-l-4 border-indigo-600"
              [routerLinkActiveOptions]="{ exact: false }"
              class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-600 dark:text-surface-400 hover:bg-gray-50 dark:hover:bg-surface-800 hover:text-gray-900 dark:hover:text-surface-100 transition duration-200"
              [title]="layoutService.isCollapsed() ? 'Intake' : ''"
            >
              <i class="pi pi-inbox text-base"></i>
              @if (!layoutService.isCollapsed()) {
                <span>Intake (Yêu cầu)</span>
              }
            </a>
          }

          <!-- Settings (Always visible) -->
          <a
            [routerLink]="['/projects', currentKey(), 'settings']"
            routerLinkActive="bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 font-semibold border-l-4 border-indigo-600"
            [routerLinkActiveOptions]="{ exact: false }"
            class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-600 dark:text-surface-400 hover:bg-gray-50 dark:hover:bg-surface-800 hover:text-gray-900 dark:hover:text-surface-100 transition duration-200"
            [title]="layoutService.isCollapsed() ? 'Settings' : ''"
          >
            <i class="pi pi-cog text-base"></i>
            @if (!layoutService.isCollapsed()) {
              <span>Cấu hình</span>
            }
          </a>
        }
      </div>
    </div>
  `,
})
export class SidebarComponent implements OnInit {
  readonly projectStore = inject(ProjectStore);
  readonly layoutService = inject(LayoutService);
  readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);

  readonly selectedProject = computed<ProjectListItem | null>(() => {
    const current = this.projectStore.currentProject();
    if (!current) return null;
    return this.projectStore.projects().find(p => p.id === current.id) || {
      id: current.id,
      name: current.name,
      key: current.key,
      status: current.status,
      myRole: 'Developer',
      createdAt: current.createdAt,
      emoji: current.emoji,
      network: current.network,
      lead: current.lead,
    };
  });

  readonly currentKey = computed(() => {
    return this.projectStore.currentProject()?.key || '';
  });

  readonly features = computed(() => {
    return this.projectStore.currentProject()?.features || {
      cycles: true,
      modules: true,
      views: true,
      pages: true,
      intake: false,
      timeTracking: false,
    };
  });

  ngOnInit(): void {
    // Tải dự án nếu danh sách trống
    if (this.projectStore.projects().length === 0) {
      this.projectStore.loadProjects();
    }
  }

  onProjectChange(project: ProjectListItem): void {
    if (project) {
      void this.router.navigate(['/projects', project.key, 'board']);
    }
  }
}
