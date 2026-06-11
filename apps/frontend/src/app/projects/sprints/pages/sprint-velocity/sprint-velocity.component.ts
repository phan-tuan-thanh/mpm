import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { toObservable } from '@angular/core/rxjs-interop';
import { SkeletonModule } from 'primeng/skeleton';
import { ChartModule } from 'primeng/chart';
import { ProjectStore } from '../../../state/project.store';
import { SprintService } from '../../services/sprint.service';
import { VelocityReport } from '../../models/sprint.models';

@Component({
  standalone: true,
  selector: 'app-sprint-velocity',
  imports: [CommonModule, SkeletonModule, ChartModule],
  template: `
    <div class="flex flex-col h-full bg-white dark:bg-surface-900">

      <!-- Toolbar -->
      <div class="flex items-center gap-3 px-6 py-3 border-b border-gray-200 dark:border-surface-700 flex-shrink-0">
        <h1 class="text-base font-semibold text-gray-900 dark:text-surface-0">Velocity Report</h1>
        @if (report()) {
          <span class="text-sm text-gray-500 dark:text-surface-400">
            Trung bình: <strong class="text-gray-900 dark:text-surface-0">{{ report()!.averageVelocity | number:'1.0-1' }} SP/sprint</strong>
          </span>
        }
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto px-6 py-4 space-y-6">

        @if (loading()) {
          <p-skeleton height="20rem" borderRadius="12px" />
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            @for (i of [1,2,3]; track i) {
              <p-skeleton height="5rem" borderRadius="12px" />
            }
          </div>
        } @else if (!report() || report()!.sprints.length === 0) {
          <div class="flex flex-col items-center justify-center h-64 gap-3 text-center">
            <i class="pi pi-chart-bar text-4xl text-gray-300 dark:text-surface-600"></i>
            <p class="text-gray-500 dark:text-surface-400 text-sm">Chưa có sprint hoàn thành để tính velocity.</p>
          </div>
        } @else {
          <!-- Bar chart -->
          <div class="bg-gray-50 dark:bg-surface-800 rounded-xl p-5 border border-gray-100 dark:border-surface-700">
            <h2 class="text-sm font-semibold text-gray-700 dark:text-surface-300 mb-4">
              Committed vs Completed Story Points
            </h2>
            <p-chart type="bar" [data]="chartData()" [options]="chartOptions()" height="320px" />
          </div>

          <!-- Summary cards -->
          <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div class="bg-gray-50 dark:bg-surface-800 rounded-xl p-4 border border-gray-100 dark:border-surface-700">
              <p class="text-xs text-gray-500 dark:text-surface-400 font-medium uppercase tracking-wide mb-1">Tổng sprint</p>
              <p class="text-2xl font-bold text-gray-900 dark:text-surface-0">{{ report()!.sprints.length }}</p>
            </div>
            <div class="bg-gray-50 dark:bg-surface-800 rounded-xl p-4 border border-gray-100 dark:border-surface-700">
              <p class="text-xs text-gray-500 dark:text-surface-400 font-medium uppercase tracking-wide mb-1">Avg Velocity</p>
              <p class="text-2xl font-bold text-gray-900 dark:text-surface-0">
                {{ report()!.averageVelocity | number:'1.0-1' }}
                <span class="text-base text-gray-400 dark:text-surface-500"> SP</span>
              </p>
            </div>
            <div class="bg-gray-50 dark:bg-surface-800 rounded-xl p-4 border border-gray-100 dark:border-surface-700">
              <p class="text-xs text-gray-500 dark:text-surface-400 font-medium uppercase tracking-wide mb-1">Tổng SP hoàn thành</p>
              <p class="text-2xl font-bold text-gray-900 dark:text-surface-0">
                {{ totalCompleted() | number:'1.0-1' }}
              </p>
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
export class SprintVelocityComponent implements OnInit, OnDestroy {
  private readonly projectStore = inject(ProjectStore);
  private readonly sprintService = inject(SprintService);
  private readonly destroy$ = new Subject<void>();
  private readonly currentProject$ = toObservable(this.projectStore.currentProject);

  readonly loading = signal(false);
  readonly report = signal<VelocityReport | null>(null);

  projectId = '';

  readonly totalCompleted = () =>
    this.report()?.sprints.reduce((s, d) => s + d.completedStoryPoints, 0) ?? 0;

  readonly chartData = () => {
    const data = this.report()?.sprints ?? [];
    const isDark = document.documentElement.classList.contains('dark');
    return {
      labels: data.map((d) => d.sprintName),
      datasets: [
        {
          label: 'Committed SP',
          data: data.map((d) => d.committedStoryPoints),
          backgroundColor: isDark ? 'rgba(129,140,248,0.7)' : 'rgba(99,102,241,0.7)',
          borderColor: isDark ? '#818cf8' : '#6366f1',
          borderWidth: 1,
        },
        {
          label: 'Completed SP',
          data: data.map((d) => d.completedStoryPoints),
          backgroundColor: isDark ? 'rgba(52,211,153,0.7)' : 'rgba(16,185,129,0.7)',
          borderColor: isDark ? '#34d399' : '#10b981',
          borderWidth: 1,
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

  ngOnInit(): void {
    this.currentProject$.pipe(takeUntil(this.destroy$)).subscribe((project) => {
      if (project) {
        this.projectId = project.id;
        this.loadVelocity();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadVelocity(): void {
    this.loading.set(true);
    this.sprintService
      .getVelocity(this.projectId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (r) => {
          this.report.set(r);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }
}
