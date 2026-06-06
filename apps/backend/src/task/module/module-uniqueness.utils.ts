import { ConflictException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Module as ModuleEntity, ModuleScope } from '../entities/module.entity';

export async function validateCreateNameUniqueness(
  moduleRepo: Repository<ModuleEntity>,
  scope: ModuleScope,
  workspaceId: string | null,
  projectId: string | null,
  name: string,
): Promise<void> {
  if (scope === 'workspace') {
    const existing = await moduleRepo.findOne({
      where: { scope: 'workspace', workspaceId: workspaceId!, name },
    });
    if (existing) {
      throw new ConflictException({
        statusCode: 409,
        error: 'Conflict',
        message: `Module name "${name}" already exists in this workspace`,
        errorCode: 'MODULE_NAME_EXISTS',
        timestamp: new Date().toISOString(),
      });
    }
  } else {
    const existing = await moduleRepo.findOne({
      where: { scope: 'project', projectId: projectId!, name },
    });
    if (existing) {
      throw new ConflictException({
        statusCode: 409,
        error: 'Conflict',
        message: `Module name "${name}" already exists in this project`,
        errorCode: 'MODULE_NAME_EXISTS',
        timestamp: new Date().toISOString(),
      });
    }
  }
}

export async function validateUpdateNameUniqueness(
  moduleRepo: Repository<ModuleEntity>,
  module: ModuleEntity,
  newName: string,
): Promise<void> {
  if (module.scope === 'workspace') {
    const existing = await moduleRepo.findOne({
      where: { scope: 'workspace', workspaceId: module.workspaceId!, name: newName },
    });
    if (existing) {
      throw new ConflictException({
        statusCode: 409,
        error: 'Conflict',
        message: `Module name "${newName}" already exists in this workspace`,
        errorCode: 'MODULE_NAME_EXISTS',
        timestamp: new Date().toISOString(),
      });
    }
  } else {
    const existing = await moduleRepo.findOne({
      where: { scope: 'project', projectId: module.projectId!, name: newName },
    });
    if (existing) {
      throw new ConflictException({
        statusCode: 409,
        error: 'Conflict',
        message: `Module name "${newName}" already exists in this project`,
        errorCode: 'MODULE_NAME_EXISTS',
        timestamp: new Date().toISOString(),
      });
    }
  }
}
