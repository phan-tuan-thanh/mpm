import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Sprint,
  SprintPagination,
  SprintSettings,
  BurndownDataPoint,
  VelocityReport,
  DashboardData,
  CreateSprintDto,
  UpdateSprintDto,
  CompleteSprintDto,
  UpdateSprintSettingsDto,
  SprintStatus,
} from '../models/sprint.models';
import { sortCompletedSprints } from '../../../tasks/pages/backlog/backlog-toolbar/sprint-filter.helpers';

export interface SprintQuery {
  status?: SprintStatus;
  search?: string;
  page?: number;
  limit?: number;
}

@Injectable({ providedIn: 'root' })
export class SprintService {
  private readonly http = inject(HttpClient);

  // ─── Signals ────────────────────────────────────────────────────────────────
  readonly sprints = signal<Sprint[]>([]);
  readonly total = signal<number>(0);
  readonly currentPage = signal<number>(1);
  readonly loading = signal<boolean>(false);
  readonly settings = signal<SprintSettings | null>(null);
  readonly activeSprint = signal<Sprint | null>(null);

  readonly totalPages = computed(() =>
    this.total() > 0 ? Math.ceil(this.total() / 20) : 0
  );

  // ─── Shared project sprint cache (toolbar, task-row, detail panel dùng chung) ──
  readonly projectSprints = signal<Sprint[]>([]);
  private _sprintsLoadedFor: string | null = null;

  /** Sprint planning/active — nhận task được */
  readonly openSprints = computed(() =>
    this.projectSprints().filter((s) => s.status !== 'completed'),
  );

  /** Sprint đã hoàn thành — mới hoàn thành nhất lên trước */
  readonly completedSprints = computed(() =>
    sortCompletedSprints(this.projectSprints()),
  );

  readonly sprintById = computed(() => {
    const map = new Map<string, Sprint>();
    for (const s of this.projectSprints()) map.set(s.id, s);
    return map;
  });

  /** Load danh sách sprint của project (cache theo projectId, force = true để reload) */
  loadProjectSprints(projectId: string, force = false): void {
    if (!force && this._sprintsLoadedFor === projectId) return;
    this._sprintsLoadedFor = projectId;
    this.getSprints(projectId, { limit: 50 }).subscribe({
      next: (res) => this.projectSprints.set(res.data),
      error: () => this.projectSprints.set([]),
    });
  }

  // ─── Shared settings cache (sidebar icon, terminology...) ─────────────────────
  readonly projectSettings = signal<SprintSettings | null>(null);
  private _settingsLoadedFor: string | null = null;

  loadProjectSettings(projectId: string, force = false): void {
    if (!force && this._settingsLoadedFor === projectId) return;
    this._settingsLoadedFor = projectId;
    this.getSettings(projectId).subscribe({
      next: (s) => this.projectSettings.set(s),
      error: () => this.projectSettings.set(null),
    });
  }

  // ─── API helpers ─────────────────────────────────────────────────────────────

  private base(projectId: string): string {
    return `/api/projects/${projectId}/sprints`;
  }

  // ─── Sprint CRUD ──────────────────────────────────────────────────────────────

  getSprints(projectId: string, query: SprintQuery = {}): Observable<SprintPagination> {
    let params = new HttpParams();
    if (query.status) params = params.set('status', query.status);
    if (query.search) params = params.set('search', query.search);
    if (query.page) params = params.set('page', query.page);
    if (query.limit) params = params.set('limit', query.limit);
    return this.http.get<SprintPagination>(this.base(projectId), { params });
  }

  getSprint(projectId: string, sprintId: string): Observable<Sprint> {
    return this.http.get<Sprint>(`${this.base(projectId)}/${sprintId}`);
  }

  createSprint(projectId: string, dto: CreateSprintDto): Observable<Sprint> {
    return this.http.post<Sprint>(this.base(projectId), dto);
  }

  updateSprint(projectId: string, sprintId: string, dto: UpdateSprintDto): Observable<Sprint> {
    return this.http.patch<Sprint>(`${this.base(projectId)}/${sprintId}`, dto);
  }

  deleteSprints(projectId: string, ids: string[]): Observable<void> {
    return this.http.delete<void>(`${this.base(projectId)}/bulk`, { body: { ids } });
  }

  // ─── Lifecycle ────────────────────────────────────────────────────────────────

  startSprint(projectId: string, sprintId: string): Observable<Sprint> {
    return this.http.post<Sprint>(`${this.base(projectId)}/${sprintId}/start`, {});
  }

  completeSprint(
    projectId: string,
    sprintId: string,
    dto: CompleteSprintDto,
  ): Observable<Sprint> {
    return this.http.post<Sprint>(`${this.base(projectId)}/${sprintId}/complete`, dto);
  }

  // ─── Burndown ─────────────────────────────────────────────────────────────────

  getBurndown(projectId: string, sprintId: string): Observable<BurndownDataPoint[]> {
    return this.http.get<BurndownDataPoint[]>(
      `${this.base(projectId)}/${sprintId}/burndown`,
    );
  }

  // ─── Dashboard & Velocity ─────────────────────────────────────────────────────

  getDashboard(projectId: string): Observable<DashboardData> {
    return this.http.get<DashboardData>(`${this.base(projectId)}/dashboard`);
  }

  getVelocity(projectId: string): Observable<VelocityReport> {
    return this.http.get<VelocityReport>(`${this.base(projectId)}/velocity`);
  }

  // ─── Task assignment ──────────────────────────────────────────────────────────

  addTasks(projectId: string, sprintId: string, taskIds: string[]): Observable<{ added: number }> {
    return this.http.post<{ added: number }>(
      `${this.base(projectId)}/${sprintId}/tasks`,
      { taskIds },
    );
  }

  removeTasks(projectId: string, sprintId: string, taskIds: string[]): Observable<void> {
    return this.http.delete<void>(`${this.base(projectId)}/${sprintId}/tasks`, {
      body: { taskIds },
    });
  }

  // ─── Settings ─────────────────────────────────────────────────────────────────

  getSettings(projectId: string): Observable<SprintSettings> {
    return this.http.get<SprintSettings>(`${this.base(projectId)}/settings`);
  }

  updateSettings(
    projectId: string,
    dto: UpdateSprintSettingsDto,
  ): Observable<SprintSettings> {
    return this.http.patch<SprintSettings>(`${this.base(projectId)}/settings`, dto);
  }
}
