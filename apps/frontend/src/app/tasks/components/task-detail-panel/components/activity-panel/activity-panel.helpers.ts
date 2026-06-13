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
 * Base activity tabs (always shown).
 */
const BASE_TABS: ActivityTab[] = [
  { label: 'Tất cả', value: 'all', icon: 'pi pi-list' },
  { label: 'Hoạt động', value: 'activity', icon: 'pi pi-bolt' },
  { label: 'Lịch sử', value: 'history', icon: 'pi pi-history' },
];

/**
 * Build the tabs array based on whether to include the Properties tab.
 */
export function buildActivityTabs(showPropertiesTab: boolean): ActivityTab[] {
  const tabs = [...BASE_TABS];
  if (showPropertiesTab) {
    tabs.push({ label: 'Thuộc tính', value: 'properties', icon: 'pi pi-cog' });
  }
  return tabs;
}

/**
 * Get the empty state config for a given filter type.
 * Falls back to 'all' state for unknown filter values.
 */
export function getEmptyStateConfig(filter: ActivityFilterType | 'properties'): EmptyStateConfig {
  const key = filter === 'properties' ? 'all' : filter;
  return EMPTY_STATE_MAP[key] ?? EMPTY_STATE_MAP['all'];
}

/**
 * Get the label text for a given active filter from the tabs array.
 */
export function getActiveTabLabel(
  tabs: ActivityTab[],
  activeFilter: ActivityFilterType | 'properties'
): string {
  const tab = tabs.find((t) => t.value === activeFilter);
  return tab?.label ?? 'Tất cả';
}
