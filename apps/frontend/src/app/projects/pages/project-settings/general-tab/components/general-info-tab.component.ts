import { Component, OnInit, inject, computed, signal, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ProjectStore } from '../../../../state/project.store';
import { ProjectService } from '../../../../services/project.service';
import { AuthService } from '../../../../../auth/services/auth.service';
import { CommonModule } from '@angular/common';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { FluidModule } from 'primeng/fluid';
import { ChipModule } from 'primeng/chip';
import { MessageService } from 'primeng/api';
import { FormsModule } from '@angular/forms';
import { SelectButtonModule } from 'primeng/selectbutton';
import { ProjectNetwork } from '@mpm/shared-types';
import type { TiptapDoc } from '@mpm/shared-types';
import { RichTextEditorComponent } from '../../../../../shared/components/rich-text-editor/rich-text-editor.component';
import { PopoverModule } from 'primeng/popover';
import { IconPickerPanelComponent } from '../../../../../shared/components/icon-picker-panel/icon-picker-panel.component';
import { IconDisplayComponent } from '../../../../../shared/components/icon-display/icon-display.component';

@Component({
  standalone: true,
  selector: 'app-general-info-tab',
  imports: [
    CommonModule,
    InputTextModule,
    ButtonModule,
    FluidModule,
    ChipModule,
    FormsModule,
    RichTextEditorComponent,
    PopoverModule,
    IconPickerPanelComponent,
    IconDisplayComponent,
    SelectButtonModule,
  ],
  template: `
    <form (submit)="onSubmit($event)">

      <!-- Read-only banner -->
      @if (isReadOnly()) {
        <div class="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-3 flex gap-2 text-xs text-amber-700 dark:text-amber-400 font-medium mb-5">
          <i class="pi pi-lock text-sm mt-0.5"></i>
          <span>{{ t().readOnlyBanner }}</span>
        </div>
      }

      <!-- 2-column layout: main content left, metadata right -->
      <div class="flex flex-col xl:flex-row gap-5 items-start">

        <!-- Left: cover + name + description -->
        <div class="flex-1 min-w-0 space-y-5">

          <!-- Card: Thông tin chung -->
          <div class="bg-surface-0 dark:bg-surface-900 rounded-xl border border-surface-100 dark:border-surface-800 shadow-sm overflow-hidden">
            <div class="px-5 py-3.5 border-b border-surface-100 dark:border-surface-800">
              <h2 class="text-sm font-bold text-gray-900 dark:text-surface-0">{{ t().generalCardTitle }}</h2>
              <p class="text-xs text-gray-400 dark:text-surface-500 mt-0.5">{{ t().generalCardDesc }}</p>
            </div>
            <div class="p-5 space-y-5">

              <!-- Emoji + Name: inline row at the top -->
              <div class="flex gap-3 items-end max-w-lg">
                <!-- Icon Selector -->
                <div class="flex-shrink-0 relative">
                  <button
                    pButton type="button"
                    [disabled]="isReadOnly() || isSubmitting()"
                    (click)="op.toggle($event)"
                    class="h-[38px] w-12 text-lg flex items-center justify-center p-0 border border-gray-200 dark:border-surface-700 bg-white dark:bg-surface-800"
                  >
                    <app-icon-display [icon]="emoji || '🚀'" class="text-lg"></app-icon-display>
                  </button>
                  <p-popover #op styleClass="!p-0" appendTo="body">
                    <app-icon-picker-panel [value]="emoji" (valueChange)="emoji = $event; op.hide()"></app-icon-picker-panel>
                  </p-popover>
                </div>
                <!-- Name Input -->
                <div class="flex-1 flex flex-col gap-1.5">
                  <label for="name" class="text-xs font-semibold text-gray-500 dark:text-surface-400 uppercase tracking-wider select-none">{{ t().projectNameLabel }} <span class="text-red-500 normal-case">*</span></label>
                  <input id="name" name="name" type="text" pInputText [(ngModel)]="name" [disabled]="isReadOnly() || isSubmitting()" required maxlength="100" class="w-full" style="height: 38px;" />
                </div>
              </div>

              <!-- Divider line -->
              <div class="border-t border-surface-100 dark:border-surface-800"></div>

              <!-- Cover image section -->
              <div class="space-y-2">
                <label class="text-xs font-semibold text-gray-500 dark:text-surface-400 uppercase tracking-wider">{{ t().coverLabel }}</label>
                <div class="relative group rounded-lg overflow-hidden border border-gray-200 dark:border-surface-700 bg-gray-50 dark:bg-surface-800 h-32 flex items-center justify-center">
                  @if (coverPreviewUrl()) {
                    <img [src]="coverPreviewUrl()" class="w-full h-full object-cover" />
                    @if (!isReadOnly()) {
                      <div class="absolute inset-0 bg-black/45 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition duration-200">
                        <button pButton type="button" icon="pi pi-trash" severity="danger" size="small" [label]="t().deleteCoverBtn" [fluid]="false" (click)="onDeleteCover()"></button>
                      </div>
                    }
                  } @else {
                    <div class="flex flex-col items-center gap-1">
                      <i class="pi pi-image text-2xl text-gray-300 dark:text-surface-600"></i>
                      <p class="text-xs text-gray-400 dark:text-surface-500">{{ t().noCoverLabel }}</p>
                    </div>
                  }
                </div>
                @if (!isReadOnly()) {
                  <div class="flex items-center gap-2 pt-1">
                    <input type="file" #coverInput accept="image/png, image/jpeg, image/webp" class="hidden" (change)="onCoverFileSelected($event)" />
                    <button pButton type="button" icon="pi pi-upload" [label]="t().uploadCoverBtn" severity="secondary" size="small" [outlined]="true" [fluid]="false" (click)="coverInput.click()" [disabled]="isUploadingCover()"></button>
                    <span class="text-xs text-gray-400 dark:text-surface-500">{{ t().coverConstraint }}</span>
                  </div>
                }
              </div>

              <!-- Divider line -->
              <div class="border-t border-surface-100 dark:border-surface-800"></div>

              <!-- Description section -->
              <div class="space-y-2">
                <label class="text-xs font-semibold text-gray-500 dark:text-surface-400 uppercase tracking-wider">{{ t().descriptionLabel }}</label>
                <div>
                  <app-rich-text-editor name="description" [(ngModel)]="description" [placeholder]="t().descriptionPlaceholder"></app-rich-text-editor>
                </div>
              </div>

            </div>
          </div>

        </div>

        <!-- Right: metadata card (sticky) -->
        <div class="w-full xl:w-1/3 xl:min-w-[20rem] xl:max-w-[24rem] flex-shrink-0">
          <div class="xl:sticky xl:top-4 space-y-4">

          <!-- Card: Thông tin dự án -->
          <div class="bg-surface-0 dark:bg-surface-900 rounded-xl border border-surface-100 dark:border-surface-800 shadow-sm overflow-hidden">
            <div class="px-5 py-3.5 border-b border-surface-100 dark:border-surface-800">
              <h2 class="text-sm font-bold text-gray-900 dark:text-surface-0">{{ t().metaCardTitle }}</h2>
              <p class="text-xs text-gray-400 dark:text-surface-500 mt-0.5">{{ t().metaCardDesc }}</p>
            </div>
            <div class="p-4 space-y-4">

              <!-- Key -->
              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-semibold text-gray-500 dark:text-surface-400 uppercase tracking-wider">{{ t().keyLabel }}</label>
                <div class="flex items-center gap-2">
                  <p-chip [label]="projectKey()" class="font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-800 rounded px-2.5 py-1 text-xs"></p-chip>
                  <span class="text-xs text-gray-400 dark:text-surface-500"><i class="pi pi-lock text-[10px] mr-0.5"></i>{{ t().fixedKeyLabel }}</span>
                </div>
              </div>

              <!-- Privacy -->
              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-semibold text-gray-500 dark:text-surface-400 uppercase tracking-wider">{{ t().privacyLabel }}</label>
                <div class="mt-1">
                  <p-selectbutton
                    [options]="privacyOptions()"
                    [(ngModel)]="network"
                    name="network"
                    [allowEmpty]="false"
                    optionLabel="label"
                    optionValue="value"
                    [disabled]="isReadOnly() || isSubmitting()"
                    size="small"
                  />
                </div>
              </div>

              <div class="border-t border-surface-100 dark:border-surface-800"></div>

              <!-- Lead -->
              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-semibold text-gray-500 dark:text-surface-400 uppercase tracking-wider">{{ t().leadLabel }}</label>
                <button
                  type="button"
                  (click)="leadPop.toggle($event)"
                  [disabled]="isReadOnly() || isSubmitting()"
                  class="pop-select-trigger w-full flex items-center justify-between gap-2 cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span class="truncate">{{ getLeadLabel() }}</span>
                  <i class="pi pi-chevron-down text-xs opacity-60 flex-shrink-0"></i>
                </button>
                <p-popover #leadPop appendTo="body" styleClass="!p-0">
                  <div class="pop-list w-64 max-h-60 overflow-y-auto">
                    @for (opt of leadOptions(); track opt.value) {
                      <div
                        (click)="leadId = opt.value; leadPop.hide()"
                        class="pop-item"
                        [class.selected]="leadId === opt.value"
                      >
                        {{ opt.label }}
                      </div>
                    }
                  </div>
                </p-popover>
              </div>

              <!-- Timezone -->
              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-semibold text-gray-500 dark:text-surface-400 uppercase tracking-wider">{{ t().timezoneLabel }} <span class="normal-case font-normal">({{ t().ianaTimezoneHint }})</span></label>
                <button
                  type="button"
                  (click)="timezonePop.toggle($event); timezoneSearch.set('')"
                  [disabled]="isReadOnly() || isSubmitting()"
                  class="pop-select-trigger w-full flex items-center justify-between gap-2 cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span class="truncate">{{ getTimezoneLabel() }}</span>
                  <i class="pi pi-chevron-down text-xs opacity-60 flex-shrink-0"></i>
                </button>
                <p-popover #timezonePop appendTo="body" styleClass="!p-0">
                  <div class="p-2 border-b border-surface-100 dark:border-surface-800 bg-surface-50 dark:bg-surface-900">
                    <input
                      type="text"
                      pInputText
                      [placeholder]="t().searchTimezonePlaceholder"
                      class="w-full text-xs p-1"
                      [ngModel]="timezoneSearch()"
                      (ngModelChange)="timezoneSearch.set($event)"
                      (click)="$event.stopPropagation()"
                    />
                  </div>
                  <div class="pop-list w-72 max-h-60 overflow-y-auto">
                    @for (opt of filteredTimezoneOptions(); track opt.value) {
                      <div
                        (click)="timezone = opt.value; timezonePop.hide()"
                        class="pop-item"
                        [class.selected]="timezone === opt.value"
                      >
                        {{ opt.label }}
                      </div>
                    } @empty {
                      <div class="p-3 text-xs text-gray-400 text-center">{{ t().noTimezoneFound }}</div>
                    }
                  </div>
                </p-popover>
              </div>

              <div class="border-t border-surface-100 dark:border-surface-800"></div>

              <!-- Language Settings -->
              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-semibold text-gray-500 dark:text-surface-400 uppercase tracking-wider">{{ t().langLabel }}</label>
                <div class="mt-1">
                  <p-selectbutton
                    [options]="languageOptions()"
                    [(ngModel)]="language"
                    name="language"
                    [allowEmpty]="false"
                    optionLabel="label"
                    optionValue="value"
                    [disabled]="isReadOnly() || isSubmitting()"
                    size="small"
                  />
                </div>
              </div>

            </div>
          </div>

          <!-- Save button -->
          @if (!isReadOnly()) {
            <div class="flex justify-end">
              <button pButton type="submit" [label]="t().saveBtn" [disabled]="isSubmitting() || !name" [fluid]="false"></button>
            </div>
          }

          </div>
        </div>
      </div>

    </form>
  `,
  styles: [`
    :host ::ng-deep {
      .pop-select-trigger {
        background: var(--p-inputtext-background) !important;
        border: 1px solid var(--p-inputtext-border-color) !important;
        color: var(--p-inputtext-color) !important;
        border-radius: var(--p-inputtext-border-radius, 6px) !important;
        height: 38px !important;
        padding: 0 0.75rem !important;
        font-weight: 500 !important;
        font-size: 0.875rem !important;
        transition: border-color 0.2s, box-shadow 0.2s;
      }
      .pop-select-trigger:hover {
        border-color: var(--p-inputtext-hover-border-color) !important;
      }
      .pop-select-trigger:focus, .pop-select-trigger:active {
        border-color: var(--p-inputtext-focus-border-color) !important;
      }
    }
  `]
})
export class GeneralInfoTabComponent implements OnInit {
  readonly ProjectNetwork = ProjectNetwork;

