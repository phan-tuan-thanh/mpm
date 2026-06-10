import { Component, Input } from '@angular/core';

/**
 * Represents a parsed state value from activity oldValue/newValue JSON.
 */
export interface StateTransitionValue {
  id?: string;
  name: string;
  color: string;
}

/**
 * StateTransitionComponent — Visual from→to state badge with arrow.
 *
 * Renders two color-coded state badges with an arrow (→) between them,
 * using the project-defined state colors. Each badge shows a colored dot
 * followed by the state name, with background at 10% opacity of the state color.
 *
 * Validates: Requirements 5.5, 5.6
 */
@Component({
  standalone: true,
  selector: 'app-state-transition',
  template: `
    <span class="inline-flex items-center gap-1.5 flex-wrap">
      <!-- From State Badge -->
      @if (fromState) {
        <span
          class="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
          [style.background-color]="fromState.color + '1A'"
          [style.color]="fromState.color"
        >
          <span
            class="w-2 h-2 rounded-full inline-block shrink-0"
            [style.background-color]="fromState.color"
          ></span>
          {{ fromState.name }}
        </span>
      }

      <!-- Arrow -->
      <span class="text-xs text-gray-400 dark:text-surface-500 select-none" aria-hidden="true">→</span>

      <!-- To State Badge -->
      @if (toState) {
        <span
          class="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
          [style.background-color]="toState.color + '1A'"
          [style.color]="toState.color"
        >
          <span
            class="w-2 h-2 rounded-full inline-block shrink-0"
            [style.background-color]="toState.color"
          ></span>
          {{ toState.name }}
        </span>
      }
    </span>
  `,
})
export class StateTransitionComponent {
  /** Trạng thái cũ (from) với tên và mã màu */
  @Input() fromState: StateTransitionValue | null = null;

  /** Trạng thái mới (to) với tên và mã màu */
  @Input() toState: StateTransitionValue | null = null;
}
