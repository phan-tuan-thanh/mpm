import { Component, inject, computed } from '@angular/core';
import { ProjectStore } from '../../../state/project.store';
import { ProjectService } from '../../../services/project.service';
import { AuthService } from '../../../../auth/services/auth.service';
import { CommonModule } from '@angular/common';
import { MessageService } from 'primeng/api';

@Component({
  standalone: true,
  selector: 'app-features-tab',
  imports: [CommonModule],
  template: `
    <div class="space-y-4">

      <!-- Header -->
      <div class="flex items-start justify-between">
        <div>
          <h2 class="text-base font-bold text-gray-900 dark:text-surface-0">Tính năng (Feature Flags)</h2>
          <p class="text-xs text-gray-400 dark:text-surface-500 mt-0.5">Bật hoặc tắt các module bổ sung để tối giản hóa giao diện.</p>
        </div>
      </div>

      @if (isReadOnly()) {
        <div class="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-3 flex gap-2 text-xs text-amber-700 dark:text-amber-400 font-medium">
          <i class="pi pi-lock text-sm mt-0.5"></i>
          <span>Chế độ xem. Chỉ Scrum Master hoặc Admin mới có quyền bật/tắt các tính năng này.</span>
        </div>
      }

      <!-- Features card -->
      <div class="bg-white dark:bg-surface-900 rounded-xl border border-gray-100 dark:border-surface-800 shadow-sm divide-y divide-gray-100 dark:divide-surface-800">
        @for (feat of featuresList; track feat.key) {
          <div class="flex items-center justify-between px-5 py-3.5 gap-4">
            <div class="flex items-center gap-3">
              <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 flex-shrink-0">
                <i [class]="feat.icon + ' text-sm'"></i>
              </div>
              <div>
                <h3 class="text-sm font-semibold text-gray-800 dark:text-surface-100">{{ feat.name }}</h3>
                <p class="text-xs text-gray-400 dark:text-surface-500 max-w-md">{{ feat.description }}</p>
              </div>
            </div>
            <label class="relative inline-flex items-center select-none flex-shrink-0"
              [ngClass]="isReadOnly() ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'"
              [title]="isReadOnly() ? 'Chỉ Scrum Master mới được thay đổi' : ''">
              <input type="checkbox" [checked]="getFeatureValue(feat.key)" (change)="onToggle(feat.key, $any($event.target).checked)" [disabled]="isReadOnly()" class="sr-only peer" />
              <div class="w-10 h-6 bg-gray-200 dark:bg-surface-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>
        }
      </div>
    </div>
  `,
})
export class FeaturesTabComponent {
  readonly projectStore = inject(ProjectStore);
  private readonly projectService = inject(ProjectService);
  private readonly authService = inject(AuthService);
  private readonly messageService = inject(MessageService);

  readonly featuresList = [
    {
      key: 'cycles',
      name: 'Sprints/Cycles',
      description: 'Chia nhỏ dự án thành các chu kỳ làm việc ngắn hạn để lập kế hoạch và theo dõi tiến độ.',
      icon: 'pi pi-sync',
    },
    {
      key: 'modules',
      name: 'Modules',
      description: 'Nhóm các công việc liên quan thành các phân hệ logic (ví dụ: Auth, Payment, Billing).',
      icon: 'pi pi-box',
    },
    {
      key: 'views',
      name: 'Views tùy chỉnh',
      description: 'Lưu các bộ lọc và tìm kiếm công việc thành các chế độ xem nhanh tiện lợi.',
      icon: 'pi pi-filter',
    },
    {
      key: 'pages',
      name: 'Pages (Tài liệu)',
      description: 'Viết tài liệu dự án, hướng dẫn phát triển và wiki nội bộ ngay trên không gian làm việc.',
      icon: 'pi pi-file',
    },
    {
      key: 'intake',
      name: 'Intake (Yêu cầu đầu vào)',
      description: 'Quản lý hòm thư góp ý hoặc tiếp nhận yêu cầu tính năng mới từ các bên liên quan.',
      icon: 'pi pi-inbox',
    },
    {
      key: 'timeTracking',
      name: 'Time Tracking (Ghi nhận giờ)',
      description: 'Ghi lại số giờ làm việc thực tế cho mỗi đầu việc để phân tích hiệu suất.',
      icon: 'pi pi-hourglass',
    },
  ];

  readonly isReadOnly = computed(() => {
    const project = this.projectStore.currentProject();
    if (!project) return true;

    const user = this.authService.currentUser();
    if (!user) return true;

    if (user.systemRole === 'Admin') return false;

    const member = this.projectStore.members().find((m) => m.userId === user.id);
    return member?.projectRole !== 'Scrum_Master';
  });

  getFeatureValue(key: string): boolean {
    const project = this.projectStore.currentProject();
    if (!project || !project.features) return false;
    return (project.features as any)[key] ?? false;
  }

  onToggle(key: string, enabled: boolean): void {
    const project = this.projectStore.currentProject();
    if (!project || this.isReadOnly()) return;

    this.projectService.updateFeatures(project.id, { [key]: enabled }).subscribe({
      next: (updatedFeatures) => {
        // Update store project
        this.projectStore.setCurrentProject({
          ...project,
          features: {
            ...project.features,
            ...updatedFeatures,
          },
        });
        
        this.messageService.add({
          severity: 'success',
          summary: 'Thành công',
          detail: `Đã ${enabled ? 'bật' : 'tắt'} tính năng thành công.`,
        });
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Lỗi cập nhật',
          detail: err.error?.message || 'Có lỗi xảy ra khi cập nhật tính năng.',
        });
      },
    });
  }
}
