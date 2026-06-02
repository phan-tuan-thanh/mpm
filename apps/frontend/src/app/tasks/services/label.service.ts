import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { Label, CreateLabelDto, UpdateLabelDto } from '@mpm/shared-types';

@Injectable({ providedIn: 'root' })
export class LabelService {
  private readonly http = inject(HttpClient);

  getLabels(projectId: string): Observable<Array<Label & { taskCount: number }>> {
    return this.http.get<Array<Label & { taskCount: number }>>(
      `/api/projects/${projectId}/tasks/labels`,
    );
  }

  createLabel(projectId: string, dto: CreateLabelDto): Observable<Label> {
    return this.http.post<Label>(`/api/projects/${projectId}/tasks/labels`, dto);
  }

  updateLabel(projectId: string, labelId: string, dto: UpdateLabelDto): Observable<Label> {
    return this.http.patch<Label>(`/api/projects/${projectId}/tasks/labels/${labelId}`, dto);
  }

  deleteLabel(projectId: string, labelId: string): Observable<void> {
    return this.http.delete<void>(`/api/projects/${projectId}/tasks/labels/${labelId}`);
  }
}
