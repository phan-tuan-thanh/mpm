import { Injectable, signal, computed, effect, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { $t, updatePreset, updateSurfacePalette } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';
import Lara from '@primeuix/themes/lara';
import Nora from '@primeuix/themes/nora';

export type PresetName = 'Aura' | 'Lara' | 'Nora';
export type MenuMode = 'static' | 'overlay';

const presets = { Aura, Lara, Nora } as const;

interface SurfacePalette {
  name?: string;
  palette?: {
    0?: string; 50?: string; 100?: string; 200?: string; 300?: string;
    400?: string; 500?: string; 600?: string; 700?: string; 800?: string;
    900?: string; 950?: string;
  };
}

const STORAGE_KEY = 'mpm-layout-config';

interface StoredConfig {
  darkMode?: boolean;
  preset?: PresetName;
  primary?: string;
  surface?: string | null;
  menuMode?: MenuMode;
  sidebarCollapsed?: boolean;
}

const defaultConfig: Required<StoredConfig> = {
  darkMode: false,
  preset: 'Aura',
  primary: 'emerald',
  surface: null,
  menuMode: 'static',
  sidebarCollapsed: false,
};

@Injectable({
  providedIn: 'root',
})
export class LayoutService {
  private readonly platformId = inject(PLATFORM_ID);

  private loadStored(): Required<StoredConfig> {
    if (!isPlatformBrowser(this.platformId)) return defaultConfig;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return { ...defaultConfig, ...JSON.parse(raw) };
    } catch {}
    // Migrate from legacy separate keys
    const legacyDark = localStorage.getItem('dark_mode') === 'true';
    const legacyCollapsed = localStorage.getItem('sidebar_collapsed') === 'true';
    return { ...defaultConfig, darkMode: legacyDark, sidebarCollapsed: legacyCollapsed };
  }

  // ── Core signals ──────────────────────────────────────────────────────────
  readonly isDarkMode = signal<boolean>(false);
  readonly preset = signal<PresetName>('Aura');
  readonly primary = signal<string>('emerald');
  readonly surface = signal<string | null>(null);
  readonly menuMode = signal<MenuMode>('static');
  readonly isCollapsed = signal<boolean>(false);
  readonly isOverlayOpen = signal<boolean>(false);
  readonly fullBleed = signal<boolean>(false);
  readonly isMobile = signal<boolean>(false);

  // On mobile (<768px) always use overlay regardless of stored menuMode
  readonly effectiveMenuMode = computed<MenuMode>(() =>
    this.isMobile() ? 'overlay' : this.menuMode()
  );

  readonly isSidebarVisible = computed(
    () => this.effectiveMenuMode() === 'static' || this.isOverlayOpen()
  );

  // ── Surface palette definitions ───────────────────────────────────────────
  readonly surfaces: SurfacePalette[] = [
    { name: 'slate',   palette: { 0: '#ffffff', 50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0', 300: '#cbd5e1', 400: '#94a3b8', 500: '#64748b', 600: '#475569', 700: '#334155', 800: '#1e293b', 900: '#0f172a', 950: '#020617' } },
    { name: 'gray',    palette: { 0: '#ffffff', 50: '#f9fafb', 100: '#f3f4f6', 200: '#e5e7eb', 300: '#d1d5db', 400: '#9ca3af', 500: '#6b7280', 600: '#4b5563', 700: '#374151', 800: '#1f2937', 900: '#111827', 950: '#030712' } },
    { name: 'zinc',    palette: { 0: '#ffffff', 50: '#fafafa', 100: '#f4f4f5', 200: '#e4e4e7', 300: '#d4d4d8', 400: '#a1a1aa', 500: '#71717a', 600: '#52525b', 700: '#3f3f46', 800: '#27272a', 900: '#18181b', 950: '#09090b' } },
    { name: 'neutral', palette: { 0: '#ffffff', 50: '#fafafa', 100: '#f5f5f5', 200: '#e5e5e5', 300: '#d4d4d4', 400: '#a3a3a3', 500: '#737373', 600: '#525252', 700: '#404040', 800: '#262626', 900: '#171717', 950: '#0a0a0a' } },
    { name: 'stone',   palette: { 0: '#ffffff', 50: '#fafaf9', 100: '#f5f5f4', 200: '#e7e5e4', 300: '#d6d3d1', 400: '#a8a29e', 500: '#78716c', 600: '#57534e', 700: '#44403c', 800: '#292524', 900: '#1c1917', 950: '#0c0a09' } },
    { name: 'soho',    palette: { 0: '#ffffff', 50: '#ececec', 100: '#dedfdf', 200: '#c4c4c6', 300: '#adaeb0', 400: '#97979b', 500: '#7f8084', 600: '#6a6b70', 700: '#55565b', 800: '#3f4046', 900: '#2c2c34', 950: '#16161d' } },
    { name: 'viva',    palette: { 0: '#ffffff', 50: '#f3f3f3', 100: '#e7e7e8', 200: '#cfd0d0', 300: '#b7b8b9', 400: '#9fa1a1', 500: '#87898a', 600: '#6e7173', 700: '#565a5b', 800: '#3e4244', 900: '#262b2c', 950: '#0e1315' } },
    { name: 'ocean',   palette: { 0: '#ffffff', 50: '#fbfcfc', 100: '#F7F9F8', 200: '#EFF3F2', 300: '#DADEDD', 400: '#B1B7B6', 500: '#828787', 600: '#5F7274', 700: '#415B61', 800: '#29444E', 900: '#183240', 950: '#0c1920' } },
  ];

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      const stored = this.loadStored();
      this.isDarkMode.set(stored.darkMode);
      this.preset.set(stored.preset);
      this.primary.set(stored.primary);
      this.surface.set(stored.surface ?? null);
      this.menuMode.set(stored.menuMode);
      this.isCollapsed.set(stored.sidebarCollapsed);

      // Mobile detection — service is app-scoped so no cleanup needed
      const checkMobile = () => this.isMobile.set(window.innerWidth < 768);
      checkMobile();
      window.addEventListener('resize', checkMobile);
    }

    // Sync .dark class on <html>
    effect(() => {
      const dark = this.isDarkMode();
      if (!isPlatformBrowser(this.platformId)) return;
      if (dark) document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
      this.saveConfig();
    });

    // Persist sidebar/menu changes
    effect(() => {
      void this.menuMode();
      void this.isCollapsed();
      if (isPlatformBrowser(this.platformId)) this.saveConfig();
    });

    // Apply PrimeNG theme when preset / primary / surface change
    effect(() => {
      const presetName = this.preset();
      const primaryName = this.primary();
      const surfaceName = this.surface();
      if (!isPlatformBrowser(this.platformId)) return;
      const presetObj = presets[presetName];
      const surfacePalette = this.surfaces.find(s => s.name === surfaceName)?.palette;
      $t()
        .preset(presetObj)
        .preset(this.buildPresetExt(presetName, primaryName))
        .surfacePalette(surfacePalette)
        .use({ useDefaultOptions: true });
      this.saveConfig();
    });
  }

  // ── Primary color palettes ─────────────────────────────────────────────────
  readonly primaryColors = computed<SurfacePalette[]>(() => {
    const presetPalette = (presets[this.preset()] as any).primitive as Record<string, SurfacePalette['palette']>;
    const colorNames = ['emerald', 'green', 'lime', 'orange', 'amber', 'yellow', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose'];
    const palettes: SurfacePalette[] = [{ name: 'noir', palette: {} }];
    colorNames.forEach(c => palettes.push({ name: c, palette: presetPalette?.[c] }));
    return palettes;
  });

  // ── Semantic preset extension (matches sakai-ng logic) ────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  buildPresetExt(presetName: PresetName, primaryName: string): any {
    const color = this.primaryColors().find(c => c.name === primaryName) ?? {};

    if (primaryName === 'noir') {
      return {
        semantic: {
          primary: { 50: '{surface.50}', 100: '{surface.100}', 200: '{surface.200}', 300: '{surface.300}', 400: '{surface.400}', 500: '{surface.500}', 600: '{surface.600}', 700: '{surface.700}', 800: '{surface.800}', 900: '{surface.900}', 950: '{surface.950}' },
          colorScheme: {
            light: { primary: { color: '{primary.950}', contrastColor: '#ffffff', hoverColor: '{primary.800}', activeColor: '{primary.700}' }, highlight: { background: '{primary.950}', focusBackground: '{primary.700}', color: '#ffffff', focusColor: '#ffffff' } },
            dark:  { primary: { color: '{primary.50}',  contrastColor: '{primary.950}', hoverColor: '{primary.200}', activeColor: '{primary.300}' }, highlight: { background: '{primary.50}', focusBackground: '{primary.300}', color: '{primary.950}', focusColor: '{primary.950}' } },
          },
        },
      };
    }

    if (presetName === 'Nora') {
      return {
        semantic: {
          primary: color.palette,
          colorScheme: {
            light: { primary: { color: '{primary.600}', contrastColor: '#ffffff', hoverColor: '{primary.700}', activeColor: '{primary.800}' }, highlight: { background: '{primary.600}', focusBackground: '{primary.700}', color: '#ffffff', focusColor: '#ffffff' } },
            dark:  { primary: { color: '{primary.500}', contrastColor: '{surface.900}', hoverColor: '{primary.400}', activeColor: '{primary.300}' }, highlight: { background: '{primary.500}', focusBackground: '{primary.400}', color: '{surface.900}', focusColor: '{surface.900}' } },
          },
        },
      };
    }

    return {
      semantic: {
        primary: color.palette,
        colorScheme: {
          light: { primary: { color: '{primary.500}', contrastColor: '#ffffff', hoverColor: '{primary.600}', activeColor: '{primary.700}' }, highlight: { background: '{primary.50}', focusBackground: '{primary.100}', color: '{primary.700}', focusColor: '{primary.800}' } },
          dark:  { primary: { color: '{primary.400}', contrastColor: '{surface.900}', hoverColor: '{primary.300}', activeColor: '{primary.200}' }, highlight: { background: 'color-mix(in srgb, {primary.400}, transparent 84%)', focusBackground: 'color-mix(in srgb, {primary.400}, transparent 76%)', color: 'rgba(255,255,255,.87)', focusColor: 'rgba(255,255,255,.87)' } },
        },
      },
    };
  }

  // ── Public actions ─────────────────────────────────────────────────────────
  toggleDarkMode(): void {
    this.isDarkMode.set(!this.isDarkMode());
  }

  toggleSidebar(): void {
    if (this.effectiveMenuMode() === 'overlay') {
      this.isOverlayOpen.update(v => !v);
    } else {
      this.isCollapsed.update(v => !v);
    }
  }

  closeOverlayMenu(): void {
    this.isOverlayOpen.set(false);
  }

  updatePrimary(colorName: string): void {
    this.primary.set(colorName);
    updatePreset(this.buildPresetExt(this.preset(), colorName));
  }

  updateSurface(surfaceName: string | null): void {
    this.surface.set(surfaceName);
    const palette = this.surfaces.find(s => s.name === surfaceName)?.palette;
    if (palette) updateSurfacePalette(palette);
  }

  // ── Label color helpers (unchanged from original) ─────────────────────────
  private readonly lightToDarkMap: Record<string, string> = {
    '#6B7280': '#9CA3AF', '#EF4444': '#F87171', '#F97316': '#FB923C',
    '#F59E0B': '#FBBF24', '#10B981': '#34D399', '#0D9488': '#2DD4BF',
    '#3B82F6': '#60A5FA', '#6366F1': '#818CF8', '#8B5CF6': '#A78BFA',
    '#EC4899': '#F472B6',
  };

  getAdaptiveColor(color: string): string {
    if (!color) return '#6B7280';
    if (!this.isDarkMode()) return color;
    const upper = color.toUpperCase();
    if (this.lightToDarkMap[upper]) return this.lightToDarkMap[upper];
    try {
      const hex = color.replace('#', '');
      if (hex.length !== 6) return color;
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      let rN = r / 255, gN = g / 255, bN = b / 255;
      const max = Math.max(rN, gN, bN), min = Math.min(rN, gN, bN);
      let h = 0, s = 0, l = (max + min) / 2;
      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case rN: h = (gN - bN) / d + (gN < bN ? 6 : 0); break;
          case gN: h = (bN - rN) / d + 2; break;
          case bN: h = (rN - gN) / d + 4; break;
        }
        h /= 6;
      }
      if (l < 0.65) l = 0.65;
      if (s > 0.8) s = 0.7;
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1; if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };
      const q2 = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p2 = 2 * l - q2;
      const toHex = (x: number) => { const str = Math.round(x * 255).toString(16); return str.length === 1 ? '0' + str : str; };
      return `#${toHex(hue2rgb(p2, q2, h + 1 / 3))}${toHex(hue2rgb(p2, q2, h))}${toHex(hue2rgb(p2, q2, h - 1 / 3))}`;
    } catch { return color; }
  }

  getTextColor(bgColor: string): string {
    if (!bgColor) return '#ffffff';
    const c = bgColor.replace('#', '');
    if (c.length !== 6) return '#ffffff';
    const r = parseInt(c.substring(0, 2), 16);
    const g = parseInt(c.substring(2, 4), 16);
    const b = parseInt(c.substring(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 >= 128 ? '#1f2937' : '#ffffff';
  }

  private saveConfig(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        darkMode: this.isDarkMode(),
        preset: this.preset(),
        primary: this.primary(),
        surface: this.surface(),
        menuMode: this.menuMode(),
        sidebarCollapsed: this.isCollapsed(),
      }));
    } catch {}
  }
}
