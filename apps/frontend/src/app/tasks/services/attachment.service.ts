import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { TaskAttachment } from '@mpm/shared-types';

@Injectable({ providedIn: 'root' })
export class AttachmentService {
  private readonly http = inject(HttpClient);

  upload(projectId: string, taskId: string, file: File): Observable<TaskAttachment> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<TaskAttachment>(
      `/api/projects/${projectId}/tasks/${taskId}/attachments`,
      form,
    );
  }

  getDownloadUrl(projectId: string, taskId: string, attachmentId: string): string {
    return `/api/projects/${projectId}/tasks/${taskId}/attachments/${attachmentId}`;
  }

  delete(projectId: string, taskId: string, attachmentId: string): Observable<void> {
    return this.http.delete<void>(
      `/api/projects/${projectId}/tasks/${taskId}/attachments/${attachmentId}`,
    );
  }
}
