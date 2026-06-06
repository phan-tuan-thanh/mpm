import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ProjectService } from '../../services/project.service';
import { StateTemplateService } from '../../services/state-template.service';
import { ProjectStore } from '../../state/project.store';
import { AuthService } from '../../../auth/services/auth.service';
import { CommonModule } from '@angular/common';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { FluidModule } from 'primeng/fluid';
import { RadioButtonModule } from 'primeng/radiobutton';
import { MessageService } from 'primeng/api';
import { Subject, Subscription, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, catchError, switchMap } from 'rxjs/operators';
import { FormsModule } from '@angular/forms';
import { ProjectNetwork, StateTemplate, WorkspaceStateTemplate } from '@mpm/shared-types';
import { COMMON_EMOJIS, TIMEZONE_OPTIONS, suggestProjectKey } from './create-project.constants';

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
    RadioButtonModule,
    FormsModule,
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
  description = '';
  emoji = '🚀';
  network: ProjectNetwork = ProjectNetwork.SECRET;
  leadId: string | null = null;
  timezone = 'Asia/Ho_Chi_Minh';
  stateTemplate: StateTemplate = 'blank';

  // Workspace templates state
  readonly workspaceTemplates = signal<WorkspaceStateTemplate[]>([]);
  readonly hasWorkspaceTemplates = computed(() => this.workspaceTemplates().length > 0);

  // UI States
  showEmojiPicker = signal<boolean>(false);
  readonly commonEmojis = COMMON_EMOJIS;

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

    // Fetch workspace state templates (chỉ hiện option nếu có)
    this.loadWorkspaceTemplates();
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
        stateTemplate: this.stateTemplate,
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
