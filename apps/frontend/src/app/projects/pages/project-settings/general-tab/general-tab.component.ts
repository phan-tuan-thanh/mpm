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
    <form (submit)="onSubmit($event)">

      <!-- Read-only banner -->
      @if (isReadOnly()) {
        <div class="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-3 flex gap-2 text-xs text-amber-700 dark:text-amber-400 font-medium mb-5">
          <i class="pi pi-lock text-sm mt-0.5"></i>
          <span>Chế độ xem. Chỉ Scrum Master hoặc Admin mới có thể chỉnh sửa.</span>
        </div>
      }

      <!-- 2-column layout: main content left, metadata right -->
      <div class="flex flex-col xl:flex-row gap-5 items-start">

        <!-- Left: cover + name + description -->
        <div class="flex-1 min-w-0 space-y-5">

          <!-- Card: Nhận diện dự án -->
          <div class="bg-surface-0 dark:bg-surface-900 rounded-xl border border-surface-100 dark:border-surface-800 shadow-sm overflow-hidden">
            <div class="px-5 py-3.5 border-b border-surface-100 dark:border-surface-800">
              <h2 class="text-sm font-bold text-gray-900 dark:text-surface-0">Nhận diện dự án</h2>
              <p class="text-xs text-gray-400 dark:text-surface-500 mt-0.5">Tên, biểu tượng và ảnh bìa hiển thị cho toàn bộ thành viên.</p>
            </div>
            <div class="p-5 space-y-4">

              <!-- Cover image -->
              <div class="flex flex-col gap-2">
                <div class="relative group rounded-lg overflow-hidden border border-gray-200 dark:border-surface-700 bg-gray-50 dark:bg-surface-800 h-32 flex items-center justify-center">
                  @if (coverImageUrl()) {
                    <img [src]="coverImageUrl()" class="w-full h-full object-cover" />
                    @if (!isReadOnly()) {
                      <div class="absolute inset-0 bg-black/45 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition duration-200">
                        <button pButton type="button" icon="pi pi-trash" severity="danger" size="small" label="Xóa ảnh bìa" [fluid]="false" (click)="onDeleteCover()"></button>
                      </div>
                    }
                  } @else {
                    <div class="flex flex-col items-center gap-1">
                      <i class="pi pi-image text-2xl text-gray-300 dark:text-surface-600"></i>
                      <p class="text-xs text-gray-400 dark:text-surface-500">Không có ảnh bìa</p>
                    </div>
                  }
                </div>
                @if (!isReadOnly()) {
                  <div class="flex items-center gap-2">
                    <input type="file" #coverInput accept="image/png, image/jpeg, image/webp" class="hidden" (change)="onCoverFileSelected($event)" />
                    <button pButton type="button" icon="pi pi-upload" label="Tải lên ảnh bìa" severity="secondary" size="small" [outlined]="true" [fluid]="false" (click)="coverInput.click()" [disabled]="isUploadingCover()"></button>
                    <span class="text-xs text-gray-400 dark:text-surface-500">JPG, PNG, WEBP · tối đa 5MB</span>
                  </div>
                }
              </div>

              <!-- Emoji + Name -->
              <div class="flex gap-3 items-end">
                <div class="flex-shrink-0 flex flex-col gap-1.5 relative">
                  <label class="text-xs font-semibold text-gray-500 dark:text-surface-400 uppercase tracking-wider">Icon</label>
                  <button
                    pButton type="button"
                    [label]="emoji || '🚀'"
                    [disabled]="isReadOnly() || isSubmitting()"
                    (click)="showEmojiPicker.set(!showEmojiPicker())"
                    class="h-10 w-12 text-lg flex items-center justify-center p-0 border border-gray-200 dark:border-surface-700 bg-white dark:bg-surface-800"
                  ></button>
                  @if (showEmojiPicker()) {
                    <div class="absolute left-0 top-16 bg-white dark:bg-surface-800 border border-gray-200 dark:border-surface-700 rounded-xl shadow-xl p-3 z-50 w-64">
                      <div class="grid grid-cols-5 gap-2 max-h-48 overflow-y-auto">
                        @for (e of commonEmojis; track e) {
                          <button type="button" class="h-8 w-8 text-lg rounded hover:bg-gray-100 dark:hover:bg-surface-700 transition flex items-center justify-center cursor-pointer border-none bg-transparent" (click)="selectEmoji(e)">{{ e }}</button>
                        }
                      </div>
                    </div>
                  }
                </div>
                <div class="flex-1 flex flex-col gap-1.5 max-w-lg">
                  <label for="name" class="text-xs font-semibold text-gray-500 dark:text-surface-400 uppercase tracking-wider">Tên dự án <span class="text-red-500 normal-case">*</span></label>
                  <input id="name" name="name" type="text" pInputText [(ngModel)]="name" [disabled]="isReadOnly() || isSubmitting()" required maxlength="100" />
                </div>
              </div>

            </div>
          </div>

          <!-- Card: Mô tả -->
          <div class="bg-surface-0 dark:bg-surface-900 rounded-xl border border-surface-100 dark:border-surface-800 shadow-sm overflow-hidden">
            <div class="px-5 py-3.5 border-b border-surface-100 dark:border-surface-800">
              <h2 class="text-sm font-bold text-gray-900 dark:text-surface-0">Mô tả</h2>
              <p class="text-xs text-gray-400 dark:text-surface-500 mt-0.5">Giới thiệu ngắn về mục tiêu và phạm vi dự án.</p>
            </div>
            <div class="p-5">
              <app-rich-text-editor name="description" [(ngModel)]="description" placeholder="Không có mô tả cho dự án này."></app-rich-text-editor>
            </div>
          </div>

        </div>

        <!-- Right: metadata card (sticky) -->
        <div class="w-full xl:w-72 flex-shrink-0">
          <div class="xl:sticky xl:top-4 space-y-4">

          <!-- Card: Thông tin dự án -->
          <div class="bg-surface-0 dark:bg-surface-900 rounded-xl border border-surface-100 dark:border-surface-800 shadow-sm overflow-hidden">
            <div class="px-4 py-3 border-b border-surface-100 dark:border-surface-800">
              <h2 class="text-sm font-bold text-gray-900 dark:text-surface-0">Thông tin dự án</h2>
            </div>
            <div class="p-4 space-y-4">

              <!-- Key -->
              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-semibold text-gray-500 dark:text-surface-400 uppercase tracking-wider">Mã dự án (Key)</label>
                <div class="flex items-center gap-2">
                  <p-chip [label]="projectKey()" class="font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-800 rounded px-2.5 py-1 text-xs"></p-chip>
                  <span class="text-xs text-gray-400 dark:text-surface-500"><i class="pi pi-lock text-[10px] mr-0.5"></i>Cố định</span>
                </div>
              </div>

              <!-- Privacy -->
              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-semibold text-gray-500 dark:text-surface-400 uppercase tracking-wider">Quyền riêng tư</label>
                <div class="flex gap-1.5">
                  @for (opt of privacyOptions; track opt.value) {
                    <button type="button"
                      class="px-3 py-1.5 text-xs font-medium rounded-lg border transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
                      [ngClass]="network === opt.value
                        ? 'text-white border-transparent'
                        : 'bg-transparent text-gray-600 dark:text-surface-300 border-gray-300 dark:border-surface-600 hover:border-gray-400 dark:hover:border-surface-500'"
                      [style.background]="network === opt.value ? 'var(--p-primary-color)' : null"
                      [disabled]="isReadOnly() || isSubmitting()"
                      (click)="network = opt.value"
                    >{{ opt.label }}</button>
                  }
                </div>
              </div>

              <div class="border-t border-surface-100 dark:border-surface-800"></div>

              <!-- Lead -->
              <div class="flex flex-col gap-1.5">
                <label for="leadId" class="text-xs font-semibold text-gray-500 dark:text-surface-400 uppercase tracking-wider">Người phụ trách</label>
                <p-select id="leadId" [options]="leadOptions()" [(ngModel)]="leadId" name="leadId" optionLabel="label" optionValue="value" [filter]="true" filterPlaceholder="Tìm kiếm..." appendTo="body" [disabled]="isReadOnly() || isSubmitting()" placeholder="Chọn người phụ trách" styleClass="w-full"></p-select>
              </div>

              <!-- Timezone -->
              <div class="flex flex-col gap-1.5">
                <label for="timezone" class="text-xs font-semibold text-gray-500 dark:text-surface-400 uppercase tracking-wider">Múi giờ <span class="normal-case font-normal">(theo IANA)</span></label>
                <p-select id="timezone" [options]="timezoneOptions" [(ngModel)]="timezone" name="timezone" optionLabel="label" optionValue="value" [filter]="true" appendTo="body" [disabled]="isReadOnly() || isSubmitting()" placeholder="Chọn múi giờ" styleClass="w-full"></p-select>
              </div>

            </div>
          </div>

          <!-- Save button -->
          @if (!isReadOnly()) {
            <div class="flex justify-end">
              <button pButton type="submit" label="Lưu thay đổi" [disabled]="isSubmitting() || !name" [fluid]="false"></button>
            </div>
          }

          </div>
        </div>
      </div>

    </form>
  `,
})
export class GeneralTabComponent implements OnInit {
  readonly ProjectNetwork = ProjectNetwork;
  readonly privacyOptions = [
    { label: 'Bảo mật', value: ProjectNetwork.SECRET },
    { label: 'Công khai', value: ProjectNetwork.PUBLIC },
  ];
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
  timezone = 'Asia/Saigon';

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
      this.timezone = project.timezone || 'Asia/Saigon';
      
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
