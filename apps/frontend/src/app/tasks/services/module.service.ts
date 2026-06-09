import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { ProjectModule, ModuleLifecycleStatus, TiptapDoc } from '@mpm/shared-types';

export interface CreateModuleDto {
  name: string;
  description?: TiptapDoc | null;
  status?: ModuleLifecycleStatus;
  startDate?: string | null;
  endDate?: string | null;
}

export interface UpdateModuleDto {
  name?: string;
  description?: TiptapDoc | null;
  status?: ModuleLifecycleStatus;
  startDate?: string | null;
  endDate?: string | null;
}

export interface AddTasksResponse {
  added: number;
  alreadyExists: number;
}

export interface ModuleQueryParams {
  status?: ModuleLifecycleStatus | ModuleLifecycleStatus[];
  scope?: 'workspace' | 'project' | 'all';
}

@Injectable({ providedIn: 'root' })
export class ModuleService {
  private readonly http = inject(HttpClient);

  // --- Project-scoped module endpoints ---

  getModules(projectId: string, query?: ModuleQueryParams): Observable<ProjectModule[]> {
    let params = new HttpParams();
    if (query?.status) {
      const statuses = Array.isArray(query.status) ? query.status : [query.status];
      params = params.set('status', statuses.join(','));
    }
    if (query?.scope) {
      params = params.set('scope', query.scope);
    }
    return this.http.get<ProjectModule[]>(
      `/api/projects/${projectId}/modules`,
      { params },
    );
  }

  createModule(projectId: string, dto: CreateModuleDto): Observable<ProjectModule> {
    return this.http.post<ProjectModule>(`/api/projects/${projectId}/modules`, dto);
  }

  updateModule(projectId: string, moduleId: string, dto: UpdateModuleDto): Observable<ProjectModule> {
    return this.http.patch<ProjectModule>(
      `/api/projects/${projectId}/modules/${moduleId}`,
      dto,
    );
  }

  deleteModule(projectId: string, moduleId: string): Observable<void> {
    return this.http.delete<void>(`/api/projects/${projectId}/modules/${moduleId}`);
  }

  // --- Task assignment endpoints ---

  addTasksToModule(projectId: string, moduleId: string, taskIds: string[]): Observable<AddTasksResponse> {
    return this.http.post<AddTasksResponse>(
      `/api/projects/${projectId}/modules/${moduleId}/tasks`,
      { taskIds },
    );
  }

  removeTaskFromModule(projectId: string, moduleId: string, taskId: string): Observable<void> {
    return this.http.delete<void>(
      `/api/projects/${projectId}/modules/${moduleId}/tasks/${taskId}`,
    );
  }

  // --- Workspace-scoped module endpoints ---

  getWorkspaceModules(workspaceId: string): Observable<ProjectModule[]> {
    return this.http.get<ProjectModule[]>(`/api/workspaces/${workspaceId}/modules`);
  }

  createWorkspaceModule(workspaceId: string, dto: CreateModuleDto): Observable<ProjectModule> {
    return this.http.post<ProjectModule>(`/api/workspaces/${workspaceId}/modules`, dto);
  }

  updateWorkspaceModule(workspaceId: string, moduleId: string, dto: UpdateModuleDto): Observable<ProjectModule> {
    return this.http.patch<ProjectModule>(
      `/api/workspaces/${workspaceId}/modules/${moduleId}`,
      dto,
    );
  }

  deleteWorkspaceModule(workspaceId: string, moduleId: string): Observable<void> {
    return this.http.delete<void>(`/api/workspaces/${workspaceId}/modules/${moduleId}`);
  }
}
