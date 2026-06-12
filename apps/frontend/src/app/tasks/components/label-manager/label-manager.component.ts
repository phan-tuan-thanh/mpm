import { Component, OnInit, inject, signal, computed, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TabsModule } from 'primeng/tabs';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { CheckboxModule } from 'primeng/checkbox';
import { PopoverModule } from 'primeng/popover';

import { LabelStore } from '../../state/label.store';
import { LabelService } from '../../services/label.service';
import { AuthStore } from '../../../auth/state/auth.store';
import { LayoutService } from '../../../layout/services/layout.service';
import { ColorPickerPanelComponent } from '../../../shared/components/color-picker-panel/color-picker-panel.component';
import type { Label } from '@mpm/shared-types';

@Component({
  standalone: true,
  selector: 'app-label-manager',
  imports: [
    CommonModule, FormsModule,
    DialogModule, ButtonModule, InputTextModule, PopoverModule,
    ConfirmDialogModule, TabsModule, ToastModule, TooltipModule, CheckboxModule,
    ColorPickerPanelComponent,
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

  readonly presetPairs = [
    { light: '#EF4444', dark: '#F87171' }, // Red
    { light: '#F97316', dark: '#FB923C' }, // Orange
    { light: '#F59E0B', dark: '#FBBF24' }, // Amber
    { light: '#10B981', dark: '#34D399' }, // Emerald
    { light: '#0D9488', dark: '#2DD4BF' }, // Teal
    { light: '#3B82F6', dark: '#60A5FA' }, // Blue
    { light: '#6366F1', dark: '#818CF8' }, // Indigo
    { light: '#8B5CF6', dark: '#A78BFA' }, // Violet
    { light: '#EC4899', dark: '#F472B6' }, // Pink
    { light: '#6B7280', dark: '#9CA3AF' }  // Gray
  ];

  getPresetGradient(light: string, dark: string): string {
    return `linear-gradient(135deg, ${light} 50%, ${dark} 50%)`;
  }

  protected getRandomPresetPair(): { light: string; dark: string } {
    const idx = Math.floor(Math.random() * this.presetPairs.length);
    return this.presetPairs[idx];
  }

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
  protected readonly editColorLight = signal('#9CA3AF');
  protected readonly editColorDark = signal('#6B7280');
  protected readonly showCustomEditColors = signal(false);
  protected editIsExclusive = true;
  protected editDescription = '';
  protected newName = '';
  protected readonly newColorLight = signal('#9CA3AF');
  protected readonly newColorDark = signal('#6B7280');
  protected readonly showCustomAddColors = signal(false);
  protected isExclusive = true;
  protected newDescription = '';

  // Workspace label editing state
  protected wsEditingId = signal<string | null>(null);
  protected wsEditName = '';
  protected readonly wsEditColorLight = signal('#9CA3AF');
  protected readonly wsEditColorDark = signal('#6B7280');
  protected readonly showCustomWsEditColors = signal(false);
  protected wsEditIsExclusive = true;
  protected wsEditDescription = '';
  protected wsNewName = '';
  protected readonly wsNewColorLight = signal('#9CA3AF');
  protected readonly wsNewColorDark = signal('#6B7280');
  protected readonly showCustomWsAddColors = signal(false);
  protected wsIsExclusive = true;
  protected wsNewDescription = '';

  // Filter
  protected projSearch = signal('');
  protected wsSearch = signal('');
  protected projFilter = signal<'all'|'regular'|'scoped'|'single'|'multi'>('all');
  protected wsFilter   = signal<'all'|'regular'|'scoped'|'single'|'multi'>('all');

  readonly filterChips: { label: string; value: 'all'|'regular'|'scoped'|'single'|'multi' }[] = [
    { label: 'Tất cả', value: 'all' },
    { label: 'Thường',  value: 'regular' },
    { label: 'Scoped',  value: 'scoped' },
    { label: 'Single',  value: 'single' },
    { label: 'Multi',   value: 'multi' },
  ];

  readonly filteredProjectLabels = computed(() => {
    const q = this.projSearch().toLowerCase();
    const f = this.projFilter();
    return this.projectLabels().filter(l => {
      if (q && !l.name.toLowerCase().includes(q) && !(l.description ?? '').toLowerCase().includes(q)) return false;
      const scoped = l.name.includes('::');
      if (f === 'regular') return !scoped;
      if (f === 'scoped')  return scoped;
      if (f === 'single')  return scoped && l.isExclusive !== false;
      if (f === 'multi')   return scoped && l.isExclusive === false;
      return true;
    });
  });

  readonly filteredWsLabels = computed(() => {
    const q = this.wsSearch().toLowerCase();
    const f = this.wsFilter();
    return this.workspaceLabels().filter(l => {
      if (q && !l.name.toLowerCase().includes(q) && !(l.description ?? '').toLowerCase().includes(q)) return false;
      const scoped = l.name.includes('::');
      if (f === 'regular') return !scoped;
      if (f === 'scoped')  return scoped;
      if (f === 'single')  return scoped && l.isExclusive !== false;
      if (f === 'multi')   return scoped && l.isExclusive === false;
      return true;
    });
  });

  protected setProjSearch(val: string): void { this.projSearch.set(val); this.projPage.set(0); this.projSelected.set(new Set()); }
  protected setWsSearch(val: string): void { this.wsSearch.set(val); this.wsPage.set(0); this.wsSelected.set(new Set()); }
  protected setProjFilter(val: 'all'|'regular'|'scoped'|'single'|'multi'): void { this.projFilter.set(val); this.projPage.set(0); this.projSelected.set(new Set()); }
  protected setWsFilter(val: 'all'|'regular'|'scoped'|'single'|'multi'): void { this.wsFilter.set(val); this.wsPage.set(0); this.wsSelected.set(new Set()); }

  // Pagination
  readonly PAGE_SIZE = 8;
  readonly projPage = signal(0);
  readonly wsPage = signal(0);

  readonly paginatedProjectLabels = computed(() => {
    const all = this.filteredProjectLabels();
    const start = this.projPage() * this.PAGE_SIZE;
    return all.slice(start, start + this.PAGE_SIZE);
  });

  readonly paginatedWsLabels = computed(() => {
    const all = this.filteredWsLabels();
    const start = this.wsPage() * this.PAGE_SIZE;
    return all.slice(start, start + this.PAGE_SIZE);
  });

  readonly projTotalPages = computed(() => Math.max(1, Math.ceil(this.filteredProjectLabels().length / this.PAGE_SIZE)));
  readonly wsTotalPages = computed(() => Math.max(1, Math.ceil(this.filteredWsLabels().length / this.PAGE_SIZE)));

  protected projEndIdx(): number { return Math.min((this.projPage() + 1) * this.PAGE_SIZE, this.filteredProjectLabels().length); }
  protected wsEndIdx(): number { return Math.min((this.wsPage() + 1) * this.PAGE_SIZE, this.filteredWsLabels().length); }
  protected pageRange(total: number): number[] { return Array.from({ length: total }, (_, i) => i); }

  // Multi-select
  protected projSelected = signal<Set<string>>(new Set());
  protected wsSelected = signal<Set<string>>(new Set());

  protected isProjSelected(id: string): boolean { return this.projSelected().has(id); }
  protected isWsSelected(id: string): boolean { return this.wsSelected().has(id); }

  readonly projAllPageSelected = computed(() => {
    const page = this.paginatedProjectLabels();
    return page.length > 0 && page.every(l => this.projSelected().has(l.id));
  });

  readonly wsAllPageSelected = computed(() => {
    const page = this.paginatedWsLabels();
    return page.length > 0 && page.every(l => this.wsSelected().has(l.id));
  });

  protected toggleProjSelect(id: string): void {
    this.projSelected.update(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  protected toggleWsSelect(id: string): void {
    this.wsSelected.update(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  protected toggleProjSelectAll(): void {
    const page = this.paginatedProjectLabels();
    const allSel = this.projAllPageSelected();
    this.projSelected.update(s => { const n = new Set(s); allSel ? page.forEach(l => n.delete(l.id)) : page.forEach(l => n.add(l.id)); return n; });
  }
  protected toggleWsSelectAll(): void {
    const page = this.paginatedWsLabels();
    const allSel = this.wsAllPageSelected();
    this.wsSelected.update(s => { const n = new Set(s); allSel ? page.forEach(l => n.delete(l.id)) : page.forEach(l => n.add(l.id)); return n; });
  }

  protected clearProjSelection(): void { this.projSelected.set(new Set()); }
  protected clearWsSelection(): void { this.wsSelected.set(new Set()); }

  ngOnInit(): void {
    const pair = this.getRandomPresetPair();
    this.newColorLight.set(pair.light);
    this.newColorDark.set(pair.dark);

    const wsPair = this.getRandomPresetPair();
    this.wsNewColorLight.set(wsPair.light);
    this.wsNewColorDark.set(wsPair.dark);

    if (this.projectId) this.labelStore.loadLabels(this.projectId);
  }

  open(): void {
    this.visible = true;
    this.projPage.set(0);
    this.wsPage.set(0);
    this.projSearch.set('');
    this.wsSearch.set('');
    this.projFilter.set('all');
    this.wsFilter.set('all');
    this.projSelected.set(new Set());
    this.wsSelected.set(new Set());

    const pair = this.getRandomPresetPair();
    this.newColorLight.set(pair.light);
    this.newColorDark.set(pair.dark);

    const wsPair = this.getRandomPresetPair();
    this.wsNewColorLight.set(wsPair.light);
    this.wsNewColorDark.set(wsPair.dark);

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

  protected getScopeColor(name: string, isDark: boolean, fallbackColor: string): string {
    if (!this.isScoped(name)) return fallbackColor;
    const scope = this.getScope(name).toLowerCase();
    
    // Search in project labels
    const projMatch = this.labelStore.labels().find(l => l.name.includes('::') && l.name.split('::')[0].trim().toLowerCase() === scope);
    if (projMatch) return isDark ? projMatch.colorDark : projMatch.colorLight;

    // Search in workspace labels
    const wsMatch = this.wsLabels().find(l => l.name.includes('::') && l.name.split('::')[0].trim().toLowerCase() === scope);
    if (wsMatch) return isDark ? wsMatch.colorDark : wsMatch.colorLight;

    return fallbackColor;
  }

  // --- Project Label Operations ---

  protected async createLabel(): Promise<void> {
    if (!this.newName.trim()) return;
    const result = await this.labelStore.createLabel(this.projectId, {
      name: this.newName.trim(),
      colorLight: this.newColorLight(),
      colorDark: this.newColorDark(),
      isExclusive: this.isExclusive,
      description: this.newDescription.trim() || null,
    });
    if (result) {
      this.newName = '';
      this.newDescription = '';
      const pair = this.getRandomPresetPair();
      this.newColorLight.set(pair.light);
      this.newColorDark.set(pair.dark);
      this.isExclusive = true;
      this.messageService.add({ severity: 'success', summary: 'Thành công', detail: 'Đã tạo label mới' });
    } else {
      this.messageService.add({ severity: 'error', summary: 'Lỗi', detail: 'Không thể tạo label. Vui lòng thử lại.' });
    }
  }

  protected startEdit(label: Label & { taskCount: number }): void {
    this.editingId.set(label.id);
    this.editName = label.name;
    this.editColorLight.set(label.colorLight);
    this.editColorDark.set(label.colorDark);
    this.editIsExclusive = label.isExclusive !== false;
    this.editDescription = label.description ?? '';
    this.showCustomEditColors.set(false);
  }

  protected async saveEdit(label: Label & { taskCount: number }): Promise<void> {
    const success = await this.labelStore.updateLabel(this.projectId, label.id, {
      name: this.editName.trim() || label.name,
      colorLight: this.editColorLight(),
      colorDark: this.editColorDark(),
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

  protected confirmBulkDeleteProj(): void {
    const ids = Array.from(this.projSelected());
    if (!ids.length) return;
    this.confirmService.confirm({
      message: `Xóa ${ids.length} label đã chọn? Labels sẽ bị bỏ khỏi tất cả tasks liên quan.`,
      header: 'Xóa nhiều labels',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: `Xóa ${ids.length} labels`,
      rejectLabel: 'Hủy',
      acceptButtonStyleClass: 'p-button-danger',
      accept: async () => {
        let ok = 0;
        for (const id of ids) {
          const success = await this.labelStore.deleteLabel(this.projectId, id);
          if (success) ok++;
        }
        this.projSelected.set(new Set());
        this.messageService.add({ severity: 'success', summary: 'Thành công', detail: `Đã xóa ${ok}/${ids.length} labels` });
      },
    });
  }

  // --- Workspace Label Operations (admin only) ---

  protected async createWsLabel(): Promise<void> {
    if (!this.wsNewName.trim() || !this.workspaceId) return;
    const label = await this.labelStore.createWorkspaceLabel(this.workspaceId, {
      name: this.wsNewName.trim(),
      colorLight: this.wsNewColorLight(),
      colorDark: this.wsNewColorDark(),
      isExclusive: this.wsIsExclusive,
      description: this.wsNewDescription.trim() || null,
    });
    if (label) {
      this.wsLabels.update(prev => [...prev, { ...label, taskCount: 0 }]);
      this.wsNewName = '';
      this.wsNewDescription = '';
      const pair = this.getRandomPresetPair();
      this.wsNewColorLight.set(pair.light);
      this.wsNewColorDark.set(pair.dark);
      this.wsIsExclusive = true;
      this.messageService.add({ severity: 'success', summary: 'Thành công', detail: 'Đã tạo workspace label' });
    } else {
      this.messageService.add({ severity: 'error', summary: 'Lỗi', detail: 'Không thể tạo workspace label. Vui lòng thử lại.' });
    }
  }

  protected startWsEdit(label: Label & { taskCount: number }): void {
    this.wsEditingId.set(label.id);
    this.wsEditName = label.name;
    this.wsEditColorLight.set(label.colorLight);
    this.wsEditColorDark.set(label.colorDark);
    this.wsEditIsExclusive = label.isExclusive !== false;
    this.wsEditDescription = label.description ?? '';
    this.showCustomWsEditColors.set(false);
  }

  protected async saveWsEdit(label: Label & { taskCount: number }): Promise<void> {
    if (!this.workspaceId) return;
    const colorLight = this.wsEditColorLight();
    const colorDark = this.wsEditColorDark();
    const newName = this.wsEditName.trim() || label.name;
    const success = await this.labelStore.updateWorkspaceLabel(this.workspaceId, label.id, {
      name: newName,
      colorLight: colorLight,
      colorDark: colorDark,
      isExclusive: this.wsEditIsExclusive,
      description: this.wsEditDescription.trim() || null,
    });
    if (success) {
      this.wsLabels.update(prev =>
        prev.map(l => {
          if (l.id === label.id) {
            return { ...l, name: newName, colorLight: colorLight, colorDark: colorDark, isExclusive: this.wsEditIsExclusive, description: this.wsEditDescription.trim() || null };
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

  protected confirmBulkDeleteWs(): void {
    const ids = Array.from(this.wsSelected());
    if (!ids.length) return;
    this.confirmService.confirm({
      message: `Xóa ${ids.length} workspace label đã chọn? Labels sẽ bị bỏ khỏi tất cả tasks liên quan.`,
      header: 'Xóa nhiều workspace labels',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: `Xóa ${ids.length} labels`,
      rejectLabel: 'Hủy',
      acceptButtonStyleClass: 'p-button-danger',
      accept: async () => {
        let ok = 0;
        for (const id of ids) {
          const success = await this.labelStore.deleteWorkspaceLabel(this.workspaceId, id);
          if (success) { this.wsLabels.update(prev => prev.filter(l => l.id !== id)); ok++; }
        }
        this.wsSelected.set(new Set());
        this.messageService.add({ severity: 'success', summary: 'Thành công', detail: `Đã xóa ${ok}/${ids.length} workspace labels` });
      },
    });
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
