import { Repository } from 'typeorm';
import { Label } from '../entities/label.entity';

export function mapRawToLabel(r: any): Label & { taskCount: number } {
  return {
    id: r.id,
    scope: r.scope,
    workspaceId: r.workspace_id ?? r.workspaceId ?? null,
    projectId: r.project_id ?? r.projectId ?? null,
    name: r.name,
    colorLight: r.color_light ?? r.colorLight,
    colorDark: r.color_dark ?? r.colorDark,
    isExclusive: r.is_exclusive ?? r.isExclusive ?? true,
    description: r.description ?? null,
    icon: r.icon ?? null,
    createdAt: r.created_at ?? r.createdAt,
    updatedAt: r.updated_at ?? r.updatedAt,
    taskCount: parseInt(r.taskCount as unknown as string, 10) || 0,
  } as any;
}

export async function queryAllForProject(
  labelRepo: Repository<Label>,
  projectId: string,
  workspaceId: string,
): Promise<Array<Label & { taskCount: number }>> {
  const rows = await labelRepo
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
    .orderBy('l.scope', 'ASC')
    .addOrderBy('l.name', 'ASC')
    .getRawMany<Label & { taskCount: string }>();

  return rows.map((r) => mapRawToLabel(r));
}

export async function queryAllForWorkspace(
  labelRepo: Repository<Label>,
  workspaceId: string,
): Promise<Array<Label & { taskCount: number }>> {
  const rows = await labelRepo
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

  return rows.map((r) => mapRawToLabel(r));
}

export async function queryAll(
  labelRepo: Repository<Label>,
  projectId: string,
): Promise<Array<Label & { taskCount: number }>> {
  const rows = await labelRepo
    .createQueryBuilder('l')
    .leftJoin('task_labels', 'tl', 'tl.label_id = l.id')
    .select('l.*')
    .addSelect('COUNT(tl.task_id)', 'taskCount')
    .where('l.project_id = :projectId', { projectId })
    .groupBy('l.id')
    .orderBy('l.name', 'ASC')
    .getRawMany<Label & { taskCount: string }>();

  return rows.map((r) => mapRawToLabel(r));
}
