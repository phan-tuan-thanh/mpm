import { inject } from '@angular/core';
import { CanActivateFn, ActivatedRouteSnapshot, Router, UrlTree } from '@angular/router';
import { AuthService, SystemRole, ProjectRole } from '../services/auth.service';

/**
 * Route data interface cho role-based access control.
 *
 * Sử dụng trong route config:
 * ```ts
 * // System role check
 * { path: 'admin', canActivate: [roleGuard], data: { roles: ['Admin'] } }
 *
 * // Project role check (projectId lấy từ route params)
 * { path: 'project/:projectId/settings', canActivate: [roleGuard], data: { projectRoles: ['Scrum_Master'] } }
 *
 * // Kết hợp cả hai (OR logic — chỉ cần thỏa 1 điều kiện)
 * { path: 'manage', canActivate: [roleGuard], data: { roles: ['Admin'], projectRoles: ['Scrum_Master'] } }
 * ```
 */
export interface RoleRouteData {
  /** System roles được phép truy cập (OR logic giữa các roles) */
  roles?: SystemRole[];
  /** Project roles được phép truy cập (OR logic giữa các roles) */
  projectRoles?: ProjectRole[];
}

/**
 * Trích xuất projectId từ route params (duyệt từ route hiện tại lên parent).
 * Hỗ trợ nested routes: /project/:projectId/tasks/:taskId
 */
function extractProjectId(route: ActivatedRouteSnapshot): string | null {
  let current: ActivatedRouteSnapshot | null = route;
  while (current) {
    const projectId = current.paramMap.get('projectId');
    if (projectId) {
      return projectId;
    }
    current = current.parent;
  }
  return null;
}

/**
 * Role Guard — kiểm tra system role hoặc project role.
 *
 * Logic:
 * 1. Nếu user chưa authenticated → redirect to /login (kèm returnUrl)
 * 2. Nếu route data có `roles` → kiểm tra system role
 * 3. Nếu route data có `projectRoles` → kiểm tra project role trong project cụ thể
 * 4. Nếu cả hai đều có → OR logic (thỏa 1 trong 2 là đủ)
 * 5. Nếu không thỏa → redirect to trang chủ
 *
 * Validates: Requirements 8.4
 */
export const roleGuard: CanActivateFn = (route, state): boolean | UrlTree => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Kiểm tra authentication trước
  if (!authService.isAuthenticated()) {
    return router.createUrlTree(['/login'], {
      queryParams: { returnUrl: state.url },
    });
  }

  const data = route.data as RoleRouteData;
  const requiredSystemRoles = data.roles;
  const requiredProjectRoles = data.projectRoles;

  // Nếu không có role requirement nào → cho phép truy cập
  if (!requiredSystemRoles?.length && !requiredProjectRoles?.length) {
    return true;
  }

  // Kiểm tra system role
  if (requiredSystemRoles?.length) {
    if (authService.hasSystemRole(requiredSystemRoles)) {
      return true;
    }
  }

  // Kiểm tra project role
  if (requiredProjectRoles?.length) {
    const projectId = extractProjectId(route);
    if (projectId) {
      // Có projectId trong route → kiểm tra role trong project cụ thể
      if (authService.hasProjectRole(projectId, requiredProjectRoles)) {
        return true;
      }
    } else {
      // Không có projectId → kiểm tra user có role đó trong bất kỳ project nào
      if (authService.hasAnyProjectRole(requiredProjectRoles)) {
        return true;
      }
    }
  }

  // Không đủ quyền → redirect đến trang chủ
  return router.createUrlTree(['/']);
};
