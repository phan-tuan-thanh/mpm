export type SystemRole = 'Admin' | 'User';
export type ProjectRole = 'Scrum_Master' | 'Product_Owner' | 'Developer' | 'QA' | 'Stakeholder';
export type Resource = 'task' | 'sprint' | 'document' | 'member';
export type Action = 'create' | 'read' | 'update' | 'delete';
export type PermissionMatrix = Record<ProjectRole, Record<Resource, Action[]>>;
export interface ProjectRoleEntry {
    projectId: string;
    role: ProjectRole;
}
export interface JwtPayload {
    sub: string;
    email: string;
    systemRole: SystemRole;
    projectRoles: ProjectRoleEntry[];
    iat: number;
    exp: number;
}
export interface SessionData {
    sessionId: string;
    userId: string;
    deviceInfo: string;
    ipAddress: string;
    createdAt: string;
    lastActivity: string;
    refreshTokenHash: string;
}
export interface ErrorResponse {
    statusCode: number;
    error: string;
    message: string;
    errorCode: string;
    timestamp: string;
}
