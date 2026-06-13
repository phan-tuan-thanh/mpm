import { Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-icon-display',
  imports: [CommonModule],
  template: `
    @if (isPrimeIcon()) {
      <i [class]="normalizedClass()" [style.font-size.px]="size"></i>
    } @else if (icon) {
      <span class="select-none" [style.font-size.px]="size">{{ icon }}</span>
    }
  `
})
export class IconDisplayComponent {
  @Input({ required: true }) set icon(v: string | null | undefined) {
    this._icon.set(v || '');
  }
  get icon(): string {
    return this._icon();
  }
  private readonly _icon = signal<string>('');

  @Input() size?: number;

  readonly isPrimeIcon = computed(() => {
    const val = this._icon();
    return !!val && (val.startsWith('pi ') || val.startsWith('pi-'));
  });

  readonly normalizedClass = computed(() => {
    const val = this._icon();
    if (!val) return '';
    if (val.startsWith('pi ')) return val;
    if (val.startsWith('pi-')) return `pi ${val}`;
    return '';
  });
}
