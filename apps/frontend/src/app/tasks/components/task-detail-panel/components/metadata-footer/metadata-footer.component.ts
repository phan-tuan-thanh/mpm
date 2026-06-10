import { Component, computed, Input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';

import { truncateCreatorName } from './metadata-footer.helpers';

/**
 * MetadataFooterComponent — Hiển thị thông tin metadata: Tạo lúc / Cập nhật lúc
 *
 * Pure display component — không có output.
 * Truncates creator name tới 30 ký tự + "…" nếu dài hơn.
 * Hiển thị "Người dùng không xác định" khi không có creator.
 *
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */
@Component({
  standalone: true,
  selector: 'app-metadata-footer',
  imports: [DatePipe],
  template: `
    <div class="border-t border-gray-100 dark:border-surface-800 pt-3 mt-3 flex flex-col gap-1.5 text-xs text-gray-500 dark:text-surface-400">
      <!-- Tạo lúc (Req 9.1) -->
      <div class="flex items-start gap-1">
        <span class="text-gray-400 dark:text-surface-500 shrink-0">Tạo lúc:</span>
        <span>
          {{ createdAt | date:'dd/MM/yyyy HH:mm' }}
          <span class="text-gray-400 dark:text-surface-500">·</span>
          {{ displayCreatorName() }}
        </span>
      </div>

      <!-- Cập nhật lúc (Req 9.2, 9.3, 9.5) -->
      <div class="flex items-start gap-1">
        <span class="text-gray-400 dark:text-surface-500 shrink-0">Cập nhật lúc:</span>
        <span>{{ updatedAt | date:'dd/MM/yyyy HH:mm' }}</span>
      </div>
    </div>
  `,
})
export class MetadataFooterComponent {
  /** Thời gian tạo task */
  @Input() createdAt: string | Date | null = null;

  /** Thời gian cập nhật task — nếu chưa cập nhật thì = createdAt (Req 9.3) */
  @Input() updatedAt: string | Date | null = null;

  /** Tên người tạo — null/empty = "Người dùng không xác định" (Req 9.4) */
  @Input() set creatorName(value: string | null | undefined) {
    this._creatorName.set(value ?? null);
  }

  private readonly _creatorName = signal<string | null>(null);

  /** Tên hiển thị: truncated hoặc fallback (Req 9.1, 9.4) */
  readonly displayCreatorName = computed(() => {
    return truncateCreatorName(this._creatorName());
  });
}
