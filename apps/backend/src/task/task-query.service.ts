import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Task, TaskType, TaskPriority } from './entities/task.entity';
import { Module } from './entities/module.entity';
import { Project } from '../project/entities/project.entity';

@Injectable()
export class TaskQueryService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(
    projectId: string,
    query: {
      types?: TaskType[];
      stateIds?: string[];
      priorities?: TaskPriority[];
      assigneeIds?: string[];
      labelIds?: string[];
      search?: string;
      groupBy?: string;
      orderBy?: string;
      page?: number;
      limit?: number;
      parentId?: string | null;
    } = {},
  ): Promise<{ data: Task[]; total: number; page: number; pageSize: number }> {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 50, 200);

    // Lấy workspace_id của project để filter modules theo scope
    const project = await this.dataSource
      .getRepository(Project)
      .findOne({ where: { id: projectId }, select: ['id', 'workspaceId'] });
    const workspaceId = project?.workspaceId;

    const qb = this.taskRepo
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.state', 'state')
      .leftJoinAndSelect('t.parent', 'parent')
      .leftJoinAndSelect('t.assignees', 'assignee')
      .leftJoinAndSelect('t.labels', 'label')
      .leftJoin(
        'task_modules',
        'tm',
        'tm.task_id = t.id',
      )
      .leftJoinAndMapMany(
        't.modules',
        Module,
        'module',
        `module.id = tm.module_id AND (
          (module.scope = 'workspace' AND module.workspace_id = :workspaceId)
          OR (module.scope = 'project' AND module.project_id = :projectId)
        )`,
        { workspaceId: workspaceId ?? '00000000-0000-0000-0000-000000000000', projectId },
      )
      .loadRelationCountAndMap('t.subItemCount', 't.children')
      .loadRelationCountAndMap('t.attachmentCount', 't.attachments')
      .loadRelationCountAndMap('t.linkCount', 't.links')
      .where('t.projectId = :projectId', { projectId });

    if (query.types?.length) qb.andWhere('t.type IN (:...types)', { types: query.types });
    if (query.stateIds?.length) qb.andWhere('t.stateId IN (:...stateIds)', { stateIds: query.stateIds });
    if (query.priorities?.length) qb.andWhere('t.priority IN (:...priorities)', { priorities: query.priorities });
    if (query.parentId !== undefined) {
      query.parentId === null
        ? qb.andWhere('t.parentId IS NULL')
        : qb.andWhere('t.parentId = :parentId', { parentId: query.parentId });
    }

    if (query.assigneeIds?.length) {
      qb.andWhere(
        `EXISTS (SELECT 1 FROM task_assignees ta WHERE ta.task_id = t.id AND ta.user_id IN (:...assigneeIds))`,
        { assigneeIds: query.assigneeIds },
      );
    }

    if (query.labelIds?.length) {
      qb.andWhere(
        `EXISTS (SELECT 1 FROM task_labels tl WHERE tl.task_id = t.id AND tl.label_id IN (:...labelIds))`,
        { labelIds: query.labelIds },
      );
    }

    if (query.search?.trim()) {
      qb.andWhere(
        `(to_tsvector('simple', t.title) @@ plainto_tsquery('simple', :search)
          OR t.taskId ILIKE :taskIdSearch
          OR (t.description_plain IS NOT NULL AND to_tsvector('simple', t.description_plain) @@ plainto_tsquery('simple', :search)))`,
        { search: query.search.trim(), taskIdSearch: `%${query.search.trim()}%` },
      );
    }

    const orderByMap: Record<string, string> = {
      rank: 't.backlogOrder',
      created_at: 't.createdAt',
      updated_at: 't.updatedAt',
      start_date: 't.startDate',
      due_date: 't.dueDate',
      priority: 't.priority',
    };
    const orderCol = orderByMap[query.orderBy ?? 'rank'] ?? 't.backlogOrder';
    qb.orderBy(orderCol, 'ASC');

    const [data, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();
    return { data, total, page, pageSize: limit };
  }

  async findById(projectId: string, taskIdOrUuid: string): Promise<Task> {
    const isUuid = /^[0-9a-f-]{36}$/.test(taskIdOrUuid);
    const where = isUuid
      ? { id: taskIdOrUuid, projectId }
      : { taskId: taskIdOrUuid, projectId };

    const task = await this.taskRepo.findOne({
      where,
      relations: [
        'state', 'reporter', 'assignees', 'labels', 'modules',
        'parent', 'children', 'children.state',
        'attachments', 'attachments.uploader',
        'links', 'relations', 'relations.targetTask', 'relations.targetTask.state',
      ],
    });
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  async search(projectId: string, query: string): Promise<Task[]> {
    return this.taskRepo
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.state', 'state')
      .where('t.projectId = :projectId', { projectId })
      .andWhere(
        `(to_tsvector('simple', t.title) @@ plainto_tsquery('simple', :q)
          OR t.taskId ILIKE :like
          OR (t.description_plain IS NOT NULL AND to_tsvector('simple', t.description_plain) @@ plainto_tsquery('simple', :q)))`,
        { q: query, like: `%${query}%` },
      )
      .orderBy('t.backlogOrder', 'ASC')
      .limit(20)
      .getMany();
  }
}
