import { Component, OnInit, OnDestroy, inject } from '@angular/core';
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

  readonly statusOptions = [
    { label: 'Tất cả trạng thái', value: 'all' },
    { label: 'Đang hoạt động', value: 'active' },
    { label: 'Đã lưu trữ', value: 'archived' },
  ];

  readonly networkOptions = [
    { label: 'Tất cả quyền riêng tư', value: 'all' },
    { label: 'Công khai (Public)', value: 'public' },
    { label: 'Bảo mật (Secret)', value: 'secret' },
  ];

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
      startDate: this.dateRange?.[0]?.toISOString(),
      endDate: this.dateRange?.[1]?.toISOString(),
    });
  }

  updateUrlParams(): void {
    const queryParams = buildQueryParams({
      name: this.filterName,
      status: this.selectedStatus,
      network: this.selectedNetwork,
      startDate: this.dateRange?.[0]?.toISOString().split('T')[0],
      endDate: this.dateRange?.[1]?.toISOString().split('T')[0],
    });

    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
    });
  }

  onBulkDelete(): void {
    if (this.selectedProjects.length === 0) return;

    this.confirmService.confirm({
      message: `Bạn có chắc chắn muốn xóa vĩnh viễn ${this.selectedProjects.length} dự án đã chọn cùng toàn bộ dữ liệu liên quan? Hành động này không thể hoàn tác.`,
      header: 'Xác nhận xóa hàng loạt',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Xóa vĩnh viễn',
      rejectLabel: 'Hủy',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary p-button-text',
      accept: () => {
        const ids = this.selectedProjects.map((p) => p.id);
        this.projectService.bulkDeleteProjects(ids).subscribe({
          next: (res) => {
            if (res.failed.length === 0) {
              this.messageService.add({
                severity: 'success',
                summary: 'Thành công',
                detail: `Đã xóa thành công ${res.deleted.length} dự án.`,
              });
              this.selectedProjects = [];
              this.fetchProjects();
            } else {
              this.messageService.add({
                severity: 'error',
                summary: 'Lỗi xóa một số dự án',
                detail: `Đã rollback do có lỗi xảy ra. Chi tiết: ${res.failed[0]?.reason}`,
              });
            }
          },
          error: (err) => {
            this.messageService.add({
              severity: 'error',
              summary: 'Lỗi hệ thống',
              detail: err.error?.message || 'Xóa hàng loạt thất bại.',
            });
          },
        });
      },
    });
  }

  formatRole(role: ProjectRole): string {
    return formatProjectRole(role);
  }
}
