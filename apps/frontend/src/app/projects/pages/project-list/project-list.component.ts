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
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { SkeletonModule } from 'primeng/skeleton';
import { FluidModule } from 'primeng/fluid';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ProjectListItem, ProjectRole } from '@mpm/shared-types';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { FormsModule } from '@angular/forms';
import { hasActiveFilters, buildQueryParams, parseQueryParams, formatProjectRole } from './project-filter.utils';

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
    SelectModule,
    DatePickerModule,
    SkeletonModule,
    FluidModule,
    FormsModule,
  ],
  template: `
    <div class="flex flex-col h-full bg-surface-50 dark:bg-surface-950 overflow-y-auto">
      <!-- Header -->
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 px-6 py-5 bg-white dark:bg-surface-900 border-b border-gray-100 dark:border-surface-700">
        <div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-surface-0">
            Dự án của bạn
          </h1>
          <p class="mt-0.5 text-sm text-gray-500 dark:text-surface-400">
            Quản lý và chuyển đổi nhanh giữa các không gian làm việc.
          </p>
        </div>
        <button
          pButton
          routerLink="new"
          label="Tạo dự án mới"
          icon="pi pi-plus"
        ></button>
      </div>

      <div class="flex-1 px-6 py-4 space-y-4">
      <!-- Filters Panel -->
      <div class="bg-white dark:bg-surface-900 rounded-xl border border-gray-100 dark:border-surface-700 p-4 shadow-sm">
        <p-fluid class="flex flex-col md:flex-row gap-4 items-end">
          <!-- Search Input -->
          <div class="w-full md:w-80 flex flex-col gap-1.5">
            <label class="text-xs font-semibold text-gray-500 uppercase tracking-wider px-1">Tìm kiếm</label>
            <span class="p-input-icon-left">
              <i class="pi pi-search text-gray-400"></i>
              <input
                type="text"
                pInputText
                [ngModel]="filterName"
                placeholder="Nhập tên dự án..."
                (input)="onSearchInput($any($event.target).value)"
              />
            </span>
          </div>

          <!-- Status Filter -->
          <div class="w-full md:w-48 flex flex-col gap-1.5">
            <label class="text-xs font-semibold text-gray-500 uppercase tracking-wider px-1">Trạng thái</label>
            <p-select
              [options]="statusOptions"
              [(ngModel)]="selectedStatus"
              optionLabel="label"
              optionValue="value"
              (onChange)="onFilterChange()"
            ></p-select>
          </div>

          <!-- Network Filter -->
          <div class="w-full md:w-48 flex flex-col gap-1.5">
            <label class="text-xs font-semibold text-gray-500 uppercase tracking-wider px-1">Quyền riêng tư</label>
            <p-select
              [options]="networkOptions"
              [(ngModel)]="selectedNetwork"
              optionLabel="label"
              optionValue="value"
              (onChange)="onFilterChange()"
            ></p-select>
          </div>

          <!-- Date Range Filter -->
          <div class="w-full md:w-72 flex flex-col gap-1.5">
            <label class="text-xs font-semibold text-gray-500 uppercase tracking-wider px-1">Ngày tạo</label>
            <p-datepicker
              [(ngModel)]="dateRange"
              selectionMode="range"
              [readonlyInput]="true"
              placeholder="Chọn khoảng ngày tạo"
              (onSelect)="onFilterChange()"
              (onClearClick)="onClearDate()"
              [showClear]="true"
            ></p-datepicker>
          </div>
        </p-fluid>
      </div>

      <!-- Selected Rows Action Toolbar -->
      @if (selectedProjects.length > 0 && !projectStore.isLoading()) {
        <div class="flex items-center justify-between bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900 p-4 rounded-xl shadow-sm transition animate-fade-in">
          <span class="text-sm font-semibold text-indigo-900">
            Đã chọn {{ selectedProjects.length }} dự án
          </span>
          <button
            pButton
            (click)="onBulkDelete()"
            label="Xóa các dự án đã chọn"
            icon="pi pi-trash"
            severity="danger"
            size="small"
          ></button>
        </div>
      }

      <!-- Projects Table -->
      <div class="bg-white dark:bg-surface-900 rounded-xl border border-gray-100 dark:border-surface-700 shadow-sm overflow-hidden">
        <p-table
          [value]="projectStore.isLoading() ? dummyProjects : projectStore.projects()"
          [(selection)]="selectedProjects"
          [rowHover]="!projectStore.isLoading()"
          responsiveLayout="scroll"
          dataKey="id"
          class="text-sm"
        >
          <ng-template pTemplate="header">
            <tr class="bg-gray-50 border-b border-gray-100">
              <th style="width: 4rem" class="py-3.5 px-4 text-left font-semibold text-gray-500 text-xs uppercase tracking-wider">
                <p-tableHeaderCheckbox [disabled]="projectStore.isLoading()" />
              </th>
              <th class="py-3.5 px-4 text-left font-semibold text-gray-500 text-xs uppercase tracking-wider">Tên dự án</th>
              <th class="py-3.5 px-4 text-left font-semibold text-gray-500 text-xs uppercase tracking-wider">Project Key</th>
              <th class="py-3.5 px-4 text-left font-semibold text-gray-500 text-xs uppercase tracking-wider">Lead</th>
              <th class="py-3.5 px-4 text-left font-semibold text-gray-500 text-xs uppercase tracking-wider">Network</th>
              <th class="py-3.5 px-4 text-left font-semibold text-gray-500 text-xs uppercase tracking-wider">Trạng thái</th>
              <th class="py-3.5 px-4 text-left font-semibold text-gray-500 text-xs uppercase tracking-wider">Vai trò của tôi</th>
              <th class="py-3.5 px-4 text-left font-semibold text-gray-500 text-xs uppercase tracking-wider">Ngày tạo</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-project>
            @if (projectStore.isLoading()) {
              <tr>
                <td class="py-3.5 px-4"><p-skeleton width="1.5rem" height="1.5rem" /></td>
                <td class="py-3.5 px-4"><p-skeleton width="12rem" height="1.2rem" /></td>
                <td class="py-3.5 px-4"><p-skeleton width="4rem" height="1.2rem" /></td>
                <td class="py-3.5 px-4"><p-skeleton width="6rem" height="1.2rem" /></td>
                <td class="py-3.5 px-4"><p-skeleton width="5rem" height="1.2rem" /></td>
                <td class="py-3.5 px-4"><p-skeleton width="5rem" height="1.2rem" /></td>
                <td class="py-3.5 px-4"><p-skeleton width="7rem" height="1.2rem" /></td>
                <td class="py-3.5 px-4"><p-skeleton width="6rem" height="1.2rem" /></td>
              </tr>
            } @else {
              <tr class="border-b border-gray-50 hover:bg-gray-50/50 transition">
                <td class="py-3.5 px-4">
                  <p-tableCheckbox [value]="project" />
                </td>
                <td class="py-3.5 px-4 font-semibold text-indigo-600 hover:text-indigo-800 transition">
                  <a [routerLink]="['/projects', project.key, 'board']" class="flex items-center gap-2">
                    @if (project.emoji) {
                      <span class="text-lg">{{ project.emoji }}</span>
                    } @else {
                      <div class="w-6 h-6 rounded bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[10px] text-indigo-600 font-bold uppercase">
                        {{ project.name.slice(0, 2).toUpperCase() }}
                      </div>
                    }
                    <span>{{ project.name }}</span>
                  </a>
                </td>
                <td class="py-3.5 px-4">
                  <span class="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-600">
                    {{ project.key }}
                  </span>
                </td>
                <td class="py-3.5 px-4 text-gray-600 font-medium">
                  @if (project.lead) {
                    <div class="flex items-center gap-2">
                      @if (project.lead.avatarUrl) {
                        <img [src]="project.lead.avatarUrl" class="w-6 h-6 rounded-full" />
                      } @else {
                        <div class="w-6 h-6 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[10px] text-indigo-600 font-bold uppercase">
                          {{ project.lead.displayName.slice(0, 2) }}
                        </div>
                      }
                      <span>{{ project.lead.displayName }}</span>
                    </div>
                  } @else {
                    <span class="text-gray-400">—</span>
                  }
                </td>
                <td class="py-3.5 px-4">
                  <p-tag
                    [value]="project.network === 'public' ? 'Public' : 'Secret'"
                    [severity]="project.network === 'public' ? 'info' : 'warn'"
                    class="text-xs font-semibold"
                  ></p-tag>
                </td>
                <td class="py-3.5 px-4">
                  <p-tag
                    [value]="project.status === 'active' ? 'Active' : 'Archived'"
                    [severity]="project.status === 'active' ? 'success' : 'secondary'"
                    class="text-xs font-semibold"
                  ></p-tag>
                </td>
                <td class="py-3.5 px-4 text-gray-600 font-medium">
                  {{ formatRole(project.myRole) }}
                </td>
                <td class="py-3.5 px-4 text-gray-500">
                  {{ project.createdAt | date: 'dd/MM/yyyy' }}
                </td>
              </tr>
            }
          </ng-template>

          <ng-template pTemplate="emptymessage">
            <tr>
              <td colspan="8" class="text-center py-12 text-gray-400">
                <div class="flex flex-col items-center justify-center space-y-3">
                  <i class="pi pi-folder-open text-4xl text-gray-300"></i>
                  @if (hasActiveFilters()) {
                    <span class="font-medium text-base text-gray-500">Không tìm thấy dự án nào khớp với bộ lọc</span>
                    <button
                      pButton
                      (click)="clearFilters()"
                      label="Xóa bộ lọc"
                      class="p-button-text p-button-sm font-semibold text-indigo-600 hover:text-indigo-800"
                    ></button>
                  } @else {
                    <span class="font-medium text-base text-gray-500">Bạn chưa tham gia dự án nào</span>
                    <button
                      pButton
                      routerLink="new"
                      label="Tạo dự án mới"
                      icon="pi pi-plus"
                      class="bg-indigo-600 border-none font-semibold text-white px-3 py-1.5 rounded-lg text-xs"
                    ></button>
                  }
                </div>
              </td>
            </tr>
          </ng-template>
        </p-table>
      </div>
      </div><!-- /flex-1 px-6 py-4 -->
    </div>
  `,
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
