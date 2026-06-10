import type { TaskPriority } from '@mpm/shared-types';

/**
 * Priority color configuration for task header badges.
 * Maps each priority level to Tailwind CSS classes and a display label.
 */
export const PRIORITY_COLORS: Record<TaskPriority, { bg: string; text: string; label: string }> = {
  urgent: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', label: 'Urgent' },
  high: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300', label: 'High' },
  medium: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-300', label: 'Medium' },
  low: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', label: 'Low' },
  none: { bg: 'bg-gray-100 dark:bg-gray-800/30', text: 'text-gray-600 dark:text-gray-400', label: 'None' },
};

/** Get combined CSS classes for a priority badge */
export function getPriorityBadgeClasses(priority: TaskPriority): string {
  const config = PRIORITY_COLORS[priority] ?? PRIORITY_COLORS.none;
  return `${config.bg} ${config.text}`;
}

/** Get the display label for a priority level */
export function getPriorityLabel(priority: TaskPriority): string {
  return (PRIORITY_COLORS[priority] ?? PRIORITY_COLORS.none).label;
}

/**
 * Attempt to copy text to the system clipboard.
 * Returns true on success, false on failure.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** Save status auto-hide durations in milliseconds */
export const SAVE_STATUS_DURATIONS = {
  saved: 2000,
  error: 3000,
} as const;
