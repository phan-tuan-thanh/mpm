import { Component, Input, inject } from '@angular/core';
import { TooltipModule } from 'primeng/tooltip';
import { IconDisplayComponent } from '../icon-display/icon-display.component';
import { LayoutService } from '../../../layout/services/layout.service';

/** Dữ liệu tối thiểu để render state — nhận được cả TaskStateRef lẫn ProjectState. */
export interface StateLike {
  name: string;
  colorLight: string;
  colorDark: string;
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
        [style.font-size.px]="renderedSize - 2"
        [pTooltip]="state.name" />
    } @else {
      <span
        class="inline-block rounded-full border-2 flex-shrink-0"
        [style.width.px]="renderedSize"
        [style.height.px]="renderedSize"
        [style.border-color]="color"
        [style.background]="isFilled ? color : 'transparent'"
        [pTooltip]="state.name"></span>
    }
  `,
})
export class StateDotComponent {
  protected readonly layoutService = inject(LayoutService);

  @Input({ required: true }) state!: StateLike;
  @Input() size = 14;

  get renderedSize(): number {
    return this.layoutService.appIconSize() + (this.size - 14);
  }

  get color(): string {
    return this.layoutService.isDarkMode() ? this.state.colorDark : this.state.colorLight;
  }

  get isFilled(): boolean {
    return this.state.group === 'started' || this.state.group === 'completed';
  }

  get iconColor(): string | null {
    const icon = this.state.icon;
    if (!icon) return null;
    const isPrime = icon.startsWith('pi ') || icon.startsWith('pi-');
    return isPrime ? this.color : null;
  }
}
