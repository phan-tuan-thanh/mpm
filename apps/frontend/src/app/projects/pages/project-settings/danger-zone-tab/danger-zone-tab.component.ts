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
    <div class="space-y-5">

      @if (isReadOnly()) {
        <div class="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-3 flex gap-2 text-xs text-amber-700 dark:text-amber-400 font-medium">
          <i class="pi pi-lock text-sm mt-0.5"></i>
          <span>{{ t().readOnlyBanner }}</span>
        </div>
      }

      <!-- Danger actions card -->
      <div class="bg-white dark:bg-surface-900 rounded-xl border border-red-100 dark:border-red-900/40 shadow-sm divide-y divide-red-50 dark:divide-red-900/30">
        <!-- Archive -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-5 py-4">
          <div>
            <h3 class="text-sm font-semibold text-gray-800 dark:text-surface-100">{{ t().archiveTitle }}</h3>
            <p class="text-xs text-gray-400 dark:text-surface-500 mt-0.5 max-w-sm">{{ t().archiveDesc }}</p>
          </div>
          <button pButton (click)="onArchive()" [disabled]="isReadOnly() || isArchived() || isSubmitting()" [label]="t().archiveBtn" severity="warning" [outlined]="true" class="flex-shrink-0"></button>
        </div>

        <!-- Delete -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-5 py-4">
          <div>
            <h3 class="text-sm font-semibold text-red-600 dark:text-red-400">{{ t().deleteTitle }}</h3>
            <p class="text-xs text-gray-400 dark:text-surface-500 mt-0.5 max-w-sm">{{ t().deleteDesc }}</p>
          </div>
          <button pButton (click)="showDeleteDialog()" [disabled]="isReadOnly() || isSubmitting()" [label]="t().deleteBtn" severity="danger" class="flex-shrink-0"></button>
        </div>
      </div>

      <!-- Delete Confirmation Dialog -->
      <p-dialog
        [header]="t().dialogHeader"
        [(visible)]="displayDeleteDialog"
        [modal]="true"
        [style]="{ width: '450px' }"
        [draggable]="false"
        [resizable]="false"
        appendTo="body"
      >
        <div class="space-y-4 py-2 text-xs text-gray-600 dark:text-surface-300">
          <div class="rounded-lg bg-red-50 border border-red-100 p-3 text-red-700 flex gap-2">
            <i class="pi pi-exclamation-triangle text-base mt-0.5"></i>
            <div>
              <p class="font-bold">{{ t().dialogWarningTitle }}</p>
              <p class="mt-0.5">{{ t().dialogWarningText }}</p>
            </div>
          </div>

          <p class="font-medium">
            {{ t().dialogInstruction }} <strong class="text-indigo-600 font-bold">{{ projectKey() }}</strong> {{ t().dialogConfirmSuffix }}
          </p>

          <p-fluid>
            <input
              type="text"
              pInputText
              [(ngModel)]="confirmKeyInput"
              [placeholder]="t().dialogInputPlaceholder"
              class="uppercase text-center font-bold text-sm tracking-widest"
            />
          </p-fluid>
        </div>

        <ng-template pTemplate="footer">
          <div class="flex items-center justify-end gap-2 text-xs">
            <button
              pButton
              (click)="displayDeleteDialog = false"
              [label]="t().cancelBtn"
              severity="secondary"
              [text]="true"
              [fluid]="false"
            ></button>
            <button
              pButton
              (click)="onConfirmDelete()"
              [disabled]="confirmKeyInput !== projectKey() || isSubmitting()"
              [label]="t().dialogConfirmBtn"
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

  readonly t = computed(() => {
    const isEn = this.projectStore.projectLanguage() === 'en';
    return isEn ? {
      readOnlyBanner: 'Read-only view. Only Scrum Master or Admin can perform these actions.',
      archiveTitle: 'Archive Project',
      archiveDesc: 'The project will switch to read-only mode but will not be deleted from the system.',
      archiveBtn: 'Archive',
      deleteTitle: 'Permanently Delete Project',
      deleteDesc: 'Wipe all data: members, tasks, sprints. This action cannot be undone.',
      deleteBtn: 'Delete Project',
      dialogHeader: 'Confirm Permanent Project Deletion',
      dialogWarningTitle: 'Important Warning!',
      dialogWarningText: 'This action will completely delete all configuration and data of the project. It cannot be recovered.',
      dialogInstruction: 'Please enter the key',
      dialogConfirmSuffix: 'to confirm deletion:',
      dialogInputPlaceholder: 'Enter project key...',
      cancelBtn: 'Cancel',
      dialogConfirmBtn: 'I understand, delete this project',
      confirmArchiveHeader: 'Confirm Project Archive',
      confirmArchiveMsg: (name: string) => `Are you sure you want to archive project "${name}"? After archiving, you will no longer be able to edit its configuration.`,
      archiveSuccessSummary: 'Success',
      archiveSuccessDetail: 'The project has been moved to archived state.',
      archiveErrorSummary: 'Error',
      archiveErrorDetail: (msg: string) => msg || 'Could not archive project.',
      deleteSuccessSummary: 'Success',
      deleteSuccessDetail: (name: string) => `Project "${name}" has been permanently deleted.`,
      deleteErrorSummary: 'Error',
      deleteErrorDetail: (msg: string) => msg || 'Could not delete project.',
    } : {
      readOnlyBanner: 'Chế độ xem. Chỉ Scrum Master hoặc Admin mới có quyền thực hiện các thao tác này.',
      archiveTitle: 'Lưu trữ dự án',
      archiveDesc: 'Dự án sẽ chuyển sang chế độ chỉ đọc nhưng không bị xóa khỏi hệ thống.',
      archiveBtn: 'Lưu trữ',
      deleteTitle: 'Xóa vĩnh viễn dự án',
      deleteDesc: 'Xóa sạch toàn bộ dữ liệu: thành viên, tasks, sprints. Không thể khôi phục.',
      deleteBtn: 'Xóa dự án',
      dialogHeader: 'Xác nhận xóa vĩnh viễn dự án',
      dialogWarningTitle: 'Cảnh báo quan trọng!',
      dialogWarningText: 'Hành động này sẽ xóa sạch toàn bộ cấu hình và dữ liệu của dự án. Không thể khôi phục lại.',
      dialogInstruction: 'Vui lòng nhập mã định danh',
      dialogConfirmSuffix: 'để xác nhận xóa:',
      dialogInputPlaceholder: 'Nhập mã dự án...',
      cancelBtn: 'Hủy',
      dialogConfirmBtn: 'Tôi hiểu, hãy xóa dự án này',
      confirmArchiveHeader: 'Xác nhận lưu trữ dự án',
      confirmArchiveMsg: (name: string) => `Bạn có chắc chắn muốn lưu trữ dự án "${name}"? Sau khi lưu trữ, dự án sẽ không cho phép chỉnh sửa cấu hình nữa.`,
      archiveSuccessSummary: 'Thành công',
      archiveSuccessDetail: 'Dự án đã được chuyển sang trạng thái lưu trữ.',
      archiveErrorSummary: 'Lỗi',
      archiveErrorDetail: (msg: string) => msg || 'Không thể lưu trữ dự án.',
      deleteSuccessSummary: 'Thành công',
      deleteSuccessDetail: (name: string) => `Dự án "${name}" đã bị xóa vĩnh viễn.`,
      deleteErrorSummary: 'Lỗi',
      deleteErrorDetail: (msg: string) => msg || 'Không thể xóa dự án.',
    };
  });

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

    const trans = this.t();
    this.confirmService.confirm({
      message: trans.confirmArchiveMsg(project.name),
      header: trans.confirmArchiveHeader,
      icon: 'pi pi-folder',
      acceptLabel: trans.archiveBtn,
      rejectLabel: trans.cancelBtn,
      acceptButtonStyleClass: 'p-button-warning',
      rejectButtonStyleClass: 'p-button-secondary p-button-text',
      accept: () => {
        this.isSubmitting.set(true);
        this.projectService.archiveProject(project.id).subscribe({
          next: (updatedProj) => {
            this.isSubmitting.set(false);
            this.messageService.add({
              severity: 'success',
              summary: trans.archiveSuccessSummary,
              detail: trans.archiveSuccessDetail,
            });
            this.projectStore.setCurrentProject(updatedProj);
          },
          error: (err) => {
            this.isSubmitting.set(false);
            this.messageService.add({
              severity: 'error',
              summary: trans.archiveErrorSummary,
              detail: trans.archiveErrorDetail(err.error?.message),
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
    const trans = this.t();
    this.projectService.deleteProject(project.id).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.displayDeleteDialog = false;
        this.messageService.add({
          severity: 'success',
          summary: trans.deleteSuccessSummary,
          detail: trans.deleteSuccessDetail(project.name),
        });
        this.projectStore.loadProjects(); // Reload projects list
        void this.router.navigate(['/projects']);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.messageService.add({
          severity: 'error',
          summary: trans.deleteErrorSummary,
          detail: trans.deleteErrorDetail(err.error?.message),
        });
      },
    });
  }
}
