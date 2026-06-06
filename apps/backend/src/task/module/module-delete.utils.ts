import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { Module as ModuleEntity } from '../entities/module.entity';
import { TaskModule } from '../entities/task-module.entity';
import { validateModuleRole } from './module-validation.utils';

export async function deleteModule(
  moduleRepo: Repository<ModuleEntity>,
  taskModuleRepo: Repository<TaskModule>,
  moduleId: string,
  opts: { userSystemRole: string },
): Promise<{ deletedModuleId: string; affectedTaskCount: number }> {
  const module = await moduleRepo.findOne({ where: { id: moduleId } });
  if (!module) {
    throw new NotFoundException({
      statusCode: 404,
      error: 'Not Found',
      message: 'Module not found',
      errorCode: 'MODULE_NOT_FOUND',
      timestamp: new Date().toISOString(),
    });
  }

  validateModuleRole(module, opts.userSystemRole, 'delete');

  const affectedTaskCount = await taskModuleRepo.count({
    where: { moduleId },
  });

  await moduleRepo.remove(module);

  return { deletedModuleId: moduleId, affectedTaskCount };
}
