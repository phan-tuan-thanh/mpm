import { Component, OnInit, inject, computed, signal } from '@angular/core';
import { ProjectStore } from '../../../state/project.store';
import { ProjectService } from '../../../services/project.service';
import { AuthService } from '../../../../auth/services/auth.service';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { PopoverModule } from 'primeng/popover';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { AvatarModule } from 'primeng/avatar';
import { FluidModule } from 'primeng/fluid';
import { ConfirmationService, MessageService } from 'primeng/api';
import { FormsModule } from '@angular/forms';
import { MemberResponse, ProjectRole } from '@mpm/shared-types';

@Component({
  standalone: true,
  selector: 'app-members-tab',
  imports: [
    CommonModule,
    TableModule,
    PopoverModule,
    DialogModule,
    InputTextModule,
    ButtonModule,
    AvatarModule,
    FluidModule,
    FormsModule,
  ],
  template: `
    <div class="space-y-5">
      <!-- Action controls row -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3">
          <!-- Search inline -->
          <div class="relative">
            <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-surface-500 text-sm"></i>
            <input
              type="text"
              pInputText
              [(ngModel)]="searchTerm"
              (ngModelChange)="onSearchChange($event)"
              placeholder="Tìm tên hoặc email..."
              class="text-sm w-56 !pl-9"
            />
          </div>
          @if (!isReadOnly()) {
            <button pButton (click)="showAddDialog()" label="Thêm thành viên" icon="pi pi-plus" size="small"></button>
          }
      </div>

      <!-- Members Table -->
      <div class="bg-white dark:bg-surface-900 rounded-xl border border-gray-100 dark:border-surface-800 shadow-sm overflow-hidden">
        <p-table
          [value]="filteredMembers()"
          [loading]="projectStore.isLoading()"
          responsiveLayout="scroll"
          class="text-xs"
        >
          <ng-template pTemplate="header">
            <tr class="bg-gray-50 dark:bg-surface-800 border-b border-gray-100 dark:border-surface-700">
              <th class="py-3 px-4 text-left font-semibold text-gray-500 dark:text-surface-400">Avatar</th>
              <th class="py-3 px-4 text-left font-semibold text-gray-500 dark:text-surface-400">Họ tên</th>
              <th class="py-3 px-4 text-left font-semibold text-gray-500 dark:text-surface-400">Email</th>
              <th class="py-3 px-4 text-left font-semibold text-gray-500 dark:text-surface-400">Vai trò</th>
              <th class="py-3 px-4 text-left font-semibold text-gray-500 dark:text-surface-400">Ngày tham gia</th>
              @if (!isReadOnly()) {
                <th class="py-3 px-4 text-center font-semibold text-gray-500 dark:text-surface-400 w-24">Hành động</th>
              }
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-member>
            <tr class="border-b border-gray-50 dark:border-surface-800 hover:bg-gray-50/50 dark:hover:bg-surface-800/50 transition">
              <td class="py-2.5 px-4">
                <p-avatar
                  [label]="member.displayName.substring(0, 1).toUpperCase()"
                  shape="circle"
                  styleClass="bg-indigo-50 text-indigo-700 font-bold text-xs"
                ></p-avatar>
              </td>
              <td class="py-2.5 px-4 font-semibold text-gray-800 dark:text-surface-100">{{ member.displayName }}</td>
              <td class="py-2.5 px-4 text-gray-500 dark:text-surface-400 font-medium">{{ member.email }}</td>
              <td class="py-2.5 px-4 overflow-visible">
                @if (!isReadOnly() && member.userId !== currentUserId()) {
                  <button
                    type="button"
                    (click)="rolePop.toggle($event)"
                    class="flex items-center justify-between gap-1 px-2.5 py-1 text-xs border border-surface-200 dark:border-surface-700 rounded-md bg-white dark:bg-surface-900 text-gray-800 dark:text-surface-100 font-semibold cursor-pointer hover:bg-surface-50 dark:hover:bg-surface-800 transition-all select-none w-[130px] h-[28px]"
                  >
                    <span class="truncate">{{ formatRole(member.projectRole) }}</span>
                    <i class="pi pi-chevron-down text-[10px] opacity-60 flex-shrink-0"></i>
                  </button>
                  <p-popover #rolePop appendTo="body" styleClass="!p-0">
                    <div class="pop-list w-36">
                      @for (opt of roleOptions; track opt.value) {
                        <div
                          (click)="onRoleChange(member, opt.value); rolePop.hide()"
                          class="pop-item"
                          [class.selected]="member.projectRole === opt.value"
                        >
                          {{ opt.label }}
                        </div>
                      }
                    </div>
                  </p-popover>
                } @else {
                  <span class="inline-flex items-center rounded-md bg-gray-100 dark:bg-surface-700 px-2.5 py-0.5 text-xs font-semibold text-gray-600 dark:text-surface-300">
                    {{ formatRole(member.projectRole) }}
                  </span>
                }
              </td>
              <td class="py-2.5 px-4 text-gray-500 dark:text-surface-400">
                {{ member.joinedAt | date: 'dd/MM/yyyy' }}
              </td>
              @if (!isReadOnly()) {
                <td class="py-2.5 px-4 text-center">
                  @if (member.userId !== currentUserId()) {
                    <button
                      (click)="onRemoveMember(member)"
                      class="flex h-7 w-7 items-center justify-center rounded hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 text-gray-400 dark:text-surface-500 mx-auto transition"
                      title="Xóa thành viên"
                    >
                      <i class="pi pi-trash"></i>
                    </button>
                  }
                </td>
              }
            </tr>
          </ng-template>
        </p-table>
      </div>

      <!-- Add Member Dialog -->
      <p-dialog
        header="Thêm thành viên mới"
        [(visible)]="displayAddDialog"
        [modal]="true"
        [style]="{ width: '400px' }"
        [draggable]="false"
        [resizable]="false"
      >
        <p-fluid class="block space-y-4 py-2 text-xs">
          <!-- Email Field -->
          <div class="flex flex-col gap-1.5">
            <label class="font-semibold text-gray-700 dark:text-surface-200">Email thành viên</label>
            <input
              type="email"
              pInputText
              [(ngModel)]="newMemberEmail"
              placeholder="Nhập email..."
            />
          </div>

          <!-- Role Field -->
          <div class="flex flex-col gap-1.5">
            <label class="font-semibold text-gray-700 dark:text-surface-200">Vai trò</label>
            <button
              type="button"
              (click)="addRolePop.toggle($event)"
              class="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm border border-surface-200 dark:border-surface-700 rounded-lg bg-white dark:bg-surface-900 text-gray-800 dark:text-surface-100 font-semibold cursor-pointer hover:bg-surface-50 dark:hover:bg-surface-800 transition-all select-none h-[38px]"
            >
              <span class="truncate">{{ formatRole(newMemberRole) }}</span>
              <i class="pi pi-chevron-down text-xs opacity-60 flex-shrink-0"></i>
            </button>
            <p-popover #addRolePop appendTo="body" styleClass="!p-0">
              <div class="pop-list w-48">
                @for (opt of roleOptions; track opt.value) {
                  <div
                    (click)="newMemberRole = opt.value; addRolePop.hide()"
                    class="pop-item"
                    [class.selected]="newMemberRole === opt.value"
                  >
                    {{ opt.label }}
                  </div>
                }
              </div>
            </p-popover>
          </div>
        </p-fluid>

        <ng-template pTemplate="footer">
          <div class="flex items-center justify-end gap-2 text-xs">
            <button
              pButton
              (click)="displayAddDialog = false"
              label="Hủy"
              severity="secondary"
              [text]="true"
              [fluid]="false"
            ></button>
            <button
              pButton
              (click)="onConfirmAdd()"
              label="Thêm"
              [disabled]="!newMemberEmail"
              [fluid]="false"
            ></button>
          </div>
        </ng-template>
      </p-dialog>
    </div>
  `,
})
export class MembersTabComponent implements OnInit {
  readonly projectStore = inject(ProjectStore);
  private readonly projectService = inject(ProjectService);
  private readonly authService = inject(AuthService);
  private readonly confirmService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);

  // States
  searchTerm = '';
  displayAddDialog = false;
  newMemberEmail = '';
  newMemberRole: ProjectRole = 'Developer';

  readonly roleOptions = [
    { label: 'Scrum Master', value: 'Scrum_Master' as ProjectRole },
    { label: 'Product Owner', value: 'Product_Owner' as ProjectRole },
    { label: 'Developer', value: 'Developer' as ProjectRole },
    { label: 'QA Engineer', value: 'QA' as ProjectRole },
    { label: 'Stakeholder', value: 'Stakeholder' as ProjectRole },
  ];

  readonly currentUserId = computed(() => {
    return this.authService.currentUser()?.id || '';
  });

  // Client-side filtering
  readonly filteredMembers = computed(() => {
    const term = this.searchTerm.trim().toLowerCase();
    const members = this.projectStore.members();
    if (!term) return members;
    return members.filter(
      (m) =>
        m.displayName.toLowerCase().includes(term) ||
        m.email.toLowerCase().includes(term),
    );
  });

  // Check read-only state
  readonly isReadOnly = computed(() => {
    const project = this.projectStore.currentProject();
    if (!project) return true;

    const user = this.authService.currentUser();
    if (!user) return true;

    if (user.systemRole === 'Admin') return false;

    const member = this.projectStore.members().find((m) => m.userId === user.id);
    return member?.projectRole !== 'Scrum_Master';
  });

  ngOnInit(): void {
    const project = this.projectStore.currentProject();
    if (project) {
      this.projectStore.loadMembers(project.id);
    }
  }

  onSearchChange(val: string): void {
    this.searchTerm = val;
  }

  showAddDialog(): void {
    this.newMemberEmail = '';
    this.newMemberRole = 'Developer';
    this.displayAddDialog = true;
  }

  onConfirmAdd(): void {
    const project = this.projectStore.currentProject();
    if (!project || !this.newMemberEmail) return;

    this.projectService
      .addMember(project.id, {
        email: this.newMemberEmail.trim(),
        projectRole: this.newMemberRole,
      })
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Thành công',
            detail: 'Thành viên đã được thêm vào dự án.',
          });
          this.displayAddDialog = false;
          this.projectStore.loadMembers(project.id); // Reload list
        },
        error: (err) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Lỗi thêm thành viên',
            detail: err.error?.message || 'Có lỗi xảy ra.',
          });
        },
      });
  }

  onRoleChange(member: MemberResponse, newRole: ProjectRole): void {
    const project = this.projectStore.currentProject();
    if (!project) return;

    // Show warning if downgrading a Scrum Master
    if (member.projectRole === 'Scrum_Master' && newRole !== 'Scrum_Master') {
      this.confirmService.confirm({
        message: `Bạn có chắc chắn muốn thay đổi vai trò của Scrum Master "${member.displayName}"? Hành động này sẽ loại bỏ các quyền quản trị dự án của họ.`,
        header: 'Cảnh báo thay đổi quyền hạn',
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: 'Xác nhận thay đổi',
        rejectLabel: 'Hủy',
        acceptButtonStyleClass: 'p-button-warning',
        rejectButtonStyleClass: 'p-button-secondary p-button-text',
        accept: () => {
          this.executeRoleChange(project.id, member.userId, newRole);
        },
        reject: () => {
          // Reset select UI by reloading
          this.projectStore.loadMembers(project.id);
        },
      });
    } else {
      this.executeRoleChange(project.id, member.userId, newRole);
    }
  }

  private executeRoleChange(
    projectId: string,
    userId: string,
    newRole: ProjectRole,
  ): void {
    this.projectService
      .changeMemberRole(projectId, userId, { projectRole: newRole })
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Thành công',
            detail: 'Vai trò thành viên đã được cập nhật.',
          });
          this.projectStore.loadMembers(projectId);
        },
        error: (err) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Lỗi cập nhật',
            detail: err.error?.message || 'Không thể thay đổi vai trò.',
          });
          // Restore UI state
          this.projectStore.loadMembers(projectId);
        },
      });
  }

  onRemoveMember(member: MemberResponse): void {
    const project = this.projectStore.currentProject();
    if (!project) return;

    this.confirmService.confirm({
      message: `Bạn có chắc chắn muốn xóa thành viên "${member.displayName}" (${this.formatRole(member.projectRole)}) khỏi dự án này?`,
      header: 'Xác nhận xóa thành viên',
      icon: 'pi pi-user-minus',
      acceptLabel: 'Xóa thành viên',
      rejectLabel: 'Hủy',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary p-button-text',
      accept: () => {
        this.projectService.removeMember(project.id, member.userId).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Thành công',
              detail: 'Thành viên đã được xóa khỏi dự án.',
            });
            this.projectStore.loadMembers(project.id);
          },
          error: (err) => {
            this.messageService.add({
              severity: 'error',
              summary: 'Thất bại',
              detail: err.error?.message || 'Không thể xóa thành viên.',
            });
          },
        });
      },
    });
  }

  formatRole(role: ProjectRole): string {
    switch (role) {
      case 'Scrum_Master':
        return 'Scrum Master';
      case 'Product_Owner':
        return 'Product Owner';
      case 'Developer':
        return 'Developer';
      case 'QA':
        return 'QA Engineer';
      case 'Stakeholder':
        return 'Stakeholder';
      default:
        return role || '';
    }
  }
}
