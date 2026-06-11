import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { toObservable } from '@angular/core/rxjs-interop';
import { MessageService } from 'primeng/api';
import { ProjectStore } from '../../../state/project.store';
import { PopoverModule } from 'primeng/popover';
import { SkeletonModule } from 'primeng/skeleton';
import { ChartModule } from 'primeng/chart';
import { ButtonModule } from 'primeng/button';
import { SprintService } from '../../services/sprint.service';
import { Sprint, BurndownDataPoint, DashboardData } from '../../models/sprint.models';

@Component({
  standalone: true,
  selector: 'app-sprint-dashboard',
  imports: [
    CommonModule,
    FormsModule,
    PopoverModule,
    SkeletonModule,
    ChartModule,
    ButtonModule,
  ],
  template: `
    <div class="flex flex-col h-full bg-white dark:bg-surface-900">

      <!-- Toolbar -->
      <div class="flex items-center gap-3 px-6 py-3 border-b border-gray-200 dark:border-surface-700 flex-shrink-0">
        <h1 class="text-base font-semibold text-gray-900 dark:text-surface-0">Sprint Dashboard</h1>

        <!-- Sprint selector -->
        <button
          type="button"
          (click)="sprintPop.toggle($event)"
          class="flex items-center justify-between gap-2 px-3 py-1.5 text-xs font-semibold border border-surface-200 dark:border-surface-700 rounded-md bg-white dark:bg-surface-800 text-gray-800 dark:text-surface-100 cursor-pointer hover:bg-surface-50 dark:hover:bg-surface-700 transition-all select-none h-[34px] w-52"
        >
          <span class="truncate">{{ getSelectedSprintLabel() }}</span>
          <i class="pi pi-chevron-down text-[10px] opacity-60 flex-shrink-0"></i>
        </button>
        <p-popover #sprintPop appendTo="body" styleClass="!p-0">
          <div class="pop-list w-52 max-h-40 overflow-y-auto">
            @for (s of activeSprints(); track s.id) {
              <div
                (click)="selectedSprintId = s.id; sprintPop.hide(); onSprintChange()"
                class="pop-item"
                [class.selected]="selectedSprintId === s.id"
              >
                {{ s.name }}
              </div>
            } @empty {
              <div class="p-3 text-xs text-gray-400 text-center">Không có sprint đang chạy</div>
            }
          </div>
        </p-popover>

        <!-- Toggle SP / Tasks -->
        <div class="flex border border-gray-200 dark:border-surface-700 rounded-md overflow-hidden">
          <button
            type="button"
            class="px-3 py-1.5 text-xs font-medium transition"
            [class]="chartMode() === 'sp'
              ? 'bg-indigo-600 text-white'
              : 'bg-white dark:bg-surface-800 text-gray-600 dark:text-surface-400 hover:bg-gray-50 dark:hover:bg-surface-700'"
            (click)="chartMode.set('sp')"
          >
            Story Points
          </button>
          <button
            type="button"
            class="px-3 py-1.5 text-xs font-medium transition"
            [class]="chartMode() === 'tasks'
              ? 'bg-indigo-600 text-white'
              : 'bg-white dark:bg-surface-800 text-gray-600 dark:text-surface-400 hover:bg-gray-50 dark:hover:bg-surface-700'"
            (click)="chartMode.set('tasks')"
          >
            Số task
          </button>
        </div>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto px-6 py-4 space-y-6">

        @if (loading()) {
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            @for (i of [1,2,3]; track i) {
              <p-skeleton height="5rem" borderRadius="12px" />
            }
          </div>
          <p-skeleton height="24rem" borderRadius="12px" />
        } @else if (!selectedSprintId) {
          <div class="flex flex-col items-center justify-center h-64 gap-3 text-center">
            <i class="pi pi-chart-line text-4xl text-gray-300 dark:text-surface-600"></i>
            <p class="text-gray-500 dark:text-surface-400 text-sm">Chọn một sprint để xem dashboard.</p>
          </div>
        } @else {

          <!-- Stats cards -->
          @if (dashboard()) {
            @for (s of dashboard()!.activeSprints; track s.id) {
              @if (s.id === selectedSprintId) {
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div class="bg-gray-50 dark:bg-surface-800 rounded-xl p-4 border border-gray-100 dark:border-surface-700">
                    <p class="text-xs text-gray-500 dark:text-surface-400 font-medium uppercase tracking-wide mb-1">Tasks</p>
                    <p class="text-2xl font-bold text-gray-900 dark:text-surface-0">{{ s.completedTasks }}<span class="text-base text-gray-400 dark:text-surface-500">/{{ s.totalTasks }}</span></p>
                  </div>
                  <div class="bg-gray-50 dark:bg-surface-800 rounded-xl p-4 border border-gray-100 dark:border-surface-700">
                    <p class="text-xs text-gray-500 dark:text-surface-400 font-medium uppercase tracking-wide mb-1">Story Points</p>
                    <p class="text-2xl font-bold text-gray-900 dark:text-surface-0">{{ s.completedStoryPoints | number:'1.0-1' }}<span class="text-base text-gray-400 dark:text-surface-500">/{{ s.totalStoryPoints | number:'1.0-1' }}</span></p>
                  </div>
                  <div class="bg-gray-50 dark:bg-surface-800 rounded-xl p-4 border border-gray-100 dark:border-surface-700">
                    <p class="text-xs text-gray-500 dark:text-surface-400 font-medium uppercase tracking-wide mb-1">Tiến độ</p>
                    <p class="text-2xl font-bold text-gray-900 dark:text-surface-0">{{ s.progressPercent }}<span class="text-base text-gray-400 dark:text-surface-500">%</span></p>
                    <div class="mt-2 h-1.5 bg-gray-200 dark:bg-surface-700 rounded-full overflow-hidden">
                      <div class="h-full bg-indigo-600 dark:bg-indigo-400 rounded-full transition-all" [style.width.%]="s.progressPercent"></div>
                    </div>
                  </div>
                  <div class="bg-gray-50 dark:bg-surface-800 rounded-xl p-4 border border-gray-100 dark:border-surface-700">
                    <p class="text-xs text-gray-500 dark:text-surface-400 font-medium uppercase tracking-wide mb-1">Thời gian còn lại</p>
                    <p class="text-2xl font-bold text-gray-900 dark:text-surface-0">
                      @if (s.endDate) {
                        {{ daysLeft(s.endDate) }}
                        <span class="text-base text-gray-400 dark:text-surface-500"> ngày</span>
                      } @else {
                        <span class="text-base text-gray-400 dark:text-surface-500">—</span>
                      }
                    </p>
                  </div>
                </div>
              }
            }
          }

          <!-- Burndown chart -->
          @if (burndownPoints().length > 0) {
            <div class="bg-gray-50 dark:bg-surface-800 rounded-xl p-5 border border-gray-100 dark:border-surface-700">
              <h2 class="text-sm font-semibold text-gray-700 dark:text-surface-300 mb-4">
                Burndown Chart — {{ chartMode() === 'sp' ? 'Story Points' : 'Số task' }}
              </h2>
              <p-chart type="line" [data]="chartData()" [options]="chartOptions()" height="320px" />
            </div>
          } @else {
            <div class="flex flex-col items-center justify-center h-48 gap-2 text-center bg-gray-50 dark:bg-surface-800 rounded-xl border border-gray-100 dark:border-surface-700">
              <i class="pi pi-chart-line text-3xl text-gray-300 dark:text-surface-600"></i>
              <p class="text-gray-500 dark:text-surface-400 text-sm">Chưa có dữ liệu burndown.</p>
            </div>
          }
        }
      </div>
    </div>
  `,
})
export class SprintDashboardComponent implements OnInit, OnDestroy {
  private readonly projectStore = inject(ProjectStore);
  private readonly sprintService = inject(SprintService);
  private readonly messageService = inject(MessageService);
  private readonly destroy$ = new Subject<void>();
  private readonly currentProject$ = toObservable(this.projectStore.currentProject);

