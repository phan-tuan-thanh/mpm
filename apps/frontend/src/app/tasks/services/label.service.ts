import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { Label, CreateLabelDto, UpdateLabelDto } from '@mpm/shared-types';

export interface DeleteWorkspaceLabelResponse {
  deletedLabelId: string;
  affectedTaskCount: number;
}

@Injectable({ providedIn: 'root' })
export class LabelService {
  private readonly http = inject(HttpClient);

  // --- Project-scoped label endpoints ---

  getLabels(projectId: string): Observable<Array<Label & { taskCount: number }>> {
    return this.http.get<Array<Label & { taskCount: number }>>(
      `/api/projects/${projectId}/labels`,
    );
  }

  createLabel(projectId: string, dto: CreateLabelDto): Observable<Label> {
    return this.http.post<Label>(`/api/projects/${projectId}/labels`, dto);
  }

  updateLabel(projectId: string, labelId: string, dto: UpdateLabelDto): Observable<Label> {
    return this.http.patch<Label>(`/api/projects/${projectId}/labels/${labelId}`, dto);
  }

  deleteLabel(projectId: string, labelId: string): Observable<void> {
    return this.http.delete<void>(`/api/projects/${projectId}/labels/${labelId}`);
  }

  // --- Workspace-scoped label endpoints ---

  getWorkspaceLabels(workspaceId: string): Observable<Array<Label & { taskCount: number }>> {
    return this.http.get<Array<Label & { taskCount: number }>>(
      `/api/workspaces/${workspaceId}/labels`,
    );
  }

  createWorkspaceLabel(workspaceId: string, dto: CreateLabelDto): Observable<Label> {
    return this.http.post<Label>(`/api/workspaces/${workspaceId}/labels`, dto);
  }

  updateWorkspaceLabel(workspaceId: string, labelId: string, dto: UpdateLabelDto): Observable<Label> {
    return this.http.patch<Label>(`/api/workspaces/${workspaceId}/labels/${labelId}`, dto);
  }

  deleteWorkspaceLabel(workspaceId: string, labelId: string): Observable<DeleteWorkspaceLabelResponse> {
    return this.http.delete<DeleteWorkspaceLabelResponse>(
      `/api/workspaces/${workspaceId}/labels/${labelId}`,
    );
  }
}
