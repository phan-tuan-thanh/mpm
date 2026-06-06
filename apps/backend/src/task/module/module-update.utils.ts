import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { Module as ModuleEntity } from '../entities/module.entity';
import { UpdateModuleDto } from './module.dto';
import { validateModuleRole } from './module-validation.utils';
import { validateUpdateNameUniqueness } from './module-uniqueness.utils';
import { extractPlainText } from '../../common/tiptap-extractor';

export async function updateModule(
  moduleRepo: Repository<ModuleEntity>,
  moduleId: string,
  dto: UpdateModuleDto,
  opts: { userSystemRole: string },
): Promise<ModuleEntity> {
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

  validateModuleRole(module, opts.userSystemRole, 'edit');

  if (dto.name && dto.name !== module.name) {
    await validateUpdateNameUniqueness(moduleRepo, module, dto.name);
    module.name = dto.name;
  }

  if (dto.description !== undefined) {
    module.description = dto.description;
    module.descriptionPlain = extractPlainText(dto.description);
  }
  if (dto.status !== undefined) module.status = dto.status;
  if (dto.startDate !== undefined) module.startDate = dto.startDate;
  if (dto.endDate !== undefined) module.endDate = dto.endDate;

  return moduleRepo.save(module);
}
