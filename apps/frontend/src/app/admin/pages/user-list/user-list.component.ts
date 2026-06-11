import { Component, OnInit, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { PopoverModule } from 'primeng/popover';
import { ButtonModule } from 'primeng/button';
import { AvatarModule } from 'primeng/avatar';
import { FluidModule } from 'primeng/fluid';
import { InputTextModule } from 'primeng/inputtext';
import { ConfirmationService, MessageService } from 'primeng/api';
import { AdminService, AdminUserResponse } from '../../services/admin.service';
import { AuthService } from '../../../auth/services/auth.service';

@Component({
  standalone: true,
  selector: 'app-user-list',
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    PopoverModule,
    ButtonModule,
    AvatarModule,
    FluidModule,
    InputTextModule,
  ],
  template: `
    <div class="p-6 space-y-6">
      <!-- Title Section -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-surface-0 flex items-center gap-2">
            <i class="pi pi-shield text-indigo-600 dark:text-indigo-400"></i>
            Quản trị hệ thống
          </h1>
          <p class="text-sm text-gray-500 dark:text-surface-400 mt-1">
            Quản lý tài khoản người dùng, phân quyền System Role và kích hoạt/vô hiệu hóa tài khoản.
          </p>
        </div>
      </div>

      <!-- Main card container -->
      <div class="bg-white dark:bg-surface-900 rounded-xl border border-gray-100 dark:border-surface-800 p-6 shadow-sm space-y-5">
        <!-- Search and statistics -->
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <p-fluid class="block w-full md:max-w-md">
            <div class="relative w-full">
              <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-surface-500 text-sm"></i>
              <input
                type="text"
                pInputText
                [(ngModel)]="searchTerm"
                placeholder="Tìm theo tên hoặc email..."
                class="w-full text-sm !pl-9"
              />
            </div>
          </p-fluid>

          <!-- Stats Quick View -->
          <div class="flex gap-4 text-xs font-semibold text-gray-500 dark:text-surface-400">
            <span class="flex items-center gap-1.5">
              <span class="h-2.5 w-2.5 rounded-full bg-indigo-600"></span>
              Tổng: {{ users().length }}
            </span>
            <span class="flex items-center gap-1.5">
              <span class="h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
              Hoạt động: {{ activeUsersCount() }}
            </span>
            <span class="flex items-center gap-1.5">
              <span class="h-2.5 w-2.5 rounded-full bg-red-500"></span>
              Bị khóa: {{ disabledUsersCount() }}
            </span>
          </div>
        </div>

        <!-- Users Table -->
        <div class="border border-gray-100 dark:border-surface-800 rounded-lg overflow-hidden">
          <p-table
            [value]="filteredUsers()"
            [loading]="isLoading()"
            responsiveLayout="scroll"
            class="text-xs"
          >
            <ng-template pTemplate="header">
              <tr class="bg-gray-50 dark:bg-surface-950 border-b border-gray-100 dark:border-surface-800">
                <th class="py-3 px-4 text-left font-semibold text-gray-500 dark:text-surface-400 w-16">Avatar</th>
                <th class="py-3 px-4 text-left font-semibold text-gray-500 dark:text-surface-400">Họ tên</th>
                <th class="py-3 px-4 text-left font-semibold text-gray-500 dark:text-surface-400">Email</th>
                <th class="py-3 px-4 text-left font-semibold text-gray-500 dark:text-surface-400 w-44">System Role</th>
                <th class="py-3 px-4 text-left font-semibold text-gray-500 dark:text-surface-400 w-32">Trạng thái</th>
                <th class="py-3 px-4 text-left font-semibold text-gray-500 dark:text-surface-400 w-36">Ngày tạo</th>
                <th class="py-3 px-4 text-center font-semibold text-gray-500 dark:text-surface-400 w-48">Hành động</th>
              </tr>
            </ng-template>

            <ng-template pTemplate="body" let-user>
              <tr class="border-b border-gray-50 dark:border-surface-800 hover:bg-gray-50/50 dark:hover:bg-surface-800/30 transition">
                <!-- Avatar -->
                <td class="py-2.5 px-4">
                  <p-avatar
                    [label]="user.displayName.substring(0, 1).toUpperCase()"
                    shape="circle"
                    styleClass="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400 font-bold text-xs"
                  ></p-avatar>
                </td>

                <!-- Display Name -->
                <td class="py-2.5 px-4 font-semibold text-gray-800 dark:text-surface-100">
                  {{ user.displayName }}
                  @if (user.id === currentUserId()) {
                    <span class="ml-1 text-[10px] bg-slate-100 dark:bg-surface-800 text-slate-600 dark:text-surface-300 px-1.5 py-0.5 rounded font-normal">Bạn</span>
                  }
                </td>

                <!-- Email -->
                <td class="py-2.5 px-4 text-gray-500 dark:text-surface-400 font-medium">{{ user.email }}</td>

                <!-- System Role Dropdown -->
                <td class="py-2.5 px-4 overflow-visible">
                  @if (user.id !== currentUserId()) {
                    <button
                      type="button"
                      (click)="rolePop.toggle($event)"
                      class="flex items-center justify-between gap-1.5 px-2 py-1 text-xs border border-surface-200 dark:border-surface-700 rounded bg-white dark:bg-surface-800 text-gray-800 dark:text-surface-100 cursor-pointer hover:bg-surface-50 dark:hover:bg-surface-700 transition-all select-none w-[120px]"
                    >
                      <span class="truncate">{{ getRoleLabel(user.systemRole) }}</span>
                      <i class="pi pi-chevron-down text-[9px] opacity-60 flex-shrink-0"></i>
                    </button>
                    <p-popover #rolePop appendTo="body" styleClass="!p-0">
                      <div class="pop-list w-32">
                        @for (opt of roleOptions; track opt.value) {
                          <div
                            (click)="onRoleChange(user, opt.value); rolePop.hide()"
                            class="pop-item"
                            [class.selected]="user.systemRole === opt.value"
                          >
                            {{ opt.label }}
                          </div>
                        }
                      </div>
                    </p-popover>
                  } @else {
                    <span class="inline-flex items-center rounded-md bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 dark:text-indigo-400">
                      {{ user.systemRole }}
                    </span>
                  }
                </td>

                <!-- Status Chip -->
                <td class="py-2.5 px-4">
                  @if (user.isActive) {
                    <span class="inline-flex items-center rounded-md bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                      Active
                    </span>
                  } @else {
                    <span class="inline-flex items-center rounded-md bg-rose-50 dark:bg-rose-950/40 px-2.5 py-0.5 text-xs font-semibold text-rose-700 dark:text-rose-400">
                      Disabled
                    </span>
                  }
                </td>

                <!-- Created At -->
                <td class="py-2.5 px-4 text-gray-500 dark:text-surface-400">
                  {{ user.createdAt | date: 'dd/MM/yyyy HH:mm' }}
                </td>

                <!-- Action Buttons -->
                <td class="py-2.5 px-4 text-center">
                  @if (user.id !== currentUserId()) {
                    <div class="flex justify-center gap-2">
                      @if (user.isActive) {
                        <button
                          pButton
                          (click)="onToggleStatus(user)"
                          label="Khóa"
                          icon="pi pi-lock"
                          severity="danger"
                          [outlined]="true"
                          class="p-button-xs py-1 px-2.5 text-xs"
                        ></button>
                      } @else {
                        <button
                          pButton
                          (click)="onToggleStatus(user)"
                          label="Kích hoạt"
                          icon="pi pi-lock-open"
                          severity="success"
                          [outlined]="true"
                          class="p-button-xs py-1 px-2.5 text-xs"
                        ></button>
                      }
                    </div>
                  } @else {
                    <span class="text-xs text-gray-400 italic">Không thể tự thao tác</span>
                  }
                </td>
              </tr>
            </ng-template>

            <ng-template pTemplate="emptymessage">
              <tr>
                <td colspan="7" class="py-8 text-center text-gray-500 dark:text-surface-400">
                  Không tìm thấy người dùng phù hợp.
                </td>
              </tr>
            </ng-template>
          </p-table>
        </div>
      </div>
    </div>
  `,
})
export class UserListComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly authService = inject(AuthService);
  private readonly confirmService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);

  // States
  users = signal<AdminUserResponse[]>([]);
  searchTerm = '';
  isLoading = signal<boolean>(false);

  readonly roleOptions = [
    { label: 'Admin', value: 'Admin' },
    { label: 'User', value: 'User' },
  ];

  readonly currentUserId = computed(() => {
    return this.authService.currentUser()?.id || '';
  });

  // Client-side filtering
  readonly filteredUsers = computed(() => {
    const term = this.searchTerm.trim().toLowerCase();
    const allUsers = this.users();
    if (!term) return allUsers;
    return allUsers.filter(
      (u) =>
        u.displayName.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term)
    );
  });

  // Count active/disabled users
  readonly activeUsersCount = computed(() => {
    return this.users().filter((u) => u.isActive).length;
  });

  readonly disabledUsersCount = computed(() => {
    return this.users().filter((u) => !u.isActive).length;
  });

  // Count active Admins in list (for last-admin validation warning)
  readonly activeAdminCount = computed(() => {
    return this.users().filter((u) => u.systemRole === 'Admin' && u.isActive).length;
  });

  getRoleLabel(role: string): string {
    const found = this.roleOptions.find((o) => o.value === role);
    return found ? found.label : role;
  }

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.isLoading.set(true);
    this.adminService.listUsers().subscribe({
      next: (data) => {
        this.users.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Lỗi tải danh sách',
          detail: err.error?.message || 'Không thể lấy thông tin người dùng.',
        });
        this.isLoading.set(false);
      },
    });
  }

  onRoleChange(user: AdminUserResponse, newRole: 'Admin' | 'User'): void {
    // Check last admin protection
    const isActiveAdmin = user.systemRole === 'Admin' && user.isActive;
    const isDemotingAdmin = isActiveAdmin && newRole !== 'Admin';

    if (isDemotingAdmin && this.activeAdminCount() <= 1) {
      this.confirmService.confirm({
        message: `Hành động bị chặn: "${user.displayName}" là tài khoản Admin duy nhất đang hoạt động của hệ thống. Bạn không thể hạ quyền của họ để tránh việc mất quyền quản trị hệ thống.`,
        header: 'Không thể thực hiện',
        icon: 'pi pi-ban',
        acceptLabel: 'Đã hiểu',
        rejectVisible: false,
        acceptButtonStyleClass: 'p-button-secondary',
        accept: () => {
          this.loadUsers(); // reload to reset select dropdown UI
        },
      });
      return;
    }

    // Confirm demoting an Admin -> User
    if (newRole === 'User') {
      this.confirmService.confirm({
        message: `Bạn có chắc muốn hạ quyền [${user.displayName}]? Họ sẽ mất quyền truy cập Trang quản trị và các cấu hình hệ thống.`,
        header: 'Xác nhận hạ quyền',
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: 'Hạ quyền',
        rejectLabel: 'Hủy',
        acceptButtonStyleClass: 'p-button-warning',
        rejectButtonStyleClass: 'p-button-secondary p-button-text',
        accept: () => {
          this.executeRoleChange(user.id, newRole);
        },
        reject: () => {
          this.loadUsers();
        },
      });
    } else {
      this.executeRoleChange(user.id, newRole);
    }
  }

  private executeRoleChange(userId: string, role: 'Admin' | 'User'): void {
    this.adminService.changeRole(userId, role).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Thành công',
          detail: 'Vai trò hệ thống đã được cập nhật.',
        });
        this.loadUsers();
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Lỗi cập nhật',
          detail: err.error?.message || 'Có lỗi xảy ra.',
        });
        this.loadUsers();
      },
    });
  }

  onToggleStatus(user: AdminUserResponse): void {
    if (user.isActive) {
      // Check last admin protection
      if (user.systemRole === 'Admin' && this.activeAdminCount() <= 1) {
        this.confirmService.confirm({
          message: `Hành động bị chặn: "${user.displayName}" là tài khoản Admin duy nhất đang hoạt động của hệ thống. Bạn không thể vô hiệu hóa tài khoản này.`,
          header: 'Không thể thực hiện',
          icon: 'pi pi-ban',
          acceptLabel: 'Đã hiểu',
          rejectVisible: false,
          acceptButtonStyleClass: 'p-button-secondary',
          accept: () => {},
        });
        return;
      }

      // Confirm disable
      this.confirmService.confirm({
        message: `Bạn có chắc muốn vô hiệu hóa tài khoản [${user.displayName}]? Họ sẽ bị đăng xuất ngay lập tức khỏi mọi thiết bị và không thể tiếp tục đăng nhập.`,
        header: 'Vô hiệu hóa tài khoản',
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: 'Vô hiệu hóa',
        rejectLabel: 'Hủy',
        acceptButtonStyleClass: 'p-button-danger',
        rejectButtonStyleClass: 'p-button-secondary p-button-text',
        accept: () => {
          this.adminService.disableUser(user.id).subscribe({
            next: () => {
              this.messageService.add({
                severity: 'success',
                summary: 'Thành công',
                detail: 'Tài khoản đã được vô hiệu hóa.',
              });
              this.loadUsers();
            },
            error: (err) => {
              this.messageService.add({
                severity: 'error',
                summary: 'Thất bại',
                detail: err.error?.message || 'Có lỗi xảy ra.',
              });
            },
          });
        },
      });
    } else {
      // Confirm enable
      this.confirmService.confirm({
        message: `Bạn có chắc muốn kích hoạt lại tài khoản [${user.displayName}]? Họ sẽ có thể đăng nhập lại vào hệ thống.`,
        header: 'Kích hoạt lại tài khoản',
        icon: 'pi pi-lock-open',
        acceptLabel: 'Kích hoạt',
        rejectLabel: 'Hủy',
        acceptButtonStyleClass: 'p-button-success',
        rejectButtonStyleClass: 'p-button-secondary p-button-text',
        accept: () => {
          this.adminService.enableUser(user.id).subscribe({
            next: () => {
              this.messageService.add({
                severity: 'success',
                summary: 'Thành công',
                detail: 'Tài khoản đã được kích hoạt lại.',
              });
              this.loadUsers();
            },
            error: (err) => {
              this.messageService.add({
                severity: 'error',
                summary: 'Thất bại',
                detail: err.error?.message || 'Có lỗi xảy ra.',
              });
            },
          });
        },
      });
    }
  }
}
