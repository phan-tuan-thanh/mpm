import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Module as ModuleEntity, ModuleScope } from '../entities/module.entity';
import type { ModuleQueryDto, ModuleWithProgress } from './module.dto';

/**
 * Module Query Service — read-only queries cho modules
 *
 * Chịu trách nhiệm:
 * - findAllForProject: merged list workspace + project modules với progress computed
 * - findAllForWorkspace: workspace-scoped modules cho admin management
 */
@Injectable()
export class ModuleQueryService {
  constructor(
    @InjectRepository(ModuleEntity)
    private readonly moduleRepo: Repository<ModuleEntity>,
  ) {}

  /**
   * Trả về merged list: workspace modules + project modules
   * Progress computed tại query time bằng JOIN project_states.group = 'completed'
   * Sorted: scope ASC (workspace trước), sau đó end_date ASC
   */
  async findAllForProject(
    projectId: string,
    workspaceId: string,
    query?: ModuleQueryDto,
  ): Promise<ModuleWithProgress[]> {
    const qb = this.moduleRepo
      .createQueryBuilder('m')
      .leftJoin('task_modules', 'tm', 'tm.module_id = m.id')
      .leftJoin(
        'tasks',
        't',
        't.id = tm.task_id AND t.project_id = :pid',
        { pid: projectId },
      )
      .leftJoin(
        'project_states',
        'ps',
        'ps.id = t.state_id',
      )
      .select('m.*')
      .addSelect('COUNT(t.id)', 'taskCount')
      .addSelect(
        `COUNT(t.id) FILTER (WHERE ps."group" = 'completed')`,
        'completedCount',
      );

    // Scope filter
    if (query?.scope === 'workspace') {
      qb.where('m.scope = :ws AND m.workspace_id = :wid', {
        ws: 'workspace',
        wid: workspaceId,
      });
    } else if (query?.scope === 'project') {
      qb.where('m.scope = :proj AND m.project_id = :pid2', {
        proj: 'project',
        pid2: projectId,
      });
    } else {
      // Default: merged list (workspace + project)
      qb.where(
        '(m.scope = :ws AND m.workspace_id = :wid) OR (m.scope = :proj AND m.project_id = :pid2)',
        {
          ws: 'workspace',
          wid: workspaceId,
          proj: 'project',
          pid2: projectId,
        },
      );
    }

    // Optional status filter
    if (query?.status) {
      qb.andWhere('m.status = :status', { status: query.status });
    }

    qb.groupBy('m.id')
      .orderBy('m.scope', 'ASC')
      .addOrderBy('m.end_date', 'ASC');

    const rows = await qb.getRawMany();

    return rows.map((r) => ({
      id: r.id,
      scope: r.scope,
      workspaceId: r.workspace_id,
      projectId: r.project_id,
      name: r.name,
      description: r.description,
      status: r.status,
      startDate: r.start_date,
      endDate: r.end_date,
      createdBy: r.created_by,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      taskCount: parseInt(r.taskCount ?? '0', 10),
      completedCount: parseInt(r.completedCount ?? '0', 10),
      progress:
        parseInt(r.taskCount ?? '0', 10) > 0
          ? Math.round(
              (parseInt(r.completedCount ?? '0', 10) /
                parseInt(r.taskCount ?? '0', 10)) *
                100,
            )
          : 0,
    }));
  }

  /**
   * Trả về chỉ workspace-scoped modules (cho workspace admin management)
   * Sorted theo name ASC
   */
  async findAllForWorkspace(workspaceId: string): Promise<ModuleEntity[]> {
    return this.moduleRepo.find({
      where: { scope: 'workspace' as ModuleScope, workspaceId },
      order: { name: 'ASC' },
    });
  }
}
