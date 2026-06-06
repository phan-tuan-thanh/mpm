import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Label } from '../entities/label.entity';
import { AuditService } from '../../audit/audit.service';
import { AuthEvent } from '../../auth/constants/auth-events';

@Injectable()
export class LabelService {
  constructor(
    @InjectRepository(Label)
    private readonly labelRepo: Repository<Label>,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Trả về merged list: workspace labels + project labels
   * Sorted: scope ASC (workspace trước), sau đó name ASC
   * Includes taskCount từ task_labels join
   */
  async findAllForProject(
    projectId: string,
    workspaceId: string,
  ): Promise<Array<Label & { taskCount: number }>> {
    const rows = await this.labelRepo
      .createQueryBuilder('l')
      .leftJoin('task_labels', 'tl', 'tl.label_id = l.id')
      .select('l.*')
      .addSelect('COUNT(tl.task_id)', 'taskCount')
      .where(
        '(l.scope = :ws AND l.workspace_id = :wid) OR (l.scope = :proj AND l.project_id = :pid)',
        {
          ws: 'workspace',
          wid: workspaceId,
          proj: 'project',
          pid: projectId,
        },
      )
      .groupBy('l.id')
      .orderBy('l.scope', 'ASC') // workspace trước project
      .addOrderBy('l.name', 'ASC')
      .getRawMany<Label & { taskCount: string }>();

    return rows.map((r) => this.mapRawToLabel(r));
  }

  private mapRawToLabel(r: any): Label & { taskCount: number } {
    return {
      id: r.id,
      scope: r.scope,
      workspaceId: r.workspace_id ?? r.workspaceId ?? null,
      projectId: r.project_id ?? r.projectId ?? null,
      name: r.name,
      color: r.color,
      isExclusive: r.is_exclusive ?? r.isExclusive ?? true,
      createdAt: r.created_at ?? r.createdAt,
      updatedAt: r.updated_at ?? r.updatedAt,
      taskCount: parseInt(r.taskCount as unknown as string, 10) || 0,
    } as any;
  }

  /**
   * Tạo label với scope parameter
   * - scope='workspace': tạo workspace-level label (workspace_id required, project_id = null)
   * - scope='project': tạo project-level label (project_id required)
   */
  async create(
    dto: { name: string; color: string; isExclusive?: boolean },
    opts: {
      scope: 'workspace' | 'project';
      workspaceId: string | null;
      projectId?: string | null;
      userId: string;
    },
  ): Promise<Label> {
    if (!/^#[0-9A-Fa-f]{6}$/.test(dto.color)) {
      throw new ConflictException('Color must be a valid hex code (e.g. #FF0000)');
    }

    // Validate uniqueness theo scope
    if (opts.scope === 'workspace') {
      if (!opts.workspaceId) {
        throw new ConflictException('Workspace ID is required for workspace labels');
      }
      const existing = await this.labelRepo.findOne({
        where: { scope: 'workspace', workspaceId: opts.workspaceId, name: dto.name },
      });
      if (existing) {
        throw new ConflictException('A label with this name already exists in the workspace');
      }
    } else {
      const existing = await this.labelRepo.findOne({
        where: { scope: 'project', projectId: opts.projectId!, name: dto.name },
      });
      if (existing) {
        throw new ConflictException('A label with this name already exists in the project');
      }
    }

    let isExclusive = dto.isExclusive ?? true;
    if (dto.name.includes('::')) {
      const scopeName = dto.name.split('::')[0].trim().toLowerCase();
      const scopePattern = `${scopeName}::%`;
      const existing = await this.labelRepo.createQueryBuilder('l')
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
        isExclusive = existing.isExclusive;
      }
    }

    const label = this.labelRepo.create({
      scope: opts.scope,
      workspaceId: opts.scope === 'workspace' ? opts.workspaceId : (opts.workspaceId ?? null),
      projectId: opts.scope === 'project' ? opts.projectId : null,
      name: dto.name,
      color: dto.color,
      isExclusive,
    });

    const saved = await this.labelRepo.save(label);

    this.auditService.log(AuthEvent.LABEL_CREATED, opts.userId, 'internal', 'system', {
      scope: opts.scope,
      workspaceId: opts.workspaceId,
      projectId: opts.projectId ?? null,
      name: dto.name,
    });

    return saved;
  }

