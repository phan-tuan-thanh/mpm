import { Component, Input } from '@angular/core';

/**
 * SubItemProgressComponent — SVG circular progress ring
 *
 * Hiển thị tỷ lệ hoàn thành sub-items dưới dạng vòng tròn SVG.
 * Nhận input done/total và render arc tương ứng với percentage.
 *
 * Validates: Requirements 4.2
 */
@Component({
  standalone: true,
  selector: 'app-sub-item-progress',
  template: `
    <div class="relative inline-flex items-center justify-center" [style.width.px]="size" [style.height.px]="size">
      <!-- SVG circular progress ring -->
      <svg
        [attr.width]="size"
        [attr.height]="size"
        class="transform -rotate-90"
        [attr.aria-label]="'Progress: ' + done + ' of ' + total + ' done'"
        role="img"
      >
        <!-- Background ring (remaining) -->
        <circle
          [attr.cx]="center"
          [attr.cy]="center"
          [attr.r]="radius"
          fill="none"
          class="stroke-gray-100 dark:stroke-surface-700"
          [attr.stroke-width]="strokeWidth"
        />
        <!-- Filled arc (done) -->
        @if (percentage > 0) {
          <circle
            [attr.cx]="center"
            [attr.cy]="center"
            [attr.r]="radius"
            fill="none"
            class="stroke-green-500"
            [attr.stroke-width]="strokeWidth"
            [attr.stroke-dasharray]="strokeDashArrayValue"
            stroke-linecap="round"
          />
        }
      </svg>
      <!-- Text label: "X/Y" centered inside -->
      <span class="absolute text-[9px] text-gray-600 dark:text-surface-300 font-semibold leading-none select-none">
        {{ done }}/{{ total }}
      </span>
    </div>
  `,
})
export class SubItemProgressComponent {
  /** Số sub-items đã hoàn thành (state.group === 'completed') */
  @Input() done = 0;

  /** Tổng số direct children */
  @Input() total = 0;

  /** SVG dimensions */
  readonly size = 36;
  readonly strokeWidth = 3.5;
  readonly radius = (this.size - this.strokeWidth) / 2; // 16.25
  readonly center = this.size / 2; // 18

  /** Tính percentage: done/total * 100, handle total=0 */
  get percentage(): number {
    if (this.total <= 0) return 0;
    return (this.done / this.total) * 100;
  }

  /** SVG stroke-dasharray: filled + remaining */
  get strokeDashArrayValue(): string {
    const circumference = 2 * Math.PI * this.radius;
    const filled = (this.percentage / 100) * circumference;
    return `${filled} ${circumference - filled}`;
  }
}
