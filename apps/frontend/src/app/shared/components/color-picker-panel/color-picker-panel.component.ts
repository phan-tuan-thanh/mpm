import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TooltipModule } from 'primeng/tooltip';

export const PRESET_COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16', '#22C55E',
  '#10B981', '#14B8A6', '#06B6D4', '#3B82F6', '#6366F1', '#8B5CF6',
  '#A855F7', '#EC4899', '#F43F5E', '#64748B', '#374151', '#111827',
  '#FBBF24', '#34D399', '#60A5FA', '#818CF8', '#C084FC', '#FB7185',
  '#FCA5A5', '#FDBA74', '#FDE047', '#86EFAC', '#93C5FD', '#A5B4FC',
  '#D8B4FE', '#FCA5A5', '#9CA3AF', '#6B7280', '#D1D5DB', '#FFFFFF',
];

@Component({
  standalone: true,
  selector: 'app-color-picker-panel',
  imports: [CommonModule, FormsModule, TooltipModule],
  templateUrl: './color-picker-panel.component.html',
})
export class ColorPickerPanelComponent implements OnInit {
  @Input() value = '#9CA3AF';
  @Output() valueChange = new EventEmitter<string>();

  readonly presets = PRESET_COLORS;
  hexInput = '';

  ngOnInit(): void {
    this.hexInput = this.value.replace('#', '');
  }

  selectPreset(color: string): void {
    this.value = color;
    this.hexInput = color.replace('#', '');
    this.valueChange.emit(color);
  }

  onHexInput(raw: string): void {
    const clean = raw.replace(/[^0-9A-Fa-f]/g, '').slice(0, 6);
    this.hexInput = clean;
    if (clean.length === 6) {
      this.value = '#' + clean.toUpperCase();
      this.valueChange.emit(this.value);
    }
  }

  isValidHex(hex: string): boolean {
    return /^[0-9A-Fa-f]{6}$/.test(hex);
  }
}
