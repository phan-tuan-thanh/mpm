import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SystemRole } from '../../auth/services/auth.service';

/**
 * Interface cho thông tin user trả về từ Admin API
 */
export interface AdminUserResponse {
  id: string;
  email: string;
  displayName: string;
  systemRole: SystemRole;
  isActive: boolean;
  createdAt: string;
}

@Injectable({
  providedIn: 'root',
})
export class AdminService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/admin/users';

  /**
   * Lấy danh sách toàn bộ user trong hệ thống
   */
  listUsers(): Observable<AdminUserResponse[]> {
    return this.http.get<AdminUserResponse[]>(this.apiUrl);
  }

  /**
   * Thay đổi System Role của user (Admin / User)
   */
  changeRole(userId: string, role: SystemRole): Observable<AdminUserResponse> {
    return this.http.patch<AdminUserResponse>(`${this.apiUrl}/${userId}/role`, { role });
  }

  /**
   * Vô hiệu hóa tài khoản user (disable)
   */
  disableUser(userId: string): Observable<AdminUserResponse> {
    return this.http.patch<AdminUserResponse>(`${this.apiUrl}/${userId}/disable`, {});
  }

  /**
   * Kích hoạt lại tài khoản user (enable)
   */
  enableUser(userId: string): Observable<AdminUserResponse> {
    return this.http.patch<AdminUserResponse>(`${this.apiUrl}/${userId}/enable`, {});
  }
}
