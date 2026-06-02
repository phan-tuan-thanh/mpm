import { bootstrapApplication } from '@angular/platform-browser';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter, withEnabledBlockingInitialNavigation } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeuix/themes/aura';
import { AppComponent } from './app/app.component';
import { authInterceptor } from './app/auth/interceptors/auth.interceptor';
import { authGuard } from './app/auth/guards/auth.guard';
import { APP_INITIALIZER } from '@angular/core';
import { AuthService } from './app/auth/services/auth.service';
import { projectFeatureGuard } from './app/core/guards/project-feature.guard';

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
            path: 'cycles',
            canActivate: [projectFeatureGuard],
            loadComponent: () =>
              import('./app/projects/pages/feature-placeholder.component').then(
                (m) => m.FeaturePlaceholderComponent
              ),
            data: { feature: 'cycles', title: 'Sprints/Cycles' },
          },
          {
            path: 'modules',
            canActivate: [projectFeatureGuard],
            loadComponent: () =>
              import('./app/projects/pages/feature-placeholder.component').then(
                (m) => m.FeaturePlaceholderComponent
              ),
            data: { feature: 'modules', title: 'Modules' },
          },
          {
            path: 'views',
            canActivate: [projectFeatureGuard],
            loadComponent: () =>
              import('./app/projects/pages/feature-placeholder.component').then(
                (m) => m.FeaturePlaceholderComponent
              ),
            data: { feature: 'views', title: 'Views tùy chỉnh' },
          },
          {
            path: 'pages',
            canActivate: [projectFeatureGuard],
            loadComponent: () =>
              import('./app/projects/pages/feature-placeholder.component').then(
                (m) => m.FeaturePlaceholderComponent
              ),
            data: { feature: 'pages', title: 'Pages (Tài liệu)' },
          },
          {
            path: 'intake',
            canActivate: [projectFeatureGuard],
            loadComponent: () =>
              import('./app/projects/pages/feature-placeholder.component').then(
                (m) => m.FeaturePlaceholderComponent
              ),
            data: { feature: 'intake', title: 'Intake (Yêu cầu)' },
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
                path: 'states',
                loadComponent: () =>
                  import('./app/projects/pages/project-settings/states-tab/states-tab.component').then(
                    (m) => m.StatesTabComponent
                  ),
                title: 'Trạng thái — Agile PM',
              },
              {
                path: 'estimates',
                loadComponent: () =>
                  import('./app/projects/pages/project-settings/estimates-tab/estimates-tab.component').then(
                    (m) => m.EstimatesTabComponent
                  ),
                title: 'Ước lượng — Agile PM',
              },
              {
                path: 'features',
                loadComponent: () =>
                  import('./app/projects/pages/project-settings/features-tab/features-tab.component').then(
                    (m) => m.FeaturesTabComponent
                  ),
                title: 'Tính năng — Agile PM',
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
    provideRouter(routes, withEnabledBlockingInitialNavigation()),
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