  readonly projectStore = inject(ProjectStore);
  private readonly projectService = inject(ProjectService);
  private readonly authService = inject(AuthService);
  private readonly messageService = inject(MessageService);

  readonly t = computed(() => {
    const isEn = this.projectStore.projectLanguage() === 'en';
    return isEn ? {
      readOnlyBanner: 'Read-only view. Only Scrum Master or Admin can edit.',
      generalCardTitle: 'General Info',
      generalCardDesc: 'Manage project identity including icon, name, cover image, and description.',
      projectNameLabel: 'Project Name',
      coverLabel: 'Cover Image',
      deleteCoverBtn: 'Delete cover image',
      noCoverLabel: 'No cover image',
      uploadCoverBtn: 'Upload cover image',
      coverConstraint: 'JPG, PNG, WEBP · max 5MB',
      descriptionLabel: 'Project Description',
      descriptionPlaceholder: 'No description for this project.',
      metaCardTitle: 'Project Information',
      metaCardDesc: 'Key, privacy, and lead.',
      keyLabel: 'Project Key (Key)',
      fixedKeyLabel: 'Fixed',
      privacyLabel: 'Privacy',
      privacySecret: 'Secret',
      privacyPublic: 'Public',
      leadLabel: 'Lead',
      timezoneLabel: 'Timezone',
      ianaTimezoneHint: 'according to IANA',
      searchTimezonePlaceholder: 'Search timezone...',
      noTimezoneFound: 'No timezone found',
      selectTimezone: 'Select timezone',
      selectLead: 'Select lead',
      langLabel: 'Display Language',
      langVi: 'Tiếng Việt',
      langEn: 'English',
      saveBtn: 'Save Changes',
      fileLargeSummary: 'File Too Large',
      fileLargeDetail: 'Cover image size must not exceed 5MB.',
      uploadSuccessSummary: 'Success',
      uploadSuccessDetail: 'Cover image uploaded successfully.',
      uploadFailedSummary: 'Upload Failed',
      uploadFailedDetail: (err: string) => err || 'An error occurred while uploading cover image.',
      deleteSuccessSummary: 'Success',
      deleteSuccessDetail: 'Project cover image deleted.',
      deleteFailedSummary: 'Deletion Failed',
      deleteFailedDetail: (err: string) => err || 'An error occurred while deleting cover image.',
      saveSuccessSummary: 'Success',
      saveSuccessDetail: 'Project configuration updated.',
      saveFailedSummary: 'Failed',
      saveFailedDetail: (err: string) => err || 'An error occurred while updating.',
    } : {
      readOnlyBanner: 'Chế độ xem. Chỉ Scrum Master hoặc Admin mới có thể chỉnh sửa.',
      generalCardTitle: 'Thông tin chung',
      generalCardDesc: 'Quản lý nhận diện dự án bao gồm biểu tượng, tên gọi, ảnh bìa và mô tả chi tiết.',
      projectNameLabel: 'Tên dự án',
      coverLabel: 'Ảnh bìa',
      deleteCoverBtn: 'Xóa ảnh bìa',
      noCoverLabel: 'Không có ảnh bìa',
      uploadCoverBtn: 'Tải lên ảnh bìa',
      coverConstraint: 'JPG, PNG, WEBP · tối đa 5MB',
      descriptionLabel: 'Mô tả dự án',
      descriptionPlaceholder: 'Không có mô tả cho dự án này.',
      metaCardTitle: 'Thông tin dự án',
      metaCardDesc: 'Mã, quyền riêng tư và người phụ trách dự án.',
      keyLabel: 'Mã dự án (Key)',
      fixedKeyLabel: 'Cố định',
      privacyLabel: 'Quyền riêng tư',
      privacySecret: 'Bảo mật',
      privacyPublic: 'Công khai',
      leadLabel: 'Người phụ trách',
      timezoneLabel: 'Múi giờ',
      ianaTimezoneHint: 'theo IANA',
      searchTimezonePlaceholder: 'Tìm kiếm múi giờ...',
      noTimezoneFound: 'Không tìm thấy múi giờ',
      selectTimezone: 'Chọn múi giờ',
      selectLead: 'Chọn người phụ trách',
      langLabel: 'Ngôn ngữ hiển thị',
      langVi: 'Tiếng Việt',
      langEn: 'English',
      saveBtn: 'Lưu thay đổi',
      fileLargeSummary: 'Kích thước file lớn',
      fileLargeDetail: 'Kích thước ảnh bìa không được vượt quá 5MB.',
      uploadSuccessSummary: 'Thành công',
      uploadSuccessDetail: 'Tải lên ảnh bìa thành công.',
      uploadFailedSummary: 'Tải lên thất bại',
      uploadFailedDetail: (err: string) => err || 'Có lỗi xảy ra khi tải lên ảnh bìa.',
      deleteSuccessSummary: 'Thành công',
      deleteSuccessDetail: 'Đã xóa ảnh bìa dự án.',
      deleteFailedSummary: 'Xóa thất bại',
      deleteFailedDetail: (err: string) => err || 'Có lỗi xảy ra khi xóa ảnh bìa.',
      saveSuccessSummary: 'Thành công',
      saveSuccessDetail: 'Cấu hình dự án đã được cập nhật.',
      saveFailedSummary: 'Thất bại',
      saveFailedDetail: (err: string) => err || 'Có lỗi xảy ra khi cập nhật.',
    };
  });

