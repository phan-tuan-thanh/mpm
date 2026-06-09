import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { ModuleLifecycleStatus } from '@mpm/shared-types';

export interface StatusConfig {
  label: string;
  color: string;
  icon: string;
  opacity: number;
}

export const STATUS_CONFIG: Record<ModuleLifecycleStatus, StatusConfig> = {
  planning:    { label: 'Đang lên kế hoạch', color: '#8B5CF6', icon: 'pi pi-clipboard',            opacity: 1.0 },
  active:      { label: 'Đang vận hành',      color: '#10B981', icon: 'pi pi-play',                 opacity: 1.0 },
  maintenance: { label: 'Bảo trì',            color: '#F59E0B', icon: 'pi pi-wrench',               opacity: 1.0 },
  suspended:   { label: 'Tạm ngưng',          color: '#6B7280', icon: 'pi pi-pause',                opacity: 1.0 },
  deprecated:  { label: 'Sắp loại bỏ',        color: '#EF4444', icon: 'pi pi-exclamation-triangle', opacity: 0.8 },
  retired:     { label: 'Đã ngừng',           color: '#374151', icon: 'pi pi-lock',                 opacity: 0.6 },
  cancelled:   { label: 'Đã hủy',             color: '#9CA3AF', icon: 'pi pi-times-circle',         opacity: 0.6 },
};

@Component({
  standalone: true,
  selector: 'app-module-status-badge',
  imports: [CommonModule],
  template: `
    <span
      class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
      [style.background-color]="bgColor"
      [style.color]="config.color"
      [style.border]="'1px solid ' + config.color"
      [style.opacity]="config.opacity"
    >
      <i [class]="config.icon + ' text-xs'"></i>
      {{ config.label }}
    </span>
  `,
})
export class ModuleStatusBadgeComponent {
  @Input({ required: true }) status!: ModuleLifecycleStatus;

  get config(): StatusConfig {
    return STATUS_CONFIG[this.status] ?? STATUS_CONFIG['planning'];
  }

  get bgColor(): string {
    return this.config.color + '15';
  }
}
