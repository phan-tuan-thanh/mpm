import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';

import { ModuleStore } from '../../state/module.store';
import { ProjectStore } from '../../../projects/state/project.store';
import { AuthStore } from '../../../auth/state/auth.store';
import { ModuleCardComponent } from './module-card.component';
import { ModuleFormComponent, ModuleFormData } from './module-form.component';
import { ModuleStatusFilterComponent } from './module-status-filter.component';
import type { ProjectModule, ModuleLifecycleStatus } from '@mpm/shared-types';

@Component({
  standalone: true,
  selector: 'app-modules-page',
  imports: [
    CommonModule,
    ButtonModule,
    SkeletonModule,
    ConfirmDialogModule,
    ToastModule,
    ModuleCardComponent,
    ModuleFormComponent,
    ModuleStatusFilterComponent,
  ],
  providers: [ConfirmationService, MessageService],
  template: `
    <div class="flex flex-col h-full bg-white dark:bg-surface-900">

      <!-- Toolbar -->
      <div class="flex items-center gap-3 px-6 py-3 border-b border-gray-200 dark:border-surface-700 flex-shrink-0">
        <h1 class="text-base font-semibold text-gray-800 dark:text-surface-100 mr-2">Modules</h1>
        <app-module-status-filter
          [selectedStatuses]="statusFilter()"
          (filterChanged)="onFilterChanged($event)"
        />
        @if (statusFilter().length > 0) {
          <button
            pButton
            label="Xóa filter"
            icon="pi pi-times"
            severity="secondary"
            [outlined]="true"
            size="small"
            (click)="clearFilter()"
          ></button>
        }
        <div class="flex-1"></div>
        <button
          pButton
          label="Tạo Module"
          icon="pi pi-plus"
          size="small"
          (click)="openCreateForm()"
        ></button>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto px-6 py-4">

        <!-- Loading state -->
        @if (moduleStore.isLoading()) {
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            @for (i of skeletonItems; track i) {
              <div class="border border-gray-200 dark:border-surface-700 rounded-lg p-4">
                <p-skeleton width="60%" height="1.25rem" styleClass="mb-3" />
                <p-skeleton width="30%" height="1rem" styleClass="mb-3" />
                <p-skeleton width="100%" height="0.5rem" styleClass="mb-3" />
                <p-skeleton width="40%" height="1rem" />
              </div>
            }
          </div>
        } @else {

          <!-- Workspace Modules -->
          @if (filteredWorkspaceModules().length > 0) {
            <section class="mb-6">
              <h2 class="flex items-center gap-2 text-sm font-semibold text-gray-500 dark:text-surface-400 uppercase tracking-wide mb-3">
                <i class="pi pi-globe text-indigo-500 text-xs"></i>
                Workspace
                <span class="font-normal normal-case tracking-normal">({{ filteredWorkspaceModules().length }})</span>
              </h2>
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                @for (mod of filteredWorkspaceModules(); track mod.id) {
                  <app-module-card
                    [module]="mod"
                    (edit)="openEditForm($event)"
                    (menuClick)="onModuleMenu($event)"
                  />
                }
              </div>
            </section>
          }

          <!-- Project Modules -->
          <section>
            <h2 class="flex items-center gap-2 text-sm font-semibold text-gray-500 dark:text-surface-400 uppercase tracking-wide mb-3">
              <i class="pi pi-folder text-teal-500 text-xs"></i>
              Project
              <span class="font-normal normal-case tracking-normal">({{ filteredProjectModules().length }})</span>
            </h2>
            @if (filteredProjectModules().length > 0) {
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                @for (mod of filteredProjectModules(); track mod.id) {
                  <app-module-card
                    [module]="mod"
                    (edit)="openEditForm($event)"
                    (menuClick)="onModuleMenu($event)"
                  />
                }
              </div>
            } @else {
              <!-- Empty state -->
              <div class="flex flex-col items-center justify-center py-16 text-center">
                <i class="pi pi-inbox text-4xl text-gray-300 dark:text-surface-600 mb-3"></i>
                @if (statusFilter().length > 0) {
                  <p class="text-sm text-gray-500 dark:text-surface-400 mb-3">Không có module nào khớp với filter hiện tại</p>
                  <button pButton label="Xóa filter" icon="pi pi-times" [outlined]="true" size="small" (click)="clearFilter()"></button>
                } @else {
                  <p class="text-sm text-gray-500 dark:text-surface-400 mb-3">Chưa có module nào trong project này</p>
                  <button pButton label="Tạo Module đầu tiên" icon="pi pi-plus" [outlined]="true" size="small" (click)="openCreateForm()"></button>
                }
              </div>
            }
          </section>
        }
      </div>
    </div>

    <!-- Create/Edit Dialog -->
    <app-module-form
      [(visible)]="formVisible"
      [editModule]="editingModule()"
      (save)="onFormSave($event)"
      (cancel)="onFormCancel()"
    />

    <p-confirmDialog appendTo="body" />
    <p-toast />
  `,
})
export class ModulesComponent implements OnInit {
  readonly moduleStore = inject(ModuleStore);
  private readonly projectStore = inject(ProjectStore);
  private readonly authStore = inject(AuthStore);
  private readonly route = inject(ActivatedRoute);
  private readonly confirmService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);

  protected formVisible = false;
  protected editingModule = signal<ProjectModule | null>(null);
  protected statusFilter = signal<ModuleLifecycleStatus[]>([]);
  protected readonly skeletonItems = [1, 2, 3, 4, 5, 6];

  private projectId = '';
  private workspaceId = '';

  readonly workspaceModules = computed(() =>
    this.moduleStore.modules().filter((m) => m.scope === 'workspace'),
  );

  readonly projectModules = computed(() =>
    this.moduleStore.modules().filter((m) => m.scope === 'project'),
  );

  readonly filteredWorkspaceModules = computed(() => {
    const filter = this.statusFilter();
    return filter.length === 0
      ? this.workspaceModules()
      : this.workspaceModules().filter((m) => filter.includes(m.status));
  });

  readonly filteredProjectModules = computed(() => {
    const filter = this.statusFilter();
    return filter.length === 0
      ? this.projectModules()
      : this.projectModules().filter((m) => filter.includes(m.status));
  });

  ngOnInit(): void {
    const project = this.projectStore.currentProject();
    if (project) {
      this.projectId = project.id;
      this.workspaceId = project.workspaceId ?? '';
      this.moduleStore.loadModules(this.projectId);
    }
  }

  onFilterChanged(statuses: ModuleLifecycleStatus[]): void {
    this.statusFilter.set(statuses);
  }

  clearFilter(): void {
    this.statusFilter.set([]);
  }

  openCreateForm(): void {
    this.editingModule.set(null);
    this.formVisible = true;
  }

  openEditForm(module: ProjectModule): void {
    if (module.scope === 'workspace' && !this.authStore.isAdmin()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Không có quyền',
        detail: 'Chỉ Workspace Admin mới có thể sửa workspace module',
        life: 3000,
      });
      return;
    }
    this.editingModule.set(module);
    this.formVisible = true;
  }

  onModuleMenu(module: ProjectModule): void {
    if (module.scope === 'workspace' && !this.authStore.isAdmin()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Không có quyền',
        detail: 'Chỉ Workspace Admin mới có thể xóa workspace module',
        life: 3000,
      });
      return;
    }

    this.confirmService.confirm({
      message: `Bạn có chắc muốn xóa module "${module.name}"? Tất cả liên kết task sẽ bị gỡ.`,
      header: 'Xác nhận xóa',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Xóa',
      rejectLabel: 'Hủy',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.moduleStore.deleteModule(this.projectId, module.id);
        this.messageService.add({
          severity: 'success',
          summary: 'Đã xóa',
          detail: `Module "${module.name}" đã được xóa`,
          life: 3000,
        });
      },
    });
  }

  async onFormSave(data: ModuleFormData): Promise<void> {
    const editing = this.editingModule();
    if (editing) {
      const dto: { name?: string; description?: any; status?: any; startDate?: string | null; endDate?: string | null } = {
        name: data.name,
        description: data.description,
        startDate: data.startDate,
        endDate: data.endDate,
      };
      if (data.status) dto.status = data.status;

      const result = await this.moduleStore.updateModule(this.projectId, editing.id, dto);

      if (!result.success) {
        if (result.error.type === '422') {
          const allowed = result.error.allowedTransitions?.join(', ') ?? '';
          this.messageService.add({
            severity: 'error',
            summary: 'Transition không hợp lệ',
            detail: `Trạng thái hiện tại: ${result.error.currentStatus}. Cho phép: ${allowed}`,
            life: 5000,
          });
          // Reload to get latest state
          this.moduleStore.loadModules(this.projectId);
        } else if (result.error.type === '409') {
          this.messageService.add({
            severity: 'warn',
            summary: 'Xung đột cập nhật',
            detail: result.error.message,
            life: 4000,
          });
          this.moduleStore.loadModules(this.projectId);
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'Lỗi',
            detail: result.error.message,
            life: 3000,
          });
        }
        return;
      }

      this.messageService.add({
        severity: 'success',
        summary: 'Đã cập nhật',
        detail: `Module "${data.name}" đã được cập nhật`,
        life: 3000,
      });
    } else {
      const module = await this.moduleStore.createModule(this.projectId, {
        name: data.name,
        description: data.description,
        status: data.status,
        startDate: data.startDate,
        endDate: data.endDate,
      });
      if (module) {
        this.messageService.add({
          severity: 'success',
          summary: 'Đã tạo',
          detail: `Module "${data.name}" đã được tạo`,
          life: 3000,
        });
      }
    }
  }

  onFormCancel(): void {
    this.editingModule.set(null);
  }
}
