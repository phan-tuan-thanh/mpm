import { Injectable, signal, computed, effect } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class LayoutService {
  // Sidebar state
  readonly isCollapsed = signal<boolean>(
    localStorage.getItem('sidebar_collapsed') === 'true'
  );

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

  toggleSidebar() {
    this.isCollapsed.set(!this.isCollapsed());
  }

  toggleDarkMode() {
    this.isDarkMode.set(!this.isDarkMode());
  }
}
