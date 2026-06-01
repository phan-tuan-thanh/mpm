import { Component, OnInit, inject, computed, signal } from '@angular/core';
import { ProjectStore } from '../../../state/project.store';
import { ProjectService } from '../../../services/project.service';
import { AuthService } from '../../../../auth/services/auth.service';
import { CommonModule } from '@angular/common';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ButtonModule } from 'primeng/button';
import { FluidModule } from 'primeng/fluid';
import { ChipModule } from 'primeng/chip';
import { MessageService } from 'primeng/api';
import { FormsModule } from '@angular/forms';

@Component({
  standalone: true,
  selector: 'app-general-tab',
  imports: [CommonModule, InputTextModule, TextareaModule, ButtonModule, FluidModule, ChipModule, FormsModule],
  template: `
    <div class="bg-white rounded-xl border border-gray-100 p-6 shadow-sm max-w-xl">
      <h2 class="text-lg font-bold text-gray-900 mb-4 border-b border-gray-50 pb-2">
        Thông tin chung
      </h2>

      <form (submit)="onSubmit($event)">
        <p-fluid class="block space-y-5">
          <!-- Project Name -->
          <div class="flex flex-col gap-2">
            <label for="name" class="text-sm font-semibold text-gray-700">Tên dự án <span class="text-red-500">*</span></label>
            <input
              id="name"
              name="name"
              type="text"
              pInputText
              [(ngModel)]="name"
              [disabled]="isReadOnly() || isSubmitting()"
              required
              maxlength="100"
            />
          </div>

          <!-- Project Key (Read-Only) -->
          <div class="flex flex-col gap-2">
            <label class="text-sm font-semibold text-gray-700">Mã dự án (Key)</label>
            <div class="flex items-center gap-2">
              <p-chip
                [label]="projectKey()"
                class="font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded px-2.5 py-1 text-xs"
              ></p-chip>
              <span class="text-xs text-gray-400 font-medium">
                <i class="pi pi-lock text-[10px] mr-1"></i> Không thể thay đổi sau khi tạo
              </span>
            </div>
          </div>

          <!-- Description -->
          <div class="flex flex-col gap-2">
            <label for="description" class="text-sm font-semibold text-gray-700">Mô tả</label>
            <textarea
              id="description"
              name="description"
              [rows]="4"
              pTextarea
              [(ngModel)]="description"
              [disabled]="isReadOnly() || isSubmitting()"
              maxlength="2000"
              placeholder="Không có mô tả cho dự án này."
            ></textarea>
          </div>

          <!-- Submit Buttons -->
          @if (!isReadOnly()) {
            <div class="flex justify-end pt-3 border-t border-gray-50">
              <button
                pButton
                type="submit"
                label="Lưu thay đổi"
                [disabled]="isSubmitting() || !name"
                [fluid]="false"
              ></button>
            </div>
          } @else {
            <div class="rounded-lg bg-gray-50 p-3 flex gap-2 text-xs text-gray-500 font-medium">
              <i class="pi pi-info-circle text-gray-400 mt-0.5"></i>
              <span>Bạn đang ở chế độ xem. Chỉ Scrum Master hoặc Admin hệ thống mới có thể chỉnh sửa cấu hình dự án.</span>
            </div>
          }
        </p-fluid>
      </form>
    </div>
  `,
})
export class GeneralTabComponent implements OnInit {
  readonly projectStore = inject(ProjectStore);
  private readonly projectService = inject(ProjectService);
  private readonly authService = inject(AuthService);
  private readonly messageService = inject(MessageService);

  // States
  name = '';
  description = '';
  readonly isSubmitting = signal<boolean>(false);

  readonly projectKey = computed(() => {
    return this.projectStore.currentProject()?.key || '';
  });

  // Kiểm tra quyền read-only
  readonly isReadOnly = computed(() => {
    const project = this.projectStore.currentProject();
    if (!project) return true;

    const user = this.authService.currentUser();
    if (!user) return true;

    if (user.systemRole === 'Admin') return false;

    // Xem member list tìm current user role
    const member = this.projectStore.members().find((m) => m.userId === user.id);
    return member?.projectRole !== 'Scrum_Master';
  });

  ngOnInit(): void {
    const project = this.projectStore.currentProject();
    if (project) {
      this.name = project.name;
      this.description = project.description || '';
    }
  }

  onSubmit(event: Event): void {
    event.preventDefault();
    const project = this.projectStore.currentProject();
    if (!project || !this.name || this.isReadOnly()) return;

    this.isSubmitting.set(true);

    this.projectService
      .updateProject(project.id, {
        name: this.name,
        description: this.description || undefined,
      })
      .subscribe({
        next: (updatedProject) => {
          this.isSubmitting.set(false);
          this.messageService.add({
            severity: 'success',
            summary: 'Thành công',
            detail: 'Cấu hình dự án đã được cập nhật.',
          });
          // Update store
          this.projectStore.setCurrentProject(updatedProject);
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Thất bại',
            detail: err.error?.message || 'Có lỗi xảy ra khi cập nhật.',
          });
        },
      });
  }
}
