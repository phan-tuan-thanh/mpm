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
import type { ProjectModule } from '@mpm/shared-types';

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
  ],
  providers: [ConfirmationService, MessageService],
  template: `
    <div class="p-6 max-w-7xl mx-auto">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold text-gray-800 dark:text-surface-100">Modules</h1>
        <button
          pButton
          label="Tạo Module"
          icon="pi pi-plus"
          (click)="openCreateForm()"
        ></button>
      </div>

      <!-- Loading state -->
      @if (moduleStore.isLoading()) {
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          @for (i of skeletonItems; track i) {
            <div class="border border-gray-200 dark:border-surface-700 rounded-lg p-4">
              <p-skeleton width="60%" height="1.5rem" styleClass="mb-3" />
              <p-skeleton width="30%" height="1rem" styleClass="mb-3" />
              <p-skeleton width="100%" height="0.5rem" styleClass="mb-3" />
              <p-skeleton width="40%" height="1rem" />
            </div>
          }
        </div>
      } @else {
        <!-- Workspace Modules -->
        @if (workspaceModules().length > 0) {
          <section class="mb-8">
            <h2 class="flex items-center gap-2 text-lg font-semibold text-gray-700 dark:text-surface-200 mb-4">
              <i class="pi pi-globe text-indigo-500"></i>
              Workspace Modules
              <span class="text-sm font-normal text-gray-500 dark:text-surface-400">
                ({{ workspaceModules().length }})
              </span>
            </h2>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              @for (mod of workspaceModules(); track mod.id) {
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
        <section class="mb-8">
          <h2 class="flex items-center gap-2 text-lg font-semibold text-gray-700 dark:text-surface-200 mb-4">
            <i class="pi pi-folder text-teal-500"></i>
            Project Modules
            <span class="text-sm font-normal text-gray-500 dark:text-surface-400">
              ({{ projectModules().length }})
            </span>
          </h2>
          @if (projectModules().length > 0) {
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              @for (mod of projectModules(); track mod.id) {
                <app-module-card
                  [module]="mod"
                  (edit)="openEditForm($event)"
                  (menuClick)="onModuleMenu($event)"
                />
              }
            </div>
          } @else {
            <!-- Empty state -->
            <div class="flex flex-col items-center justify-center py-12 text-center">
              <i class="pi pi-inbox text-4xl text-gray-300 dark:text-surface-600 mb-3"></i>
              <p class="text-gray-500 dark:text-surface-400 mb-2">Chưa có module nào trong project này</p>
              <button pButton label="Tạo Module đầu tiên" icon="pi pi-plus" [outlined]="true" (click)="openCreateForm()"></button>
            </div>
          }
        </section>
      }
    </div>

    <!-- Create/Edit Dialog -->
    <app-module-form
      [(visible)]="formVisible"
      [editModule]="editingModule()"
      (save)="onFormSave($event)"
      (cancel)="onFormCancel()"
    />

    <p-confirmDialog />
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
  protected readonly skeletonItems = [1, 2, 3, 4, 5, 6];

  private projectId = '';
  private workspaceId = '';

  /** Workspace modules (scope = 'workspace') */
  readonly workspaceModules = computed(() =>
    this.moduleStore.modules().filter((m) => m.scope === 'workspace'),
  );

  /** Project modules (scope = 'project') */
  readonly projectModules = computed(() =>
    this.moduleStore.modules().filter((m) => m.scope === 'project'),
  );

  ngOnInit(): void {
    const project = this.projectStore.currentProject();
    if (project) {
      this.projectId = project.id;
      this.workspaceId = project.workspaceId ?? '';
      this.moduleStore.loadModules(this.projectId);
    }
  }

  openCreateForm(): void {
    this.editingModule.set(null);
    this.formVisible = true;
  }

  openEditForm(module: ProjectModule): void {
    // Chỉ cho phép sửa nếu có quyền
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
    // Kiểm tra quyền xóa
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
      // Update
      this.moduleStore.updateModule(this.projectId, editing.id, {
        name: data.name,
        description: data.description,
        status: data.status,
        startDate: data.startDate,
        endDate: data.endDate,
      });
      this.messageService.add({
        severity: 'success',
        summary: 'Đã cập nhật',
        detail: `Module "${data.name}" đã được cập nhật`,
        life: 3000,
      });
    } else {
      // Create
      const result = await this.moduleStore.createModule(this.projectId, {
        name: data.name,
        description: data.description,
        status: data.status,
        startDate: data.startDate,
        endDate: data.endDate,
      });
      if (result) {
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
