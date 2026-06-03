import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { TaskRelation, CreateRelationDto } from '@mpm/shared-types';

@Injectable({ providedIn: 'root' })
export class RelationService {
  private readonly http = inject(HttpClient);

  addRelation(projectId: string, taskId: string, dto: CreateRelationDto): Observable<TaskRelation> {
    return this.http.post<TaskRelation>(
      `/api/projects/${projectId}/tasks/${taskId}/relations`,
      dto,
    );
  }

  deleteRelation(projectId: string, taskId: string, relationId: string): Observable<void> {
    return this.http.delete<void>(
      `/api/projects/${projectId}/tasks/${taskId}/relations/${relationId}`,
    );
  }
}
