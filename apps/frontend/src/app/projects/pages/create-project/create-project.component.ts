import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ProjectService } from '../../services/project.service';
import { StateTemplateService } from '../../services/state-template.service';
import { ProjectStore } from '../../state/project.store';
import { AuthService } from '../../../auth/services/auth.service';
import { CommonModule } from '@angular/common';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { FluidModule } from 'primeng/fluid';
import { RadioButtonModule } from 'primeng/radiobutton';
import { MessageService } from 'primeng/api';
import { Subject, Subscription, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, catchError, switchMap } from 'rxjs/operators';
import { FormsModule } from '@angular/forms';
import { ProjectNetwork, StateTemplate, WorkspaceStateTemplate } from '@mpm/shared-types';
import type { TiptapDoc } from '@mpm/shared-types';
import { RichTextEditorComponent } from '../../../shared/components/rich-text-editor/rich-text-editor.component';
import { TIMEZONE_OPTIONS, suggestProjectKey } from './create-project.constants';
import { PopoverModule } from 'primeng/popover';
import { IconPickerPanelComponent } from '../../../shared/components/icon-picker-panel/icon-picker-panel.component';

import { IconDisplayComponent } from '../../../shared/components/icon-display/icon-display.component';

@Component({
  standalone: true,
  selector: 'app-create-project',
  imports: [
    CommonModule,
    RouterLink,
    InputTextModule,
    ButtonModule,
    FluidModule,
    RadioButtonModule,
    FormsModule,
    RichTextEditorComponent,
    PopoverModule,
    IconPickerPanelComponent,
    IconDisplayComponent,
  ],
  templateUrl: './create-project.component.html',
})
export class CreateProjectComponent implements OnInit, OnDestroy {
  readonly ProjectNetwork = ProjectNetwork;

  private readonly projectService = inject(ProjectService);
  private readonly stateTemplateService = inject(StateTemplateService);
  private readonly projectStore = inject(ProjectStore);
  private readonly authService = inject(AuthService);
  private readonly messageService = inject(MessageService);
  private readonly router = inject(Router);

  // Form Fields
  name = '';
  key = '';
  description: TiptapDoc | null = null;
  emoji = '🚀';
  network: ProjectNetwork = ProjectNetwork.SECRET;
  leadId: string | null = null;
  timezone = 'Asia/Saigon';
  stateTemplate: StateTemplate = 'blank';

  // Workspace templates state
  readonly workspaceTemplates = signal<WorkspaceStateTemplate[]>([]);
  readonly hasWorkspaceTemplates = computed(() => this.workspaceTemplates().length > 0);

  // Localization
  readonly t = computed(() => {
    const isEn = this.projectStore.projectLanguage() === 'en';
    return isEn ? {
      breadcrumbProjects: 'Projects',
      breadcrumbCreate: 'Create new project',
      title: 'Create new project',
      subtitle: 'Set up a new collaborative workspace for your team.',
      iconLabel: 'Icon',
      nameLabel: 'Project Name',
      nameRequired: 'Project name is required (maximum 100 characters).',
      namePlaceholder: 'e.g. Project Management System',
      keyLabel: 'Project Key',
      keyPlaceholder: 'e.g. PMS',
      keyHint: 'Used as task code prefix (e.g. PMS-1). Length 2-5 uppercase letters.',
      keyRequired: 'Project Key does not match the format (2-5 uppercase letters).',
      keyExists: `Project Key "${this.key}" is already taken.`,
      descriptionLabel: 'Description (Optional)',
      descriptionPlaceholder: 'Brief description of project goals...',
      initStates: 'Initialization States',
      defaultStateLabel: 'Default (Blank)',
      defaultStateDesc: 'Initialize 3 basic states: Backlog, In Progress, Done.',
      workspaceStateLabel: 'From Workspace Template',
      workspaceStateDesc: (count: number) => `Use ${count} predefined states for the workspace.`,
      privacyLabel: 'Privacy Level',
      privacySecretBtn: 'Secret',
      privacyPublicBtn: 'Public',
      privacySecretDesc: 'Only invited members can access this project.',
      privacyPublicDesc: 'Anyone in the workspace can find and join this project.',
      leadLabel: 'Lead',
      selectLead: 'Select lead',
      timezoneLabel: 'Timezone',
      selectTimezone: 'Select timezone',
      searchTimezonePlaceholder: 'Search timezone...',
      noTimezoneFound: 'No timezones found',
      cancelBtn: 'Cancel',
      createBtn: 'Create Project',
      successSummary: 'Success',
      successDetail: (projectName: string) => `Project "${projectName}" was successfully created.`,
      errorSummary: 'Create Project Error',
      errorDetail: (msg: string) => msg || 'An error occurred while creating the project.',
    } : {
      breadcrumbProjects: 'Dự án',
      breadcrumbCreate: 'Tạo dự án mới',
      title: 'Tạo dự án mới',
      subtitle: 'Thiết lập không gian cộng tác mới cho nhóm của bạn.',
      iconLabel: 'Icon',
      nameLabel: 'Tên dự án',
      nameRequired: 'Tên dự án là bắt buộc (tối đa 100 ký tự).',
      namePlaceholder: 'Ví dụ: Project Management System',
      keyLabel: 'Mã dự án (Key)',
      keyPlaceholder: 'Ví dụ: PMS',
      keyHint: 'Được dùng làm tiền tố mã công việc (ví dụ: PMS-1). Độ dài 2-5 chữ cái in hoa.',
      keyRequired: 'Mã dự án không khớp định dạng (2-5 chữ cái in hoa).',
      keyExists: `Mã dự án "${this.key}" đã được sử dụng.`,
      descriptionLabel: 'Mô tả (Không bắt buộc)',
      descriptionPlaceholder: 'Mô tả tóm tắt mục tiêu dự án...',
      initStates: 'Trạng thái khởi tạo',
      defaultStateLabel: 'Mặc định (Blank)',
      defaultStateDesc: 'Khởi tạo 3 trạng thái cơ bản: Backlog, In Progress, Done.',
      workspaceStateLabel: 'Từ Workspace Template',
      workspaceStateDesc: (count: number) => `Sử dụng ${count} trạng thái đã được định nghĩa sẵn cho workspace.`,
      privacyLabel: 'Quyền riêng tư',
      privacySecretBtn: 'Bảo mật (Secret)',
      privacyPublicBtn: 'Công khai (Public)',
      privacySecretDesc: 'Chỉ thành viên được mời mới có thể truy cập dự án này.',
      privacyPublicDesc: 'Tất cả mọi người trong workspace đều có thể tìm thấy và tự tham gia dự án này.',
      leadLabel: 'Người phụ trách (Lead)',
      selectLead: 'Chọn người phụ trách',
      timezoneLabel: 'Múi giờ',
      selectTimezone: 'Chọn múi giờ',
      searchTimezonePlaceholder: 'Tìm kiếm múi giờ...',
      noTimezoneFound: 'Không tìm thấy múi giờ',
      cancelBtn: 'Hủy bỏ',
      createBtn: 'Tạo dự án',
      successSummary: 'Thành công',
      successDetail: (projectName: string) => `Dự án "${projectName}" đã được tạo thành công.`,
      errorSummary: 'Lỗi tạo dự án',
      errorDetail: (msg: string) => msg || 'Có lỗi xảy ra khi tạo dự án.',
    };
  });

