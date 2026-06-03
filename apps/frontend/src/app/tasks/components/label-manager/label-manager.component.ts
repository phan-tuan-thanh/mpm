import { Component, OnInit, inject, signal, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ColorPickerModule } from 'primeng/colorpicker';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';

import { LabelStore } from '../../state/label.store';
import type { Label } from '@mpm/shared-types';

@Component({
  standalone: true,
  selector: 'app-label-manager',
  imports: [
    CommonModule, FormsModule,
    DialogModule, ButtonModule, InputTextModule, ColorPickerModule, ConfirmDialogModule,
  ],
  providers: [ConfirmationService, MessageService],
  template: `
    <p-dialog
      [(visible)]="visible"
      header="Quản lý Labels"
      [modal]="true"
      [style]="{ width: '480px' }"
      (onHide)="visible = false"
    >
      <!-- Label list -->
      <div class="space-y-2 max-h-72 overflow-y-auto mb-4">
        @for (label of labelStore.labels(); track label.id) {
          <div class="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 dark:hover:bg-surface-800">
            <!-- Color swatch -->
            <span class="w-4 h-4 rounded-full flex-shrink-0 border border-gray-200"
              [style.background]="label.color"></span>

            @if (editingId() === label.id) {
              <!-- Inline edit mode -->
              <input pInputText class="flex-1 text-sm" [(ngModel)]="editName" />
              <p-colorpicker [(ngModel)]="editColor" />
              <button pButton icon="pi pi-check" size="small" text severity="success" (click)="saveEdit(label)"></button>
              <button pButton icon="pi pi-times" size="small" text severity="secondary" (click)="cancelEdit()"></button>
            } @else {
              <!-- Display mode -->
              <span class="flex-1 text-sm font-medium text-gray-800 dark:text-surface-100">{{ label.name }}</span>
              <span class="text-xs text-gray-400">{{ label.taskCount }} tasks</span>
              <button pButton icon="pi pi-pencil" size="small" text severity="secondary" (click)="startEdit(label)"></button>
              <button pButton icon="pi pi-trash" size="small" text severity="danger"
                (click)="confirmDelete(label)"></button>
            }
          </div>
        }
        @if (labelStore.labels().length === 0) {
          <p class="text-sm text-gray-400 text-center py-4">Chưa có label nào</p>
        }
      </div>

      <!-- Create new label -->
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
    </p-dialog>

    <p-confirmDialog />
  `,
})
export class LabelManagerComponent implements OnInit {
  readonly labelStore = inject(LabelStore);
  private readonly confirmService = inject(ConfirmationService);

  @Input() projectId = '';
  visible = false;

  protected newName = '';
  protected newColor = '#6B7280';
  protected editingId = signal<string | null>(null);
  protected editName = '';
  protected editColor = '';

  ngOnInit(): void {
    if (this.projectId) this.labelStore.loadLabels(this.projectId);
  }

  open(): void {
    this.visible = true;
    if (this.projectId) this.labelStore.loadLabels(this.projectId);
  }

  protected async createLabel(): Promise<void> {
    if (!this.newName.trim()) return;
    await this.labelStore.createLabel(this.projectId, {
      name: this.newName.trim(),
      color: `#${this.newColor}`.replace('##', '#'),
    });
    this.newName = '';
    this.newColor = '#6B7280';
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
      accept: () => this.labelStore.deleteLabel(this.projectId, label.id),
    });
  }
}
