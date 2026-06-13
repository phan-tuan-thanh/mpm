import { Injectable, inject, signal } from '@angular/core';
import { ProjectService } from '../services/project.service';
import { PriorityConfigService } from '../../tasks/services/priority-config.service';
import {
  Project,
  ProjectListItem,
  MemberResponse,
  ProjectStateGrouped,
  UpdateFeaturesDto,
} from '@mpm/shared-types';
import { catchError, finalize } from 'rxjs/operators';
import { of } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ProjectStore {
  private readonly projectService = inject(ProjectService);
  private readonly priorityConfigService = inject(PriorityConfigService);

  // States
  readonly projects = signal<ProjectListItem[]>([]);
  readonly currentProject = signal<Project | null>(null);
  readonly members = signal<MemberResponse[]>([]);
  readonly currentProjectStates = signal<ProjectStateGrouped | null>(null);
  readonly currentEstimateConfig = signal<any | null>(null);
  readonly isLoading = signal<boolean>(false);
  readonly error = signal<string | null>(null);
  readonly projectLanguage = signal<'vi' | 'en'>('vi');

  /**
   * Load danh sách dự án
   */
  loadProjects(filter?: {
    name?: string;
    status?: string;
    network?: string;
  }): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.projectService
      .getProjects(filter)
      .pipe(
        catchError((err) => {
          this.error.set(err.error?.message || 'Không thể tải danh sách dự án');
          return of([]);
        }),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe((data) => {
        this.projects.set(data);
      });
  }

  /**
   * Load chi tiết dự án theo key
   */
  loadProject(key: string, onSuccess?: (p: Project) => void, onError?: () => void): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.projectService
      .getProjectByKey(key)
      .pipe(
        catchError((err) => {
          const msg = err.error?.message || 'Không thể tải thông tin dự án';
          this.error.set(msg);
          if (onError) onError();
          return of(null);
        }),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe((data) => {
        this.currentProject.set(data);
        if (data) {
          const savedLang = localStorage.getItem(`project-lang-${data.id}`);
          this.projectLanguage.set(savedLang === 'en' ? 'en' : 'vi');
          // Auto load states and estimate config when project is loaded
          this.loadStates(data.id);
          this.loadEstimateConfig(data.id);
          this.priorityConfigService.loadPriorities(data.id);
          if (onSuccess) {
            onSuccess(data);
          }
        }
      });
  }

  /**
   * Set current project directly
   */
  setCurrentProject(project: Project | null): void {
    this.currentProject.set(project);
    this.error.set(null);
    if (project) {
      const savedLang = localStorage.getItem(`project-lang-${project.id}`);
      this.projectLanguage.set(savedLang === 'en' ? 'en' : 'vi');
      this.loadStates(project.id);
      this.loadEstimateConfig(project.id);
      this.priorityConfigService.loadPriorities(project.id);
    } else {
      this.projectLanguage.set('vi');
      this.currentProjectStates.set(null);
      this.currentEstimateConfig.set(null);
    }
  }

  /**
   * Cập nhật ngôn ngữ hiển thị của dự án
   */
  setProjectLanguage(lang: 'vi' | 'en'): void {
    const project = this.currentProject();
    if (project) {
      localStorage.setItem(`project-lang-${project.id}`, lang);
      this.projectLanguage.set(lang);
    }
  }

  /**
   * Load danh sách thành viên dự án
   */
  loadMembers(projectId: string, filter?: string): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.projectService
      .getMembers(projectId, filter)
      .pipe(
        catchError((err) => {
          this.error.set(err.error?.message || 'Không thể tải danh sách thành viên');
          return of([]);
        }),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe((data) => {
        this.members.set(data);
      });
  }

  /**
   * Load states của dự án hiện tại
   */
  loadStates(projectId: string): void {
    this.projectService
      .getStates(projectId)
      .pipe(
        catchError((err) => {
          console.error('Không thể tải danh sách trạng thái', err);
          return of({ data: null });
        }),
      )
      .subscribe((res) => {
        if (res && res.data) {
          this.currentProjectStates.set(res.data);
        }
      });
  }

  /**
   * Load estimate config của dự án hiện tại
   */
  loadEstimateConfig(projectId: string): void {
    this.projectService
      .getEstimateConfig(projectId)
      .pipe(
        catchError((err) => {
          console.error('Không thể tải cấu hình estimate', err);
          return of(null);
        }),
      )
      .subscribe((config) => {
        if (config) {
          this.currentEstimateConfig.set(config);
        }
      });
  }

  /**
   * Cập nhật feature flags
   */
  updateFeatures(dto: UpdateFeaturesDto): void {
    const proj = this.currentProject();
    if (!proj) return;

    this.projectService
      .updateFeatures(proj.id, dto)
      .pipe(
        catchError((err) => {
          console.error('Không thể cập nhật feature flags', err);
          return of(null);
        }),
      )
      .subscribe((features) => {
        if (features) {
          this.currentProject.set({
            ...proj,
            features: {
              ...proj.features,
              ...features,
            },
          });
        }
      });
  }
}
