/**
 * Authentication & Authorization shared types
 * Dùng chung giữa backend và frontend
 */

// ─── Role Types ─────────────────────────────────────────────────────────────────

/** Vai trò cấp hệ thống */
export type SystemRole = 'Admin' | 'User';

/** Vai trò cấp dự án */
export type ProjectRole =
  | 'Scrum_Master'
  | 'Product_Owner'
  | 'Developer'
  | 'QA'
  | 'Stakeholder';

// ─── Permission Types ───────────────────────────────────────────────────────────

/** Loại tài nguyên trong project */
export type Resource = 'task' | 'sprint' | 'document' | 'member';

/** Hành động trên tài nguyên */
export type Action = 'create' | 'read' | 'update' | 'delete';

/** Ma trận phân quyền: Role → Resource → Actions */
export type PermissionMatrix = Record<ProjectRole, Record<Resource, Action[]>>;

// ─── JWT & Session Interfaces ───────────────────────────────────────────────────

/** Entry cho project role trong JWT payload */
export interface ProjectRoleEntry {
  projectId: string;
  role: ProjectRole;
}

/** JWT Access Token payload (RS256) */
export interface JwtPayload {
  /** User ID (UUID) */
  sub: string;
  /** Email người dùng */
  email: string;
  /** Vai trò cấp hệ thống */
  systemRole: SystemRole;
  /** Danh sách vai trò trong các project */
  projectRoles: ProjectRoleEntry[];
  /** Issued at (Unix timestamp) */
  iat: number;
  /** Expiration (Unix timestamp) */
  exp: number;
}

/** Session data lưu trong Redis */
export interface SessionData {
  /** Session ID (UUID) */
  sessionId: string;
  /** User ID (UUID) */
  userId: string;
  /** Thông tin thiết bị (User-Agent hoặc parsed device info) */
  deviceInfo: string;
  /** Địa chỉ IP của client */
  ipAddress: string;
  /** Thời gian tạo session (ISO 8601) */
  createdAt: string;
  /** Thời gian hoạt động cuối (ISO 8601) */
  lastActivity: string;
  /** Hash của Refresh Token liên kết với session */
  refreshTokenHash: string;
}

// ─── Error Response ─────────────────────────────────────────────────────────────

/** Cấu trúc error response thống nhất cho toàn bộ API */
export interface ErrorResponse {
  /** HTTP status code */
  statusCode: number;
  /** HTTP status text (e.g. "Unauthorized", "Forbidden") */
  error: string;
  /** Thông báo lỗi dễ đọc cho người dùng */
  message: string;
  /** Mã lỗi máy đọc được (e.g. "TOKEN_EXPIRED", "INSUFFICIENT_ROLE") */
  errorCode: string;
  /** Thời điểm xảy ra lỗi (ISO 8601) */
  timestamp: string;
}
