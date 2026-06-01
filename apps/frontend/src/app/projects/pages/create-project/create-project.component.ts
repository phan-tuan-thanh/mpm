import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ProjectService } from '../../services/project.service';
import { ProjectStore } from '../../state/project.store';
import { CommonModule } from '@angular/common';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ButtonModule } from 'primeng/button';
import { FluidModule } from 'primeng/fluid';
import { MessageService } from 'primeng/api';
import { Subject, Subscription, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, catchError, switchMap } from 'rxjs/operators';
import { FormsModule } from '@angular/forms';

@Component({
  standalone: true,
  selector: 'app-create-project',
  imports: [CommonModule, RouterLink, InputTextModule, TextareaModule, ButtonModule, FluidModule, FormsModule],
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
          <!-- Project Name -->
          <div class="flex flex-col gap-2">
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
            @if (nameInput.invalid && (nameInput.dirty || nameInput.touched)) {
              <span class="text-xs text-red-500 font-medium px-1">Tên dự án là bắt buộc (tối đa 100 ký tự).</span>
            }
          </div>

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
  private readonly projectService = inject(ProjectService);
  private readonly projectStore = inject(ProjectStore);
  private readonly messageService = inject(MessageService);
  private readonly router = inject(Router);

  // Form Fields
  name = '';
  key = '';
  description = '';

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
          // Gọi API resolve key
          return this.projectService.getProjectByKey(k).pipe(
            catchError(() => {
              // 404 / Lỗi -> Key khả dụng
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
  }

  ngOnDestroy(): void {
    this.keyCheckSubscription?.unsubscribe();
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
      })
      .subscribe({
        next: (project) => {
          this.messageService.add({
            severity: 'success',
            summary: 'Thành công',
            detail: `Dự án "${project.name}" đã được tạo thành công.`,
          });
          this.projectStore.loadProjects(); // Reload projects list
          // Chuyển hướng ngay sang project workspace
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
