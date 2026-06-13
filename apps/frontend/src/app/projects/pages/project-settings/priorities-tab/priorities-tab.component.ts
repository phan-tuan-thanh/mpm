import { Component, OnInit, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { PopoverModule } from 'primeng/popover';
import { TooltipModule } from 'primeng/tooltip';
import { DragDropModule, CdkDragDrop } from '@angular/cdk/drag-drop';
import { MessageService } from 'primeng/api';
import { ProjectStore } from '../../../state/project.store';
import { PriorityService } from '../../../services/priority.service';
import { PriorityConfigService } from '../../../../tasks/services/priority-config.service';
import { AuthService } from '../../../../auth/services/auth.service';
import { LayoutService } from '../../../../layout/services/layout.service';
import { ColorPickerPanelComponent } from '../../../../shared/components/color-picker-panel/color-picker-panel.component';
import { IconPickerPanelComponent } from '../../../../shared/components/icon-picker-panel/icon-picker-panel.component';
import { IconDisplayComponent } from '../../../../shared/components/icon-display/icon-display.component';
import { ProjectPriority, CreatePriorityDto } from '@mpm/shared-types';

interface EditDraft {
  name: string;
  colorLight: string;
  colorDark: string;
  icon: string;
}

@Component({
  standalone: true,
  selector: 'app-priorities-tab',
  imports: [
    CommonModule, FormsModule, ButtonModule, DialogModule,
    InputTextModule, PopoverModule, TooltipModule,
    DragDropModule, ColorPickerPanelComponent, IconPickerPanelComponent,
    IconDisplayComponent,
  ],
  templateUrl: './priorities-tab.component.html',
  styleUrl: './priorities-tab.component.css',
})
export class PrioritiesTabComponent implements OnInit {
  private readonly projectStore = inject(ProjectStore);
  private readonly priorityService = inject(PriorityService);
  private readonly priorityConfigService = inject(PriorityConfigService);
  private readonly authService = inject(AuthService);
  private readonly messageService = inject(MessageService);
  protected readonly layoutService = inject(LayoutService);

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

  protected readonly showCustomAddColors = signal(false);
  protected readonly showCustomEditColors = signal(false);

  getPresetGradient(light: string, dark: string): string {
    return `linear-gradient(135deg, ${light} 50%, ${dark} 50%)`;
  }

  selectColorPair(light: string, dark: string): void {
    this.addDraft.update(d => ({ ...d, colorLight: light, colorDark: dark }));
  }

  selectEditColorPair(light: string, dark: string): void {
    this.editDraft.update(d => ({ ...d, colorLight: light, colorDark: dark }));
  }

  readonly t = computed(() => {
    const isEn = this.projectStore.projectLanguage() === 'en';
    return isEn ? {
      addSectionTitle: 'Add new priority',
      iconTooltip: 'Choose icon',
      namePlaceholder: 'Name (e.g. Critical)',
      slugPlaceholder: 'Slug (e.g. critical)',
      quickColorTitle: 'Quick Colors (Light / Dark)',
      customColorBtn: 'Customize Light & Dark colors',
      lightModeLabel: 'Light mode color:',
      darkModeLabel: 'Dark mode color:',
      colorTooltip: 'Choose color pair',
      addBtn: 'Add',
      previewTitle: 'Preview:',
      previewDefaultName: 'Priority name',
      systemBadge: 'System',
      slugTooltip: 'Identifier slug',
      editTooltip: 'Edit',
      deleteTooltip: 'Delete',
      editIconTooltip: 'Choose icon',
      editColorTooltip: 'Choose color pair',
      customEditColorBtn: 'Customize Light & Dark colors',
      slugLabel: 'Slug:',
      deleteDialogHeader: 'Delete priority',
      deleteDialogMsg: (name: string) => `Tasks using priority "${name}" will be migrated to:`,
      migrationPlaceholder: 'Select replacement priority...',
      cancelBtn: 'Cancel',
      confirmDeleteBtn: 'Confirm delete',
      loadErrorDetail: 'Failed to load priority list.',
      saveSuccessDetail: (name: string) => `Updated "${name}" successfully.`,
      saveErrorDetail: 'Failed to update.',
      deleteSuccessDetail: 'Deleted and migrated tasks successfully.',
      deleteErrorDetail: 'Failed to delete.',
      addSuccessDetail: (name: string) => `Added "${name}" successfully.`,
      addErrorDetail: 'Failed to add.',
      reorderErrorDetail: 'Failed to save order.',
      errorSummary: 'Error',
      savedSummary: 'Saved',
      deletedSummary: 'Deleted',
      successSummary: 'Success',
      reorderErrorSummary: 'Reorder error',
    } : {
      addSectionTitle: 'Thêm mức ưu tiên mới',
      iconTooltip: 'Chọn icon nhận diện',
      namePlaceholder: 'Tên (vd: Critical)',
      slugPlaceholder: 'Slug (vd: critical)',
      quickColorTitle: 'Màu chọn nhanh (Light / Dark)',
      customColorBtn: 'Tự tùy chỉnh màu sắc Light & Dark',
      lightModeLabel: 'Màu Light mode:',
      darkModeLabel: 'Màu Dark mode:',
      colorTooltip: 'Chọn cặp màu sắc',
      addBtn: 'Thêm',
      previewTitle: 'Xem trước mức ưu tiên:',
      previewDefaultName: 'Tên mức ưu tiên',
      systemBadge: 'Hệ thống',
      slugTooltip: 'Slug nhận dạng',
      editTooltip: 'Chỉnh sửa',
      deleteTooltip: 'Xóa',
      editIconTooltip: 'Chọn icon',
      editColorTooltip: 'Chọn cặp màu sắc',
      customEditColorBtn: 'Tùy chỉnh màu sắc Light & Dark',
      slugLabel: 'Slug:',
      deleteDialogHeader: 'Xóa mức ưu tiên',
      deleteDialogMsg: (name: string) => `Công việc đang dùng mức "${name}" sẽ được chuyển sang:`,
      migrationPlaceholder: 'Chọn mức thay thế...',
      cancelBtn: 'Hủy',
      confirmDeleteBtn: 'Xác nhận xóa',
      loadErrorDetail: 'Không thể tải danh sách mức ưu tiên.',
      saveSuccessDetail: (name: string) => `Cập nhật "${name}" thành công.`,
      saveErrorDetail: 'Không thể cập nhật.',
      deleteSuccessDetail: 'Xóa và chuyển công việc thành công.',
      deleteErrorDetail: 'Không thể xóa.',
      addSuccessDetail: (name: string) => `Đã thêm "${name}".`,
      addErrorDetail: 'Không thể thêm.',
      reorderErrorDetail: 'Không thể lưu thứ tự.',
      errorSummary: 'Lỗi',
      savedSummary: 'Đã lưu',
      deletedSummary: 'Đã xóa',
      successSummary: 'Thành công',
      reorderErrorSummary: 'Lỗi sắp xếp',
    };
  });

  readonly previewPriority = computed(() => {
    const draft = this.addDraft();
    return {
      name: draft.name.trim() || this.t().previewDefaultName,
      icon: draft.icon,
      colorLight: draft.colorLight,
      colorDark: draft.colorDark
    };
  });

  readonly priorities = signal<ProjectPriority[]>([]);
  readonly isLoading = signal(false);

  readonly editingId = signal<string | null>(null);
  readonly editDraft = signal<EditDraft>({ name: '', colorLight: '#9CA3AF', colorDark: '#6B7280', icon: 'pi pi-flag' });

  readonly showAddForm = signal(false);
  readonly addDraft = signal<CreatePriorityDto>({ name: '', value: '', colorLight: '#9CA3AF', colorDark: '#6B7280', icon: 'pi pi-flag' });

  readonly displayDeleteDialog = signal(false);
  readonly priorityToDelete = signal<ProjectPriority | null>(null);
  readonly migrationTargets = signal<ProjectPriority[]>([]);
  readonly selectedMigrateValue = signal<string | null>(null);
  readonly isDeleting = signal(false);

  getMigrationTargetLabel(): string {
    const found = this.migrationTargets().find((t) => t.value === this.selectedMigrateValue());
    return found ? found.name : this.t().migrationPlaceholder;
  }

  draggedId: string | null = null;
  hoveredId: string | null = null;

  readonly isReadOnly = computed(() => {
    const project = this.projectStore.currentProject();
    if (!project) return true;
    const user = this.authService.currentUser();
    if (!user) return true;
    if (user.systemRole === 'Admin') return false;
    const member = this.projectStore.members().find(m => m.userId === user.id);
    return member?.projectRole !== 'Scrum_Master';
  });

  private get projectId(): string {
    return this.projectStore.currentProject()?.id ?? '';
  }

  ngOnInit(): void {
    const project = this.projectStore.currentProject();
    if (project) {
      this.load(project.id);
      this.projectStore.loadMembers(project.id);
    }
  }

  private load(projectId: string): void {
    this.isLoading.set(true);
    this.priorityService.getPriorities(projectId).subscribe({
      next: res => { this.priorities.set(res.data); this.isLoading.set(false); },
      error: () => {
        this.isLoading.set(false);
        const tr = this.t();
        this.messageService.add({ severity: 'error', summary: tr.errorSummary, detail: tr.loadErrorDetail });
      },
    });
  }

  private reload(): void {
    const id = this.projectId;
    if (id) { this.load(id); this.priorityConfigService.loadPriorities(id); }
  }

  startEdit(p: ProjectPriority): void {
    this.editingId.set(p.id);
    this.editDraft.set({ name: p.name, colorLight: p.colorLight, colorDark: p.colorDark, icon: p.icon });
    this.showCustomEditColors.set(false);
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.showCustomEditColors.set(false);
  }

  saveEdit(p: ProjectPriority): void {
    const draft = this.editDraft();
    this.priorityService.updatePriority(this.projectId, p.id, draft).subscribe({
      next: () => {
        const tr = this.t();
        this.editingId.set(null);
        this.showCustomEditColors.set(false);
        this.reload();
        this.messageService.add({ severity: 'success', summary: tr.savedSummary, detail: tr.saveSuccessDetail(draft.name) });
      },
      error: err => {
        const tr = this.t();
        this.messageService.add({ severity: 'error', summary: tr.errorSummary, detail: err.error?.message || tr.saveErrorDetail });
      },
    });
  }

  openDeleteDialog(p: ProjectPriority): void {
    this.priorityToDelete.set(p);
    this.migrationTargets.set(this.priorities().filter(x => x.id !== p.id));
    this.selectedMigrateValue.set(null);
    this.displayDeleteDialog.set(true);
  }

  confirmDelete(): void {
    const p = this.priorityToDelete();
    const migrateToValue = this.selectedMigrateValue();
    if (!p || !migrateToValue) return;

    this.isDeleting.set(true);
    this.priorityService.deletePriority(this.projectId, p.id, { migrateToValue }).subscribe({
      next: () => {
        const tr = this.t();
        this.isDeleting.set(false);
        this.displayDeleteDialog.set(false);
        this.priorityToDelete.set(null);
        this.reload();
        this.messageService.add({ severity: 'success', summary: tr.deletedSummary, detail: tr.deleteSuccessDetail });
      },
      error: err => {
        const tr = this.t();
        this.isDeleting.set(false);
        this.messageService.add({ severity: 'error', summary: tr.errorSummary, detail: err.error?.message || tr.deleteErrorDetail });
      },
    });
  }

  submitAdd(): void {
    const draft = this.addDraft();
    if (!draft.name.trim() || !draft.value.trim()) return;

    this.priorityService.createPriority(this.projectId, {
      ...draft,
      value: draft.value.toLowerCase().replace(/[^a-z0-9_-]/g, '-'),
    }).subscribe({
      next: () => {
        const tr = this.t();
        this.showAddForm.set(false);
        this.addDraft.set({ name: '', value: '', colorLight: '#9CA3AF', colorDark: '#6B7280', icon: 'pi pi-flag' });
        this.showCustomAddColors.set(false);
        this.reload();
        this.messageService.add({ severity: 'success', summary: tr.successSummary, detail: tr.addSuccessDetail(draft.name) });
      },
      error: err => {
        const tr = this.t();
        this.messageService.add({ severity: 'error', summary: tr.errorSummary, detail: err.error?.message || tr.addErrorDetail });
      },
    });
  }

  onDragStart(id: string): void { this.draggedId = id; }
  onDragEnd(): void { setTimeout(() => { this.draggedId = null; this.hoveredId = null; }, 100); }

  onDrop(_event: CdkDragDrop<ProjectPriority[]>): void {
    if (this.isReadOnly()) return;
    const dragId = this.draggedId;
    const hoverId = this.hoveredId;
    this.draggedId = null;
    this.hoveredId = null;
    if (!dragId || !hoverId || dragId === hoverId) return;

    const list = [...this.priorities()];
    const fromIdx = list.findIndex(p => p.id === dragId);
    if (fromIdx === -1) return;
    const [dragged] = list.splice(fromIdx, 1);
    const toIdx = list.findIndex(p => p.id === hoverId);
    list.splice(toIdx === -1 ? list.length : toIdx, 0, dragged);
    this.priorities.set(list);

    this.priorityService.reorderPriorities(this.projectId, {
      items: list.map((p, i) => ({ priorityId: p.id, order: i + 1 })),
    }).subscribe({
      next: () => this.reload(),
      error: () => {
        const tr = this.t();
        this.reload();
        this.messageService.add({ severity: 'error', summary: tr.reorderErrorSummary, detail: tr.reorderErrorDetail });
      },
    });
  }
}
