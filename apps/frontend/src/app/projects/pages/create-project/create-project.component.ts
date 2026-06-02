import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ProjectService } from '../../services/project.service';
import { ProjectStore } from '../../state/project.store';
import { AuthService } from '../../../auth/services/auth.service';
import { CommonModule } from '@angular/common';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { FluidModule } from 'primeng/fluid';
import { MessageService } from 'primeng/api';
import { Subject, Subscription, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, catchError, switchMap } from 'rxjs/operators';
import { FormsModule } from '@angular/forms';
import { ProjectNetwork } from '@mpm/shared-types';

@Component({
  standalone: true,
  selector: 'app-create-project',
  imports: [
    CommonModule,
    RouterLink,
    InputTextModule,
    TextareaModule,
    ButtonModule,
    SelectModule,
    FluidModule,
    FormsModule,
  ],
  template: `
    <div class="p-6 max-w-xl mx-auto space-y-6">
      <!-- Breadcrumbs -->
      <nav class="flex text-xs text-gray-500 font-semibold uppercase tracking-wider" aria-label="Breadcrumb">
        <ol class="inline-flex items-center space-x-1 md:space-x-2">
          <li class="inline-flex items-center">
            <a routerLink="/projects" class="hover:text-indigo-600 transition">Dự án</a>
          </li>
          <li>
            <div class="flex items-center gap-1">
              <i class="pi pi-chevron-right text-[10px] text-gray-400"></i>
              <span class="text-gray-400">Tạo dự án mới</span>
            </div>
          </li>
        </ol>
      </nav>

      <!-- Title Header -->
      <div>
        <h1 class="text-2xl font-extrabold tracking-tight text-gray-900">
          Tạo dự án mới
        </h1>
        <p class="mt-1 text-sm text-gray-500 font-medium">
          Thiết lập không gian cộng tác mới cho nhóm của bạn.
        </p>
      </div>

      <!-- Form Content -->
      <form (submit)="onSubmit($event)" class="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
        <p-fluid class="block space-y-5">
          <!-- Project Emoji and Name -->
          <div class="flex gap-4">
            <!-- Emoji Select -->
            <div class="flex-shrink-0 flex flex-col gap-2 relative">
              <label class="text-sm font-semibold text-gray-700">Emoji</label>
              <button
                pButton
                type="button"
                [label]="emoji || '😀'"
                (click)="showEmojiPicker.set(!showEmojiPicker())"
                class="h-10 w-12 text-lg flex items-center justify-center p-0 border border-gray-200 bg-white"
              ></button>
              @if (showEmojiPicker()) {
                <div class="absolute left-0 top-20 bg-white border border-gray-100 rounded-xl shadow-xl p-3 z-50 w-64">
                  <div class="grid grid-cols-5 gap-2 max-h-48 overflow-y-auto">
                    @for (e of commonEmojis; track e) {
                      <button
                        type="button"
                        class="h-8 w-8 text-lg rounded hover:bg-gray-100 transition flex items-center justify-center cursor-pointer border-none bg-transparent"
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
                (ngModelChange)="onNameChange($event)"
                required
                maxlength="100"
                placeholder="Ví dụ: Project Management System"
                #nameInput="ngModel"
              />
            </div>
          </div>

          @if (nameInput.invalid && (nameInput.dirty || nameInput.touched)) {
            <span class="text-xs text-red-500 font-medium px-1 block mt-1">Tên dự án là bắt buộc (tối đa 100 ký tự).</span>
          }

          <!-- Project Key -->
          <div class="flex flex-col gap-2">
            <label for="key" class="text-sm font-semibold text-gray-700">
              Mã dự án (Key) <span class="text-red-500">*</span>
            </label>
            <input
              id="key"
              name="key"
              type="text"
              pInputText
              [(ngModel)]="key"
              (ngModelChange)="onKeyChange($event)"
              required
              pattern="^[A-Z]{2,5}$"
              class="uppercase"
              placeholder="Ví dụ: PMS"
              #keyInput="ngModel"
            />
            <span class="text-[11px] text-gray-400 font-medium px-1">
              Được dùng làm tiền tố mã công việc (ví dụ: PMS-1). Độ dài 2-5 chữ cái in hoa.
            </span>
            @if (keyInput.invalid && (keyInput.dirty || keyInput.touched)) {
              <span class="text-xs text-red-500 font-medium px-1">Mã dự án không khớp định dạng (2-5 chữ cái in hoa).</span>
            }
            @if (keyError) {
              <span class="text-xs text-red-500 font-medium px-1">{{ keyError }}</span>
            }
          </div>

          <!-- Description -->
          <div class="flex flex-col gap-2">
            <label for="description" class="text-sm font-semibold text-gray-700">Mô tả (Không bắt buộc)</label>
            <textarea
              id="description"
              name="description"
              [rows]="3"
              pTextarea
              [(ngModel)]="description"
              maxlength="2000"
              placeholder="Mô tả tóm tắt mục tiêu dự án..."
            ></textarea>
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
                class="flex-1 text-xs py-2"
                (click)="network = ProjectNetwork.SECRET"
              ></button>
              <button
                type="button"
                pButton
                [label]="'Công khai (Public)'"
                [severity]="network === ProjectNetwork.PUBLIC ? 'primary' : 'secondary'"
                [outlined]="network !== ProjectNetwork.PUBLIC"
                class="flex-1 text-xs py-2"
                (click)="network = ProjectNetwork.PUBLIC"
              ></button>
            </div>
            <span class="text-[11px] text-gray-400 font-medium px-1">
              @if (network === 'secret') {
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
                placeholder="Chọn múi giờ"
              ></p-select>
            </div>
          </div>

          <!-- Form Actions -->
          <div class="flex items-center justify-end gap-3 pt-3 border-t border-gray-50">
            <button
              pButton
              type="button"
              routerLink="/projects"
              label="Hủy bỏ"
              severity="secondary"
              [text]="true"
              [fluid]="false"
            ></button>
            <button
              pButton
              type="submit"
              label="Tạo dự án"
              [disabled]="isSubmitting() || !name || !key || !!keyError || keyInput.invalid"
              [fluid]="false"
            ></button>
          </div>
        </p-fluid>
      </form>
    </div>
  `,
})
export class CreateProjectComponent implements OnInit, OnDestroy {
  readonly ProjectNetwork = ProjectNetwork;

