import { Injectable, signal, computed, effect } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class LayoutService {
  // Sidebar state
  readonly isCollapsed = signal<boolean>(
    localStorage.getItem('sidebar_collapsed') === 'true'
  );

  // Full-bleed layout mode (no padding, no scroll on main — page manages its own)
  readonly fullBleed = signal<boolean>(false);

  // Dark mode state
  readonly isDarkMode = signal<boolean>(
    localStorage.getItem('dark_mode') === 'true' ||
    document.documentElement.classList.contains('dark')
  );

  constructor() {
    // Sync dark mode class with documentElement
    effect(() => {
      if (this.isDarkMode()) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('dark_mode', 'true');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('dark_mode', 'false');
      }
    });

    // Sync sidebar state with localStorage
    effect(() => {
      localStorage.setItem('sidebar_collapsed', String(this.isCollapsed()));
    });
  }

  private readonly lightToDarkMap: Record<string, string> = {
    '#6B7280': '#9CA3AF', // Gray
    '#EF4444': '#F87171', // Red
    '#F97316': '#FB923C', // Orange
    '#F59E0B': '#FBBF24', // Yellow
    '#10B981': '#34D399', // Green
    '#0D9488': '#2DD4BF', // Teal
    '#3B82F6': '#60A5FA', // Blue
    '#6366F1': '#818CF8', // Indigo
    '#8B5CF6': '#A78BFA', // Purple
    '#EC4899': '#F472B6', // Pink
  };

  getAdaptiveColor(color: string): string {
    if (!color) return '#6B7280';
    if (!this.isDarkMode()) return color;
    
    // First try the predefined mapping (case-insensitive)
    const upperColor = color.toUpperCase();
    if (this.lightToDarkMap[upperColor]) {
      return this.lightToDarkMap[upperColor];
    }
    
    // Fallback for custom colors: convert hex to HSL, adjust lightness for dark mode
    try {
      const hex = color.replace('#', '');
      if (hex.length !== 6) return color;
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      
      // Convert to HSL
      let rNorm = r / 255, gNorm = g / 255, bNorm = b / 255;
      const max = Math.max(rNorm, gNorm, bNorm), min = Math.min(rNorm, gNorm, bNorm);
      let h = 0, s = 0, l = (max + min) / 2;
      
      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case rNorm: h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0); break;
          case gNorm: h = (bNorm - rNorm) / d + 2; break;
          case bNorm: h = (rNorm - gNorm) / d + 4; break;
        }
        h /= 6;
      }
      
      // For dark mode: make sure lightness is at least 65% and not more than 85%
      // and desaturate slightly if it's highly saturated
      if (l < 0.65) {
        l = 0.65;
      }
      if (s > 0.8) {
        s = 0.7;
      }
      
      // Convert back to Hex
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      
      const rFinal = Math.round(hue2rgb(p, q, h + 1/3) * 255);
      const gFinal = Math.round(hue2rgb(p, q, h) * 255);
      const bFinal = Math.round(hue2rgb(p, q, h - 1/3) * 255);
      
      const toHex = (x: number) => {
        const str = x.toString(16);
        return str.length === 1 ? '0' + str : str;
      };
      
      return `#${toHex(rFinal)}${toHex(gFinal)}${toHex(bFinal)}`;
    } catch {
      return color;
    }
  }

  getTextColor(bgColor: string): string {
    if (!bgColor) return '#ffffff';
    const color = bgColor.replace('#', '');
    if (color.length !== 6) return '#ffffff';
    const r = parseInt(color.substring(0, 2), 16);
    const g = parseInt(color.substring(2, 4), 16);
    const b = parseInt(color.substring(4, 6), 16);
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 128 ? '#1f2937' : '#ffffff';
  }

  toggleSidebar() {
    this.isCollapsed.set(!this.isCollapsed());
  }

  toggleDarkMode() {
    this.isDarkMode.set(!this.isDarkMode());
  }
}
