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
    startDate?: string;
    endDate?: string;
  }): Observable<ProjectListItem[]> {
    let params = new HttpParams();
    if (filter) {
      if (filter.name) params = params.set('name', filter.name);
      if (filter.status) params = params.set('status', filter.status);
      if (filter.startDate) params = params.set('startDate', filter.startDate);
      if (filter.endDate) params = params.set('endDate', filter.endDate);
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
}
