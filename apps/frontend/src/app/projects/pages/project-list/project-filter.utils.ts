import type { ProjectRole } from '@mpm/shared-types';

/**
 * Filter state cho project list
 */
export interface ProjectFilters {
  name?: string;
  status?: string;
  network?: string;
  startDate?: string;
  endDate?: string;
}

/**
 * Kiểm tra có filter nào đang active không
 */
export function hasActiveFilters(filters: ProjectFilters): boolean {
  return (
    !!filters.name ||
    (!!filters.status && filters.status !== 'all') ||
    (!!filters.network && filters.network !== 'all') ||
    !!(filters.startDate || filters.endDate)
  );
}

/**
 * Build query params object từ filter state để update URL
 */
export function buildQueryParams(filters: ProjectFilters): Record<string, string> {
  const params: Record<string, string> = {};

  if (filters.name) {
    params['name'] = filters.name;
  }
  if (filters.status && filters.status !== 'all') {
    params['status'] = filters.status;
  }
  if (filters.network && filters.network !== 'all') {
    params['network'] = filters.network;
  }
  if (filters.startDate) {
    params['startDate'] = filters.startDate;
  }
  if (filters.endDate) {
    params['endDate'] = filters.endDate;
  }

  return params;
}

/**
 * Parse URL query params thành ProjectFilters
 */
export function parseQueryParams(params: Record<string, string>): ProjectFilters {
  return {
    name: params['name'] || '',
    status: params['status'] || 'all',
    network: params['network'] || 'all',
    startDate: params['startDate'] || undefined,
    endDate: params['endDate'] || undefined,
  };
}

/**
 * Format project role thành display name tiếng Việt/English
 */
export function formatProjectRole(role: ProjectRole): string {
  switch (role) {
    case 'Scrum_Master':
      return 'Scrum Master';
    case 'Product_Owner':
      return 'Product Owner';
    case 'Developer':
      return 'Developer';
    case 'QA':
      return 'QA Engineer';
    case 'Stakeholder':
      return 'Stakeholder';
    default:
      return role || 'Non-member';
  }
}
