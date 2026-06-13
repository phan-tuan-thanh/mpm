import { Component, OnInit, OnDestroy, inject, computed } from '@angular/core';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { ProjectStore } from '../../state/project.store';
import { ProjectService } from '../../services/project.service';
import { LayoutService } from '../../../layout/services/layout.service';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { SkeletonModule } from 'primeng/skeleton';
import { FluidModule } from 'primeng/fluid';
import { PopoverModule } from 'primeng/popover';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ProjectListItem, ProjectRole } from '@mpm/shared-types';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { FormsModule } from '@angular/forms';
import { hasActiveFilters, buildQueryParams, parseQueryParams, formatProjectRole } from './project-filter.utils';

import { IconDisplayComponent } from '../../../shared/components/icon-display/icon-display.component';

@Component({
  standalone: true,
  selector: 'app-project-list',
  imports: [
    CommonModule,
    RouterLink,
    TableModule,
    TagModule,
    InputTextModule,
    ButtonModule,
    PopoverModule,
    DatePickerModule,
    SkeletonModule,
    FluidModule,
    FormsModule,
    IconDisplayComponent,
  ],
  templateUrl: './project-list.component.html',
  styles: [`
    :host ::ng-deep {
      .p-datatable {
        background: transparent !important;
      }
      .p-datatable-table-container {
        background: transparent !important;
      }
      .p-datatable-thead > tr > th {
        background: transparent !important;
        color: inherit !important;
      }
      .p-datatable-tbody > tr {
        background: transparent !important;
        color: inherit !important;
      }
      .p-datatable-tbody > tr > td {
        background: transparent !important;
        color: inherit !important;
      }
      /* Uniform height for form fields and dropdown buttons */
      .p-inputtext {
        height: 38px !important;
      }
      .p-datepicker {
        width: 100%;
      }
      /* Mimic Sakai/PrimeNG native input styling for custom dropdown buttons */
      .pop-select-trigger {
        background: var(--p-inputtext-background) !important;
        border: 1px solid var(--p-inputtext-border-color) !important;
        color: var(--p-inputtext-color) !important;
        border-radius: var(--p-inputtext-border-radius, 6px) !important;
        height: 38px !important;
        padding: 0 0.75rem !important;
        font-weight: 500 !important;
        font-size: 0.875rem !important;
        transition: border-color 0.2s, box-shadow 0.2s;
      }
      .pop-select-trigger:hover {
        border-color: var(--p-inputtext-hover-border-color) !important;
      }
      .pop-select-trigger:focus, .pop-select-trigger:active {
        border-color: var(--p-inputtext-focus-border-color) !important;
      }
    }
  `],
})
export class ProjectListComponent implements OnInit, OnDestroy {
  readonly projectStore = inject(ProjectStore);
  private readonly projectService = inject(ProjectService);
  private readonly layoutService = inject(LayoutService);
  private readonly confirmService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  // States
  selectedProjects: ProjectListItem[] = [];
  selectedStatus: string = 'all';
  selectedNetwork: string = 'all';
  dateRange: Date[] | null = null;
  filterName: string = '';

