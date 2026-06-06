import { Component, OnInit, inject, computed, signal } from '@angular/core';
import { ProjectStore } from '../../../state/project.store';
import { ProjectService } from '../../../services/project.service';
import { AuthService } from '../../../../auth/services/auth.service';
import { CommonModule } from '@angular/common';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { FluidModule } from 'primeng/fluid';
import { ChipModule } from 'primeng/chip';
import { SelectModule } from 'primeng/select';
import { MessageService } from 'primeng/api';
import { FormsModule } from '@angular/forms';
import { ProjectNetwork } from '@mpm/shared-types';
import type { TiptapDoc } from '@mpm/shared-types';
import { RichTextEditorComponent } from '../../../../shared/components/rich-text-editor/rich-text-editor.component';

@Component({
  standalone: true,
  selector: 'app-general-tab',
  imports: [
    CommonModule,
    InputTextModule,
    ButtonModule,
    FluidModule,
    ChipModule,
    SelectModule,
    FormsModule,
    RichTextEditorComponent,
  ],
  template: `
    <div class="bg-white rounded-xl border border-gray-100 p-6 shadow-sm max-w-xl space-y-6">
      <h2 class="text-lg font-bold text-gray-900 mb-4 border-b border-gray-50 pb-2">
        Thông tin chung
      </h2>

      <!-- Cover Image Section -->
      <div class="flex flex-col gap-2">
        <label class="text-sm font-semibold text-gray-700">Ảnh bìa dự án</label>
        <div class="relative group rounded-xl overflow-hidden border border-gray-200 bg-gray-50 h-36 flex items-center justify-center">
          @if (coverImageUrl()) {
            <img [src]="coverImageUrl()" class="w-full h-full object-cover" />
            @if (!isReadOnly()) {
              <div class="absolute inset-0 bg-black/45 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition duration-200">
                <button
                  pButton
                  type="button"
                  icon="pi pi-trash"
                  severity="danger"
                  size="small"
                  label="Xóa ảnh bìa"
                  (click)="onDeleteCover()"
                ></button>
              </div>
            }
          } @else {
            <div class="text-center p-4">
              <i class="pi pi-image text-3xl text-gray-400 mb-1"></i>
              <p class="text-xs text-gray-450">Không có ảnh bìa</p>
            </div>
          }
        </div>
        @if (!isReadOnly()) {
          <div class="flex items-center gap-2 mt-1">
            <input
              type="file"
              #coverInput
              accept="image/png, image/jpeg, image/webp"
              class="hidden"
              (change)="onCoverFileSelected($event)"
            />
            <button
              pButton
              type="button"
              icon="pi pi-upload"
              label="Tải lên ảnh bìa"
              severity="secondary"
              size="small"
              [outlined]="true"
              (click)="coverInput.click()"
              [disabled]="isUploadingCover()"
            ></button>
            <span class="text-xs text-gray-400 font-medium">Hỗ trợ JPG, PNG, WEBP tối đa 5MB</span>
          </div>
        }
      </div>

      <form (submit)="onSubmit($event)">
        <p-fluid class="block space-y-5">
          <!-- Project Emoji and Name -->
          <div class="flex gap-4">
            <!-- Emoji Select -->
            <div class="flex-shrink-0 flex flex-col gap-2 relative">
              <label class="text-sm font-semibold text-gray-700">Emoji</label>
              <button
                pButton
                type="button"
                [label]="emoji || '🚀'"
                [disabled]="isReadOnly() || isSubmitting()"
                (click)="showEmojiPicker.set(!showEmojiPicker())"
                class="h-10 w-12 text-lg flex items-center justify-center p-0 border border-gray-200 bg-white"
              ></button>
              @if (showEmojiPicker()) {
                <div class="absolute left-0 top-20 bg-white border border-gray-200 rounded-xl shadow-xl p-3 z-50 w-64">
                  <div class="grid grid-cols-5 gap-2 max-h-48 overflow-y-auto">
                    @for (e of commonEmojis; track e) {
                      <button
                        type="button"
                        class="h-8 w-8 text-lg rounded hover:bg-gray-150 transition flex items-center justify-center cursor-pointer border-none bg-transparent"
                        (click)="selectEmoji(e)"
                      >
                        {{ e }}
                      </button>
                    }
                  </div>
                </div>
              }
            </div>

            <!-- Project Name -->
            <div class="flex-1 flex flex-col gap-2">
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
            <label class="text-sm font-semibold text-gray-700">Mô tả</label>
            <app-rich-text-editor toolbarMode="full" name="description" [(ngModel)]="description" placeholder="Không có mô tả cho dự án này."></app-rich-text-editor>
          </div>

          <!-- Network (Quyền riêng tư) -->
          <div class="flex flex-col gap-2">
            <label class="text-sm font-semibold text-gray-700">Quyền riêng tư</label>
            <div class="flex gap-2">
              <button
                type="button"
                pButton
                [label]="'Bảo mật (Secret)'"
                [severity]="network === ProjectNetwork.SECRET ? 'primary' : 'secondary'"
                [outlined]="network !== ProjectNetwork.SECRET"
                [disabled]="isReadOnly() || isSubmitting()"
                class="flex-1 text-xs py-2"
                (click)="network = ProjectNetwork.SECRET"
              ></button>
              <button
                type="button"
                pButton
                [label]="'Công khai (Public)'"
                [severity]="network === ProjectNetwork.PUBLIC ? 'primary' : 'secondary'"
                [outlined]="network !== ProjectNetwork.PUBLIC"
                [disabled]="isReadOnly() || isSubmitting()"
                class="flex-1 text-xs py-2"
                (click)="network = ProjectNetwork.PUBLIC"
              ></button>
            </div>
            <span class="text-[11px] text-gray-450 font-medium px-1">
              @if (network === ProjectNetwork.SECRET) {
                Chỉ thành viên được mời mới có thể truy cập dự án này.
              } @else {
                Tất cả mọi người trong workspace đều có thể tìm thấy và tự tham gia dự án này.
              }
            </span>
          </div>

          <!-- Lead & Timezone -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Lead -->
            <div class="flex flex-col gap-2">
              <label for="leadId" class="text-sm font-semibold text-gray-700">Người phụ trách (Lead)</label>
              <p-select
                id="leadId"
                [options]="leadOptions()"
                [(ngModel)]="leadId"
                name="leadId"
                optionLabel="label"
                optionValue="value"
                [disabled]="isReadOnly() || isSubmitting()"
                placeholder="Chọn người phụ trách"
              ></p-select>
            </div>

            <!-- Timezone -->
            <div class="flex flex-col gap-2">
              <label for="timezone" class="text-sm font-semibold text-gray-700">Múi giờ</label>
              <p-select
                id="timezone"
                [options]="timezoneOptions"
                [(ngModel)]="timezone"
                name="timezone"
                optionLabel="label"
                optionValue="value"
                [filter]="true"
                [disabled]="isReadOnly() || isSubmitting()"
                placeholder="Chọn múi giờ"
              ></p-select>
            </div>
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
  readonly ProjectNetwork = ProjectNetwork;
  readonly projectStore = inject(ProjectStore);
  private readonly projectService = inject(ProjectService);
  private readonly authService = inject(AuthService);
  private readonly messageService = inject(MessageService);

  // States
  name = '';
  description: TiptapDoc | null = null;
  emoji = '🚀';
  network = ProjectNetwork.SECRET;
  leadId: string | null = null;
  timezone = 'Asia/Ho_Chi_Minh';

  readonly isSubmitting = signal<boolean>(false);
  readonly isUploadingCover = signal<boolean>(false);
  readonly showEmojiPicker = signal<boolean>(false);

  readonly commonEmojis = [
    '🚀', '💻', '🎨', '📝', '📊', '🔍', '⚙️', '📅', '👥', '🔔',
    '📎', '🔒', '🌍', '💡', '🔥', '✨', '⚡️', '🛠️', '📦', '🎯',
  ];

  readonly coverImageUrl = computed(() => {
    return this.projectStore.currentProject()?.coverImageUrl || null;
  });

  readonly projectKey = computed(() => {
    return this.projectStore.currentProject()?.key || '';
  });

  // Lead options computed
  readonly leadOptions = computed(() => {
    return this.projectStore.members().map((m) => ({
      label: m.displayName || m.email,
      value: m.userId,
    }));
  });

  // Timezone options
  readonly timezoneOptions = Intl.supportedValuesOf('timeZone').map((tz) => ({
    label: tz,
    value: tz,
  }));

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
      this.description = project.description ?? null;
      this.emoji = project.emoji || '🚀';
      this.network = project.network || ProjectNetwork.SECRET;
      this.leadId = project.lead?.userId || null;
      this.timezone = project.timezone || 'Asia/Ho_Chi_Minh';
      
      // Load members for dropdown selection
      this.projectStore.loadMembers(project.id);
    }
  }

  selectEmoji(e: string): void {
    this.emoji = e;
    this.showEmojiPicker.set(false);
  }

  onCoverFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      this.messageService.add({
        severity: 'error',
        summary: 'Kích thước file lớn',
        detail: 'Kích thước ảnh bìa không được vượt quá 5MB.',
      });
      return;
    }

    const project = this.projectStore.currentProject();
    if (!project) return;

    this.isUploadingCover.set(true);

    this.projectService.uploadCover(project.id, file).subscribe({
      next: (res) => {
        this.isUploadingCover.set(false);
        this.projectStore.setCurrentProject({
          ...project,
          coverImageUrl: res.coverImageUrl + '?t=' + Date.now(),
        });
        this.messageService.add({
          severity: 'success',
          summary: 'Thành công',
          detail: 'Tải lên ảnh bìa thành công.',
        });
      },
      error: (err) => {
        this.isUploadingCover.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Tải lên thất bại',
          detail: err.error?.message || 'Có lỗi xảy ra khi tải lên ảnh bìa.',
        });
      },
    });
  }

  onDeleteCover(): void {
    const project = this.projectStore.currentProject();
    if (!project) return;

    this.projectService.deleteCover(project.id).subscribe({
      next: () => {
        this.projectStore.setCurrentProject({
          ...project,
          coverImageUrl: null,
        });
        this.messageService.add({
          severity: 'success',
          summary: 'Thành công',
          detail: 'Đã xóa ảnh bìa dự án.',
        });
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Xóa thất bại',
          detail: err.error?.message || 'Có lỗi xảy ra khi xóa ảnh bìa.',
        });
      },
    });
  }

  onSubmit(event: Event): void {
    event.preventDefault();
    const project = this.projectStore.currentProject();
    if (!project || !this.name || this.isReadOnly()) return;

    this.isSubmitting.set(true);

    this.projectService
      .updateProject(project.id, {
        name: this.name,
        description: this.description ?? null,
        emoji: this.emoji,
        network: this.network,
        leadId: this.leadId,
        timezone: this.timezone,
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
