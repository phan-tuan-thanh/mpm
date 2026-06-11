import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ColorPickerModule } from 'primeng/colorpicker';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { CheckboxModule } from 'primeng/checkbox';

import { LabelStore } from '../../../../tasks/state/label.store';
import { LayoutService } from '../../../../layout/services/layout.service';
import { ProjectStore } from '../../../state/project.store';
import type { Label } from '@mpm/shared-types';
import { computed, signal } from '@angular/core';

@Component({
  standalone: true,
  selector: 'app-labels-tab',
  imports: [
    CommonModule, FormsModule,
    ButtonModule, InputTextModule, ColorPickerModule,
    ConfirmDialogModule, ToastModule, TooltipModule, CheckboxModule,
  ],
  providers: [ConfirmationService, MessageService],
  template: `
    <p-toast />
    <p-confirmDialog />

    <div class="space-y-5">

      <!-- Create form — dashed box, đặt ở top của tab -->
      <div class="border border-dashed border-surface-300 dark:border-surface-700 rounded-xl p-4 space-y-3">
        <p class="text-xs font-semibold text-gray-500 dark:text-surface-400 uppercase tracking-wide">Thêm label mới</p>
        <div class="flex items-center gap-2 flex-wrap">
          <input pInputText [(ngModel)]="newName" placeholder="Tên label" style="height:32px;font-size:12px;width:160px" (keyup.enter)="createLabel()" />
          <input pInputText [(ngModel)]="newDescription" placeholder="Mô tả (tuỳ chọn)" style="height:32px;font-size:12px;flex:1;min-width:140px" (keyup.enter)="createLabel()" />
          <p-colorPicker [(ngModel)]="newColor" format="hex" />
          <label class="flex items-center gap-1.5 text-xs text-gray-600 dark:text-surface-300 cursor-pointer">
            <p-checkbox [(ngModel)]="isExclusive" [binary]="true" />
            Exclusive (single-select)
          </label>
          <button pButton label="Thêm" icon="pi pi-plus" size="small" [fluid]="false"
            [disabled]="!newName.trim()" (click)="createLabel()"></button>
        </div>
      </div>

      <!-- Action controls — bulk-delete cluster (header bỏ; ngữ cảnh do tab cha thể hiện) -->
      @if (projSelected().size > 0) {
        <div class="flex items-center justify-end gap-2">
          <button pButton icon="pi pi-trash" severity="danger" size="small" [fluid]="false"
            [label]="'Xóa ' + projSelected().size" (click)="confirmBulkDeleteProj()"></button>
          <button pButton icon="pi pi-times" severity="secondary" size="small" text [fluid]="false"
            pTooltip="Bỏ chọn tất cả" (click)="clearProjSelection()"></button>
        </div>
      }

      <!-- Toolbar: search + filter chips -->
      <div class="flex flex-col gap-2">
        <div class="relative max-w-xs">
          <i class="pi pi-search absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-surface-500 text-xs pointer-events-none"></i>
          <input pInputText class="w-full !pl-7" style="height:32px;font-size:12px"
            placeholder="Tìm theo tên hoặc mô tả..."
            [ngModel]="projSearch()" (ngModelChange)="setProjSearch($event)" />
        </div>
        <div class="flex items-center gap-1 flex-wrap">
          @for (chip of filterChips; track chip.value) {
            <button type="button"
              class="px-2.5 py-0.5 text-xs rounded-full border transition-colors"
              [class]="projFilter() === chip.value
                ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 font-semibold'
                : 'border-surface-200 dark:border-surface-700 text-gray-500 dark:text-surface-400 hover:bg-surface-50 dark:hover:bg-surface-800'"
              (click)="setProjFilter(chip.value)">{{ chip.label }}</button>
          }
        </div>
      </div>

      <!-- Label List -->
      <div class="space-y-1">
        @for (label of paginatedProjectLabels(); track label.id) {
          <div class="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-surface-100 dark:border-surface-800 bg-white dark:bg-surface-900 hover:border-surface-200 dark:hover:border-surface-700 transition group">
            <!-- Checkbox -->
            <input type="checkbox" [checked]="isProjSelected(label.id)" (change)="toggleProjSelect(label.id)"
              class="cursor-pointer rounded border-gray-300">
            <!-- Color swatch -->
            <span class="w-3 h-3 rounded-full shrink-0 ring-1 ring-black/10"
              [style.background]="layoutService.getAdaptiveColor(label.color)"></span>

            @if (editingId() === label.id) {
              <!-- Inline edit form -->
              <div class="flex-1 flex items-center gap-2 flex-wrap">
                <input pInputText [(ngModel)]="editName" placeholder="Tên label" style="height:28px;font-size:12px;width:160px" />
                <input pInputText [(ngModel)]="editDescription" placeholder="Mô tả (tuỳ chọn)" style="height:28px;font-size:12px;flex:1;min-width:120px" />
                <p-colorPicker [(ngModel)]="editColor" format="hex" />
                <label class="flex items-center gap-1 text-xs text-gray-500 dark:text-surface-400 cursor-pointer">
                  <p-checkbox [(ngModel)]="editIsExclusive" [binary]="true" />
                  Exclusive
                </label>
                <button pButton icon="pi pi-check" size="small" severity="success" [fluid]="false" (click)="saveEdit(label)"></button>
                <button pButton icon="pi pi-times" size="small" severity="secondary" text [fluid]="false" (click)="cancelEdit()"></button>
              </div>
            } @else {
              <!-- Read view -->
              <div class="flex-1 min-w-0">
                <span class="text-sm font-medium text-gray-800 dark:text-surface-100 truncate block">{{ label.name }}</span>
                @if (label.description) {
                  <span class="text-xs text-gray-400 dark:text-surface-500 truncate block">{{ label.description }}</span>
                }
              </div>
              <span class="text-[10px] px-1.5 py-0.5 rounded border border-surface-200 dark:border-surface-700 text-gray-400 dark:text-surface-500 shrink-0">
                {{ label.isExclusive !== false ? 'Single' : 'Multi' }}
              </span>
              <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button pButton icon="pi pi-pencil" size="small" severity="secondary" text [fluid]="false"
                  pTooltip="Sửa" (click)="startEdit(label)"></button>
                <button pButton icon="pi pi-trash" size="small" severity="danger" text [fluid]="false"
                  pTooltip="Xóa" (click)="confirmDelete(label)"></button>
              </div>
            }
          </div>
        }

        @if (filteredProjectLabels().length === 0) {
          <div class="flex flex-col items-center gap-3 py-12 text-center text-gray-400 dark:text-surface-500">
            <i class="pi pi-tags text-4xl opacity-30"></i>
            @if (projSearch() || projFilter() !== 'all') {
              <span class="text-sm">Không tìm thấy label khớp</span>
            } @else {
              <span class="text-sm">Chưa có label nào. Tạo label đầu tiên bên trên.</span>
            }
          </div>
        }
      </div>

      <!-- Pagination -->
      @if (projTotalPages() > 1) {
        <div class="flex items-center justify-between text-xs text-gray-500 dark:text-surface-400">
          <span>{{ projPage() * PAGE_SIZE + 1 }}–{{ projEndIdx() }} / {{ filteredProjectLabels().length }}</span>
          <div class="flex items-center gap-1">
            <button pButton icon="pi pi-chevron-left" size="small" severity="secondary" text [fluid]="false"
              [disabled]="projPage() === 0" (click)="projPage.set(projPage() - 1)"></button>
            @for (i of pageRange(projTotalPages()); track i) {
              <button type="button"
                class="w-6 h-6 rounded text-xs font-medium transition-colors"
                [class]="projPage() === i
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-500 hover:bg-surface-100 dark:hover:bg-surface-800'"
                (click)="projPage.set(i)">{{ i + 1 }}</button>
            }
            <button pButton icon="pi pi-chevron-right" size="small" severity="secondary" text [fluid]="false"
              [disabled]="projPage() >= projTotalPages() - 1" (click)="projPage.set(projPage() + 1)"></button>
          </div>
        </div>
      }

    </div>
  `,
})
export class LabelsTabComponent implements OnInit {
  readonly labelStore = inject(LabelStore);
  private readonly confirmService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);
  protected readonly layoutService = inject(LayoutService);
  private readonly projectStore = inject(ProjectStore);

  protected get projectId(): string {
    return this.projectStore.currentProject()?.id ?? '';
  }

  // ── Filter chips ──────────────────────────────────────────────
  readonly filterChips: { label: string; value: 'all'|'regular'|'scoped'|'single'|'multi' }[] = [
    { label: 'Tất cả', value: 'all' },
    { label: 'Thường',  value: 'regular' },
    { label: 'Scoped',  value: 'scoped' },
    { label: 'Single',  value: 'single' },
    { label: 'Multi',   value: 'multi' },
  ];

  // ── Editing state ─────────────────────────────────────────────
  protected editingId = signal<string | null>(null);
  protected editName = '';
  protected editColor = '';
  protected editIsExclusive = true;
  protected editDescription = '';

  // ── Create state ──────────────────────────────────────────────
  protected newName = '';
  protected newColor = '';
  protected isExclusive = true;
  protected newDescription = '';

  // ── Filter / search ───────────────────────────────────────────
  protected projSearch = signal('');
  protected projFilter = signal<'all'|'regular'|'scoped'|'single'|'multi'>('all');

  protected setProjSearch(val: string): void { this.projSearch.set(val); this.projPage.set(0); this.projSelected.set(new Set()); }
  protected setProjFilter(val: 'all'|'regular'|'scoped'|'single'|'multi'): void { this.projFilter.set(val); this.projPage.set(0); this.projSelected.set(new Set()); }

  // ── Computed labels ───────────────────────────────────────────
  readonly filteredProjectLabels = computed(() => {
    const q = this.projSearch().toLowerCase();
    const f = this.projFilter();
    return this.labelStore.labels()
      .filter(l => l.scope === 'project' || !l.scope)
      .filter(l => {
        if (q && !l.name.toLowerCase().includes(q) && !(l.description ?? '').toLowerCase().includes(q)) return false;
        const scoped = l.name.includes('::');
        if (f === 'regular') return !scoped;
        if (f === 'scoped')  return scoped;
        if (f === 'single')  return scoped && l.isExclusive !== false;
        if (f === 'multi')   return scoped && l.isExclusive === false;
        return true;
      });
  });

  // ── Pagination ────────────────────────────────────────────────
  readonly PAGE_SIZE = 10;
  readonly projPage = signal(0);

  readonly paginatedProjectLabels = computed(() => {
    const all = this.filteredProjectLabels();
    const start = this.projPage() * this.PAGE_SIZE;
    return all.slice(start, start + this.PAGE_SIZE);
  });

  readonly projTotalPages = computed(() => Math.max(1, Math.ceil(this.filteredProjectLabels().length / this.PAGE_SIZE)));
  protected projEndIdx(): number { return Math.min((this.projPage() + 1) * this.PAGE_SIZE, this.filteredProjectLabels().length); }
  protected pageRange(total: number): number[] { return Array.from({ length: total }, (_, i) => i); }

  // ── Multi-select ──────────────────────────────────────────────
  protected projSelected = signal<Set<string>>(new Set());
  protected isProjSelected(id: string): boolean { return this.projSelected().has(id); }
  protected toggleProjSelect(id: string): void {
    this.projSelected.update(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  protected clearProjSelection(): void { this.projSelected.set(new Set()); }

  // ── Lifecycle ─────────────────────────────────────────────────
  ngOnInit(): void {
    this.newColor = 'EF4444';
    if (this.projectId) this.labelStore.loadLabels(this.projectId);
  }

  // ── CRUD ──────────────────────────────────────────────────────
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
      this.newColor = 'EF4444';
      this.isExclusive = true;
      this.messageService.add({ severity: 'success', summary: 'Thành công', detail: 'Đã tạo label mới' });
    } else {
      this.messageService.add({ severity: 'error', summary: 'Lỗi', detail: 'Không thể tạo label. Vui lòng thử lại.' });
    }
  }

  protected startEdit(label: Label): void {
    this.editingId.set(label.id);
    this.editName = label.name;
    this.editColor = label.color.replace('#', '');
    this.editIsExclusive = label.isExclusive !== false;
    this.editDescription = label.description ?? '';
  }

  protected async saveEdit(label: Label): Promise<void> {
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
      this.messageService.add({ severity: 'error', summary: 'Lỗi', detail: 'Không thể cập nhật label.' });
    }
  }

  protected cancelEdit(): void { this.editingId.set(null); }

  protected confirmDelete(label: Label): void {
    this.confirmService.confirm({
      message: `Xóa label "${label.name}"?`,
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
          this.messageService.add({ severity: 'error', summary: 'Lỗi', detail: 'Không thể xóa label.' });
        }
      },
    });
  }

  protected confirmBulkDeleteProj(): void {
    const ids = Array.from(this.projSelected());
    if (!ids.length) return;
    this.confirmService.confirm({
      message: `Xóa ${ids.length} label đã chọn?`,
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
}
