import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { TaskAttachment } from '@mpm/shared-types';

@Injectable({ providedIn: 'root' })
export class AttachmentService {
  private readonly http = inject(HttpClient);

  upload(projectId: string, taskId: string, file: File, title?: string, source?: string): Observable<TaskAttachment> {
    const form = new FormData();
    form.append('file', file);
    if (title?.trim()) form.append('title', title.trim());
    let url = `/api/projects/${projectId}/tasks/${taskId}/attachments`;
    if (source) {
      url += `?source=${source}`;
    }
    return this.http.post<TaskAttachment>(url, form);
  }

  getDownloadUrl(projectId: string, taskId: string, attachmentId: string): string {
    return `/api/projects/${projectId}/tasks/${taskId}/attachments/${attachmentId}`;
  }

  batchUpdate(
    projectId: string,
    taskId: string,
    items: Array<{ id: string; title?: string | null; sortOrder?: number }>,
  ): Observable<{ ok: boolean }> {
    return this.http.patch<{ ok: boolean }>(
      `/api/projects/${projectId}/tasks/${taskId}/attachments`,
      { items },
    );
  }

  updateTitle(projectId: string, taskId: string, attachmentId: string, title: string | null): Observable<TaskAttachment> {
    return this.http.patch<TaskAttachment>(
      `/api/projects/${projectId}/tasks/${taskId}/attachments/${attachmentId}`,
      { title },
    );
  }

  delete(projectId: string, taskId: string, attachmentId: string): Observable<void> {
    return this.http.delete<void>(
      `/api/projects/${projectId}/tasks/${taskId}/attachments/${attachmentId}`,
    );
  }
}