  private readonly projectService = inject(ProjectService);
  private readonly projectStore = inject(ProjectStore);
  private readonly authService = inject(AuthService);
  private readonly messageService = inject(MessageService);
  private readonly router = inject(Router);

  // Form Fields
  name = '';
  key = '';
  description = '';
  emoji = '🚀';
  network: ProjectNetwork = ProjectNetwork.SECRET;
  leadId: string | null = null;
  timezone = 'Asia/Ho_Chi_Minh';

  // UI States
  showEmojiPicker = signal<boolean>(false);
  readonly commonEmojis = [
    '🚀', '💻', '🎨', '📝', '📊', '🔍', '⚙️', '📅', '👥', '🔔',
    '📎', '🔒', '🌍', '💡', '🔥', '✨', '⚡️', '🛠️', '📦', '🎯',
  ];

  // Lead options computed (only current user for new projects)
  readonly leadOptions = computed(() => {
    const user = this.authService.currentUser();
    if (!user) return [];
    return [
      { label: user.email, value: user.id },
    ];
  });

  // Timezone options
  readonly timezoneOptions = Intl.supportedValuesOf('timeZone').map((tz) => ({
    label: tz,
    value: tz,
  }));

  // Form States
  keyEditedByUser = false;
  keyError = '';
  readonly isSubmitting = signal<boolean>(false);

  private readonly keyCheckSubject = new Subject<string>();
  private keyCheckSubscription?: Subscription;

  ngOnInit(): void {
    // Unique check với debounce 500ms
    this.keyCheckSubscription = this.keyCheckSubject
      .pipe(
        debounceTime(500),
        distinctUntilChanged(),
        switchMap((k) => {
          if (!k || !/^[A-Z]{2,5}$/.test(k)) {
            return of(null);
          }
          return this.projectService.getProjectByKey(k).pipe(
            catchError(() => {
              return of(null);
            }),
          );
        }),
      )
      .subscribe((project) => {
        if (project) {
          this.keyError = `Mã dự án "${this.key}" đã được sử dụng.`;
        } else {
          this.keyError = '';
        }
      });

    // Default lead to current user
    const currentUser = this.authService.currentUser();
    if (currentUser) {
      this.leadId = currentUser.id;
    }
  }

  ngOnDestroy(): void {
    this.keyCheckSubscription?.unsubscribe();
  }

  selectEmoji(e: string): void {
    this.emoji = e;
    this.showEmojiPicker.set(false);
  }

  onNameChange(val: string): void {
    if (!this.keyEditedByUser && val) {
      // Suggest key bằng các chữ cái in hoa đầu tiên của mỗi từ
      const words = val.trim().split(/\s+/);
      const suggested = words
        .map((w) => w.charAt(0))
        .join('')
        .toUpperCase()
        .replace(/[^A-Z]/g, '')
        .substring(0, 5);

      this.key = suggested;
      this.keyCheckSubject.next(suggested);
    }
  }

  onKeyChange(val: string): void {
    this.keyEditedByUser = true;
    const formatted = val.toUpperCase().replace(/[^A-Z]/g, '').substring(0, 5);
    this.key = formatted;
    this.keyCheckSubject.next(formatted);
  }

  onSubmit(event: Event): void {
    event.preventDefault();
    if (!this.name || !this.key || this.keyError) return;

    this.isSubmitting.set(true);

    this.projectService
      .createProject({
        name: this.name,
        key: this.key,
        description: this.description || undefined,
        emoji: this.emoji,
        network: this.network,
        leadId: this.leadId || undefined,
        timezone: this.timezone,
      })
      .subscribe({
        next: (project) => {
          this.messageService.add({
            severity: 'success',
            summary: 'Thành công',
            detail: `Dự án "${project.name}" đã được tạo thành công.`,
          });
          this.projectStore.loadProjects(); // Reload projects list
          void this.router.navigate(['/projects', project.key, 'board']);
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Lỗi tạo dự án',
            detail: err.error?.message || 'Có lỗi xảy ra khi tạo dự án.',
          });
        },
      });
  }
}
