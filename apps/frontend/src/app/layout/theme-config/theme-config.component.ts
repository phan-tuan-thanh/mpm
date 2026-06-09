import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SelectButtonModule } from 'primeng/selectbutton';
import { ButtonModule } from 'primeng/button';
import { LayoutService, PresetName, MenuMode } from '../services/layout.service';

@Component({
  selector: 'app-theme-config',
  standalone: true,
  imports: [CommonModule, FormsModule, SelectButtonModule, ButtonModule],
  template: `
    <div class="flex flex-col gap-4">

      <!-- Primary Color -->
      <div>
        <span class="text-sm text-muted-color font-semibold">Primary</span>
        <div class="pt-2 flex gap-2 flex-wrap justify-start">
          @for (color of layoutService.primaryColors(); track color.name) {
            <button
              type="button"
              [title]="color.name"
              (click)="onPrimaryChange(color.name!)"
              class="cursor-pointer w-5 h-5 rounded-full flex shrink-0 items-center justify-center outline-offset-1 shadow"
              [class.outline]="color.name === layoutService.primary()"
              [class.outline-primary]="color.name === layoutService.primary()"
              [style]="{
                'background-color': color.name === 'noir' ? 'var(--p-text-color)' : color.palette?.['500']
              }"
            ></button>
          }
        </div>
      </div>

      <!-- Surface Color -->
      <div>
        <span class="text-sm text-muted-color font-semibold">Surface</span>
        <div class="pt-2 flex gap-2 flex-wrap justify-start">
          @for (surf of layoutService.surfaces; track surf.name) {
            <button
              type="button"
              [title]="surf.name"
              (click)="onSurfaceChange(surf.name!)"
              class="cursor-pointer w-5 h-5 rounded-full flex shrink-0 items-center justify-center outline-offset-1"
              [class.outline]="isSelectedSurface(surf.name!)"
              [class.outline-primary]="isSelectedSurface(surf.name!)"
              [style]="{ 'background-color': surf.palette?.['500'] }"
            ></button>
          }
        </div>
      </div>

      <!-- Presets -->
      <div class="flex flex-col gap-2">
        <span class="text-sm text-muted-color font-semibold">Presets</span>
        <p-selectbutton
          [options]="presetOptions"
          [ngModel]="layoutService.preset()"
          (ngModelChange)="onPresetChange($event)"
          [allowEmpty]="false"
          size="small"
        />
      </div>

      <!-- Menu Mode -->
      <div class="flex flex-col gap-2">
        <span class="text-sm text-muted-color font-semibold">Menu Mode</span>
        <p-selectbutton
          [options]="menuModeOptions"
          [ngModel]="layoutService.menuMode()"
          (ngModelChange)="onMenuModeChange($event)"
          [allowEmpty]="false"
          size="small"
        />
      </div>

    </div>
  `,
  host: {
    class: 'absolute top-13 right-0 w-72 p-4 bg-surface-0 dark:bg-surface-900 border border-surface rounded-border origin-top z-50 shadow-[0px_3px_5px_rgba(0,0,0,0.02),0px_0px_2px_rgba(0,0,0,0.05),0px_1px_4px_rgba(0,0,0,0.08)]'
  }
})
export class ThemeConfigComponent {
  readonly layoutService = inject(LayoutService);

  readonly presetOptions: PresetName[] = ['Aura', 'Lara', 'Nora'];

  readonly menuModeOptions = [
    { label: 'Static',  value: 'static'  },
    { label: 'Overlay', value: 'overlay' },
  ];

  isSelectedSurface(name: string): boolean {
    const selected = this.layoutService.surface();
    if (selected) return selected === name;
    // Default highlight: zinc in dark, slate in light
    return this.layoutService.isDarkMode() ? name === 'zinc' : name === 'slate';
  }

  onPrimaryChange(colorName: string): void {
    this.layoutService.updatePrimary(colorName);
  }

  onSurfaceChange(surfaceName: string): void {
    this.layoutService.updateSurface(surfaceName);
  }

  onPresetChange(presetName: PresetName): void {
    this.layoutService.preset.set(presetName);
  }

  onMenuModeChange(mode: MenuMode): void {
    this.layoutService.menuMode.set(mode);
    // Reset overlay open state when switching modes
    this.layoutService.closeOverlayMenu();
  }
}
