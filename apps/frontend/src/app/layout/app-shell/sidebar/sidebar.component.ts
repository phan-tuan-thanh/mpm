import { Component, OnInit, computed, inject, signal, effect } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { ProjectStore } from '../../../projects/state/project.store';
import { LayoutService } from '../../services/layout.service';
import { AuthStore } from '../../../auth/state/auth.store';
import { SprintService } from '../../../projects/sprints/services/sprint.service';
import { CommonModule } from '@angular/common';
import { PopoverModule } from 'primeng/popover';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { ProjectListItem } from '@mpm/shared-types';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';

import { IconDisplayComponent } from '../../../shared/components/icon-display/icon-display.component';

@Component({
  standalone: true,
  selector: 'app-sidebar',
  imports: [CommonModule, RouterLink, RouterLinkActive, PopoverModule, FormsModule, IconDisplayComponent, InputTextModule],
  template: `
    <div
      [class.w-64]="layoutService.menuMode() === 'overlay' || isExpanded()"
      [class.w-16]="layoutService.menuMode() === 'static' && !isExpanded()"
      class="flex h-full flex-col border-r border-surface-200 dark:border-surface-800 bg-surface-0 dark:bg-surface-900 text-gray-800 dark:text-surface-100 transition-all duration-300 ease-in-out select-none shadow-sm"
    >
      <!-- Project Switcher -->
      <div class="p-3 border-b border-surface-100 dark:border-surface-800 overflow-visible">
        @if (isExpanded()) {
          <span class="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-surface-400 mb-2 px-1">Dự án</span>
          <button
            (click)="projectPop.toggle($event); projectSearch.set('')"
            class="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm border border-surface-200 dark:border-surface-800 rounded-lg bg-white dark:bg-surface-900 text-gray-800 dark:text-surface-100 font-semibold cursor-pointer hover:bg-surface-50 dark:hover:bg-surface-800 transition-all select-none"
          >
            <div class="flex items-center gap-2 truncate">
              @if (selectedProject(); as project) {
                @if (project.emoji) {
                  <app-icon-display [icon]="project.emoji" class="text-sm flex-shrink-0"></app-icon-display>
                } @else {
                  <div class="flex h-5 w-5 items-center justify-center rounded bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 text-[10px] font-bold flex-shrink-0">
                    {{ project.name.slice(0, 2).toUpperCase() }}
                  </div>
                }
                <span class="truncate text-left">{{ project.name }}</span>
              } @else {
                <span class="text-gray-400 dark:text-surface-500">Chọn dự án</span>
              }
            </div>
            <i class="pi pi-chevron-down text-xs opacity-60 flex-shrink-0"></i>
          </button>

          <p-popover #projectPop appendTo="body" styleClass="!p-0">
            <div class="p-2 border-b border-surface-100 dark:border-surface-800 bg-surface-50 dark:bg-surface-900">
              <input
                type="text"
                pInputText
                placeholder="Tìm dự án..."
                class="w-full text-xs p-1"
                [ngModel]="projectSearch()"
                (ngModelChange)="projectSearch.set($event)"
                (click)="$event.stopPropagation()"
              />
            </div>
            <div class="pop-list w-56 max-h-72 overflow-y-auto">
              @for (project of filteredProjects(); track project.id) {
                <div
                  (click)="onProjectChange(project); projectPop.hide()"
                  class="pop-item flex items-center gap-2"
                  [class.selected]="project.id === selectedProject()?.id"
                >
                  @if (project.emoji) {
                    <app-icon-display [icon]="project.emoji" class="text-sm flex-shrink-0"></app-icon-display>
                  } @else {
                    <div class="flex h-5 w-5 items-center justify-center rounded bg-gray-100 dark:bg-surface-800 text-gray-600 dark:text-surface-400 text-[10px] font-bold flex-shrink-0">
                      {{ project.name.slice(0, 2).toUpperCase() }}
                    </div>
                  }
                  <span class="truncate">{{ project.name }}</span>
                </div>
              } @empty {
                <div class="p-3 text-xs text-gray-400 text-center">Không tìm thấy dự án</div>
              }
            </div>
          </p-popover>
        } @else {
          <!-- Collapsed Icon Trigger -->
          <div class="flex justify-center py-2">
            <button
              (click)="layoutService.toggleSidebar()"
              class="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition duration-200 cursor-pointer"
              title="Chuyển dự án"
            >
              @if (projectStore.currentProject()?.emoji) {
                <app-icon-display [icon]="projectStore.currentProject()?.emoji" class="text-lg"></app-icon-display>
              } @else {
                <i class="pi pi-folder-open text-lg"></i>
              }
            </button>
          </div>
        }
      </div>

      <!-- Nav Links -->
      <div class="flex-1 space-y-1 p-2 overflow-y-auto">
        <!-- Danh sách dự án (luôn hiển thị) -->
        <a
          routerLink="/projects"
          routerLinkActive="bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 font-semibold border-l-4 border-indigo-600"
          [routerLinkActiveOptions]="{ exact: true }"
          class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-600 dark:text-surface-400 hover:bg-gray-50 dark:hover:bg-surface-800 hover:text-gray-900 dark:hover:text-surface-100 transition duration-200"
          [title]="!isExpanded() ? 'Dự án' : ''"
        >
          <i class="pi pi-th-large text-base"></i>
          @if (isExpanded()) {
            <span>Dự án</span>
          }
        </a>

        @if (projectStore.currentProject()) {
          <!-- Work Items (Always visible) -->
          <a
            [routerLink]="['/projects', currentKey(), 'workitem']"
            routerLinkActive="bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 font-semibold border-l-4 border-indigo-600"
            [routerLinkActiveOptions]="{ exact: false }"
            class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-600 dark:text-surface-400 hover:bg-gray-50 dark:hover:bg-surface-800 hover:text-gray-900 dark:hover:text-surface-100 transition duration-200"
            [title]="!isExpanded() ? 'Work Items' : ''"
          >
            <i class="pi pi-align-left text-base"></i>
            @if (isExpanded()) {
              <span>Work Items</span>
            }
          </a>

          <!-- Sprints/Cycles (Conditional, collapsible submenu) -->
          @if (features().cycles) {
            <div>
              <button
                type="button"
                (click)="onSprintsClick()"
                class="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition duration-200"
                [ngClass]="isOnSprints()
                  ? 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 font-semibold border-l-4 border-indigo-600'
                  : 'text-gray-600 dark:text-surface-400 hover:bg-gray-50 dark:hover:bg-surface-800 hover:text-gray-900 dark:hover:text-surface-100'"
                [title]="!isExpanded() ? 'Sprints' : ''"
              >
                <app-icon-display [icon]="sprintIcon()" class="text-base flex-shrink-0"></app-icon-display>
                @if (isExpanded()) {
                  <span class="flex-1 text-left">{{ sprintLabel() }}</span>
                  <i class="pi text-[10px] text-gray-400 dark:text-surface-500 transition-transform duration-200"
                     [ngClass]="isSprintsOpen() ? 'pi-chevron-down' : 'pi-chevron-right'"></i>
                }
              </button>

              @if (isExpanded() && isSprintsOpen()) {
                <div class="mt-0.5 ml-4 pl-3 border-l border-gray-100 dark:border-surface-800 space-y-0.5">
                  @for (sub of sprintSubItems; track sub.label) {
                    <a
                      [routerLink]="['/projects', currentKey(), 'sprints', sub.route]"
                      [routerLinkActiveOptions]="{ exact: true }"
                      routerLinkActive="bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 font-semibold"
                      class="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-gray-500 dark:text-surface-400 hover:bg-gray-50 dark:hover:bg-surface-800 hover:text-gray-700 dark:hover:text-surface-100 transition"
                    >
                      <i [class]="'pi ' + sub.icon + ' text-[10px]'"></i>
                      {{ sub.label }}
                    </a>
                  }
                </div>
              }
            </div>
          }

          <!-- Modules (Conditional) -->
          @if (features().modules) {
            <a
              [routerLink]="['/projects', currentKey(), 'modules']"
              routerLinkActive="bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 font-semibold border-l-4 border-indigo-600"
              [routerLinkActiveOptions]="{ exact: false }"
              class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-600 dark:text-surface-400 hover:bg-gray-50 dark:hover:bg-surface-800 hover:text-gray-900 dark:hover:text-surface-100 transition duration-200"
              [title]="!isExpanded() ? 'Modules' : ''"
            >
              <i class="pi pi-box text-base"></i>
              @if (isExpanded()) {
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
              [title]="!isExpanded() ? 'Custom Views' : ''"
            >
              <i class="pi pi-filter text-base"></i>
              @if (isExpanded()) {
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
              [title]="!isExpanded() ? 'Pages' : ''"
            >
              <i class="pi pi-file text-base"></i>
              @if (isExpanded()) {
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
              [title]="!isExpanded() ? 'Intake' : ''"
            >
              <i class="pi pi-inbox text-base"></i>
              @if (isExpanded()) {
                <span>Intake (Yêu cầu)</span>
              }
            </a>
          }

          <!-- Settings (with collapsible sub-items) -->
          <div>
            <button
              type="button"
              (click)="onSettingsClick()"
              class="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition duration-200"
              [ngClass]="isOnSettings()
                ? 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 font-semibold border-l-4 border-indigo-600'
                : 'text-gray-600 dark:text-surface-400 hover:bg-gray-50 dark:hover:bg-surface-800 hover:text-gray-900 dark:hover:text-surface-100'"
              [title]="!isExpanded() ? 'Cài đặt' : ''"
            >
              <i class="pi pi-cog text-base flex-shrink-0"></i>
              @if (isExpanded()) {
                <span class="flex-1 text-left">Cài đặt</span>
                <i class="pi text-[10px] text-gray-400 dark:text-surface-500 transition-transform duration-200"
                   [ngClass]="isSettingsOpen() ? 'pi-chevron-down' : 'pi-chevron-right'"></i>
              }
            </button>

            @if (isExpanded() && isSettingsOpen()) {
              <div class="mt-0.5 ml-4 pl-3 border-l border-gray-100 dark:border-surface-800 space-y-0.5">
                @for (sub of settingsSubItems; track sub.label) {
                  <a
                    [routerLink]="['/projects', currentKey(), 'settings'].concat(sub.route)"
                    [routerLinkActiveOptions]="{ exact: sub.exact }"
                    [routerLinkActive]="sub.danger ? 'bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 font-semibold' : 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 font-semibold'"
                    class="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition"
                    [ngClass]="sub.danger
                      ? 'text-red-400 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600 dark:hover:text-red-400'
                      : 'text-gray-500 dark:text-surface-400 hover:bg-gray-50 dark:hover:bg-surface-800 hover:text-gray-700 dark:hover:text-surface-100'"
                  >
                    <i [class]="'pi ' + sub.icon + ' text-[10px]'"></i>
                    {{ sub.label }}
                  </a>
                }
              </div>
            }
          </div>

          <!-- Quản trị (admin only, grouped with bottom admin items) -->
          @if (authStore.isAdmin()) {
            <div class="mt-2 pt-2 border-t border-surface-100 dark:border-surface-800">
              <a
                routerLink="/admin/users"
                routerLinkActive="bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 font-semibold border-l-4 border-indigo-600"
                [routerLinkActiveOptions]="{ exact: false }"
                class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-600 dark:text-surface-400 hover:bg-gray-50 dark:hover:bg-surface-800 hover:text-gray-900 dark:hover:text-surface-100 transition duration-200"
                [title]="!isExpanded() ? 'Quản trị hệ thống' : ''"
              >
                <i class="pi pi-shield text-base"></i>
                @if (isExpanded()) {
                  <span>Quản trị</span>
                }
              </a>
            </div>
          }
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
  private readonly sprintService = inject(SprintService);

  readonly projectSearch = signal('');

  readonly filteredProjects = computed(() => {
    const search = this.projectSearch().toLowerCase().trim();
    const list = this.projectStore.projects();
    if (!search) return list;
    return list.filter(p =>
      p.name.toLowerCase().includes(search) ||
      p.key.toLowerCase().includes(search)
    );
  });

  readonly isOnSettings = toSignal(
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      map(() => this.router.url.includes('/settings'))
    ),
    { initialValue: this.router.url.includes('/settings') }
  );

  readonly isOnSprints = toSignal(
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      map(() => this.router.url.includes('/sprints') && !this.router.url.includes('/settings'))
    ),
    { initialValue: this.router.url.includes('/sprints') && !this.router.url.includes('/settings') }
  );

  readonly isSettingsOpen = signal<boolean>(this.router.url.includes('/settings'));
  readonly isSprintsOpen = signal<boolean>(this.router.url.includes('/sprints') && !this.router.url.includes('/settings'));

  constructor() {
    effect(() => {
      if (this.isOnSettings()) {
        this.isSettingsOpen.set(true);
      }
    });
    effect(() => {
      if (this.isOnSprints()) {
        this.isSprintsOpen.set(true);
      }
    });
    // Load sprint settings (icon, terminology) khi project sẵn sàng
    effect(() => {
      const project = this.projectStore.currentProject();
      if (project?.features?.cycles !== false && project) {
        this.sprintService.loadProjectSettings(project.id);
      }
    });
  }

  /** Icon sprint từ cấu hình dự án (mặc định pi-sync) */
  readonly sprintIcon = computed(
    () => this.sprintService.projectSettings()?.icon ?? 'pi-sync',
  );

  /** Nhãn theo terminology đã cấu hình */
  readonly sprintLabel = computed(() =>
    this.sprintService.projectSettings()?.terminology === 'cycle' ? 'Cycles' : 'Sprints',
  );

  onSettingsClick(): void {
    this.isSettingsOpen.update(v => !v);
  }

  onSprintsClick(): void {
    this.isSprintsOpen.update(v => !v);
  }

  readonly sprintSubItems = [
    { label: 'Danh sách', icon: 'pi-list',      route: 'list' },
    { label: 'Dashboard', icon: 'pi-chart-line', route: 'dashboard' },
    { label: 'Velocity',  icon: 'pi-chart-bar',  route: 'velocity' },
  ];

  readonly settingsSubItems = [
    { label: 'Cấu hình chung', icon: 'pi-sliders-h',            route: [] as string[], exact: true,  danger: false },
    { label: 'Thành viên',     icon: 'pi-users',                 route: ['members'],   exact: false, danger: false },
    { label: 'Tính năng',      icon: 'pi-toggle-on',             route: ['features'],  exact: false, danger: false },
    { label: 'Danger Zone',    icon: 'pi-exclamation-triangle',  route: ['danger'],    exact: false, danger: true  },
  ];

  // In overlay mode the sidebar is always fully expanded; in static mode it respects isCollapsed
  readonly isExpanded = computed(
    () => this.layoutService.menuMode() === 'overlay' || !this.layoutService.isCollapsed()
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
