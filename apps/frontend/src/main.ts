import { bootstrapApplication } from '@angular/platform-browser';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter, withEnabledBlockingInitialNavigation } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeuix/themes/aura';
import { AppComponent } from './app/app.component';
import { authInterceptor } from './app/auth/interceptors/auth.interceptor';
import { authGuard } from './app/auth/guards/auth.guard';
import { adminGuard } from './app/admin/guards/admin.guard';
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
    path: 'admin',
    canActivate: [authGuard, adminGuard],
    loadComponent: () =>
      import('./app/layout/app-shell/app-shell.component').then(
        (m) => m.AppShellComponent
      ),
    loadChildren: () =>
      import('./app/admin/admin.routes').then((m) => m.ADMIN_ROUTES),
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
            redirectTo: 'workitem?view=board',
          },
          {
            path: 'backlog',
            redirectTo: 'workitem',
          },
          {
            path: 'workitem',
            loadComponent: () =>
              import('./app/tasks/pages/backlog/backlog.component').then(
                (m) => m.BacklogComponent
              ),
            title: 'Work Items — Agile PM',
          },
          {
            path: 'cycles',
            redirectTo: 'sprints',
          },
          {
            path: 'sprints',
            canActivate: [projectFeatureGuard],
            data: { feature: 'cycles' },
            loadComponent: () =>
              import('./app/projects/sprints/pages/sprint-shell/sprint-shell.component').then(
                (m) => m.SprintShellComponent
              ),
            children: [
              {
                path: '',
                redirectTo: 'list',
                pathMatch: 'full' as const,
              },
              {
                path: 'list',
                loadComponent: () =>
                  import('./app/projects/sprints/pages/sprint-list/sprint-list.component').then(
                    (m) => m.SprintListComponent
                  ),
                title: 'Sprints — Agile PM',
              },
              {
                path: 'dashboard',
                loadComponent: () =>
                  import('./app/projects/sprints/pages/sprint-dashboard/sprint-dashboard.component').then(
                    (m) => m.SprintDashboardComponent
                  ),
                title: 'Sprint Dashboard — Agile PM',
              },
              {
                path: 'velocity',
                loadComponent: () =>
                  import('./app/projects/sprints/pages/sprint-velocity/sprint-velocity.component').then(
                    (m) => m.SprintVelocityComponent
                  ),
                title: 'Sprint Velocity — Agile PM',
              },
              {
                path: 'settings',
                loadComponent: () =>
                  import('./app/projects/sprints/pages/sprint-settings/sprint-settings.component').then(
                    (m) => m.SprintSettingsComponent
                  ),
                title: 'Sprint Settings — Agile PM',
              },
            ],
          },
          {
            path: 'modules',
            canActivate: [projectFeatureGuard],
            loadComponent: () =>
              import('./app/tasks/pages/modules/modules.component').then(
                (m) => m.ModulesComponent
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
                children: [
                  {
                    path: '',
                    redirectTo: 'info',
                    pathMatch: 'full' as const,
                  },
                  {
                    path: 'info',
                    loadComponent: () =>
                      import('./app/projects/pages/project-settings/general-tab/components/general-info-tab.component').then(
                        (m) => m.GeneralInfoTabComponent
                      ),
                  },
                  {
                    path: 'sprints',
                    loadComponent: () =>
                      import('./app/projects/sprints/pages/sprint-settings/sprint-settings.component').then(
                        (m) => m.SprintSettingsComponent
                      ),
                  },
                  {
                    path: 'states',
                    loadComponent: () =>
                      import('./app/projects/pages/project-settings/states-tab/states-tab.component').then(
                        (m) => m.StatesTabComponent
                      ),
                  },
                  {
                    path: 'estimates',
                    loadComponent: () =>
                      import('./app/projects/pages/project-settings/estimates-tab/estimates-tab.component').then(
                        (m) => m.EstimatesTabComponent
                      ),
                  },
                  {
                    path: 'priorities',
                    loadComponent: () =>
                      import('./app/projects/pages/project-settings/priorities-tab/priorities-tab.component').then(
                        (m) => m.PrioritiesTabComponent
                      ),
                  },
                  {
                    path: 'labels',
                    loadComponent: () =>
                      import('./app/projects/pages/project-settings/labels-tab/labels-tab.component').then(
                        (m) => m.LabelsTabComponent
                      ),
                    title: 'Labels — Agile PM',
                  },
                  {
                    path: 'language',
                    loadComponent: () =>
                      import('./app/projects/pages/project-settings/language-tab/language-tab.component').then(
                        (m) => m.LanguageTabComponent
                      ),
                    title: 'Ngôn ngữ — Agile PM',
                  },
                ],
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
