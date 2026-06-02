import { Routes } from '@angular/router';
import { adminGuard } from './guards/admin.guard';

export const ADMIN_ROUTES: Routes = [
  {
    path: 'users',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./pages/user-list/user-list.component').then((m) => m.UserListComponent),
  },
  {
    path: '',
    redirectTo: 'users',
    pathMatch: 'full',
  },
];
