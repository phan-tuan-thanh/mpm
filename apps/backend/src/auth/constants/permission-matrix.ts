import type { PermissionMatrix } from '@mpm/shared-types';

/**
 * Ma trận phân quyền cấp project
 *
 * Quy tắc:
 * - Scrum_Master: CRUD trên tất cả tài nguyên
 * - Product_Owner: CRUD trên task/sprint/document, chỉ read member
 * - Developer: CRU trên task/document, chỉ read sprint/member
 * - QA: CRU trên task/document, chỉ read sprint/member
 * - Stakeholder: chỉ read trên tất cả tài nguyên
 */
export const PERMISSION_MATRIX: PermissionMatrix = {
  Scrum_Master: {
    task: ['create', 'read', 'update', 'delete'],
    sprint: ['create', 'read', 'update', 'delete'],
    document: ['create', 'read', 'update', 'delete'],
    member: ['create', 'read', 'update', 'delete'],
  },
  Product_Owner: {
    task: ['create', 'read', 'update', 'delete'],
    sprint: ['create', 'read', 'update', 'delete'],
    document: ['create', 'read', 'update', 'delete'],
    member: ['read'],
  },
  Developer: {
    task: ['create', 'read', 'update'],
    sprint: ['read'],
    document: ['create', 'read', 'update'],
    member: ['read'],
  },
  QA: {
    task: ['create', 'read', 'update'],
    sprint: ['read'],
    document: ['create', 'read', 'update'],
    member: ['read'],
  },
  Stakeholder: {
    task: ['read'],
    sprint: ['read'],
    document: ['read'],
    member: ['read'],
  },
} as const;

/**
 * Kiểm tra quyền truy cập dựa trên permission matrix
 *
 * @param role - Project role của user
 * @param resource - Loại tài nguyên
 * @param action - Hành động cần kiểm tra
 * @returns true nếu role có quyền thực hiện action trên resource
 */
export function hasPermission(
  role: keyof typeof PERMISSION_MATRIX,
  resource: keyof (typeof PERMISSION_MATRIX)[typeof role],
  action: string,
): boolean {
  const rolePermissions = PERMISSION_MATRIX[role];
  if (!rolePermissions) {
    return false;
  }

  const allowedActions = rolePermissions[resource];
  if (!allowedActions) {
    return false;
  }

  return allowedActions.includes(action as never);
}
