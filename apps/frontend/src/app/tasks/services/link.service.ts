import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { TaskLink, CreateLinkDto } from '@mpm/shared-types';

@Injectable({ providedIn: 'root' })
export class LinkService {
  private readonly http = inject(HttpClient);

  addLink(projectId: string, taskId: string, dto: CreateLinkDto): Observable<TaskLink> {
    return this.http.post<TaskLink>(
      `/api/projects/${projectId}/tasks/${taskId}/links`,
      dto,
    );
  }

  deleteLink(projectId: string, taskId: string, linkId: string): Observable<void> {
    return this.http.delete<void>(
      `/api/projects/${projectId}/tasks/${taskId}/links/${linkId}`,
    );
  }
}