  readonly t = computed(() => {
    const isEn = this.projectStore.projectLanguage() === 'en';
    return isEn ? {
      title: 'Your Projects',
      subtitle: 'Manage and quickly switch between workspaces.',
      createProject: 'Create new project',
      searchLabel: 'Search',
      searchPlaceholder: 'Enter project name...',
      statusLabel: 'Status',
      networkLabel: 'Privacy',
      createdDateLabel: 'Created date',
      datepickerPlaceholder: 'Select creation date range',
      selectedBar: (count: number) => `Selected ${count} project${count > 1 ? 's' : ''}`,
      bulkDeleteBtn: 'Delete selected projects',
      colProjectName: 'Project Name',
      colProjectKey: 'Project Key',
      colLead: 'Lead',
      colNetwork: 'Network',
      colStatus: 'Status',
      colMyRole: 'My Role',
      colCreatedDate: 'Created Date',
      allStatus: 'All Statuses',
      activeStatus: 'Active',
      archivedStatus: 'Archived',
      allNetwork: 'All Privacies',
      publicNetwork: 'Public',
      secretNetwork: 'Secret',
      noProjectsFound: 'No projects match current filters',
      clearFiltersBtn: 'Clear filters',
      noProjectsJoined: 'You haven\'t joined any projects yet',
      confirmBulkDeleteHeader: 'Confirm Bulk Delete',
      confirmBulkDeleteMessage: (count: number) => `Are you sure you want to permanently delete ${count} selected project${count > 1 ? 's' : ''} along with all associated data? This action cannot be undone.`,
      confirmDeleteBtn: 'Delete permanently',
      cancelBtn: 'Cancel',
      deleteSuccessSummary: 'Success',
      deleteSuccessDetail: (count: number) => `Successfully deleted ${count} project${count > 1 ? 's' : ''}.`,
      deleteErrorSummary: 'Bulk delete error',
      deleteErrorDetail: (reason: string) => `Rolled back due to error. Details: ${reason}`,
      systemErrorSummary: 'System Error',
      systemErrorDetail: 'Bulk delete failed.',
    } : {
      title: 'Dự án của bạn',
      subtitle: 'Quản lý và chuyển đổi nhanh giữa các không gian làm việc.',
      createProject: 'Tạo dự án mới',
      searchLabel: 'Tìm kiếm',
      searchPlaceholder: 'Nhập tên dự án...',
      statusLabel: 'Trạng thái',
      networkLabel: 'Quyền riêng tư',
      createdDateLabel: 'Ngày tạo',
      datepickerPlaceholder: 'Chọn khoảng ngày tạo',
      selectedBar: (count: number) => `Đã chọn ${count} dự án`,
      bulkDeleteBtn: 'Xóa các dự án đã chọn',
      colProjectName: 'Tên dự án',
      colProjectKey: 'Project Key',
      colLead: 'Lead',
      colNetwork: 'Network',
      colStatus: 'Trạng thái',
      colMyRole: 'Vai trò của tôi',
      colCreatedDate: 'Ngày tạo',
      allStatus: 'Tất cả trạng thái',
      activeStatus: 'Đang hoạt động',
      archivedStatus: 'Đã lưu trữ',
      allNetwork: 'Tất cả quyền riêng tư',
      publicNetwork: 'Công khai (Public)',
      secretNetwork: 'Bảo mật (Secret)',
      noProjectsFound: 'Không tìm thấy dự án nào khớp với bộ lọc',
      clearFiltersBtn: 'Xóa bộ lọc',
      noProjectsJoined: 'Bạn chưa tham gia dự án nào',
      confirmBulkDeleteHeader: 'Xác nhận xóa hàng loạt',
      confirmBulkDeleteMessage: (count: number) => `Bạn có chắc chắn muốn xóa vĩnh viễn ${count} dự án đã chọn cùng toàn bộ dữ liệu liên quan? Hành động này không thể hoàn tác.`,
      confirmDeleteBtn: 'Xóa vĩnh viễn',
      cancelBtn: 'Hủy',
      deleteSuccessSummary: 'Thành công',
      deleteSuccessDetail: (count: number) => `Đã xóa thành công ${count} dự án.`,
      deleteErrorSummary: 'Lỗi xóa một số dự án',
      deleteErrorDetail: (reason: string) => `Đã rollback do có lỗi xảy ra. Chi tiết: ${reason}`,
      systemErrorSummary: 'Lỗi hệ thống',
      systemErrorDetail: 'Xóa hàng loạt thất bại.',
    };
  });

  readonly statusOptions = computed(() => {
    const trans = this.t();
    return [
      { label: trans.allStatus, value: 'all' },
      { label: trans.activeStatus, value: 'active' },
      { label: trans.archivedStatus, value: 'archived' },
    ];
  });

  readonly networkOptions = computed(() => {
    const trans = this.t();
    return [
      { label: trans.allNetwork, value: 'all' },
      { label: trans.publicNetwork, value: 'public' },
      { label: trans.secretNetwork, value: 'secret' },
    ];
  });

