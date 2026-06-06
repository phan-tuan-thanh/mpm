import { Repository } from 'typeorm';
import { Module as ModuleEntity, ModuleScope } from '../entities/module.entity';
import { CreateModuleDto } from './module.dto';
import { validateScopeConsistency } from './module-validation.utils';
import { validateCreateNameUniqueness } from './module-uniqueness.utils';
import { extractPlainText } from '../../common/tiptap-extractor';

export async function createModule(
  moduleRepo: Repository<ModuleEntity>,
  scope: ModuleScope,
  workspaceId: string | null,
  projectId: string | null,
  userId: string,
  dto: CreateModuleDto,
): Promise<ModuleEntity> {
  validateScopeConsistency(scope, projectId);
  await validateCreateNameUniqueness(moduleRepo, scope, workspaceId, projectId, dto.name);

  const module = moduleRepo.create({
    scope,
    workspaceId: workspaceId ?? null,
    projectId: scope === 'project' ? projectId : null,
    name: dto.name,
    description: dto.description ?? null,
    descriptionPlain: extractPlainText(dto.description ?? null),
    status: dto.status ?? 'backlog',
    startDate: dto.startDate ?? null,
    endDate: dto.endDate ?? null,
    createdBy: userId,
  });

  return moduleRepo.save(module);
}
