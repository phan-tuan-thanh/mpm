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
    <div class="space-y-4">

      <!-- Header -->
      <div>
        <h2 class="text-base font-bold text-red-600 dark:text-red-400">Danger Zone</h2>
        <p class="text-xs text-gray-400 dark:text-surface-500 mt-0.5">Các thao tác không thể hoàn tác đối với dự án này.</p>
      </div>

      @if (isReadOnly()) {
        <div class="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-3 flex gap-2 text-xs text-amber-700 dark:text-amber-400 font-medium">
          <i class="pi pi-lock text-sm mt-0.5"></i>
          <span>Chế độ xem. Chỉ Scrum Master hoặc Admin mới có quyền thực hiện các thao tác này.</span>
        </div>
      }

      <!-- Danger actions card -->
      <div class="bg-white dark:bg-surface-900 rounded-xl border border-red-100 dark:border-red-900/40 shadow-sm divide-y divide-red-50 dark:divide-red-900/30">
        <!-- Archive -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-5 py-4">
          <div>
            <h3 class="text-sm font-semibold text-gray-800 dark:text-surface-100">Lưu trữ dự án</h3>
            <p class="text-xs text-gray-400 dark:text-surface-500 mt-0.5 max-w-sm">Dự án sẽ chuyển sang chế độ chỉ đọc nhưng không bị xóa khỏi hệ thống.</p>
          </div>
          <button pButton (click)="onArchive()" [disabled]="isReadOnly() || isArchived() || isSubmitting()" label="Lưu trữ" severity="warning" [outlined]="true" class="flex-shrink-0"></button>
        </div>

        <!-- Delete -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-5 py-4">
          <div>
            <h3 class="text-sm font-semibold text-red-600 dark:text-red-400">Xóa vĩnh viễn dự án</h3>
            <p class="text-xs text-gray-400 dark:text-surface-500 mt-0.5 max-w-sm">Xóa sạch toàn bộ dữ liệu: thành viên, tasks, sprints. Không thể khôi phục.</p>
          </div>
          <button pButton (click)="showDeleteDialog()" [disabled]="isReadOnly() || isSubmitting()" label="Xóa dự án" severity="danger" class="flex-shrink-0"></button>
        </div>
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
        <div class="space-y-4 py-2 text-xs text-gray-600 dark:text-surface-300">
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