  readonly loading = signal(false);
  readonly activeSprints = signal<Sprint[]>([]);
  readonly dashboard = signal<DashboardData | null>(null);
  readonly burndownPoints = signal<BurndownDataPoint[]>([]);
  readonly chartMode = signal<'sp' | 'tasks'>('sp');

  selectedSprintId: string | null = null;
  projectId = '';

  readonly chartData = () => {
    const pts = this.burndownPoints();
    const mode = this.chartMode();
    const labels = pts.map((p) => p.date.slice(5)); // MM-DD
    const ideal = pts.map((p) =>
      mode === 'sp' ? p.idealStoryPoints : p.idealTasksCount,
    );
    const actual = pts.map((p) =>
      mode === 'sp' ? p.remainingStoryPoints : p.remainingTasksCount,
    );

    const isDark = document.documentElement.classList.contains('dark');
    const gridColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

    return {
      labels,
      datasets: [
        {
          label: 'Ideal',
          data: ideal,
          borderColor: isDark ? '#818cf8' : '#6366f1',
          borderDash: [6, 4],
          pointRadius: 0,
          tension: 0,
          fill: false,
        },
        {
          label: 'Thực tế',
          data: actual,
          borderColor: isDark ? '#34d399' : '#10b981',
          backgroundColor: isDark ? 'rgba(52,211,153,0.1)' : 'rgba(16,185,129,0.1)',
          pointRadius: 3,
          tension: 0.2,
          fill: true,
          spanGaps: false,
        },
      ],
    };
  };

