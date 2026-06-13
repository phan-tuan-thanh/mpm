import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SelectButtonModule } from 'primeng/selectbutton';
import { ButtonModule } from 'primeng/button';
import { SliderModule } from 'primeng/slider';
import { LayoutService, PresetName, MenuMode } from '../services/layout.service';
import { StateDotComponent } from '../../shared/components/state-dot/state-dot.component';
import { IconDisplayComponent } from '../../shared/components/icon-display/icon-display.component';

@Component({
  selector: 'app-theme-config',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    SelectButtonModule,
    ButtonModule,
    SliderModule,
    StateDotComponent,
    IconDisplayComponent,
  ],
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

      <!-- Icon Settings -->
      <div class="flex flex-col gap-3 pt-3 border-t border-surface-200 dark:border-surface-800">
        <span class="text-sm text-muted-color font-semibold">Icon Size Settings</span>
        
        <!-- Menu Icon Size -->
        <div class="flex flex-col gap-1">
          <div class="flex justify-between items-center text-xs text-muted-color">
            <span>Menu Icons</span>
            <span class="font-bold">{{ layoutService.menuIconSize() }}px</span>
          </div>
          <p-slider 
            [min]="14" 
            [max]="32" 
            [ngModel]="layoutService.menuIconSize()" 
            (ngModelChange)="layoutService.menuIconSize.set($event)" 
            class="w-full mt-1"
          />
        </div>

        <!-- App Icon Size -->
        <div class="flex flex-col gap-1 mt-1">
          <div class="flex justify-between items-center text-xs text-muted-color">
            <span>App/Task Icons</span>
            <span class="font-bold">{{ layoutService.appIconSize() }}px</span>
          </div>
          <p-slider 
            [min]="16" 
            [max]="32" 
            [ngModel]="layoutService.appIconSize()" 
            (ngModelChange)="layoutService.appIconSize.set($event)" 
            class="w-full mt-1"
          />
        </div>

        <!-- Live Preview Box -->
        <div class="mt-1 p-2.5 rounded-lg border border-surface border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-950 flex flex-col gap-2 select-none">
          <span class="text-[9px] font-bold text-gray-400 dark:text-surface-500 uppercase tracking-wider">Xem trước (Live Preview)</span>
          
          <!-- Sample Menu Preview -->
          <div class="flex items-center gap-3 px-2 py-1.5 rounded bg-surface-0 dark:bg-surface-900 border border-surface text-xs font-semibold text-gray-700 dark:text-surface-200">
            <i class="pi pi-th-large" [style.font-size.px]="layoutService.menuIconSize()"></i>
            <span>Dự án (Menu Item)</span>
          </div>

          <!-- Sample Task/State Dot Preview -->
          <div class="flex items-center gap-2.5 px-2 py-1.5 rounded bg-surface-0 dark:bg-surface-900 border border-surface text-xs text-gray-700 dark:text-surface-200">
            <app-state-dot [state]="previewState" [size]="14" />
            <app-icon-display [icon]="'🚩'" [size]="layoutService.appIconSize() - 2"></app-icon-display>
            <span class="truncate">Sample Task Title</span>
          </div>
        </div>
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

  readonly previewState = {
    name: 'Todo',
    colorLight: '#3B82F6',
    colorDark: '#60A5FA',
    group: 'unstarted',
    icon: null
  };

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