  readonly privacyOptions = computed(() => {
    const trans = this.t();
    return [
      { label: trans.privacySecret, value: ProjectNetwork.SECRET },
      { label: trans.privacyPublic, value: ProjectNetwork.PUBLIC },
    ];
  });

  readonly languageOptions = computed(() => {
    const trans = this.t();
    return [
      { label: trans.langVi, value: 'vi' },
      { label: trans.langEn, value: 'en' },
    ];
  });

  // States
  name = '';
  description: TiptapDoc | null = null;
  emoji = '🚀';
  network = ProjectNetwork.SECRET;
  leadId: string | null = null;
  timezone = 'Asia/Saigon';
  language: 'vi' | 'en' = 'vi';

  readonly isSubmitting = signal<boolean>(false);
  readonly isUploadingCover = signal<boolean>(false);

  readonly coverImageUrl = computed(() => {
    return this.projectStore.currentProject()?.coverImageUrl || null;
  });

  /** Endpoint cover yêu cầu Bearer token nên <img src> trực tiếp sẽ bị 401 —
      fetch blob qua HttpClient (interceptor gắn token) rồi hiển thị bằng object URL. */
  private readonly http = inject(HttpClient);
  readonly coverPreviewUrl = signal<string | null>(null);

  constructor() {
    effect((onCleanup) => {
      const url = this.coverImageUrl();
      if (!url) {
        this.coverPreviewUrl.set(null);
        return;
      }
      const sub = this.http.get(url, { responseType: 'blob' }).subscribe({
        next: (blob) => this.coverPreviewUrl.set(URL.createObjectURL(blob)),
        error: () => this.coverPreviewUrl.set(null),
      });
      onCleanup(() => {
        sub.unsubscribe();
        const prev = this.coverPreviewUrl();
        if (prev) URL.revokeObjectURL(prev);
      });
    });
  }

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

