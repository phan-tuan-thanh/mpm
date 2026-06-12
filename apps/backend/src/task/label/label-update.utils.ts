import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { Label } from '../entities/label.entity';
import { validateUpdate } from './label-validation.utils';

export async function updateExclusiveLabels(
  labelRepo: Repository<Label>,
  label: Label,
  isExclusive: boolean,
): Promise<void> {
  if (label.name.includes('::')) {
    const scopeName = label.name.split('::')[0].trim().toLowerCase();
    const scopePattern = `${scopeName}::%`;
    if (label.scope === 'project') {
      await labelRepo.createQueryBuilder()
        .update(Label)
        .set({ isExclusive })
        .where('project_id = :projectId AND scope = :scope AND name ILIKE :pattern', {
          projectId: label.projectId,
          scope: 'project',
          pattern: scopePattern,
        })
        .execute();
    } else {
      await labelRepo.createQueryBuilder()
        .update(Label)
        .set({ isExclusive })
        .where('workspace_id = :workspaceId AND scope = :scope AND name ILIKE :pattern', {
          workspaceId: label.workspaceId,
          scope: 'workspace',
          pattern: scopePattern,
        })
        .execute();
    }
  }
}

export async function updateLabel(
  labelRepo: Repository<Label>,
  labelId: string,
  dto: { name?: string; colorLight?: string; colorDark?: string; isExclusive?: boolean; description?: string | null; icon?: string | null },
  opts: {
    workspaceId?: string;
    projectId?: string;
    userSystemRole: string;
  },
): Promise<Label> {
  const label = await labelRepo.findOne({ where: { id: labelId } });
  if (!label) throw new NotFoundException('Label not found');

  await validateUpdate(label, dto, opts, labelRepo);

  if (dto.name !== undefined) label.name = dto.name;
  if (dto.colorLight !== undefined) label.colorLight = dto.colorLight;
  if (dto.colorDark !== undefined) label.colorDark = dto.colorDark;
  if (dto.icon !== undefined) label.icon = dto.icon;
  if (dto.description !== undefined) label.description = dto.description;
  if (dto.isExclusive !== undefined) {
    label.isExclusive = dto.isExclusive;
    await updateExclusiveLabels(labelRepo, label, dto.isExclusive);
  }

  return labelRepo.save(label);
}
