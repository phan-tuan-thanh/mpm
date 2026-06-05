import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { WorkspaceStateTemplate } from '@mpm/shared-types';

/**
 * Service quản lý Workspace State Templates
 * Giao tiếp với endpoint /api/workspaces/:wid/state-templates
 */
@Injectable({
  providedIn: 'root',
})
export class StateTemplateService {
  private readonly http = inject(HttpClient);

  /**
   * Lấy danh sách state templates của workspace
   */
  getTemplates(workspaceId: string): Observable<WorkspaceStateTemplate[]> {
    return this.http.get<WorkspaceStateTemplate[]>(
      `/api/workspaces/${workspaceId}/state-templates`,
    );
  }

  /**
   * Áp dụng lại workspace templates vào project
   * Chỉ thêm states chưa có (theo template_id), không xóa states hiện tại
   */
  applyToProject(
    workspaceId: string,
    projectId: string,
  ): Observable<{ addedCount: number; skippedCount: number }> {
    return this.http.post<{ addedCount: number; skippedCount: number }>(
      `/api/workspaces/${workspaceId}/state-templates/apply/${projectId}`,
      {},
    );
  }
}
