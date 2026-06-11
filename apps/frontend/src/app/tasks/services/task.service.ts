import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import type {
  Task,
  TaskListItem,
  TaskListResponse,
  TaskActivity,
  CreateTaskDto,
  UpdateTaskDto,
  ReorderTasksDto,
  BulkDeleteTasksDto,
  TaskQueryDto,
  CreateCommentDto,
  UpdateCommentDto,
  SubItemsTreeResponse,
  ActivityFilteredResponse,
  ActivityFilterType,
} from '@mpm/shared-types';

@Injectable({ providedIn: 'root' })
export class TaskService {
  private readonly http = inject(HttpClient);

  private base(projectId: string): string {
    return `/api/projects/${projectId}/tasks`;
  }

  getTasks(projectId: string, query: TaskQueryDto = {}): Observable<TaskListResponse> {
    let params = new HttpParams();
    if (query.types?.length) params = params.set('types', query.types.join(','));
    if (query.stateIds?.length) params = params.set('stateIds', query.stateIds.join(','));
    if (query.priorities?.length) params = params.set('priorities', query.priorities.join(','));
    if (query.assigneeIds?.length) params = params.set('assigneeIds', query.assigneeIds.join(','));
    if (query.labelIds?.length) params = params.set('labelIds', query.labelIds.join(','));
    if (query.search) params = params.set('search', query.search);
    if (query.groupBy) params = params.set('groupBy', query.groupBy);
    if (query.orderBy) params = params.set('orderBy', query.orderBy);
    if (query.page) params = params.set('page', String(query.page));
    if (query.limit) params = params.set('limit', String(query.limit));
    if (query.parentId !== undefined) params = params.set('parentId', query.parentId === null ? 'null' : query.parentId);
    if (query.sprintId) params = params.set('sprintId', query.sprintId);
    return this.http.get<TaskListResponse>(this.base(projectId), { params });
  }

  getTask(projectId: string, taskId: string): Observable<Task> {
    return this.http.get<Task>(`${this.base(projectId)}/${taskId}`);
  }

  createTask(projectId: string, dto: CreateTaskDto): Observable<Task> {
    return this.http.post<Task>(this.base(projectId), dto);
  }

  updateTask(projectId: string, taskId: string, dto: UpdateTaskDto): Observable<Task> {
    return this.http.patch<Task>(`${this.base(projectId)}/${taskId}`, dto);
  }

  deleteTask(projectId: string, taskId: string): Observable<void> {
    return this.http.delete<void>(`${this.base(projectId)}/${taskId}`);
  }

  bulkDeleteTasks(projectId: string, dto: BulkDeleteTasksDto): Observable<{ succeeded: string[]; failed: string[] }> {
    return this.http.delete<{ succeeded: string[]; failed: string[] }>(this.base(projectId), { body: dto });
  }

  reorderTasks(projectId: string, dto: ReorderTasksDto): Observable<{ ok: boolean }> {
    return this.http.patch<{ ok: boolean }>(`${this.base(projectId)}/reorder`, dto);
  }

  searchTasks(projectId: string, q: string): Observable<TaskListItem[]> {
    return this.http.get<TaskListItem[]>(`${this.base(projectId)}/search`, {
      params: new HttpParams().set('q', q),
    });
  }

  getActivity(projectId: string, taskId: string, page = 1, limit = 50): Observable<{ data: TaskActivity[]; total: number }> {
    return this.http.get<{ data: TaskActivity[]; total: number }>(
      `${this.base(projectId)}/${taskId}/activity`,
      { params: new HttpParams().set('page', String(page)).set('limit', String(limit)) },
    );
  }

  addComment(projectId: string, taskId: string, dto: CreateCommentDto): Observable<TaskActivity> {
    return this.http.post<TaskActivity>(`${this.base(projectId)}/${taskId}/comments`, dto);
  }

  editComment(projectId: string, taskId: string, commentId: string, dto: UpdateCommentDto): Observable<TaskActivity> {
    return this.http.patch<TaskActivity>(`${this.base(projectId)}/${taskId}/comments/${commentId}`, dto);
  }

  deleteComment(projectId: string, taskId: string, commentId: string): Observable<void> {
    return this.http.delete<void>(`${this.base(projectId)}/${taskId}/comments/${commentId}`);
  }

  getSubItemsTree(projectId: string, taskId: string, depth?: number): Observable<SubItemsTreeResponse> {
    let params = new HttpParams();
    if (depth != null) params = params.set('depth', String(depth));
    return this.http.get<SubItemsTreeResponse>(
      `${this.base(projectId)}/${taskId}/children`,
      { params },
    );
  }

  getActivityFiltered(
    projectId: string,
    taskId: string,
    type?: ActivityFilterType,
    page?: number,
    limit?: number,
  ): Observable<ActivityFilteredResponse> {
    let params = new HttpParams();
    if (type) params = params.set('type', type);
    if (page != null) params = params.set('page', String(page));
    if (limit != null) params = params.set('limit', String(limit));
    return this.http.get<ActivityFilteredResponse>(
      `${this.base(projectId)}/${taskId}/activity`,
      { params },
    );
  }
}
