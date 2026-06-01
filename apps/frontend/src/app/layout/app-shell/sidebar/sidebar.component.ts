import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { ProjectStore } from '../../../projects/state/project.store';
import { AuthService } from '../../../auth/services/auth.service';
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
      [class.w-64]="!isCollapsed()"
      [class.w-16]="isCollapsed()"
      class="flex h-full flex-col border-r border-[#e2e8f0] bg-white text-[#2d3748] transition-all duration-300 ease-in-out select-none shadow-sm"
    >
      <!-- Logo / Header -->
      <div class="flex h-16 items-center justify-between px-4 border-b border-[#f1f5f9]">
        <div class="flex items-center gap-2 overflow-hidden">
          <div class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold shadow-md shadow-indigo-100">
            A
          </div>
          @if (!isCollapsed()) {
            <span class="text-lg font-bold tracking-tight bg-gradient-to-r from-indigo-600 to-indigo-800 bg-clip-text text-transparent">
              Agile PM
            </span>
          }
        </div>
        <button
          (click)="toggleSidebar()"
          class="flex h-8 w-8 items-center justify-center rounded-md text-gray-400 hover:bg-[#f1f5f9] hover:text-[#1a202c] transition"
          [attr.aria-label]="isCollapsed() ? 'Mở rộng menu' : 'Thu gọn menu'"
        >
          @if (isCollapsed()) {
            <i class="pi pi-angle-double-right font-medium"></i>
          } @else {
            <i class="pi pi-angle-double-left font-medium"></i>
          }
        </button>
      </div>

      <!-- Project Switcher -->
      <div class="p-3 border-b border-[#f1f5f9] overflow-visible">
        @if (!isCollapsed()) {
          <span class="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2 px-1">Dự án</span>
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
              <div class="flex items-center gap-2 text-gray-800 font-semibold truncate">
                <div class="flex h-5 w-5 items-center justify-center rounded bg-indigo-50 text-indigo-700 text-[10px] font-bold">
                  {{ project.key }}
                </div>
                <span>{{ project.name }}</span>
              </div>
            </ng-template>
            <ng-template let-project pTemplate="item">
              <div class="flex items-center gap-2 py-1">
                <div class="flex h-5 w-5 items-center justify-center rounded bg-gray-100 text-gray-600 text-[10px] font-bold">
                  {{ project.key }}
                </div>
                <span>{{ project.name }}</span>
              </div>
            </ng-template>
          </p-select>
        } @else {
          <!-- Collapsed Icon Trigger -->
          <div class="flex justify-center py-2">
            <button
              (click)="toggleSidebar()"
              class="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition"
              title="Chuyển dự án"
            >
              <i class="pi pi-folder-open text-lg"></i>
            </button>
          </div>
        }
      </div>

      <!-- Nav Links -->
      <div class="flex-1 space-y-1 p-2 overflow-y-auto">
        <!-- Danh sách dự án (Always visible) -->
        <a
          routerLink="/projects"
          routerLinkActive="bg-indigo-50 text-indigo-700 font-semibold border-l-4 border-indigo-600"
          [routerLinkActiveOptions]="{ exact: true }"
          class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-600 hover:bg-[#fafbfe] hover:text-gray-900 transition"
          [title]="isCollapsed() ? 'Danh sách dự án' : ''"
        >
          <i class="pi pi-list text-base"></i>
          @if (!isCollapsed()) {
            <span>Danh sách dự án</span>
          }
        </a>

        @if (projectStore.currentProject()) {
          <!-- Divider -->
          <div class="my-2 border-t border-[#f1f5f9]"></div>

          <!-- Board -->
          <a
            [routerLink]="['/projects', currentKey(), 'board']"
            routerLinkActive="bg-indigo-50 text-indigo-700 font-semibold border-l-4 border-indigo-600"
            [routerLinkActiveOptions]="{ exact: false }"
            class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-600 hover:bg-[#fafbfe] hover:text-gray-900 transition"
            [title]="isCollapsed() ? 'Board' : ''"
          >
            <i class="pi pi-table text-base"></i>
            @if (!isCollapsed()) {
              <span>Kanban Board</span>
            }
          </a>

          <!-- Backlog -->
          <a
            [routerLink]="['/projects', currentKey(), 'backlog']"
            routerLinkActive="bg-indigo-50 text-indigo-700 font-semibold border-l-4 border-indigo-600"
            [routerLinkActiveOptions]="{ exact: false }"
            class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-600 hover:bg-[#fafbfe] hover:text-gray-900 transition"
            [title]="isCollapsed() ? 'Backlog' : ''"
          >
            <i class="pi pi-list text-base"></i>
            @if (!isCollapsed()) {
              <span>Backlog</span>
            }
          </a>

          <!-- Settings -->
          <a
            [routerLink]="['/projects', currentKey(), 'settings']"
            routerLinkActive="bg-indigo-50 text-indigo-700 font-semibold border-l-4 border-indigo-600"
            [routerLinkActiveOptions]="{ exact: false }"
            class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-600 hover:bg-[#fafbfe] hover:text-gray-900 transition"
            [title]="isCollapsed() ? 'Settings' : ''"
          >
            <i class="pi pi-cog text-base"></i>
            @if (!isCollapsed()) {
              <span>Cấu hình</span>
            }
          </a>
        }
      </div>

      <!-- User Profile & Action -->
      <div class="border-t border-[#f1f5f9] p-3">
        @if (!isCollapsed()) {
          <div class="flex items-center justify-between rounded-lg bg-gray-50 p-2 shadow-sm">
            <div class="flex items-center gap-2 overflow-hidden">
              <div class="h-8 w-8 flex-shrink-0 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                {{ userInitials() }}
              </div>
              <div class="flex flex-col min-w-0">
                <span class="text-xs font-semibold text-gray-800 truncate">{{ userEmail() }}</span>
                <span class="text-[10px] text-gray-400 font-medium">{{ userRole() }}</span>
              </div>
            </div>
            <button
              (click)="logout()"
              class="flex h-7 w-7 items-center justify-center rounded hover:bg-red-50 hover:text-red-600 text-gray-400 transition"
              title="Đăng xuất"
            >
              <i class="pi pi-sign-out text-sm"></i>
            </button>
          </div>
        } @else {
          <div class="flex justify-center">
            <button
              (click)="logout()"
              class="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-red-50 hover:text-red-600 text-gray-400 transition"
              title="Đăng xuất"
            >
              <i class="pi pi-sign-out text-lg"></i>
            </button>
          </div>
        }
      </div>
    </div>
  `,

})
export class SidebarComponent implements OnInit {
  readonly projectStore = inject(ProjectStore);
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly isCollapsed = signal<boolean>(
    localStorage.getItem('sidebar_collapsed') === 'true',
  );

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
    };
  });

  readonly currentKey = computed(() => {
    return this.projectStore.currentProject()?.key || '';
  });

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

  ngOnInit(): void {
    // Tải dự án nếu danh sách trống
    if (this.projectStore.projects().length === 0) {
      this.projectStore.loadProjects();
    }
  }

  toggleSidebar(): void {
    const newValue = !this.isCollapsed();
    this.isCollapsed.set(newValue);
    localStorage.setItem('sidebar_collapsed', String(newValue));
  }

  onProjectChange(project: ProjectListItem): void {
    if (project) {
      void this.router.navigate(['/projects', project.key, 'board']);
    }
  }

  logout(): void {
    void this.authService.logout();
  }
}
