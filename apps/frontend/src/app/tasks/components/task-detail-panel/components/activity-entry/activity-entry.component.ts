import { Component, Input, signal } from '@angular/core';

import { RelativeTimePipe } from '../../pipes/relative-time.pipe';
import { StateTransitionComponent, StateTransitionValue } from '../state-transition';
import type { TaskActivity } from '@mpm/shared-types';

/**
 * Deterministically generates a background color for avatar initials
 * based on the actor name string.
 */
function getAvatarColor(name: string): string {
  const colors = [
    '#3B82F6', // blue
    '#10B981', // emerald
    '#F59E0B', // amber
    '#EF4444', // red
    '#8B5CF6', // violet
    '#EC4899', // pink
    '#06B6D4', // cyan
    '#F97316', // orange
    '#6366F1', // indigo
    '#14B8A6', // teal
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

/**
 * Safely parses a JSON string into a StateTransitionValue, returning null on failure.
 */
function parseStateValue(json: string | null): StateTransitionValue | null {
  if (!json) return null;
  try {
    const parsed = JSON.parse(json);
    if (parsed && typeof parsed.name === 'string' && typeof parsed.color === 'string') {
      return { id: parsed.id ?? '', name: parsed.name, color: parsed.color };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * ActivityEntryComponent — Displays a single activity entry row.
 *
 * Layout: [Avatar] [Username + Action Description + Relative Time]
 *
 * For state_changed entries, integrates StateTransitionComponent to show
 * the visual from→to state badges.
 *
 * Requirements: 5.6, 5.7
 */
@Component({
  standalone: true,
  selector: 'app-activity-entry',
  imports: [RelativeTimePipe, StateTransitionComponent],
  template: `
    <div class="flex items-start gap-3 py-2">
      <!-- Avatar (32px circular) -->
      <div class="shrink-0">
        @if (entry.actorAvatar) {
          <img
            [src]="entry.actorAvatar"
            [alt]="entry.actorName ?? 'User'"
            class="w-8 h-8 rounded-full object-cover"
          />
        } @else {
          <div
            class="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold select-none"
            [style.background-color]="avatarColor()"
            [attr.aria-label]="entry.actorName ?? 'User'"
          >
            {{ initial() }}
          </div>
        }
      </div>

      <!-- Content -->
      <div class="flex-1 min-w-0">
        <div class="flex items-center flex-wrap gap-x-1.5 gap-y-0.5">
          <!-- Username -->
          <span class="text-sm font-semibold text-gray-800 dark:text-surface-100">
            {{ entry.actorName ?? 'Người dùng' }}
          </span>

          <!-- Action Description -->
          <span class="text-sm text-gray-600 dark:text-surface-300">
            {{ actionText() }}
          </span>

          <!-- State Transition Badges (for state_changed) -->
          @if (entry.entryType === 'state_changed') {
            <app-state-transition
              [fromState]="oldState()"
              [toState]="newState()"
            />
          }

          <!-- Relative Time -->
          <span class="text-xs text-gray-400 dark:text-surface-500 ml-auto whitespace-nowrap">
            {{ entry.createdAt | relativeTime }}
          </span>
        </div>

        <!-- Comment content (for comment_added) -->
        @if (entry.entryType === 'comment_added' && entry.comment) {
          <p class="mt-1 text-sm text-gray-700 dark:text-surface-200 break-words line-clamp-3">
            {{ entry.comment }}
          </p>
        }
      </div>
    </div>
  `,
})
export class ActivityEntryComponent {
  @Input({ required: true }) entry!: TaskActivity;

  /** First letter of actor name for avatar fallback */
  readonly initial = signal('?');

  /** Background color for avatar initials */
  readonly avatarColor = signal('#6B7280');

  /** Human-readable action description */
  readonly actionText = signal('');

  /** Parsed old state for state_changed entries */
  readonly oldState = signal<StateTransitionValue | null>(null);

  /** Parsed new state for state_changed entries */
  readonly newState = signal<StateTransitionValue | null>(null);

  constructor() {
    // Values are computed in ngOnInit and ngOnChanges lifecycle hooks
  }

  ngOnChanges(): void {
    this.computeValues();
  }

  ngOnInit(): void {
    this.computeValues();
  }

  private computeValues(): void {
    const entry = this.entry;
    if (!entry) return;

    // Avatar
    const name = entry.actorName ?? '';
    this.initial.set(name.length > 0 ? name.charAt(0).toUpperCase() : '?');
    this.avatarColor.set(name.length > 0 ? getAvatarColor(name) : '#6B7280');

    // Action text
    this.actionText.set(this.getActionDescription(entry));

    // Parse state values for state_changed
    if (entry.entryType === 'state_changed') {
      this.oldState.set(parseStateValue(entry.oldValue));
      this.newState.set(parseStateValue(entry.newValue));
    } else {
      this.oldState.set(null);
      this.newState.set(null);
    }
  }

  /**
   * Returns the localized action description based on entry type.
   */
  private getActionDescription(entry: TaskActivity): string {
    switch (entry.entryType) {
      case 'created':
        return 'đã tạo task';
      case 'title_changed':
        return 'đã đổi tiêu đề';
      case 'description_changed':
        return 'đã cập nhật mô tả';
      case 'state_changed':
        return 'chuyển trạng thái';
      case 'priority_changed':
        return 'thay đổi ưu tiên';
      case 'type_changed':
        return 'thay đổi loại';
      case 'parent_changed':
        return 'thay đổi parent';
      case 'estimate_changed':
        return 'thay đổi ước lượng';
      case 'start_date_changed':
        return 'thay đổi ngày bắt đầu';
      case 'due_date_changed':
        return 'thay đổi ngày hạn';
      case 'assignee_added':
        return 'thêm người phụ trách';
      case 'assignee_removed':
        return 'xoá người phụ trách';
      case 'label_added':
        return 'thêm nhãn';
      case 'label_removed':
        return 'xoá nhãn';
      case 'attachment_added':
        return 'thêm tệp đính kèm';
      case 'attachment_removed':
        return 'xoá tệp đính kèm';
      case 'link_added':
        return 'thêm liên kết';
      case 'link_removed':
        return 'xoá liên kết';
      case 'relation_added':
        return 'thêm quan hệ';
      case 'relation_removed':
        return 'xoá quan hệ';
      case 'comment_added':
        return 'thêm bình luận';
      case 'comment_edited':
        return 'sửa bình luận';
      case 'comment_deleted':
        return 'xoá bình luận';
      case 'deleted':
        return 'đã xoá task';
      case 'completed':
        return 'đã hoàn thành';
      case 'reopened':
        return 'mở lại task';
      default:
        return 'cập nhật';
    }
  }
}
