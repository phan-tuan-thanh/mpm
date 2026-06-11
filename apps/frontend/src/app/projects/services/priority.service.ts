import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  ProjectPriority,
  CreatePriorityDto,
  UpdatePriorityDto,
  ReorderPrioritiesDto,
  DeletePriorityDto,
} from '@mpm/shared-types';

@Injectable({ providedIn: 'root' })
export class PriorityService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/projects';

  getPriorities(projectId: string): Observable<{ data: ProjectPriority[] }> {
    return this.http.get<{ data: ProjectPriority[] }>(
      `${this.baseUrl}/${projectId}/priorities`,
    );
  }

  createPriority(projectId: string, dto: CreatePriorityDto): Observable<{ data: ProjectPriority }> {
    return this.http.post<{ data: ProjectPriority }>(
      `${this.baseUrl}/${projectId}/priorities`,
      dto,
    );
  }

  updatePriority(projectId: string, priorityId: string, dto: UpdatePriorityDto): Observable<{ data: ProjectPriority }> {
    return this.http.patch<{ data: ProjectPriority }>(
      `${this.baseUrl}/${projectId}/priorities/${priorityId}`,
      dto,
    );
  }

  reorderPriorities(projectId: string, dto: ReorderPrioritiesDto): Observable<void> {
    return this.http.patch<void>(
      `${this.baseUrl}/${projectId}/priorities/reorder`,
      dto,
    );
  }

  deletePriority(projectId: string, priorityId: string, dto: DeletePriorityDto): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/${projectId}/priorities/${priorityId}`,
      { body: dto },
    );
  }
}
