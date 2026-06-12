import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Label } from '../entities/label.entity';

export function validateColor(color: string): void {
  if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
    throw new ConflictException('Color must be a valid hex code (e.g. #FF0000)');
  }
}

export async function validateUpdate(
  label: Label,
  dto: { name?: string; colorLight?: string; colorDark?: string },
  opts: { projectId?: string; userSystemRole: string },
  labelRepo: Repository<Label>,
): Promise<void> {
  if (label.scope === 'workspace' && opts.userSystemRole !== 'Admin') {
    throw new ForbiddenException({
      statusCode: 403,
      error: 'Forbidden',
      message: 'Only Workspace Admin can edit workspace labels',
      errorCode: 'INSUFFICIENT_ROLE',
      timestamp: new Date().toISOString(),
    });
  }

  if (label.scope === 'project' && opts.projectId && label.projectId !== opts.projectId) {
    throw new NotFoundException('Label not found');
  }

  if (dto.colorLight) {
    validateColor(dto.colorLight);
  }
  if (dto.colorDark) {
    validateColor(dto.colorDark);
  }

  if (dto.name && dto.name !== label.name) {
    if (label.scope === 'workspace') {
      const existing = await labelRepo.findOne({
        where: { scope: 'workspace', workspaceId: label.workspaceId!, name: dto.name },
      });
      if (existing) {
        throw new ConflictException('A label with this name already exists in the workspace');
      }
    } else {
      const existing = await labelRepo.findOne({
        where: { scope: 'project', projectId: label.projectId!, name: dto.name },
      });
      if (existing) {
        throw new ConflictException('A label with this name already exists');
      }
    }
  }
}

export function validateDelete(
  label: Label,
  opts: { projectId?: string; userSystemRole: string },
): void {
  if (label.scope === 'workspace' && opts.userSystemRole !== 'Admin') {
    throw new ForbiddenException({
      statusCode: 403,
      error: 'Forbidden',
      message: 'Only Workspace Admin can delete workspace labels',
      errorCode: 'INSUFFICIENT_ROLE',
      timestamp: new Date().toISOString(),
    });
  }

  if (label.scope === 'project' && opts.projectId && label.projectId !== opts.projectId) {
    throw new NotFoundException('Label not found');
  }
}