  readonly dummyProjects = Array(5).fill({});

  private readonly searchSubject = new Subject<string>();
  private searchSubscription?: Subscription;
  private routeSubscription?: Subscription;

  ngOnInit(): void {
    this.layoutService.fullBleed.set(true);

    // 1. Đồng bộ filter state từ URL query params
    this.routeSubscription = this.route.queryParams.subscribe((params) => {
      const filters = parseQueryParams(params as Record<string, string>);
      this.filterName = filters.name ?? '';
      this.selectedStatus = filters.status ?? 'all';
      this.selectedNetwork = filters.network ?? 'all';

      if (filters.startDate && filters.endDate) {
        this.dateRange = [new Date(filters.startDate), new Date(filters.endDate)];
      } else {
        this.dateRange = null;
      }

      this.fetchProjects();
    });

    // 2. Debounce search input để update URL params
    this.searchSubscription = this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((val) => {
        this.filterName = val;
        this.updateUrlParams();
      });
  }

  ngOnDestroy(): void {
    this.layoutService.fullBleed.set(false);
    this.searchSubscription?.unsubscribe();
    this.routeSubscription?.unsubscribe();
  }

  fetchProjects(): void {
    this.projectStore.loadProjects({
      name: this.filterName,
      status: this.selectedStatus,
      network: this.selectedNetwork === 'all' ? undefined : this.selectedNetwork,
    });
  }

  onSearchInput(val: string): void {
    this.searchSubject.next(val);
  }

  onFilterChange(): void {
    this.updateUrlParams();
  }

  onClearDate(): void {
    this.dateRange = null;
    this.updateUrlParams();
  }

  clearFilters(): void {
    this.filterName = '';
    this.selectedStatus = 'all';
    this.selectedNetwork = 'all';
    this.dateRange = null;
    this.updateUrlParams();
  }

  hasActiveFilters(): boolean {
    return hasActiveFilters({
      name: this.filterName,
      status: this.selectedStatus,
      network: this.selectedNetwork,
      startDate: this.formatDateToISO(this.dateRange?.[0]) ?? undefined,
      endDate: this.formatDateToISO(this.dateRange?.[1]) ?? undefined,
    });
  }

  updateUrlParams(): void {
    const queryParams = buildQueryParams({
      name: this.filterName,
      status: this.selectedStatus,
      network: this.selectedNetwork,
      startDate: this.formatDateToISO(this.dateRange?.[0]) ?? undefined,
      endDate: this.formatDateToISO(this.dateRange?.[1]) ?? undefined,
    });

    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
    });
  }

  onBulkDelete(): void {
    if (this.selectedProjects.length === 0) return;

    const trans = this.t();
    this.confirmService.confirm({
      message: trans.confirmBulkDeleteMessage(this.selectedProjects.length),
      header: trans.confirmBulkDeleteHeader,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: trans.confirmDeleteBtn,
      rejectLabel: trans.cancelBtn,
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary p-button-text',
      accept: () => {
        const ids = this.selectedProjects.map((p) => p.id);
        this.projectService.bulkDeleteProjects(ids).subscribe({
          next: (res) => {
            if (res.failed.length === 0) {
              this.messageService.add({
                severity: 'success',
                summary: trans.deleteSuccessSummary,
                detail: trans.deleteSuccessDetail(res.deleted.length),
              });
              this.selectedProjects = [];
              this.fetchProjects();
            } else {
              this.messageService.add({
                severity: 'error',
                summary: trans.deleteErrorSummary,
                detail: trans.deleteErrorDetail(res.failed[0]?.reason),
              });
            }
          },
          error: (err) => {
            this.messageService.add({
              severity: 'error',
              summary: trans.systemErrorSummary,
              detail: err.error?.message || trans.systemErrorDetail,
            });
          },
        });
      },
    });
  }

  formatRole(role: ProjectRole): string {
    return formatProjectRole(role);
  }

  private formatDateToISO(date: Date | null | undefined): string | null {
    if (!date) return null;
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
