import { bootstrapApplication } from '@angular/platform-browser';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeuix/themes/aura';
import { AppComponent } from './app/app.component';
import { authInterceptor } from './app/auth/interceptors/auth.interceptor';
import { authGuard } from './app/auth/guards/auth.guard';
import { APP_INITIALIZER } from '@angular/core';
import { AuthService } from './app/auth/services/auth.service';

const routes = [
  {
    path: 'auth',
    loadChildren: () =>
      import('./app/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },
  {
    path: 'projects',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./app/layout/app-shell/app-shell.component').then(
        (m) => m.AppShellComponent
      ),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./app/projects/pages/project-list/project-list.component').then(
            (m) => m.ProjectListComponent
          ),
        title: 'Danh sách dự án — Agile PM',
      },
      {
        path: 'new',
        loadComponent: () =>
          import('./app/projects/pages/create-project/create-project.component').then(
            (m) => m.CreateProjectComponent
          ),
        title: 'Tạo dự án mới — Agile PM',
      },
      {
        path: ':key',
        children: [
          {
            path: 'board',
            loadComponent: () =>
              import('./app/projects/pages/board-placeholder.component').then(
                (m) => m.BoardPlaceholderComponent
              ),
            title: 'Board — Agile PM',
          },
          {
            path: 'backlog',
            loadComponent: () =>
              import('./app/projects/pages/backlog-placeholder.component').then(
                (m) => m.BacklogPlaceholderComponent
              ),
            title: 'Backlog — Agile PM',
          },
          {
            path: 'settings',
            loadComponent: () =>
              import('./app/projects/pages/project-settings/project-settings.component').then(
                (m) => m.ProjectSettingsComponent
              ),
            children: [
              {
                path: '',
                loadComponent: () =>
                  import('./app/projects/pages/project-settings/general-tab/general-tab.component').then(
                    (m) => m.GeneralTabComponent
                  ),
                title: 'Cấu hình chung — Agile PM',
              },
              {
                path: 'members',
                loadComponent: () =>
                  import('./app/projects/pages/project-settings/members-tab/members-tab.component').then(
                    (m) => m.MembersTabComponent
                  ),
                title: 'Thành viên — Agile PM',
              },
              {
                path: 'danger',
                loadComponent: () =>
                  import('./app/projects/pages/project-settings/danger-zone-tab/danger-zone-tab.component').then(
                    (m) => m.DangerZoneTabComponent
                  ),
                title: 'Danger Zone — Agile PM',
              },
            ],
          },
          {
            path: '',
            redirectTo: 'board',
            pathMatch: 'full' as const,
          },
        ],
      },
    ],
  },
  {
    path: '',
    redirectTo: 'projects',
    pathMatch: 'full' as const,
  },
  {
    path: '**',
    redirectTo: 'projects',
  },
];

import { ConfirmationService, MessageService } from 'primeng/api';

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAnimationsAsync(),
    providePrimeNG({
      theme: {
        preset: Aura,
        options: {
          darkModeSelector: '.dark',
          cssLayer: {
            name: 'primeng',
            order: 'theme, base, primeng, utilities',
          },
        },
      },
    }),
    {
      provide: APP_INITIALIZER,
      useFactory: (authService: AuthService) => () => authService.initialize(),
      deps: [AuthService],
      multi: true,
    },
    ConfirmationService,
    MessageService,
  ],
}).catch((err) => console.error(err));
