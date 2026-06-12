import { Repository } from 'typeorm';
import { Label } from '../entities/label.entity';
import { AuditService } from '../../audit/audit.service';
import { AuthEvent } from '../../auth/constants/auth-events';
import { validateColor } from './label-validation.utils';
import { validateCreateUniqueness, determineIsExclusive } from './label-creation.utils';

export async function createLabel(
  labelRepo: Repository<Label>,
  auditService: AuditService,
  dto: { name: string; colorLight: string; colorDark: string; isExclusive?: boolean; description?: string | null; icon?: string | null },
  opts: {
    scope: 'workspace' | 'project';
    workspaceId: string | null;
    projectId?: string | null;
    userId: string;
  },
): Promise<Label> {
  validateColor(dto.colorLight);
  validateColor(dto.colorDark);
  await validateCreateUniqueness(labelRepo, opts, dto.name);
  const isExclusive = await determineIsExclusive(labelRepo, opts, dto.name, dto.isExclusive ?? true);

  const label = labelRepo.create({
    scope: opts.scope,
    workspaceId: opts.scope === 'workspace' ? opts.workspaceId : (opts.workspaceId ?? null),
    projectId: opts.scope === 'project' ? opts.projectId : null,
    name: dto.name,
    colorLight: dto.colorLight,
    colorDark: dto.colorDark,
    icon: dto.icon ?? null,
    isExclusive,
    description: dto.description ?? null,
  });

  const saved = await labelRepo.save(label);

  auditService.log(AuthEvent.LABEL_CREATED, opts.userId, 'internal', 'system', {
    scope: opts.scope,
    workspaceId: opts.workspaceId,
    projectId: opts.projectId ?? null,
    name: dto.name,
  });

  return saved;
}
