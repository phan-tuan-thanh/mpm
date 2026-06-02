import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Project,
  ProjectListItem,
  MemberResponse,
  CreateProjectDto,
  UpdateProjectDto,
  AddMemberDto,
  UpdateMemberRoleDto,
  UpdateFeaturesDto,
  ProjectFeatures,
  ProjectStateGrouped,
  ProjectState,
  CreateStateDto,
  UpdateStateDto,
  ReorderStatesDto,
  MigrateStateDto,
  UpdateEstimateConfigDto,
} from '@mpm/shared-types';

@Injectable({
  providedIn: 'root',
})
export class ProjectService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/projects';

  /**
   * Lấy danh sách projects
   */
  getProjects(filter?: {
    name?: string;
    status?: string;
    network?: string;
  }): Observable<ProjectListItem[]> {
    let params = new HttpParams();
    if (filter) {
      if (filter.name) params = params.set('name', filter.name);
      if (filter.status) params = params.set('status', filter.status);
      if (filter.network) params = params.set('network', filter.network);
    }
    return this.http.get<ProjectListItem[]>(this.baseUrl, { params });
  }

  /**
   * Lấy project theo key
   */
  getProjectByKey(key: string): Observable<Project> {
    return this.http.get<Project>(`${this.baseUrl}/by-key/${key}`);
  }

  /**
   * Tạo project mới
   */
  createProject(dto: CreateProjectDto): Observable<Project> {
    return this.http.post<Project>(this.baseUrl, dto);
  }

  /**
   * Cập nhật project
   */
  updateProject(id: string, dto: UpdateProjectDto): Observable<Project> {
    return this.http.patch<Project>(`${this.baseUrl}/${id}`, dto);
  }

  /**
   * Lưu trữ project
   */
  archiveProject(id: string): Observable<Project> {
    return this.http.patch<Project>(`${this.baseUrl}/${id}/archive`, {});
  }

  /**
   * Xóa project vĩnh viễn
   */
  deleteProject(id: string): Observable<{ deleted: boolean }> {
    return this.http.delete<{ deleted: boolean }>(`${this.baseUrl}/${id}`);
  }

  /**
   * Xóa nhiều projects cùng lúc
   */
  bulkDeleteProjects(ids: string[]): Observable<{
    deleted: string[];
    failed: { id: string; reason: string }[];
  }> {
    return this.http.delete<{
      deleted: string[];
      failed: { id: string; reason: string }[];
    }>(this.baseUrl, { body: { ids } });
  }

  /**
   * Lấy danh sách thành viên
   */
  getMembers(projectId: string, filter?: string): Observable<MemberResponse[]> {
    let params = new HttpParams();
    if (filter) {
      params = params.set('filter', filter);
    }
    return this.http.get<MemberResponse[]>(`${this.baseUrl}/${projectId}/members`, {
      params,
    });
  }

  /**
   * Thêm thành viên
   */
  addMember(projectId: string, dto: AddMemberDto): Observable<MemberResponse> {
    return this.http.post<MemberResponse>(
      `${this.baseUrl}/${projectId}/members`,
      dto,
    );
  }

  /**
   * Thay đổi vai trò thành viên
   */
  changeMemberRole(
    projectId: string,
    userId: string,
    dto: UpdateMemberRoleDto,
  ): Observable<MemberResponse> {
    return this.http.patch<MemberResponse>(
      `${this.baseUrl}/${projectId}/members/${userId}`,
      dto,
    );
  }

  /**
   * Xóa thành viên
   */
  removeMember(projectId: string, userId: string): Observable<{ removed: boolean }> {
    return this.http.delete<{ removed: boolean }>(
      `${this.baseUrl}/${projectId}/members/${userId}`,
    );
  }

  /**
   * Tự tham gia public project
   */
  joinProject(projectId: string): Observable<{ role: string; projectId: string }> {
    return this.http.post<{ role: string; projectId: string }>(
      `${this.baseUrl}/${projectId}/join`,
      {},
    );
  }

  /**
   * Cập nhật feature flags
   */
  updateFeatures(projectId: string, dto: UpdateFeaturesDto): Observable<ProjectFeatures> {
    return this.http.patch<ProjectFeatures>(
      `${this.baseUrl}/${projectId}/features`,
      dto,
    );
  }

  /**
   * Upload ảnh bìa project
   */
  uploadCover(projectId: string, file: File): Observable<{ coverImageUrl: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ coverImageUrl: string }>(
      `${this.baseUrl}/${projectId}/cover`,
      formData,
    );
  }

  /**
   * Xóa ảnh bìa project
   */
  deleteCover(projectId: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(
      `${this.baseUrl}/${projectId}/cover`,
    );
  }

  /**
   * Lấy danh sách states của project
   */
  getStates(projectId: string): Observable<{ data: ProjectStateGrouped }> {
    return this.http.get<{ data: ProjectStateGrouped }>(
      `${this.baseUrl}/${projectId}/states`,
    );
  }

  /**
   * Tạo state mới
   */
  createState(projectId: string, dto: CreateStateDto): Observable<ProjectState> {
    return this.http.post<ProjectState>(
      `${this.baseUrl}/${projectId}/states`,
      dto,
    );
  }

  /**
   * Cập nhật state
   */
  updateState(
    projectId: string,
    stateId: string,
    dto: UpdateStateDto,
  ): Observable<ProjectState> {
    return this.http.patch<ProjectState>(
      `${this.baseUrl}/${projectId}/states/${stateId}`,
      dto,
    );
  }

  /**
   * Sắp xếp lại states
   */
  reorderStates(projectId: string, dto: ReorderStatesDto): Observable<{ updated: number }> {
    return this.http.patch<{ updated: number }>(
      `${this.baseUrl}/${projectId}/states/reorder`,
      dto,
    );
  }

  /**
   * Xóa state
   */
  deleteState(projectId: string, stateId: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(
      `${this.baseUrl}/${projectId}/states/${stateId}`,
    );
  }

  /**
   * Migrate tasks và xóa state
   */
  migrateState(projectId: string, dto: MigrateStateDto): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(
      `${this.baseUrl}/${projectId}/states/migrate`,
      dto,
    );
  }

  /**
   * Lấy cấu hình estimate
   */
  getEstimateConfig(projectId: string): Observable<any> {
    return this.http.get<any>(
      `${this.baseUrl}/${projectId}/estimate-config`,
    );
  }

  /**
   * Cập nhật cấu hình estimate
   */
  updateEstimateConfig(
    projectId: string,
    dto: UpdateEstimateConfigDto,
  ): Observable<any> {
    return this.http.patch<any>(
      `${this.baseUrl}/${projectId}/estimate-config`,
      dto,
    );
  }
}
