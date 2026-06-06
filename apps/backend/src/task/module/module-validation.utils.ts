import { ConflictException, ForbiddenException } from '@nestjs/common';
import { Module as ModuleEntity, ModuleScope } from '../entities/module.entity';

export function validateScopeConsistency(scope: ModuleScope, projectId: string | null): void {
  if (scope === 'workspace' && projectId) {
    throw new ConflictException('Workspace modules cannot have a project_id');
  }
  if (scope === 'project' && !projectId) {
    throw new ConflictException('Project modules require a project_id');
  }
}

export function validateModuleRole(
  module: ModuleEntity,
  userSystemRole: string,
  action: 'edit' | 'delete',
): void {
  if (module.scope === 'workspace' && userSystemRole !== 'Admin') {
    throw new ForbiddenException({
      statusCode: 403,
      error: 'Forbidden',
      message: `Only Workspace Admin can ${action} workspace modules`,
      errorCode: 'INSUFFICIENT_ROLE',
      timestamp: new Date().toISOString(),
    });
  }
}
