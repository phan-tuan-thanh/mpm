import { Component, inject, computed, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ProjectStore } from '../../../state/project.store';
import { ProjectService } from '../../../services/project.service';
import { AuthService } from '../../../../auth/services/auth.service';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { FluidModule } from 'primeng/fluid';
import { ConfirmationService, MessageService } from 'primeng/api';
import { FormsModule } from '@angular/forms';

@Component({
  standalone: true,
  selector: 'app-danger-zone-tab',
  imports: [CommonModule, ButtonModule, DialogModule, InputTextModule, FluidModule, FormsModule],
  template: `
    <div class="bg-white rounded-xl border border-red-100 p-6 shadow-sm max-w-xl space-y-6">
      <h2 class="text-lg font-bold text-red-700 border-b border-red-50 pb-2">
        Danger Zone
      </h2>

      <!-- Read-only Mode Warning -->
      @if (isReadOnly()) {
        <div class="rounded-lg bg-gray-50 p-3 flex gap-2 text-xs text-gray-500 font-medium">
          <i class="pi pi-info-circle text-gray-400 mt-0.5"></i>
          <span>Bạn đang ở chế độ xem. Chỉ Scrum Master hoặc Admin hệ thống mới có quyền truy cập Danger Zone.</span>
        </div>
      }

      <!-- Archive Project Section -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-2 border-b border-gray-100">
        <div class="space-y-1">
          <h3 class="text-sm font-bold text-gray-800">Lưu trữ dự án (Archive)</h3>
          <p class="text-xs text-gray-500 max-w-sm">
            Chuyển trạng thái dự án sang lưu trữ. Dự án sẽ ở chế độ chỉ đọc nhưng không bị xóa khỏi hệ thống.
          </p>
        </div>
        <button
          pButton
          (click)="onArchive()"
          [disabled]="isReadOnly() || isArchived() || isSubmitting()"
          label="Lưu trữ dự án"
          severity="warning"
          [outlined]="true"
        ></button>
      </div>

      <!-- Delete Project Section -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-2">
        <div class="space-y-1">
          <h3 class="text-sm font-bold text-gray-800">Xóa vĩnh viễn dự án (Delete)</h3>
          <p class="text-xs text-gray-500 max-w-sm text-red-500/80">
            Hành động này sẽ xóa vĩnh viễn dự án này cùng tất cả dữ liệu liên quan (thành viên, tasks, sprints). Không thể hoàn tác.
          </p>
        </div>
        <button
          pButton
          (click)="showDeleteDialog()"
          [disabled]="isReadOnly() || isSubmitting()"
          label="Xóa dự án"
          severity="danger"
        ></button>
      </div>

      <!-- Delete Confirmation Dialog -->
      <p-dialog
        header="Xác nhận xóa vĩnh viễn dự án"
        [(visible)]="displayDeleteDialog"
        [modal]="true"
        [style]="{ width: '450px' }"
        [draggable]="false"
        [resizable]="false"
      >
        <div class="space-y-4 py-2 text-xs text-gray-600">
          <div class="rounded-lg bg-red-50 border border-red-100 p-3 text-red-700 flex gap-2">
            <i class="pi pi-exclamation-triangle text-base mt-0.5"></i>
            <div>
              <p class="font-bold">Cảnh báo quan trọng!</p>
              <p class="mt-0.5">Hành động này sẽ xóa sạch toàn bộ cấu hình và dữ liệu của dự án. Không thể khôi phục lại.</p>
            </div>
          </div>

          <p class="font-medium">
            Vui lòng nhập mã định danh <strong class="text-indigo-600 font-bold">{{ projectKey() }}</strong> để xác nhận xóa:
          </p>

          <p-fluid>
            <input
              type="text"
              pInputText
              [(ngModel)]="confirmKeyInput"
              placeholder="Nhập mã dự án..."
              class="uppercase text-center font-bold text-sm tracking-widest"
            />
          </p-fluid>
        </div>

        <ng-template pTemplate="footer">
          <div class="flex items-center justify-end gap-2 text-xs">
            <button
              pButton
              (click)="displayDeleteDialog = false"
              label="Hủy"
              severity="secondary"
              [text]="true"
              [fluid]="false"
            ></button>
            <button
              pButton
              (click)="onConfirmDelete()"
              [disabled]="confirmKeyInput !== projectKey() || isSubmitting()"
              label="Tôi hiểu, hãy xóa dự án này"
              severity="danger"
              [fluid]="false"
            ></button>
          </div>
        </ng-template>
      </p-dialog>
    </div>
  `,
})
export class DangerZoneTabComponent {
  readonly projectStore = inject(ProjectStore);
  private readonly projectService = inject(ProjectService);
  private readonly authService = inject(AuthService);
  private readonly confirmService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);
  private readonly router = inject(Router);

  // States
  displayDeleteDialog = false;
  confirmKeyInput = '';
  readonly isSubmitting = signal<boolean>(false);

  readonly projectKey = computed(() => {
    return this.projectStore.currentProject()?.key || '';
  });

  readonly isArchived = computed(() => {
    return this.projectStore.currentProject()?.status === 'archived';
  });

  // Check read-only state
  readonly isReadOnly = computed(() => {
    const project = this.projectStore.currentProject();
    if (!project) return true;

    const user = this.authService.currentUser();
    if (!user) return true;

    if (user.systemRole === 'Admin') return false;

    const member = this.projectStore.members().find((m) => m.userId === user.id);
    return member?.projectRole !== 'Scrum_Master';
  });

  onArchive(): void {
    const project = this.projectStore.currentProject();
    if (!project || this.isReadOnly()) return;

    this.confirmService.confirm({
      message: `Bạn có chắc chắn muốn lưu trữ dự án "${project.name}"? Sau khi lưu trữ, dự án sẽ không cho phép chỉnh sửa cấu hình nữa.`,
      header: 'Xác nhận lưu trữ dự án',
      icon: 'pi pi-folder',
      acceptLabel: 'Lưu trữ',
      rejectLabel: 'Hủy',
      acceptButtonStyleClass: 'p-button-warning',
      rejectButtonStyleClass: 'p-button-secondary p-button-text',
      accept: () => {
        this.isSubmitting.set(true);
        this.projectService.archiveProject(project.id).subscribe({
          next: (updatedProj) => {
            this.isSubmitting.set(false);
            this.messageService.add({
              severity: 'success',
              summary: 'Thành công',
              detail: 'Dự án đã được chuyển sang trạng thái lưu trữ.',
            });
            this.projectStore.setCurrentProject(updatedProj);
          },
          error: (err) => {
            this.isSubmitting.set(false);
            this.messageService.add({
              severity: 'error',
              summary: 'Lỗi',
              detail: err.error?.message || 'Không thể lưu trữ dự án.',
            });
          },
        });
      },
    });
  }

  showDeleteDialog(): void {
    this.confirmKeyInput = '';
    this.displayDeleteDialog = true;
  }

  onConfirmDelete(): void {
    const project = this.projectStore.currentProject();
    if (!project || this.confirmKeyInput !== project.key || this.isReadOnly()) return;

    this.isSubmitting.set(true);
    this.projectService.deleteProject(project.id).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.displayDeleteDialog = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Thành công',
          detail: `Dự án "${project.name}" đã bị xóa vĩnh viễn.`,
        });
        this.projectStore.loadProjects(); // Reload projects list
        void this.router.navigate(['/projects']);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Lỗi',
          detail: err.error?.message || 'Không thể xóa dự án.',
        });
      },
    });
  }
}
