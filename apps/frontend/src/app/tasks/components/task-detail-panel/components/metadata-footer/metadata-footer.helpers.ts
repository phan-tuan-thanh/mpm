/**
 * Helper utilities for MetadataFooterComponent
 *
 * Contains pure functions for creator name truncation logic.
 * Exported separately to allow unit testing without Angular JIT compilation.
 */

/** Max characters to display before truncation */
export const MAX_CREATOR_NAME_LENGTH = 30;

/** Fallback text when creator is missing */
export const UNKNOWN_CREATOR_LABEL = 'Người dùng không xác định';

/**
 * Truncate creator display name:
 * - null/undefined/empty → "Người dùng không xác định"
 * - ≤ 30 chars → unchanged
 * - > 30 chars → first 30 + "…"
 *
 * Requirements: 9.1, 9.4
 */
export function truncateCreatorName(name: string | null | undefined): string {
  if (!name || name.trim().length === 0) {
    return UNKNOWN_CREATOR_LABEL;
  }

  if (name.length <= MAX_CREATOR_NAME_LENGTH) {
    return name;
  }

  return name.substring(0, MAX_CREATOR_NAME_LENGTH) + '…';
}
