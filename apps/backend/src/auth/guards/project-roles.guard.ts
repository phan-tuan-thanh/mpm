import {
  CanActivate,
  ExecutionContext,
  Injectable,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectMember } from '../entities/project-member.entity';
import type { ProjectRole } from '@mpm/shared-types';
import { PROJECT_ROLES_KEY } from '../decorators/project-roles.decorator';
import type { RequestUser } from '../decorators/current-user.decorator';
import { AuthEvent } from '../constants/auth-events';

/**
 * Project Roles Guard — kiểm tra quyền truy cập cấp project
 *
 * Flow:
 * 1. Đọc metadata @ProjectRoles() từ handler/class qua Reflector
 * 2. Nếu không có metadata → cho phép (endpoint không yêu cầu project role)
 * 3. Admin bypass: systemRole === 'Admin' → cho phép
 * 4. Extract projectId từ route params hoặc request body
 * 5. Tìm role của user trong project đó
 * 6. Kiểm tra role có nằm trong danh sách required roles
 *
 * Error codes:
 * - MISSING_PROJECT_ID (HTTP 400): Không tìm thấy projectId trong request
 * - INSUFFICIENT_PROJECT_ROLE (HTTP 403): User không có role phù hợp trong project
 */
@Injectable()
export class ProjectRolesGuard implements CanActivate {
  private readonly logger = new Logger(ProjectRolesGuard.name);

  constructor(
    private readonly reflector: Reflector,
    @InjectRepository(ProjectMember)
    private readonly projectMemberRepository: Repository<ProjectMember>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Bước 1: Đọc required project roles từ metadata
    const requiredRoles = this.reflector.getAllAndOverride<ProjectRole[] | undefined>(
      PROJECT_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Bước 2: Nếu endpoint không yêu cầu project role → cho phép
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request & { user: RequestUser }>();
    const user = request.user;

    // Bước 3: Admin bypass — Admin có quyền truy cập mọi project
    if (user.systemRole === 'Admin') {
      return true;
    }

    // Bước 4: Extract projectId từ route params hoặc request body
    const projectId = this.extractProjectId(request);
    if (!projectId) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Project ID is required for this endpoint. Provide it as a route parameter (:projectId) or in the request body.',
        errorCode: 'MISSING_PROJECT_ID',
        timestamp: new Date().toISOString(),
      });
    }

    // Bước 5: Tìm role của user trong project
    let userProjectRole = user.projectRoles?.find(
      (entry) => entry.projectId === projectId,
    );

    // Nếu không tìm thấy trong token -> fallback query database (đề phòng token stale khi vừa được thêm vào project)
    if (!userProjectRole) {
      const dbMember = await this.projectMemberRepository.findOne({
        where: { projectId, userId: user.id },
      });
      if (dbMember) {
        userProjectRole = {
          projectId: dbMember.projectId,
          role: dbMember.projectRole,
        };
      }
    }

    // Bước 6: Kiểm tra user có role phù hợp
    if (!userProjectRole || !requiredRoles.includes(userProjectRole.role)) {
      // Ghi Audit_Log khi access bị denied
      this.logAccessDenied(user, projectId, requiredRoles);

      throw new ForbiddenException({
        statusCode: 403,
        error: 'Forbidden',
        message: 'You do not have the required project role to access this resource',
        errorCode: 'INSUFFICIENT_PROJECT_ROLE',
        timestamp: new Date().toISOString(),
      });
    }

    return true;
  }

  /**
   * Extract projectId từ route params (`:projectId`) hoặc request body (`projectId` field)
   *
   * Ưu tiên route params trước, fallback sang request body
   */
  private extractProjectId(request: Request): string | undefined {
    // Ưu tiên 1: Route params
    const paramProjectId = request.params?.['projectId'];
    if (paramProjectId && typeof paramProjectId === 'string' && paramProjectId.trim().length > 0) {
      return paramProjectId;
    }

    // Ưu tiên 2: Request body
    const body = request.body as Record<string, unknown> | undefined;
    if (body && typeof body['projectId'] === 'string' && (body['projectId'] as string).trim().length > 0) {
      return body['projectId'] as string;
    }

    return undefined;
  }

  /**
   * Ghi audit log khi access bị denied
   *
   * Hiện tại sử dụng Logger. Khi AuditService sẵn sàng, sẽ inject và ghi vào PostgreSQL.
   */
  private logAccessDenied(
    user: RequestUser,
    projectId: string,
    requiredRoles: ProjectRole[],
  ): void {
    const userRole = user.projectRoles.find((entry) => entry.projectId === projectId);

    this.logger.warn(
      `[${AuthEvent.ACCESS_DENIED}] User ${user.id} denied access to project ${projectId}. ` +
        `Required roles: [${requiredRoles.join(', ')}], ` +
        `User role: ${userRole?.role ?? 'none'}`,
    );
  }
}
