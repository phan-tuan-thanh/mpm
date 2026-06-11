import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PopoverModule } from 'primeng/popover';
import { ColorPickerPanelComponent } from '../color-picker-panel/color-picker-panel.component';

@Component({
  standalone: true,
  selector: 'app-color-pair-picker',
  imports: [CommonModule, PopoverModule, ColorPickerPanelComponent],
  templateUrl: './color-pair-picker.component.html',
})
export class ColorPairPickerComponent {
  @Input() light = '#9CA3AF';
  @Input() dark = '#6B7280';
  @Output() lightChange = new EventEmitter<string>();
  @Output() darkChange = new EventEmitter<string>();

  onLightChange(color: string): void {
    this.light = color;
    this.lightChange.emit(color);
  }

  onDarkChange(color: string): void {
    this.dark = color;
    this.darkChange.emit(color);
  }
}
