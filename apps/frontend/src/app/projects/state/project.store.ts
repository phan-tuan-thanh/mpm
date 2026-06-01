import { Injectable, inject, signal } from '@angular/core';
import { ProjectService } from '../services/project.service';
import { Project, ProjectListItem, MemberResponse } from '@mpm/shared-types';
import { catchError, finalize } from 'rxjs/operators';
import { of } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ProjectStore {
  private readonly projectService = inject(ProjectService);

  // States
  readonly projects = signal<ProjectListItem[]>([]);
  readonly currentProject = signal<Project | null>(null);
  readonly members = signal<MemberResponse[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  /**
   * Load danh sách dự án
   */
  loadProjects(filter?: {
    name?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
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
        if (data && onSuccess) {
          onSuccess(data);
        }
      });
  }

  /**
   * Set current project directly
   */
  setCurrentProject(project: Project | null): void {
    this.currentProject.set(project);
    this.error.set(null);
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
}
