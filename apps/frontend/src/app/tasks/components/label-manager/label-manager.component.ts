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
import { ProjectStore } from '../../../projects/state/project.store';
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
  protected readonly projectStore = inject(ProjectStore);

  readonly t = computed(() => {
    const isEn = this.projectStore.projectLanguage() === 'en';
    return isEn ? {
      header: 'Quản lý Labels', // dialog title uses t().header
      manageLabels: 'Manage Labels',
      searchPlaceholder: 'Search by name or description...',
      wsTab: 'Workspace',
      projTab: 'Project',
      all: 'All',
      regular: 'Regular',
      scoped: 'Scoped',
      single: 'Single',
      multi: 'Multi',
      noLabelsFound: 'No matching labels found',
      noLabelsFoundSearch: (q: string) => `No labels matching "${q}"`,
      noWsLabelsYet: 'No workspace labels yet',
      noProjLabelsYet: 'No project labels yet',
      createLabelBelow: 'Create a label below to start',
      selectedXOfY: (x: number, y: number) => `Selected ${x} / ${y} labels`,
      selectAllOnPage: 'Select all on page',
      quickColorsHeader: 'Quick Colors (Light / Dark)',
      customColorsToggle: 'Custom Light & Dark colors',
      customColorLight: 'Light mode color:',
      customColorDark: 'Dark mode color:',
      labelNamePlaceholder: 'Label name...',
      labelDescPlaceholder: 'Label description (optional)...',
      saveBtn: 'Save',
      cancelBtn: 'Cancel',
      deleteBtn: 'Delete',
      editTooltip: 'Edit',
      deleteTooltip: 'Delete',
      colorTooltip: 'Choose color pair',
      wsLabelCount: (count: number) => `${count} tasks`,
      scopeModeSingleTooltip: 'Single: only 1 label of this scope allowed per task',
      scopeModeMultiTooltip: 'Multi: multiple labels of this scope allowed per task',
      scopeLabel: 'Color',
      scopeModeLabel: 'Mode',
      nameLabel: 'Name',
      descLabel: 'Description',
      addWsLabelHeader: 'Add workspace label',
      addProjLabelHeader: 'Create new label',
      addLabelBtn: 'Add label',
      toastSuccess: 'Success',
      toastError: 'Error',
      toastCreateSuccess: 'Created label successfully',
      toastCreateWsSuccess: 'Created workspace label successfully',
      toastCreateError: 'Failed to create label. Please try again.',
      toastCreateWsError: 'Failed to create workspace label. Please try again.',
      toastUpdateSuccess: 'Updated label successfully',
      toastUpdateError: 'Failed to update label. Please try again.',
      toastUpdateWsSuccess: 'Updated workspace label successfully',
      toastUpdateWsError: 'Failed to update workspace label. Please try again.',
      toastDeleteSuccess: 'Deleted label successfully',
      toastDeleteError: 'Failed to delete label. Please try again.',
      toastDeleteWsSuccess: 'Deleted workspace label successfully',
      toastDeleteWsError: 'Failed to delete workspace label. Please try again.',
      confirmDeleteMsg: (name: string, count: number) => `Deleting label "${name}" will remove it from ${count} tasks. Continue?`,
      confirmDeleteHeader: 'Confirm Delete',
      confirmBulkDeleteMsg: (count: number) => `Delete ${count} selected labels? Labels will be removed from all related tasks.`,
      confirmBulkDeleteHeader: 'Delete Multiple Labels',
      toastBulkDeleteSuccess: (ok: number, total: number) => `Deleted ${ok}/${total} labels`,
      deleteCountLabels: (count: number) => `Delete ${count} labels`,
      confirmBulkDeleteWsMsg: (count: number) => `Delete ${count} selected workspace labels? Labels will be removed from all related tasks.`,
      confirmBulkDeleteWsHeader: 'Delete Multiple Workspace Labels',
      toastBulkDeleteWsSuccess: (ok: number, total: number) => `Deleted ${ok}/${total} workspace labels`,
      wsLabelDeleteConfirmMsg: (count: number) => `This label is used in ${count} tasks. Deleting it will remove it from all tasks.`,
      wsLabelDeleteConfirmHeader: 'Confirm Delete Workspace Label',
      clearSelection: 'Clear selection',
      labelsLabel: 'labels',
      singleModeDesc: 'Only 1 from group',
      multiModeDesc: 'Select multiple from group'
    } : {
      header: 'Quản lý Labels',
      manageLabels: 'Quản lý Labels',
      searchPlaceholder: 'Tìm theo tên hoặc mô tả...',
      wsTab: 'Workspace',
      projTab: 'Project',
      all: 'Tất cả',
      regular: 'Thường',
      scoped: 'Scoped',
      single: 'Single',
      multi: 'Multi',
      noLabelsFound: 'Không tìm thấy label nào khớp',
      noLabelsFoundSearch: (q: string) => `Không tìm thấy label nào khớp "${q}"`,
      noWsLabelsYet: 'Chưa có workspace label nào',
      noProjLabelsYet: 'Chưa có project label nào',
      createLabelBelow: 'Tạo label bên dưới để bắt đầu',
      selectedXOfY: (x: number, y: number) => `Đã chọn ${x} / ${y} labels`,
      selectAllOnPage: 'Chọn tất cả trên trang',
      quickColorsHeader: 'Màu chọn nhanh (Light / Dark)',
      customColorsToggle: 'Tự tùy chỉnh màu sắc Light & Dark',
      customColorLight: 'Màu Light mode:',
      customColorDark: 'Màu Dark mode:',
      labelNamePlaceholder: 'Tên label...',
      labelDescPlaceholder: 'Mô tả nhãn (tùy chọn)...',
      saveBtn: 'Lưu',
      cancelBtn: 'Hủy',
      deleteBtn: 'Xóa',
      editTooltip: 'Sửa',
      deleteTooltip: 'Xóa',
      colorTooltip: 'Chọn cặp màu sắc',
      wsLabelCount: (count: number) => `${count} tasks`,
      scopeModeSingleTooltip: 'Single: chỉ 1 label trong nhóm mỗi task',
      scopeModeMultiTooltip: 'Multi: chọn nhiều từ nhóm',
      scopeLabel: 'Màu',
      scopeModeLabel: 'Chế độ',
      nameLabel: 'Tên',
      descLabel: 'Mô tả',
      addWsLabelHeader: 'Thêm workspace label',
      addProjLabelHeader: 'Tạo label mới',
      addLabelBtn: 'Thêm label',
      toastSuccess: 'Thành công',
      toastError: 'Lỗi',
      toastCreateSuccess: 'Đã tạo label mới',
      toastCreateWsSuccess: 'Đã tạo workspace label',
      toastCreateError: 'Không thể tạo label. Vui lòng thử lại.',
      toastCreateWsError: 'Không thể tạo workspace label. Vui lòng thử lại.',
      toastUpdateSuccess: 'Đã cập nhật label',
      toastUpdateError: 'Không thể cập nhật label. Vui lòng thử lại.',
      toastUpdateWsSuccess: 'Đã cập nhật workspace label',
      toastUpdateWsError: 'Không thể cập nhật workspace label. Vui lòng thử lại.',
      toastDeleteSuccess: 'Đã xóa label',
      toastDeleteError: 'Không thể xóa label. Vui lòng thử lại.',
      toastDeleteWsSuccess: 'Đã xóa workspace label',
      toastDeleteWsError: 'Không thể xóa workspace label. Vui lòng thử lại.',
      confirmDeleteMsg: (name: string, count: number) => `Xóa label "${name}" sẽ bỏ label khỏi ${count} tasks. Tiếp tục?`,
      confirmDeleteHeader: 'Xác nhận xóa',
      confirmBulkDeleteMsg: (count: number) => `Xóa ${count} label đã chọn? Labels sẽ bị bỏ khỏi tất cả tasks liên quan.`,
      confirmBulkDeleteHeader: 'Xóa nhiều labels',
      toastBulkDeleteSuccess: (ok: number, total: number) => `Đã xóa ${ok}/${total} labels`,
      deleteCountLabels: (count: number) => `Xóa ${count} labels`,
      confirmBulkDeleteWsMsg: (count: number) => `Xóa ${count} workspace label đã chọn? Labels sẽ bị bỏ khỏi tất cả tasks liên quan.`,
      confirmBulkDeleteWsHeader: 'Xóa nhiều workspace labels',
      toastBulkDeleteWsSuccess: (ok: number, total: number) => `Đã xóa ${ok}/${total} workspace labels`,
      wsLabelDeleteConfirmMsg: (count: number) => `Label này đang dùng trong ${count} tasks. Xóa sẽ bỏ label khỏi tất cả.`,
      wsLabelDeleteConfirmHeader: 'Xác nhận xóa workspace label',
      clearSelection: 'Bỏ chọn tất cả',
      labelsLabel: 'nhãn',
      singleModeDesc: 'Chỉ 1 từ nhóm',
      multiModeDesc: 'Chọn nhiều từ nhóm'
    };
  });

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

  readonly filterChips = computed(() => {
    const tr = this.t();
    return [
      { label: tr.all, value: 'all' as const },
      { label: tr.regular, value: 'regular' as const },
      { label: tr.scoped, value: 'scoped' as const },
      { label: tr.single, value: 'single' as const },
      { label: tr.multi, value: 'multi' as const },
    ];
  });

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
    const tr = this.t();
    if (result) {
      this.newName = '';
      this.newDescription = '';
      const pair = this.getRandomPresetPair();
      this.newColorLight.set(pair.light);
      this.newColorDark.set(pair.dark);
      this.isExclusive = true;
      this.messageService.add({ severity: 'success', summary: tr.toastSuccess, detail: tr.toastCreateSuccess });
    } else {
      this.messageService.add({ severity: 'error', summary: tr.toastError, detail: tr.toastCreateError });
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
    const tr = this.t();
    if (success) {
      this.editingId.set(null);
      this.messageService.add({ severity: 'success', summary: tr.toastSuccess, detail: tr.toastUpdateSuccess });
    } else {
      this.messageService.add({ severity: 'error', summary: tr.toastError, detail: tr.toastUpdateError });
    }
  }

  protected cancelEdit(): void {
    this.editingId.set(null);
  }

  protected confirmDelete(label: Label & { taskCount: number }): void {
    const tr = this.t();
    this.confirmService.confirm({
      message: tr.confirmDeleteMsg(label.name, label.taskCount),
      header: tr.confirmDeleteHeader,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: tr.deleteBtn,
      rejectLabel: tr.cancelBtn,
      acceptButtonStyleClass: 'p-button-danger',
      accept: async () => {
        const success = await this.labelStore.deleteLabel(this.projectId, label.id);
        if (success) {
          this.messageService.add({ severity: 'success', summary: tr.toastSuccess, detail: tr.toastDeleteSuccess });
        } else {
          this.messageService.add({ severity: 'error', summary: tr.toastError, detail: tr.toastDeleteError });
        }
      },
    });
  }

  protected confirmBulkDeleteProj(): void {
    const ids = Array.from(this.projSelected());
    if (!ids.length) return;
    const tr = this.t();
    this.confirmService.confirm({
      message: tr.confirmBulkDeleteMsg(ids.length),
      header: tr.confirmBulkDeleteHeader,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: tr.deleteCountLabels(ids.length),
      rejectLabel: tr.cancelBtn,
      acceptButtonStyleClass: 'p-button-danger',
      accept: async () => {
        let ok = 0;
        for (const id of ids) {
          const success = await this.labelStore.deleteLabel(this.projectId, id);
          if (success) ok++;
        }
        this.projSelected.set(new Set());
        this.messageService.add({ severity: 'success', summary: tr.toastSuccess, detail: tr.toastBulkDeleteSuccess(ok, ids.length) });
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
    const tr = this.t();
    if (label) {
      this.wsLabels.update(prev => [...prev, { ...label, taskCount: 0 }]);
      this.wsNewName = '';
      this.wsNewDescription = '';
      const pair = this.getRandomPresetPair();
      this.wsNewColorLight.set(pair.light);
      this.wsNewColorDark.set(pair.dark);
      this.wsIsExclusive = true;
      this.messageService.add({ severity: 'success', summary: tr.toastSuccess, detail: tr.toastCreateWsSuccess });
    } else {
      this.messageService.add({ severity: 'error', summary: tr.toastError, detail: tr.toastCreateWsError });
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
    const tr = this.t();
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
      this.messageService.add({ severity: 'success', summary: tr.toastSuccess, detail: tr.toastUpdateWsSuccess });
    } else {
      this.messageService.add({ severity: 'error', summary: tr.toastError, detail: tr.toastUpdateWsError });
    }
  }

  protected cancelWsEdit(): void {
    this.wsEditingId.set(null);
  }

  protected confirmBulkDeleteWs(): void {
    const ids = Array.from(this.wsSelected());
    if (!ids.length) return;
    const tr = this.t();
    this.confirmService.confirm({
      message: tr.confirmBulkDeleteWsMsg(ids.length),
      header: tr.confirmBulkDeleteWsHeader,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: tr.deleteCountLabels(ids.length),
      rejectLabel: tr.cancelBtn,
      acceptButtonStyleClass: 'p-button-danger',
      accept: async () => {
        let ok = 0;
        for (const id of ids) {
          const success = await this.labelStore.deleteWorkspaceLabel(this.workspaceId, id);
          if (success) { this.wsLabels.update(prev => prev.filter(l => l.id !== id)); ok++; }
        }
        this.wsSelected.set(new Set());
        this.messageService.add({ severity: 'success', summary: tr.toastSuccess, detail: tr.toastBulkDeleteWsSuccess(ok, ids.length) });
      },
    });
  }

  protected confirmDeleteWsLabel(label: Label & { taskCount: number }): void {
    const tr = this.t();
    this.confirmService.confirm({
      message: tr.wsLabelDeleteConfirmMsg(label.taskCount),
      header: tr.wsLabelDeleteConfirmHeader,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: tr.deleteBtn,
      rejectLabel: tr.cancelBtn,
      acceptButtonStyleClass: 'p-button-danger',
      accept: async () => {
        const success = await this.labelStore.deleteWorkspaceLabel(this.workspaceId, label.id);
        if (success) {
          this.wsLabels.update(prev => prev.filter(l => l.id !== label.id));
          this.messageService.add({ severity: 'success', summary: tr.toastSuccess, detail: tr.toastDeleteWsSuccess });
        } else {
          this.messageService.add({ severity: 'error', summary: tr.toastError, detail: tr.toastDeleteWsError });
        }
      },
    });
  }
}
