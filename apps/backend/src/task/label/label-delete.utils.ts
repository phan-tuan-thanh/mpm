import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { Label } from '../entities/label.entity';
import { AuditService } from '../../audit/audit.service';
import { AuthEvent } from '../../auth/constants/auth-events';
import { validateDelete } from './label-validation.utils';

export async function getAffectedTaskCount(
  labelRepo: Repository<Label>,
  labelId: string,
): Promise<number> {
  const affectedResult = await labelRepo
    .createQueryBuilder()
    .select('COUNT(*)', 'count')
    .from('task_labels', 'tl')
    .where('tl.label_id = :labelId', { labelId })
    .getRawOne<{ count: string }>();

  return parseInt(affectedResult?.count ?? '0', 10);
}

export async function deleteLabel(
  labelRepo: Repository<Label>,
  auditService: AuditService,
  labelId: string,
  opts: {
    workspaceId?: string;
    projectId?: string;
    userId: string;
    userSystemRole: string;
  },
): Promise<{ deletedLabelId: string; affectedTaskCount: number }> {
  const label = await labelRepo.findOne({ where: { id: labelId } });
  if (!label) throw new NotFoundException('Label not found');

  validateDelete(label, opts);

  const affectedTaskCount = await getAffectedTaskCount(labelRepo, labelId);

  await labelRepo.delete(labelId);

  auditService.log(AuthEvent.LABEL_DELETED, opts.userId, 'internal', 'system', {
    scope: label.scope,
    workspaceId: label.workspaceId,
    projectId: label.projectId,
    name: label.name,
    affectedTaskCount,
  });

  return { deletedLabelId: labelId, affectedTaskCount };
}
