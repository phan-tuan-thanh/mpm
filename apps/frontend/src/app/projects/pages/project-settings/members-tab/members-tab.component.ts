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
              [placeholder]="t().searchPlaceholder"
              class="text-sm w-56 !pl-9"
            />
          </div>
          @if (!isReadOnly()) {
            <button pButton (click)="showAddDialog()" [label]="t().addMemberBtn" icon="pi pi-plus" size="small"></button>
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
              <th class="py-3 px-4 text-left font-semibold text-gray-500 dark:text-surface-400">{{ t().colAvatar }}</th>
              <th class="py-3 px-4 text-left font-semibold text-gray-500 dark:text-surface-400">{{ t().colName }}</th>
              <th class="py-3 px-4 text-left font-semibold text-gray-500 dark:text-surface-400">{{ t().colEmail }}</th>
              <th class="py-3 px-4 text-left font-semibold text-gray-500 dark:text-surface-400">{{ t().colRole }}</th>
              <th class="py-3 px-4 text-left font-semibold text-gray-500 dark:text-surface-400">{{ t().colJoinedDate }}</th>
              @if (!isReadOnly()) {
                <th class="py-3 px-4 text-center font-semibold text-gray-500 dark:text-surface-400 w-24">{{ t().colAction }}</th>
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
                      @for (opt of roleOptions(); track opt.value) {
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
                      [title]="t().removeTooltip"
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
        [header]="t().addDialogHeader"
        [(visible)]="displayAddDialog"
        [modal]="true"
        [style]="{ width: '400px' }"
        [draggable]="false"
        [resizable]="false"
      >
        <p-fluid class="block space-y-4 py-2 text-xs">
          <!-- Email Field -->
          <div class="flex flex-col gap-1.5">
            <label class="font-semibold text-gray-700 dark:text-surface-200">{{ t().emailLabel }}</label>
            <input
              type="email"
              pInputText
              [(ngModel)]="newMemberEmail"
              [placeholder]="t().emailPlaceholder"
            />
          </div>

          <!-- Role Field -->
          <div class="flex flex-col gap-1.5">
            <label class="font-semibold text-gray-700 dark:text-surface-200">{{ t().roleLabel }}</label>
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
                @for (opt of roleOptions(); track opt.value) {
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
              [label]="t().cancelBtn"
              severity="secondary"
              [text]="true"
              [fluid]="false"
            ></button>
            <button
              pButton
              (click)="onConfirmAdd()"
              [label]="t().addBtn"
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

  readonly t = computed(() => {
    const isEn = this.projectStore.projectLanguage() === 'en';
    return isEn ? {
      searchPlaceholder: 'Search name or email...',
      addMemberBtn: 'Add Member',
      colAvatar: 'Avatar',
      colName: 'Name',
      colEmail: 'Email',
      colRole: 'Role',
      colJoinedDate: 'Joined Date',
      colAction: 'Action',
      removeTooltip: 'Remove member',
      addDialogHeader: 'Add New Member',
      emailLabel: 'Member Email',
      emailPlaceholder: 'Enter email...',
      roleLabel: 'Role',
      cancelBtn: 'Cancel',
      addBtn: 'Add',
      roleScrumMaster: 'Scrum Master',
      roleProductOwner: 'Product Owner',
      roleDeveloper: 'Developer',
      roleQA: 'QA Engineer',
      roleStakeholder: 'Stakeholder',
      addSuccessSummary: 'Success',
      addSuccessDetail: 'Member has been added to the project.',
      addErrorSummary: 'Add Member Error',
      addErrorDetail: (msg: string) => msg || 'An error occurred.',
      confirmRoleChangeHeader: 'Role Change Warning',
      confirmRoleChangeMsg: (name: string) => `Are you sure you want to change the role of Scrum Master "${name}"? This action will revoke their project administration permissions.`,
      confirmRoleChangeBtn: 'Confirm Change',
      roleUpdateSuccessSummary: 'Success',
      roleUpdateSuccessDetail: 'Member role updated successfully.',
      roleUpdateErrorSummary: 'Update Failed',
      roleUpdateErrorDetail: (msg: string) => msg || 'Could not change role.',
      confirmRemoveHeader: 'Confirm Member Removal',
      confirmRemoveMsg: (name: string, role: string) => `Are you sure you want to remove member "${name}" (${role}) from this project?`,
      confirmRemoveBtn: 'Remove Member',
      removeSuccessSummary: 'Success',
      removeSuccessDetail: 'Member removed from project.',
      removeErrorSummary: 'Removal Failed',
      removeErrorDetail: (msg: string) => msg || 'Could not remove member.',
    } : {
      searchPlaceholder: 'Tìm tên hoặc email...',
      addMemberBtn: 'Thêm thành viên',
      colAvatar: 'Avatar',
      colName: 'Họ tên',
      colEmail: 'Email',
      colRole: 'Vai trò',
      colJoinedDate: 'Ngày tham gia',
      colAction: 'Hành động',
      removeTooltip: 'Xóa thành viên',
      addDialogHeader: 'Thêm thành viên mới',
      emailLabel: 'Email thành viên',
      emailPlaceholder: 'Nhập email...',
      roleLabel: 'Vai trò',
      cancelBtn: 'Hủy',
      addBtn: 'Thêm',
      roleScrumMaster: 'Scrum Master',
      roleProductOwner: 'Product Owner',
      roleDeveloper: 'Developer',
      roleQA: 'QA Engineer',
      roleStakeholder: 'Stakeholder',
      addSuccessSummary: 'Thành công',
      addSuccessDetail: 'Thành viên đã được thêm vào dự án.',
      addErrorSummary: 'Lỗi thêm thành viên',
      addErrorDetail: (msg: string) => msg || 'Có lỗi xảy ra.',
      confirmRoleChangeHeader: 'Cảnh báo thay đổi quyền hạn',
      confirmRoleChangeMsg: (name: string) => `Bạn có chắc chắn muốn thay đổi vai trò của Scrum Master "${name}"? Hành động này sẽ loại bỏ các quyền quản trị dự án của họ.`,
      confirmRoleChangeBtn: 'Xác nhận thay đổi',
      roleUpdateSuccessSummary: 'Thành công',
      roleUpdateSuccessDetail: 'Vai trò thành viên đã được cập nhật.',
      roleUpdateErrorSummary: 'Lỗi cập nhật',
      roleUpdateErrorDetail: (msg: string) => msg || 'Không thể thay đổi vai trò.',
      confirmRemoveHeader: 'Xác nhận xóa thành viên',
      confirmRemoveMsg: (name: string, role: string) => `Bạn có chắc chắn muốn xóa thành viên "${name}" (${role}) khỏi dự án này?`,
      confirmRemoveBtn: 'Xóa thành viên',
      roleUpdateErrorSummary2: 'Thất bại', // Keep naming clean
      removeSuccessSummary: 'Thành công',
      removeSuccessDetail: 'Thành viên đã được xóa khỏi dự án.',
      removeErrorSummary: 'Thất bại',
      removeErrorDetail: (msg: string) => msg || 'Không thể xóa thành viên.',
    };
  });

  // States
  searchTerm = '';
  displayAddDialog = false;
  newMemberEmail = '';
  newMemberRole: ProjectRole = 'Developer';

  readonly roleOptions = computed(() => {
    const trans = this.t();
    return [
      { label: trans.roleScrumMaster, value: 'Scrum_Master' as ProjectRole },
      { label: trans.roleProductOwner, value: 'Product_Owner' as ProjectRole },
      { label: trans.roleDeveloper, value: 'Developer' as ProjectRole },
      { label: trans.roleQA, value: 'QA' as ProjectRole },
      { label: trans.roleStakeholder, value: 'Stakeholder' as ProjectRole },
    ];
  });

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

    const trans = this.t();
    this.projectService
      .addMember(project.id, {
        email: this.newMemberEmail.trim(),
        projectRole: this.newMemberRole,
      })
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: trans.addSuccessSummary,
            detail: trans.addSuccessDetail,
          });
          this.displayAddDialog = false;
          this.projectStore.loadMembers(project.id); // Reload list
        },
        error: (err) => {
          this.messageService.add({
            severity: 'error',
            summary: trans.addErrorSummary,
            detail: trans.addErrorDetail(err.error?.message),
          });
        },
      });
  }

  onRoleChange(member: MemberResponse, newRole: ProjectRole): void {
    const project = this.projectStore.currentProject();
    if (!project) return;

    const trans = this.t();
    // Show warning if downgrading a Scrum Master
    if (member.projectRole === 'Scrum_Master' && newRole !== 'Scrum_Master') {
      this.confirmService.confirm({
        message: trans.confirmRoleChangeMsg(member.displayName),
        header: trans.confirmRoleChangeHeader,
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: trans.confirmRoleChangeBtn,
        rejectLabel: trans.cancelBtn,
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
    const trans = this.t();
    this.projectService
      .changeMemberRole(projectId, userId, { projectRole: newRole })
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: trans.roleUpdateSuccessSummary,
            detail: trans.roleUpdateSuccessDetail,
          });
          this.projectStore.loadMembers(projectId);
        },
        error: (err) => {
          this.messageService.add({
            severity: 'error',
            summary: trans.roleUpdateErrorSummary,
            detail: trans.roleUpdateErrorDetail(err.error?.message),
          });
          // Restore UI state
          this.projectStore.loadMembers(projectId);
        },
      });
  }

  onRemoveMember(member: MemberResponse): void {
    const project = this.projectStore.currentProject();
    if (!project) return;

    const trans = this.t();
    this.confirmService.confirm({
      message: trans.confirmRemoveMsg(member.displayName, this.formatRole(member.projectRole)),
      header: trans.confirmRemoveHeader,
      icon: 'pi pi-user-minus',
      acceptLabel: trans.confirmRemoveBtn,
      rejectLabel: trans.cancelBtn,
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary p-button-text',
      accept: () => {
        this.projectService.removeMember(project.id, member.userId).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: trans.removeSuccessSummary,
              detail: trans.removeSuccessDetail,
            });
            this.projectStore.loadMembers(project.id);
          },
          error: (err) => {
            this.messageService.add({
              severity: 'error',
              summary: trans.removeErrorSummary,
              detail: trans.removeErrorDetail(err.error?.message),
            });
          },
        });
      },
    });
  }

  formatRole(role: ProjectRole): string {
    const trans = this.t();
    switch (role) {
      case 'Scrum_Master':
        return trans.roleScrumMaster;
      case 'Product_Owner':
        return trans.roleProductOwner;
      case 'Developer':
        return trans.roleDeveloper;
      case 'QA':
        return trans.roleQA;
      case 'Stakeholder':
        return trans.roleStakeholder;
      default:
        return role || '';
    }
  }
}
