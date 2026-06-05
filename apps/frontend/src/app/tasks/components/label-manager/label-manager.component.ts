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

import { LabelStore } from '../../state/label.store';
import { LabelService } from '../../services/label.service';
import { AuthStore } from '../../../auth/state/auth.store';
import type { Label } from '@mpm/shared-types';

@Component({
  standalone: true,
  selector: 'app-label-manager',
  imports: [
    CommonModule, FormsModule,
    DialogModule, ButtonModule, InputTextModule, ColorPickerModule,
    ConfirmDialogModule, TabsModule, ToastModule,
  ],
  providers: [ConfirmationService, MessageService],
  template: `
    <p-dialog
      [(visible)]="visible"
      header="Quản lý Labels"
      [modal]="true"
      [style]="{ width: '560px' }"
      (onHide)="visible = false"
    >
      <p-tabs [value]="'workspace'" class="label-manager-tabs">
        <p-tablist>
          <p-tab value="workspace">
            <i class="pi pi-globe mr-1.5"></i> Workspace Labels
          </p-tab>
          <p-tab value="project">
            <i class="pi pi-folder mr-1.5"></i> Project Labels
          </p-tab>
        </p-tablist>

        <p-tabpanels>
          <!-- Workspace Labels Tab -->
          <p-tabpanel value="workspace">
            <div class="space-y-2 max-h-72 overflow-y-auto mb-4 mt-2">
              @for (label of workspaceLabels(); track label.id) {
                <div class="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 dark:hover:bg-surface-800">
                  <!-- Globe icon for workspace labels -->
                  <i class="pi pi-globe text-xs text-blue-500 flex-shrink-0"></i>

                  @if (isAdmin() && wsEditingId() === label.id) {
                    <!-- Inline edit mode (admin only) -->
                    <input pInputText class="flex-1 text-sm" [(ngModel)]="wsEditName" />
                    <p-colorpicker [(ngModel)]="wsEditColor" />
                    <button pButton icon="pi pi-check" size="small" text severity="success"
                      (click)="saveWsEdit(label)"></button>
                    <button pButton icon="pi pi-times" size="small" text severity="secondary"
                      (click)="cancelWsEdit()"></button>
                  } @else {
                    <!-- Display mode -->
                    <span class="w-3 h-3 rounded-full flex-shrink-0 border border-gray-200"
                      [style.background]="label.color"></span>
                    <span class="flex-1 text-sm font-medium text-gray-800 dark:text-surface-100">{{ label.name }}</span>
                    <span class="text-xs text-gray-400">{{ label.taskCount }} tasks</span>

                    @if (isAdmin()) {
                      <button pButton icon="pi pi-pencil" size="small" text severity="secondary"
                        (click)="startWsEdit(label)"></button>
                      <button pButton icon="pi pi-trash" size="small" text severity="danger"
                        (click)="confirmDeleteWsLabel(label)"></button>
                    }
                  }
                </div>
              }
              @if (workspaceLabels().length === 0) {
                <div class="text-center py-6">
                  <i class="pi pi-globe text-3xl text-gray-300 mb-2"></i>
                  <p class="text-sm text-gray-400">Chưa có workspace label nào</p>
                </div>
              }
            </div>

            <!-- Create new workspace label (admin only) -->
            @if (isAdmin()) {
              <div class="border-t border-gray-100 dark:border-surface-700 pt-4">
                <h4 class="text-xs font-semibold text-gray-500 uppercase mb-2">Thêm workspace label</h4>
                <div class="flex items-center gap-2">
                  <input pInputText class="flex-1 text-sm" placeholder="Tên label..."
                    [(ngModel)]="wsNewName" />
                  <p-colorpicker [(ngModel)]="wsNewColor" />
                  <button
                    pButton label="+ Thêm" size="small"
                    (click)="createWsLabel()"
                    [disabled]="!wsNewName.trim()"
                  ></button>
                </div>
              </div>
            }
          </p-tabpanel>

          <!-- Project Labels Tab -->
          <p-tabpanel value="project">
            <div class="space-y-2 max-h-72 overflow-y-auto mb-4 mt-2">
              @for (label of projectLabels(); track label.id) {
                <div class="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 dark:hover:bg-surface-800">
                  <!-- Color swatch -->
                  <span class="w-4 h-4 rounded-full flex-shrink-0 border border-gray-200"
                    [style.background]="label.color"></span>

                  @if (editingId() === label.id) {
                    <!-- Inline edit mode -->
                    <input pInputText class="flex-1 text-sm" [(ngModel)]="editName" />
                    <p-colorpicker [(ngModel)]="editColor" />
                    <button pButton icon="pi pi-check" size="small" text severity="success"
                      (click)="saveEdit(label)"></button>
                    <button pButton icon="pi pi-times" size="small" text severity="secondary"
                      (click)="cancelEdit()"></button>
                  } @else {
                    <!-- Display mode -->
                    <span class="flex-1 text-sm font-medium text-gray-800 dark:text-surface-100">{{ label.name }}</span>
                    <span class="text-xs text-gray-400">{{ label.taskCount }} tasks</span>
                    <button pButton icon="pi pi-pencil" size="small" text severity="secondary"
                      (click)="startEdit(label)"></button>
                    <button pButton icon="pi pi-trash" size="small" text severity="danger"
                      (click)="confirmDelete(label)"></button>
                  }
                </div>
              }
              @if (projectLabels().length === 0) {
                <div class="text-center py-6">
                  <i class="pi pi-folder text-3xl text-gray-300 mb-2"></i>
                  <p class="text-sm text-gray-400">Chưa có project label nào</p>
                </div>
              }
            </div>

            <!-- Create new project label -->
            <div class="border-t border-gray-100 dark:border-surface-700 pt-4">
              <h4 class="text-xs font-semibold text-gray-500 uppercase mb-2">Tạo label mới</h4>
              <div class="flex items-center gap-2">
                <input pInputText class="flex-1 text-sm" placeholder="Tên label..." [(ngModel)]="newName" />
                <p-colorpicker [(ngModel)]="newColor" />
                <button
                  pButton label="Thêm" size="small"
                  (click)="createLabel()"
                  [disabled]="!newName.trim()"
                ></button>
              </div>
            </div>
          </p-tabpanel>
        </p-tabpanels>
      </p-tabs>
    </p-dialog>

    <p-toast />
    <p-confirmDialog />
  `,
})
export class LabelManagerComponent implements OnInit {
  readonly labelStore = inject(LabelStore);
  private readonly labelService = inject(LabelService);
  private readonly authStore = inject(AuthStore);
  private readonly confirmService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);

  @Input() projectId = '';
  @Input() workspaceId = '';
  visible = false;

  // Admin check
  protected readonly isAdmin = this.authStore.isAdmin;

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
  protected newName = '';
  protected newColor = '#6B7280';

  // Workspace label editing state
  protected wsEditingId = signal<string | null>(null);
  protected wsEditName = '';
  protected wsEditColor = '';
  protected wsNewName = '';
  protected wsNewColor = '#6B7280';

  ngOnInit(): void {
    if (this.projectId) this.labelStore.loadLabels(this.projectId);
  }

  open(): void {
    this.visible = true;
    if (this.projectId) this.labelStore.loadLabels(this.projectId);
    if (this.workspaceId) this.loadWorkspaceLabels();
  }

  private loadWorkspaceLabels(): void {
    if (!this.workspaceId) return;
    this.labelService.getWorkspaceLabels(this.workspaceId).subscribe(
      (data) => this.wsLabels.set(data),
    );
  }

  // --- Project Label Operations (existing behavior) ---

  protected async createLabel(): Promise<void> {
    if (!this.newName.trim()) return;
    await this.labelStore.createLabel(this.projectId, {
      name: this.newName.trim(),
      color: `#${this.newColor}`.replace('##', '#'),
    });
    this.newName = '';
    this.newColor = '#6B7280';
    this.messageService.add({ severity: 'success', summary: 'Thành công', detail: 'Đã tạo label mới' });
  }

  protected startEdit(label: Label & { taskCount: number }): void {
    this.editingId.set(label.id);
    this.editName = label.name;
    this.editColor = label.color;
  }

  protected saveEdit(label: Label & { taskCount: number }): void {
    this.labelStore.updateLabel(this.projectId, label.id, {
      name: this.editName.trim() || label.name,
      color: `#${this.editColor}`.replace('##', '#'),
    });
    this.editingId.set(null);
    this.messageService.add({ severity: 'success', summary: 'Thành công', detail: 'Đã cập nhật label' });
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
      accept: () => {
        this.labelStore.deleteLabel(this.projectId, label.id);
        this.messageService.add({ severity: 'success', summary: 'Thành công', detail: 'Đã xóa label' });
      },
    });
  }

  // --- Workspace Label Operations (admin only) ---

  protected async createWsLabel(): Promise<void> {
    if (!this.wsNewName.trim() || !this.workspaceId) return;
    const label = await this.labelStore.createWorkspaceLabel(this.workspaceId, {
      name: this.wsNewName.trim(),
      color: `#${this.wsNewColor}`.replace('##', '#'),
    });
    if (label) {
      this.wsLabels.update(prev => [...prev, { ...label, taskCount: 0 }]);
      this.wsNewName = '';
      this.wsNewColor = '#6B7280';
      this.messageService.add({ severity: 'success', summary: 'Thành công', detail: 'Đã tạo workspace label' });
    }
  }

  protected startWsEdit(label: Label & { taskCount: number }): void {
    this.wsEditingId.set(label.id);
    this.wsEditName = label.name;
    this.wsEditColor = label.color;
  }

  protected saveWsEdit(label: Label & { taskCount: number }): void {
    if (!this.workspaceId) return;
    this.labelStore.updateWorkspaceLabel(this.workspaceId, label.id, {
      name: this.wsEditName.trim() || label.name,
      color: `#${this.wsEditColor}`.replace('##', '#'),
    });
    this.wsLabels.update(prev =>
      prev.map(l => l.id === label.id ? { ...l, name: this.wsEditName.trim() || l.name, color: `#${this.wsEditColor}`.replace('##', '#') } : l)
    );
    this.wsEditingId.set(null);
    this.messageService.add({ severity: 'success', summary: 'Thành công', detail: 'Đã cập nhật workspace label' });
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
      accept: () => {
        this.labelStore.deleteWorkspaceLabel(this.workspaceId, label.id);
        this.wsLabels.update(prev => prev.filter(l => l.id !== label.id));
        this.messageService.add({ severity: 'success', summary: 'Thành công', detail: 'Đã xóa workspace label' });
      },
    });
  }
}