  readonly chartOptions = () => {
    const isDark = document.documentElement.classList.contains('dark');
    const gridColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
    const labelColor = isDark ? '#94a3b8' : '#6b7280';
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: labelColor, boxWidth: 12, font: { size: 12 } } },
        tooltip: { mode: 'index', intersect: false },
      },
      scales: {
        x: { grid: { color: gridColor }, ticks: { color: labelColor, font: { size: 11 } } },
        y: { grid: { color: gridColor }, ticks: { color: labelColor, font: { size: 11 } }, min: 0 },
      },
    };
  };

  getSelectedSprintLabel(): string {
    const found = this.activeSprints().find((s) => s.id === this.selectedSprintId);
    return found ? found.name : 'Chọn sprint...';
  }

  ngOnInit(): void {
    this.currentProject$.pipe(takeUntil(this.destroy$)).subscribe((project) => {
      if (project) {
        this.projectId = project.id;
        this.loadData();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadData(): void {
    this.loading.set(true);
    this.sprintService
      .getSprints(this.projectId, { status: 'active', limit: 10 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.activeSprints.set(res.data);
          if (res.data.length > 0 && !this.selectedSprintId) {
            this.selectedSprintId = res.data[0].id;
            this.loadDashboardAndBurndown();
          } else {
            this.loading.set(false);
          }
        },
        error: () => this.loading.set(false),
      });
  }

  onSprintChange(): void {
    if (this.selectedSprintId) {
      this.loadDashboardAndBurndown();
    }
  }

  private loadDashboardAndBurndown(): void {
    this.loading.set(true);
    this.sprintService.getDashboard(this.projectId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (d) => {
        this.dashboard.set(d);
      },
    });

    this.sprintService
      .getBurndown(this.projectId, this.selectedSprintId!)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (pts) => {
          this.burndownPoints.set(pts);
          this.loading.set(false);
        },
        error: () => {
          this.burndownPoints.set([]);
          this.loading.set(false);
        },
      });
  }

  daysLeft(endDate: string): number {
    const end = new Date(endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.max(0, Math.ceil((end.getTime() - today.getTime()) / 86400000));
  }
}