  /**
   * Cập nhật label — validate scope:
   * - Workspace label: chỉ Workspace Admin (systemRole='Admin') mới được sửa
   * - Project label: SM/PO được sửa
   */
  async update(
    labelId: string,
    dto: { name?: string; color?: string; isExclusive?: boolean },
    opts: {
      workspaceId?: string;
      projectId?: string;
      userSystemRole: string;
    },
  ): Promise<Label> {
    const label = await this.labelRepo.findOne({ where: { id: labelId } });
    if (!label) throw new NotFoundException('Label not found');

    // Scope validation: workspace label chỉ Admin mới sửa
    if (label.scope === 'workspace' && opts.userSystemRole !== 'Admin') {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Only Workspace Admin can edit workspace labels',
        errorCode: 'INSUFFICIENT_ROLE',
        timestamp: new Date().toISOString(),
      });
    }

    // Project label: verify label thuộc đúng project
    if (label.scope === 'project' && opts.projectId && label.projectId !== opts.projectId) {
      throw new NotFoundException('Label not found');
    }

    if (dto.color && !/^#[0-9A-Fa-f]{6}$/.test(dto.color)) {
      throw new ConflictException('Color must be a valid hex code');
    }

    // Validate name uniqueness trong cùng scope
    if (dto.name && dto.name !== label.name) {
      if (label.scope === 'workspace') {
        const existing = await this.labelRepo.findOne({
          where: { scope: 'workspace', workspaceId: label.workspaceId!, name: dto.name },
        });
        if (existing) throw new ConflictException('A label with this name already exists in the workspace');
      } else {
        const existing = await this.labelRepo.findOne({
          where: { scope: 'project', projectId: label.projectId!, name: dto.name },
        });
        if (existing) throw new ConflictException('A label with this name already exists');
      }
    }

    if (dto.name !== undefined) label.name = dto.name;
    if (dto.color !== undefined) label.color = dto.color;
    if (dto.isExclusive !== undefined) {
      label.isExclusive = dto.isExclusive;
      if (label.name.includes('::')) {
        const scopeName = label.name.split('::')[0].trim().toLowerCase();
        const scopePattern = `${scopeName}::%`;
        if (label.scope === 'project') {
          await this.labelRepo.createQueryBuilder()
            .update(Label)
            .set({ isExclusive: dto.isExclusive })
            .where('project_id = :projectId AND scope = :scope AND name ILIKE :pattern', {
              projectId: label.projectId,
              scope: 'project',
              pattern: scopePattern
            })
            .execute();
        } else {
          await this.labelRepo.createQueryBuilder()
            .update(Label)
            .set({ isExclusive: dto.isExclusive })
            .where('workspace_id = :workspaceId AND scope = :scope AND name ILIKE :pattern', {
              workspaceId: label.workspaceId,
              scope: 'workspace',
              pattern: scopePattern
            })
            .execute();
        }
      }
    }

    return this.labelRepo.save(label);
  }

  /**
   * Xóa label — tính affectedTaskCount trước khi xóa
   * - Workspace label: cascade xóa task_labels cross-project, chỉ Admin mới xóa
   * - Project label: xóa task_labels trong project đó
   * Trả về { deletedLabelId, affectedTaskCount }
   */
  async delete(
    labelId: string,
    opts: {
      workspaceId?: string;
      projectId?: string;
      userId: string;
      userSystemRole: string;
    },
  ): Promise<{ deletedLabelId: string; affectedTaskCount: number }> {
    const label = await this.labelRepo.findOne({ where: { id: labelId } });
    if (!label) throw new NotFoundException('Label not found');

    // Scope validation: workspace label chỉ Admin mới xóa
    if (label.scope === 'workspace' && opts.userSystemRole !== 'Admin') {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Only Workspace Admin can delete workspace labels',
        errorCode: 'INSUFFICIENT_ROLE',
        timestamp: new Date().toISOString(),
      });
    }

    // Project label: verify label thuộc đúng project
    if (label.scope === 'project' && opts.projectId && label.projectId !== opts.projectId) {
      throw new NotFoundException('Label not found');
    }

    // Tính affectedTaskCount trước khi xóa
    const affectedResult = await this.labelRepo
      .createQueryBuilder()
      .select('COUNT(*)', 'count')
      .from('task_labels', 'tl')
      .where('tl.label_id = :labelId', { labelId })
      .getRawOne<{ count: string }>();

    const affectedTaskCount = parseInt(affectedResult?.count ?? '0', 10);

    // Xóa label — task_labels sẽ cascade delete (FK ON DELETE CASCADE)
    await this.labelRepo.delete(labelId);

    this.auditService.log(AuthEvent.LABEL_DELETED, opts.userId, 'internal', 'system', {
      scope: label.scope,
      workspaceId: label.workspaceId,
      projectId: label.projectId,
      name: label.name,
      affectedTaskCount,
    });

    return { deletedLabelId: labelId, affectedTaskCount };
  }

  /**
   * Trả về chỉ workspace-scoped labels (cho workspace admin management)
   * Sorted theo name ASC, includes taskCount
   */
  async findAllForWorkspace(workspaceId: string): Promise<Array<Label & { taskCount: number }>> {
    const rows = await this.labelRepo
      .createQueryBuilder('l')
      .leftJoin('task_labels', 'tl', 'tl.label_id = l.id')
      .select('l.*')
      .addSelect('COUNT(tl.task_id)', 'taskCount')
      .where('l.scope = :scope AND l.workspace_id = :wid', {
        scope: 'workspace',
        wid: workspaceId,
      })
      .groupBy('l.id')
      .orderBy('l.name', 'ASC')
      .getRawMany<Label & { taskCount: string }>();

    return rows.map((r) => this.mapRawToLabel(r));
  }

  /**
   * Backward-compatible findAll — delegates to findAllForProject
   * Dùng cho trường hợp chỉ có projectId (legacy)
   */
  async findAll(projectId: string): Promise<Array<Label & { taskCount: number }>> {
    const rows = await this.labelRepo
      .createQueryBuilder('l')
      .leftJoin('task_labels', 'tl', 'tl.label_id = l.id')
      .select('l.*')
      .addSelect('COUNT(tl.task_id)', 'taskCount')
      .where('l.project_id = :projectId', { projectId })
      .groupBy('l.id')
      .orderBy('l.name', 'ASC')
      .getRawMany<Label & { taskCount: string }>();

    return rows.map((r) => this.mapRawToLabel(r));
  }
}