  readonly timezoneSearch = signal<string>('');
  readonly filteredTimezoneOptions = computed(() => {
    const query = this.timezoneSearch().toLowerCase().trim();
    if (!query) return this.timezoneOptions;
    return this.timezoneOptions.filter(
      (o) => o.label.toLowerCase().includes(query) || o.value.toLowerCase().includes(query)
    );
  });

  getTimezoneLabel(): string {
    const found = this.timezoneOptions.find((o) => o.value === this.timezone);
    return found ? found.label : this.t().selectTimezone;
  }

  getLeadLabel(): string {
    const found = this.leadOptions().find((o) => o.value === this.leadId);
    return found ? found.label : this.t().selectLead;
  }

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
      this.language = this.projectStore.projectLanguage();
      
      // Load members for dropdown selection
      this.projectStore.loadMembers(project.id);
    }
  }

  onCoverFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const trans = this.t();
    if (file.size > 5 * 1024 * 1024) {
      this.messageService.add({
        severity: 'error',
        summary: trans.fileLargeSummary,
        detail: trans.fileLargeDetail,
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
          summary: trans.uploadSuccessSummary,
          detail: trans.uploadSuccessDetail,
        });
      },
      error: (err) => {
        this.isUploadingCover.set(false);
        this.messageService.add({
          severity: 'error',
          summary: trans.uploadFailedSummary,
          detail: trans.uploadFailedDetail(err.error?.message),
        });
      },
    });
  }

  onDeleteCover(): void {
    const project = this.projectStore.currentProject();
    if (!project) return;

    const trans = this.t();
    this.projectService.deleteCover(project.id).subscribe({
      next: () => {
        this.projectStore.setCurrentProject({
          ...project,
          coverImageUrl: null,
        });
        this.messageService.add({
          severity: 'success',
          summary: trans.deleteSuccessSummary,
          detail: trans.deleteSuccessDetail,
        });
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: trans.deleteFailedSummary,
          detail: trans.deleteFailedDetail(err.error?.message),
        });
      },
    });
  }

  onSubmit(event: Event): void {
    event.preventDefault();
    const project = this.projectStore.currentProject();
    if (!project || !this.name || this.isReadOnly()) return;

    this.isSubmitting.set(true);

    this.projectStore.setProjectLanguage(this.language);

    const trans = this.t();
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
            summary: trans.saveSuccessSummary,
            detail: trans.saveSuccessDetail,
          });
          // Update store
          this.projectStore.setCurrentProject(updatedProject);
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.messageService.add({
            severity: 'error',
            summary: trans.saveFailedSummary,
            detail: trans.saveFailedDetail(err.error?.message),
          });
        },
      });
  }
}
