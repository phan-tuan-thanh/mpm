import { Component, Input, Output, EventEmitter, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { ICON_GROUPS } from './icon-picker.constants';

@Component({
  standalone: true,
  selector: 'app-icon-picker-panel',
  imports: [CommonModule, FormsModule, InputTextModule],
  templateUrl: './icon-picker-panel.component.html',
})
export class IconPickerPanelComponent {
  @Input() value = 'pi pi-flag';
  @Output() valueChange = new EventEmitter<string>();

  readonly search = signal('');

  readonly filteredGroups = computed(() => {
    const q = this.search().toLowerCase();
    if (!q) return ICON_GROUPS;
    return ICON_GROUPS
      .map(g => ({ ...g, icons: g.icons.filter(i => i.icon.toLowerCase().includes(q) || i.name.toLowerCase().includes(q)) }))
      .filter(g => g.icons.length > 0);
  });

  select(icon: string): void {
    this.value = icon;
    this.valueChange.emit(icon);
  }
}
