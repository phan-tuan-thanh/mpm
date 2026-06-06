import { Component, OnInit, inject, signal, computed, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ColorPickerModule } from 'primeng/colorpicker';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TabsModule } from 'primeng/tabs';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { CheckboxModule } from 'primeng/checkbox';

import { LabelStore } from '../../state/label.store';
import { LabelService } from '../../services/label.service';
import { AuthStore } from '../../../auth/state/auth.store';
import { LayoutService } from '../../../layout/services/layout.service';
import type { Label } from '@mpm/shared-types';

@Component({
  standalone: true,
  selector: 'app-label-manager',
  imports: [
    CommonModule, FormsModule,
    DialogModule, ButtonModule, InputTextModule, ColorPickerModule,
    ConfirmDialogModule, TabsModule, ToastModule, TooltipModule, CheckboxModule,
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './label-manager.component.html',
  styleUrl: './label-manager.component.css',
})
export class LabelManagerComponent implements OnInit {
  readonly labelStore = inject(LabelStore);
  private readonly labelService = inject(LabelService);
  private readonly authStore = inject(AuthStore);
  private readonly confirmService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);
  protected readonly layoutService = inject(LayoutService);

  @Input() projectId = '';
  @Input() workspaceId = '';
  visible = false;

  // Admin check
  protected readonly isAdmin = this.authStore.isAdmin;

  protected readonly colorPresets = [
    'EF4444', // Red
    'F97316', // Orange
    'F59E0B', // Yellow
    '10B981', // Green
    '0D9488', // Teal
    '3B82F6', // Blue
    '6366F1', // Indigo
    '8B5CF6', // Purple
    'EC4899', // Pink
    '6B7280', // Gray
  ];

  protected readonly themes = [
    {
      id: 'classic',
      name: 'Classic',
      presets: [
        { scope: 'EF4444', value: 'F97316', label: 'Red - Orange' },
        { scope: '10B981', value: '0D9488', label: 'Green - Teal' },
        { scope: '3B82F6', value: '6366F1', label: 'Blue - Indigo' },
        { scope: '8B5CF6', value: 'EC4899', label: 'Purple - Pink' },
        { scope: '6B7280', value: '475569', label: 'Gray - Slate' },
      ]
    },
    {
      id: 'pastel',
      name: 'Pastel',
      presets: [
        { scope: 'FCA5A5', value: 'FFEDD5', label: 'Light Red - Orange' },
        { scope: 'A7F3D0', value: 'CCFBF1', label: 'Light Green - Teal' },
        { scope: 'BFDBFE', value: 'E0E7FF', label: 'Light Blue - Indigo' },
        { scope: 'C084FC', value: 'FCE7F3', label: 'Light Purple - Pink' },
        { scope: 'D1D5DB', value: 'F3F4F6', label: 'Light Gray - White' },
      ]
    },
    {
      id: 'neon',
      name: 'Vibrant / Neon',
      presets: [
        { scope: 'FF007F', value: 'FF5E00', label: 'Neon Pink - Orange' },
        { scope: '00FF66', value: '00E5FF', label: 'Neon Green - Cyan' },
        { scope: '0066FF', value: '7F00FF', label: 'Neon Blue - Purple' },
        { scope: 'FFD700', value: 'FF3300', label: 'Vibrant Yellow - Red' },
        { scope: 'E0B0FF', value: 'DA70D6', label: 'Vibrant Mauve - Orchid' },
      ]
    }
  ];

  protected selectedThemeId = signal('classic');

  protected readonly currentPresets = computed(() => {
    const theme = this.themes.find(t => t.id === this.selectedThemeId());
    return theme ? theme.presets : this.themes[0].presets;
  });

  // Workspace labels (loaded separately)
  protected readonly wsLabels = signal<Array<Label & { taskCount: number }>>([]);

  // Computed: filter labels by scope
  protected readonly workspaceLabels = computed(() => this.wsLabels());
  protected readonly projectLabels = computed(() =>
    this.labelStore.labels().filter(l => l.scope === 'project' || !l.scope)
  );

  // Project label editing state
  protected editingId = signal<string | null>(null);
  protected editName = '';
  protected editColor = '';
  protected editIsExclusive = true;
  protected editDescription = '';
  protected newName = '';
  protected newColor = '';
  protected isExclusive = true;
  protected newDescription = '';

  // Workspace label editing state
  protected wsEditingId = signal<string | null>(null);
  protected wsEditName = '';
  protected wsEditColor = '';
  protected wsEditIsExclusive = true;
  protected wsEditDescription = '';
  protected wsNewName = '';
  protected wsNewColor = '';
  protected wsIsExclusive = true;
  protected wsNewDescription = '';

  ngOnInit(): void {
    this.newColor = this.getRandomPresetColor();
    this.wsNewColor = this.getRandomPresetColor();
    if (this.projectId) this.labelStore.loadLabels(this.projectId);
  }

  open(): void {
    this.visible = true;
    this.newColor = this.getRandomPresetColor();
    this.wsNewColor = this.getRandomPresetColor();
    if (this.projectId) this.labelStore.loadLabels(this.projectId);
    if (this.workspaceId) this.loadWorkspaceLabels();
  }

  private loadWorkspaceLabels(): void {
    if (!this.workspaceId) return;
    this.labelService.getWorkspaceLabels(this.workspaceId).subscribe(
      (data) => this.wsLabels.set(data),
    );
  }

  protected isScoped(name: string): boolean {
    return name.includes('::');
  }

  protected getScope(name: string): string {
    return name.split('::')[0].trim();
  }

  protected getValue(name: string): string {
    return name.split('::').slice(1).join('::').trim();
  }

  protected getRandomPresetColor(): string {
    const idx = Math.floor(Math.random() * this.colorPresets.length);
    return this.colorPresets[idx];
  }

  protected isPairSelected(pair: { scope: string; value: string }, isWs: boolean): boolean {
    const currentColor = isWs ? this.wsNewColor : this.newColor;
    return currentColor.toUpperCase() === pair.scope.toUpperCase() || currentColor.toUpperCase() === pair.value.toUpperCase();
  }

  protected selectColorPair(pair: { scope: string; value: string }, isWs: boolean): void {
    const name = isWs ? this.wsNewName.trim() : this.newName.trim();
    if (!name.includes('::')) {
      if (isWs) this.wsNewColor = pair.scope;
      else this.newColor = pair.scope;
      return;
    }
    const scope = name.split('::')[0].trim().toLowerCase();
    const labels = isWs ? this.wsLabels() : this.labelStore.labels();
    const exists = labels.some(l => l.name.includes('::') && l.name.split('::')[0].trim().toLowerCase() === scope);
    if (exists) {
      if (isWs) this.wsNewColor = pair.value;
      else this.newColor = pair.value;
    } else {
      if (isWs) this.wsNewColor = pair.scope;
      else this.newColor = pair.scope;
    }
  }

  protected getScopeColor(name: string, fallbackColor: string): string {
    if (!this.isScoped(name)) return fallbackColor;
    const scope = this.getScope(name).toLowerCase();
    
    // Search in project labels
    const projMatch = this.labelStore.labels().find(l => l.name.includes('::') && l.name.split('::')[0].trim().toLowerCase() === scope);
    if (projMatch) return projMatch.color;

    // Search in workspace labels
    const wsMatch = this.wsLabels().find(l => l.name.includes('::') && l.name.split('::')[0].trim().toLowerCase() === scope);
    if (wsMatch) return wsMatch.color;

    return fallbackColor;
  }

  // --- Project Label Operations ---

  protected async createLabel(): Promise<void> {
    if (!this.newName.trim()) return;
    const result = await this.labelStore.createLabel(this.projectId, {
      name: this.newName.trim(),
      color: `#${this.newColor}`.replace('##', '#'),
      isExclusive: this.isExclusive,
      description: this.newDescription.trim() || null,
    });
    if (result) {
      this.newName = '';
      this.newDescription = '';
      this.newColor = this.getRandomPresetColor();
      this.isExclusive = true;
      this.messageService.add({ severity: 'success', summary: 'Thành công', detail: 'Đã tạo label mới' });
    } else {
      this.messageService.add({ severity: 'error', summary: 'Lỗi', detail: 'Không thể tạo label. Vui lòng thử lại.' });
    }
  }

  protected startEdit(label: Label & { taskCount: number }): void {
    this.editingId.set(label.id);
    this.editName = label.name;
    this.editColor = label.color.replace('#', '');
    this.editIsExclusive = label.isExclusive !== false;
    this.editDescription = label.description ?? '';
  }

  protected async saveEdit(label: Label & { taskCount: number }): Promise<void> {
    const success = await this.labelStore.updateLabel(this.projectId, label.id, {
      name: this.editName.trim() || label.name,
      color: `#${this.editColor}`.replace('##', '#'),
      isExclusive: this.editIsExclusive,
      description: this.editDescription.trim() || null,
    });
    if (success) {
      this.editingId.set(null);
      this.messageService.add({ severity: 'success', summary: 'Thành công', detail: 'Đã cập nhật label' });
    } else {
      this.messageService.add({ severity: 'error', summary: 'Lỗi', detail: 'Không thể cập nhật label. Vui lòng thử lại.' });
    }
  }

  protected cancelEdit(): void {
    this.editingId.set(null);
  }

  protected confirmDelete(label: Label & { taskCount: number }): void {
    this.confirmService.confirm({
      message: `Xóa label "${label.name}" sẽ bỏ label khỏi ${label.taskCount} tasks. Tiếp tục?`,
      header: 'Xác nhận xóa',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Xóa',
      rejectLabel: 'Hủy',
      acceptButtonStyleClass: 'p-button-danger',
      accept: async () => {
        const success = await this.labelStore.deleteLabel(this.projectId, label.id);
        if (success) {
          this.messageService.add({ severity: 'success', summary: 'Thành công', detail: 'Đã xóa label' });
        } else {
          this.messageService.add({ severity: 'error', summary: 'Lỗi', detail: 'Không thể xóa label. Vui lòng thử lại.' });
        }
      },
    });
  }

  // --- Workspace Label Operations (admin only) ---

  protected async createWsLabel(): Promise<void> {
    if (!this.wsNewName.trim() || !this.workspaceId) return;
    const label = await this.labelStore.createWorkspaceLabel(this.workspaceId, {
      name: this.wsNewName.trim(),
      color: `#${this.wsNewColor}`.replace('##', '#'),
      isExclusive: this.wsIsExclusive,
      description: this.wsNewDescription.trim() || null,
    });
    if (label) {
      this.wsLabels.update(prev => [...prev, { ...label, taskCount: 0 }]);
      this.wsNewName = '';
      this.wsNewDescription = '';
      this.wsNewColor = this.getRandomPresetColor();
      this.wsIsExclusive = true;
      this.messageService.add({ severity: 'success', summary: 'Thành công', detail: 'Đã tạo workspace label' });
    } else {
      this.messageService.add({ severity: 'error', summary: 'Lỗi', detail: 'Không thể tạo workspace label. Vui lòng thử lại.' });
    }
  }

  protected startWsEdit(label: Label & { taskCount: number }): void {
    this.wsEditingId.set(label.id);
    this.wsEditName = label.name;
    this.wsEditColor = label.color.replace('#', '');
    this.wsEditIsExclusive = label.isExclusive !== false;
    this.wsEditDescription = label.description ?? '';
  }

  protected async saveWsEdit(label: Label & { taskCount: number }): Promise<void> {
    if (!this.workspaceId) return;
    const newColor = `#${this.wsEditColor}`.replace('##', '#');
    const newName = this.wsEditName.trim() || label.name;
    const success = await this.labelStore.updateWorkspaceLabel(this.workspaceId, label.id, {
      name: newName,
      color: newColor,
      isExclusive: this.wsEditIsExclusive,
      description: this.wsEditDescription.trim() || null,
    });
    if (success) {
      this.wsLabels.update(prev =>
        prev.map(l => {
          if (l.id === label.id) {
            return { ...l, name: newName, color: newColor, isExclusive: this.wsEditIsExclusive, description: this.wsEditDescription.trim() || null };
          }
          // Propagate isExclusive update to same-scope labels locally
          if (newName.includes('::') && l.name.includes('::') && l.name.split('::')[0].trim().toLowerCase() === newName.split('::')[0].trim().toLowerCase()) {
            return { ...l, isExclusive: this.wsEditIsExclusive };
          }
          return l;
        })
      );
      this.wsEditingId.set(null);
      this.messageService.add({ severity: 'success', summary: 'Thành công', detail: 'Đã cập nhật workspace label' });
    } else {
      this.messageService.add({ severity: 'error', summary: 'Lỗi', detail: 'Không thể cập nhật workspace label. Vui lòng thử lại.' });
    }
  }

  protected cancelWsEdit(): void {
    this.wsEditingId.set(null);
  }

  protected confirmDeleteWsLabel(label: Label & { taskCount: number }): void {
    this.confirmService.confirm({
      message: `Label này đang dùng trong ${label.taskCount} tasks. Xóa sẽ bỏ label khỏi tất cả.`,
      header: 'Xác nhận xóa workspace label',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Xóa',
      rejectLabel: 'Hủy',
      acceptButtonStyleClass: 'p-button-danger',
      accept: async () => {
        const success = await this.labelStore.deleteWorkspaceLabel(this.workspaceId, label.id);
        if (success) {
          this.wsLabels.update(prev => prev.filter(l => l.id !== label.id));
          this.messageService.add({ severity: 'success', summary: 'Thành công', detail: 'Đã xóa workspace label' });
        } else {
          this.messageService.add({ severity: 'error', summary: 'Lỗi', detail: 'Không thể xóa workspace label. Vui lòng thử lại.' });
        }
      },
    });
  }
}
