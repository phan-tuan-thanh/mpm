import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  ChangeDetectionStrategy,
} from '@angular/core';
import { SkeletonModule } from 'primeng/skeleton';

import type { TaskActivity, ActivityFilterType } from '@mpm/shared-types';
import { ActivityEntryComponent } from '../activity-entry';
import {
  ActivityTab,
  buildActivityTabs,
  getEmptyStateConfig,
  getActiveTabLabel,
} from './activity-panel.helpers';

/**
 * ActivityPanelComponent — Tabbed activity panel with manual pagination buttons.
 *
 * Container component that provides:
 * - Tab bar: "Tất cả", "Hoạt động", "Lịch sử" (+ "Thuộc tính" in drawer/popup)
 * - Manual pagination buttons ("Xem thêm" & "Xem hết") instead of infinite scroll
 * - Skeleton placeholders while loading
 * - Empty state with icon + message per tab
 * - "Properties" tab support in drawer/popup mode (content projected via ng-content)
 */
@Component({
  standalone: true,
  selector: 'app-activity-panel',
  imports: [ActivityEntryComponent, SkeletonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Tab Bar -->
    <div class="border-b border-gray-200 dark:border-surface-700" [class.mb-2]="compact" [class.mb-3]="!compact" role="tablist" aria-label="Activity tabs">
      <div class="flex gap-0 overflow-x-auto -mb-px">
        @for (tab of tabs; track tab.value) {
          <button
            type="button"
            role="tab"
            [attr.aria-selected]="activeFilter === tab.value"
            [attr.aria-controls]="'activity-tabpanel-' + tab.value"
            class="font-medium whitespace-nowrap border-b-2 transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            [class.px-3]="!compact"
            [class.py-2]="!compact"
            [class.text-sm]="!compact"
            [class.px-2]="compact"
            [class.py-1.5]="compact"
            [class.text-xs]="compact"
            [class.border-primary-500]="activeFilter === tab.value"
            [class.text-primary-600]="activeFilter === tab.value"
            [class.dark:text-primary-400]="activeFilter === tab.value"
            [class.border-transparent]="activeFilter !== tab.value"
            [class.text-gray-500]="activeFilter !== tab.value"
            [class.dark:text-surface-400]="activeFilter !== tab.value"
            [class.hover:text-gray-700]="activeFilter !== tab.value"
            [class.dark:hover:text-surface-200]="activeFilter !== tab.value"
            [class.hover:border-gray-300]="activeFilter !== tab.value"
            (click)="onTabClick(tab.value)"
            (keydown.enter)="onTabClick(tab.value)"
            (keydown.space)="onTabClick(tab.value); $event.preventDefault()"
          >
            <i [class]="tab.icon + (compact ? ' text-[10px]' : ' mr-1.5 text-xs')" aria-hidden="true"></i>
            @if (!compact) { {{ tab.label }} }
          </button>
        }
      </div>
    </div>

    <!-- Tab Content — parent container handles scrolling; no internal overflow -->
    <div
      [id]="'activity-tabpanel-' + activeFilter"
      role="tabpanel"
      [attr.aria-label]="currentTabLabel"
    >
      <!-- Properties Tab (projected content) -->
      @if (activeFilter === 'properties') {
        <ng-content select="[activityPanelProperties]"></ng-content>
      } @else {
        <!-- Loading Skeleton -->
        @if (loading && entries.length === 0) {
          <div class="space-y-2 px-1" aria-busy="true" aria-label="Đang tải hoạt động...">
            @for (i of effectiveSkeletonRows; track i) {
              <div class="flex items-start gap-2 py-1.5">
                <p-skeleton shape="circle" [size]="compact ? '1.5rem' : '2rem'" />
                <div class="flex-1 space-y-1.5">
                  <p-skeleton width="60%" [height]="compact ? '0.75rem' : '0.875rem'" />
                  <p-skeleton width="40%" height="0.625rem" />
                </div>
              </div>
            }
          </div>
        }

        <!-- Entries List -->
        @if (!loading || entries.length > 0) {
          @if (entries.length === 0) {
            <!-- Empty State -->
            <div class="flex flex-col items-center justify-center py-8 text-center" role="status">
              <i [class]="emptyStateIcon + ' text-2xl text-gray-300 dark:text-surface-600 mb-2'" aria-hidden="true"></i>
              <p class="text-xs text-gray-400 dark:text-surface-500">{{ emptyStateMessage }}</p>
            </div>
          } @else {
            <!-- Activity Entries -->
            <div class="divide-y divide-gray-100 dark:divide-surface-700">
              @for (entry of entries; track entry.id) {
                <app-activity-entry [entry]="entry" [compact]="compact" />
              }
            </div>

            <!-- Loading More Indicator -->
            @if (loading && entries.length > 0) {
              <div class="flex items-center justify-center py-2" aria-busy="true">
                <i class="pi pi-spin pi-spinner text-gray-400 text-xs mr-1.5" aria-hidden="true"></i>
                <span class="text-xs text-gray-400 dark:text-surface-500">Đang tải thêm...</span>
              </div>
            }

            <!-- Manual Load More / View All Buttons -->
            @if (hasMore && !loading) {
              <div class="flex items-center justify-center gap-2 py-3">
                <button
                  type="button"
                  class="px-3 py-1.5 text-xs font-semibold rounded-md border border-gray-200 dark:border-surface-700 text-gray-700 dark:text-surface-200 hover:bg-gray-50 dark:hover:bg-surface-800 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
                  (click)="onShowMoreClick()"
                >
                  Xem thêm
                </button>
                <button
                  type="button"
                  class="px-3 py-1.5 text-xs font-semibold rounded-md bg-gray-50 dark:bg-surface-800 text-gray-700 dark:text-surface-200 hover:bg-gray-100 dark:hover:bg-surface-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
                  (click)="onShowAllClick()"
                >
                  Xem hết
                </button>
              </div>
            }
          }
        }
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
  `,
})
export class ActivityPanelComponent implements OnDestroy, OnChanges {
  /** List of activity entries to display (already filtered by parent) */
  @Input() entries: TaskActivity[] = [];

  @Input() projectId = '';
  @Input() taskId = '';
  @Input() membersList: any[] = [];

  /** Whether entries are currently loading */
  @Input() loading = false;

  /** Whether there are more entries to load */
  @Input() hasMore = true;

  /** The currently active filter tab */
  @Input() activeFilter: ActivityFilterType | 'properties' = 'all';

  /** View mode for the panel — determines whether "Properties" tab is shown */
  @Input() viewMode: 'full-page' | 'drawer' | 'popup' = 'full-page';

  /** Whether to show the Properties tab (true in drawer/popup mode) */
  @Input() showPropertiesTab = false;

  /** Compact layout — smaller tabs, denser entries; auto-enabled in drawer/popup */
  @Input() compact = false;

  /** Emitted when the user changes the active tab filter */
  @Output() filterChanged = new EventEmitter<ActivityFilterType | 'properties'>();

  /** Emitted when user clicks "Xem thêm" to load more entries */
  @Output() loadMore = new EventEmitter<void>();

  /** Emitted when user clicks "Xem hết" to load all entries */
  @Output() loadAll = new EventEmitter<void>();

  /** Skeleton placeholder row count */
  readonly skeletonRows = [1, 2, 3, 4, 5];
  readonly compactSkeletonRows = [1, 2, 3];

  get effectiveSkeletonRows(): number[] {
    return this.compact ? this.compactSkeletonRows : this.skeletonRows;
  }

  /** Computed tabs list */
  tabs: ActivityTab[] = [];

  /** Computed empty state icon for the current tab */
  get emptyStateIcon(): string {
    return getEmptyStateConfig(this.activeFilter).icon;
  }

  /** Computed empty state message for the current tab */
  get emptyStateMessage(): string {
    return getEmptyStateConfig(this.activeFilter).message;
  }

  /** Get the label of the currently active tab */
  get currentTabLabel(): string {
    return getActiveTabLabel(this.tabs, this.activeFilter);
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Rebuild tabs when showPropertiesTab or viewMode changes
    if (changes['showPropertiesTab'] || changes['viewMode']) {
      this.tabs = buildActivityTabs(this.showPropertiesTab);
    }
  }

  ngOnDestroy(): void {}

  /** Handle tab click */
  onTabClick(tabValue: ActivityFilterType | 'properties'): void {
    if (tabValue === this.activeFilter) return;
    this.filterChanged.emit(tabValue);
  }

  onShowMoreClick(): void {
    this.loadMore.emit();
  }

  onShowAllClick(): void {
    this.loadAll.emit();
  }
}
