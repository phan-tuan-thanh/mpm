import { Component, inject, computed } from '@angular/core';
import { ProjectStore } from '../../../state/project.store';
import { ProjectService } from '../../../services/project.service';
import { AuthService } from '../../../../auth/services/auth.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { MessageService } from 'primeng/api';

@Component({
  standalone: true,
  selector: 'app-features-tab',
  imports: [CommonModule, FormsModule, ToggleSwitchModule],
  template: `
    <div class="space-y-5">

      @if (isReadOnly()) {
        <div class="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-3 flex gap-2 text-xs text-amber-700 dark:text-amber-400 font-medium">
          <i class="pi pi-lock text-sm mt-0.5"></i>
          <span>{{ t().readOnlyBanner }}</span>
        </div>
      }

      <!-- Features card -->
      <div class="bg-white dark:bg-surface-900 rounded-xl border border-gray-100 dark:border-surface-800 shadow-sm divide-y divide-gray-100 dark:divide-surface-800">
        @for (feat of featuresList(); track feat.key) {
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
            <div class="flex-shrink-0 flex items-center"
              [title]="isReadOnly() ? t().readOnlyTooltip : ''">
              <p-toggleswitch
                [ngModel]="getFeatureValue(feat.key)"
                (ngModelChange)="onToggle(feat.key, $event)"
                [disabled]="isReadOnly()"
              />
            </div>
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

  readonly t = computed(() => {
    const isEn = this.projectStore.projectLanguage() === 'en';
    return isEn ? {
      readOnlyBanner: 'Read-only view. Only Scrum Master or Admin can toggle these features.',
      readOnlyTooltip: 'Only Scrum Master can make changes',
      successSummary: 'Success',
      successDetail: (enabled: boolean) => `Feature successfully ${enabled ? 'enabled' : 'disabled'}.`,
      errorSummary: 'Update Failed',
      errorDetail: (msg: string) => msg || 'An error occurred while updating the feature.',
    } : {
      readOnlyBanner: 'Chế độ xem. Chỉ Scrum Master hoặc Admin mới có quyền bật/tắt các tính năng này.',
      readOnlyTooltip: 'Chỉ Scrum Master mới được thay đổi',
      successSummary: 'Thành công',
      successDetail: (enabled: boolean) => `Đã ${enabled ? 'bật' : 'tắt'} tính năng thành công.`,
      errorSummary: 'Lỗi cập nhật',
      errorDetail: (msg: string) => msg || 'Có lỗi xảy ra khi cập nhật tính năng.',
    };
  });

  readonly featuresList = computed(() => {
    const isEn = this.projectStore.projectLanguage() === 'en';
    return [
      {
        key: 'cycles',
        name: 'Sprints/Cycles',
        description: isEn
          ? 'Break down the project into short-term work cycles to plan and track progress.'
          : 'Chia nhỏ dự án thành các chu kỳ làm việc ngắn hạn để lập kế hoạch và theo dõi tiến độ.',
        icon: 'pi pi-sync',
      },
      {
        key: 'modules',
        name: 'Modules',
        description: isEn
          ? 'Group related tasks into logical modules (e.g. Auth, Payment, Billing).'
          : 'Nhóm các công việc liên quan thành các phân hệ logic (ví dụ: Auth, Payment, Billing).',
        icon: 'pi pi-box',
      },
      {
        key: 'views',
        name: isEn ? 'Custom Views' : 'Views tùy chỉnh',
        description: isEn
          ? 'Save task filters and searches into convenient quick views.'
          : 'Lưu các bộ lọc và tìm kiếm công việc thành các chế độ xem nhanh tiện lợi.',
        icon: 'pi pi-filter',
      },
      {
        key: 'pages',
        name: isEn ? 'Pages (Documents)' : 'Pages (Tài liệu)',
        description: isEn
          ? 'Write project documentation, development guides, and internal wikis directly on the workspace.'
          : 'Viết tài liệu dự án, hướng dẫn phát triển và wiki nội bộ ngay trên không gian làm việc.',
        icon: 'pi pi-file',
      },
      {
        key: 'intake',
        name: isEn ? 'Intake (Inbound Requests)' : 'Intake (Yêu cầu đầu vào)',
        description: isEn
          ? 'Manage suggestion boxes or receive new feature requests from stakeholders.'
          : 'Quản lý hòm thư góp ý hoặc tiếp nhận yêu cầu tính năng mới từ các bên liên quan.',
        icon: 'pi pi-inbox',
      },
      {
        key: 'timeTracking',
        name: isEn ? 'Time Tracking' : 'Time Tracking (Ghi nhận giờ)',
        description: isEn
          ? 'Log actual working hours for each task to analyze performance.'
          : 'Ghi lại số giờ làm việc thực tế cho mỗi đầu việc để phân tích hiệu suất.',
        icon: 'pi pi-hourglass',
      },
    ];
  });

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

    const trans = this.t();
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
          summary: trans.successSummary,
          detail: trans.successDetail(enabled),
        });
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: trans.errorSummary,
          detail: trans.errorDetail(err.error?.message),
        });
      },
    });
  }
}
