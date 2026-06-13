import type { ActivityFilterType } from '@mpm/shared-types';

/**
 * Tab definition for the activity panel tab bar.
 */
export interface ActivityTab {
  label: string;
  value: ActivityFilterType | 'properties';
  icon: string;
}

/**
 * Empty state configuration per tab.
 */
export interface EmptyStateConfig {
  icon: string;
  message: string;
}

/**
 * Empty state messages per tab (Vietnamese locale).
 */
export const EMPTY_STATE_MAP: Record<string, EmptyStateConfig> = {
  all: {
    icon: 'pi pi-clock',
    message: 'Chưa có hoạt động nào.',
  },
  activity: {
    icon: 'pi pi-bolt',
    message: 'Chưa có hoạt động hệ thống nào.',
  },
  comments: {
    icon: 'pi pi-comments',
    message: 'Chưa có bình luận nào.',
  },
  history: {
    icon: 'pi pi-history',
    message: 'Chưa có lịch sử chuyển trạng thái.',
  },
};

/**
 * Empty state messages per tab (English locale).
 */
export const EMPTY_STATE_MAP_EN: Record<string, EmptyStateConfig> = {
  all: {
    icon: 'pi pi-clock',
    message: 'No activities yet.',
  },
  activity: {
    icon: 'pi pi-bolt',
    message: 'No system activities yet.',
  },
  comments: {
    icon: 'pi pi-comments',
    message: 'No comments yet.',
  },
  history: {
    icon: 'pi pi-history',
    message: 'No status history yet.',
  },
};

/**
 * Build the tabs array based on whether to include the Properties tab.
 */
export function buildActivityTabs(showPropertiesTab: boolean, isEn = false): ActivityTab[] {
  const baseTabs: ActivityTab[] = [
    { label: isEn ? 'All' : 'Tất cả', value: 'all', icon: 'pi pi-list' },
    { label: isEn ? 'Activities' : 'Hoạt động', value: 'activity', icon: 'pi pi-bolt' },
    { label: isEn ? 'History' : 'Lịch sử', value: 'history', icon: 'pi pi-history' },
  ];
  if (showPropertiesTab) {
    baseTabs.push({ label: isEn ? 'Properties' : 'Thuộc tính', value: 'properties', icon: 'pi pi-cog' });
  }
  return baseTabs;
}

/**
 * Get the empty state config for a given filter type.
 * Falls back to 'all' state for unknown filter values.
 */
export function getEmptyStateConfig(filter: ActivityFilterType | 'properties', isEn = false): EmptyStateConfig {
  const key = filter === 'properties' ? 'all' : filter;
  const map = isEn ? EMPTY_STATE_MAP_EN : EMPTY_STATE_MAP;
  return map[key] ?? map['all'];
}

/**
 * Get the label text for a given active filter from the tabs array.
 */
export function getActiveTabLabel(
  tabs: ActivityTab[],
  activeFilter: ActivityFilterType | 'properties',
  isEn = false
): string {
  const tab = tabs.find((t) => t.value === activeFilter);
  return tab?.label ?? (isEn ? 'All' : 'Tất cả');
}
