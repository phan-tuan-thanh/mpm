import { ConflictException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Label } from '../entities/label.entity';

export async function validateCreateUniqueness(
  labelRepo: Repository<Label>,
  opts: { scope: 'workspace' | 'project'; workspaceId: string | null; projectId?: string | null },
  name: string,
): Promise<void> {
  if (opts.scope === 'workspace') {
    if (!opts.workspaceId) {
      throw new ConflictException('Workspace ID is required for workspace labels');
    }
    const existing = await labelRepo.findOne({
      where: { scope: 'workspace', workspaceId: opts.workspaceId, name },
    });
    if (existing) {
      throw new ConflictException('A label with this name already exists in the workspace');
    }
  } else {
    const existing = await labelRepo.findOne({
      where: { scope: 'project', projectId: opts.projectId!, name },
    });
    if (existing) {
      throw new ConflictException('A label with this name already exists in the project');
    }
  }
}

export async function determineIsExclusive(
  labelRepo: Repository<Label>,
  opts: { scope: 'workspace' | 'project'; workspaceId: string | null; projectId?: string | null },
  name: string,
  defaultExclusive: boolean,
): Promise<boolean> {
  if (name.includes('::')) {
    const scopeName = name.split('::')[0].trim().toLowerCase();
    const scopePattern = `${scopeName}::%`;
    const existing = await labelRepo.createQueryBuilder('l')
      .where(
        opts.scope === 'workspace'
          ? 'l.scope = :ws AND l.workspace_id = :wid'
          : 'l.scope = :proj AND l.project_id = :pid',
        {
          ws: 'workspace',
          wid: opts.workspaceId,
          proj: 'project',
          pid: opts.projectId,
        },
      )
      .andWhere('l.name ILIKE :pattern', { pattern: scopePattern })
      .getOne();
    if (existing) {
      return existing.isExclusive;
    }
  }
  return defaultExclusive;
}
