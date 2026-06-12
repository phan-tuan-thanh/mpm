import { Component, Input } from '@angular/core';
import { TooltipModule } from 'primeng/tooltip';
import { IconDisplayComponent } from '../icon-display/icon-display.component';

/** Dữ liệu tối thiểu để render state — nhận được cả TaskStateRef lẫn ProjectState. */
export interface StateLike {
  name: string;
  color: string;
  group: string;
  icon?: string | null;
}

@Component({
  standalone: true,
  selector: 'app-state-dot',
  imports: [TooltipModule, IconDisplayComponent],
  template: `
    @if (state.icon) {
      <app-icon-display
        [icon]="state.icon"
        class="leading-none flex-shrink-0"
        [style.color]="iconColor"
        [style.font-size.px]="size - 2"
        [pTooltip]="state.name" />
    } @else {
      <span
        class="inline-block rounded-full border-2 flex-shrink-0"
        [style.width.px]="size"
        [style.height.px]="size"
        [style.border-color]="state.color"
        [style.background]="isFilled ? state.color : 'transparent'"
        [pTooltip]="state.name"></span>
    }
  `,
})
export class StateDotComponent {
  @Input({ required: true }) state!: StateLike;
  @Input() size = 14;

  get isFilled(): boolean {
    return this.state.group === 'started' || this.state.group === 'completed';
  }

  get iconColor(): string | null {
    const icon = this.state.icon;
    if (!icon) return null;
    const isPrime = icon.startsWith('pi ') || icon.startsWith('pi-');
    return isPrime ? this.state.color : null;
  }
}