  // Lead options computed (only current user for new projects)
  readonly leadOptions = computed(() => {
    const user = this.authService.currentUser();
    if (!user) return [];
    return [
      { label: user.email, value: user.id },
    ];
  });

  // Timezone options
  readonly timezoneOptions = TIMEZONE_OPTIONS;
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

  // Form States
  keyEditedByUser = false;
  keyAlreadyExists = signal<boolean>(false);
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
        this.keyAlreadyExists.set(!!project);
      });

    // Default lead to current user
    const currentUser = this.authService.currentUser();
    if (currentUser) {
      this.leadId = currentUser.id;
    }

    // Fetch workspace state templates (chỉ hiện option nếu có)
    this.loadWorkspaceTemplates();
  }

  ngOnDestroy(): void {
    this.keyCheckSubscription?.unsubscribe();
  }

  onNameChange(val: string): void {
    if (!this.keyEditedByUser && val) {
      // Suggest key bằng các chữ cái in hoa đầu tiên của mỗi từ
      const suggested = suggestProjectKey(val);
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
    if (!this.name || !this.key || this.keyAlreadyExists()) return;

    this.isSubmitting.set(true);

    const trans = this.t();
    this.projectService
      .createProject({
        name: this.name,
        key: this.key,
        description: this.description ?? undefined,
        emoji: this.emoji,
        network: this.network,
        leadId: this.leadId || undefined,
        timezone: this.timezone,
        stateTemplate: this.stateTemplate,
      })
      .subscribe({
        next: (project) => {
          this.messageService.add({
            severity: 'success',
            summary: trans.successSummary,
            detail: trans.successDetail(project.name),
          });
          this.projectStore.loadProjects(); // Reload projects list
          void this.router.navigate(['/projects', project.key, 'board']);
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.messageService.add({
            severity: 'error',
            summary: trans.errorSummary,
            detail: trans.errorDetail(err.error?.message),
          });
        },
      });
  }

  /**
   * Lấy workspace ID từ project hiện tại hoặc project đầu tiên trong danh sách,
   * sau đó fetch state templates. Chỉ hiển thị option "Workspace Template" nếu có templates.
   */
  private loadWorkspaceTemplates(): void {
    const workspaceId = this.getWorkspaceId();
    if (!workspaceId) return;

    this.stateTemplateService
      .getTemplates(workspaceId)
      .pipe(catchError(() => of([])))
      .subscribe((templates) => {
        this.workspaceTemplates.set(templates);
      });
  }

  /**
   * Lấy workspace ID từ project đã load (currentProject hoặc first project in list)
   */
  private getWorkspaceId(): string | null {
    // Ưu tiên lấy từ current project đã load
    const currentProject = this.projectStore.currentProject();
    if (currentProject?.workspaceId) {
      return currentProject.workspaceId;
    }

    // Fallback: lấy từ first project in list (getProjectByKey sẽ được gọi riêng nếu cần)
    // Nếu không có project nào → không có workspace → không có templates
    return null;
  }
}
