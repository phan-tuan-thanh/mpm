import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Task, TaskType, TaskPriority } from './entities/task.entity';
import { Project } from '../project/entities/project.entity';
import type { SubItemTreeNode, SubItemsTreeResponse } from '@mpm/shared-types';

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
      sprintId?: string;
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
      .leftJoinAndSelect(
        't.modules',
        'module',
        `(module.scope = 'workspace' AND module.workspace_id = :workspaceId)
          OR (module.scope = 'project' AND module.project_id = :projectId)`,
        { workspaceId: workspaceId ?? '00000000-0000-0000-0000-000000000000', projectId },
      )
      .loadRelationCountAndMap('t.subItemCount', 't.children')
      .loadRelationCountAndMap('t.attachmentCount', 't.attachments')
      .loadRelationCountAndMap('t.linkCount', 't.links')
      .where('t.projectId = :projectId', { projectId })
      .andWhere('t.isDraft = :isDraft', { isDraft: false });

    if (query.types?.length) qb.andWhere('t.type IN (:...types)', { types: query.types });
    if (query.sprintId) {
      // 'none' = task chưa thuộc sprint nào
      query.sprintId === 'none'
        ? qb.andWhere('t.sprintId IS NULL')
        : qb.andWhere('t.sprintId = :sprintId', { sprintId: query.sprintId });
    }
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
      .andWhere('t.isDraft = :isDraft', { isDraft: false })
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

  /**
   * Lấy cây con (sub-items tree) của một task theo dạng phân cấp.
   * Dùng recursive CTE để lấy tất cả descendants đến depth tối đa.
   */
  async getChildrenTree(
    projectId: string,
    taskId: string,
    depth: number = 5,
  ): Promise<SubItemsTreeResponse> {
    // Kiểm tra task tồn tại trong project
    const task = await this.taskRepo.findOne({
      where: { id: taskId, projectId },
      select: ['id'],
    });
    if (!task) throw new NotFoundException('Task not found');

    // Giới hạn depth tối đa là 5
    const maxDepth = Math.min(Math.max(depth, 1), 5);

    // Recursive CTE lấy tất cả descendants với depth tracking
    const rows: Array<{
      id: string;
      task_id: string;
      title: string;
      type: TaskType;
      priority: TaskPriority;
      state_id: string;
      parent_id: string | null;
      due_date: string | null;
      backlog_order: number;
      depth: number;
      state_name: string;
      state_color: string;
      state_group: string;
    }> = await this.dataSource.query(
      `
      WITH RECURSIVE task_tree AS (
        SELECT
          t.id,
          t.task_id,
          t.title,
          t.type,
          t.priority,
          t.state_id,
          t.parent_id,
          t.due_date,
          t.backlog_order,
          1 AS depth
        FROM tasks t
        WHERE t.parent_id = $1
          AND t.project_id = $2
        UNION ALL
        SELECT
          c.id,
          c.task_id,
          c.title,
          c.type,
          c.priority,
          c.state_id,
          c.parent_id,
          c.due_date,
          c.backlog_order,
          tt.depth + 1 AS depth
        FROM tasks c
        INNER JOIN task_tree tt ON c.parent_id = tt.id
        WHERE tt.depth < $3
          AND c.project_id = $2
      )
      SELECT
        tt.id,
        tt.task_id,
        tt.title,
        tt.type,
        tt.priority,
        tt.state_id,
        tt.parent_id,
        tt.due_date,
        tt.backlog_order,
        tt.depth,
        ps.name AS state_name,
        ps.color AS state_color,
        ps."group" AS state_group
      FROM task_tree tt
      LEFT JOIN project_states ps ON ps.id = tt.state_id
      ORDER BY tt.depth ASC, tt.backlog_order ASC
      `,
      [taskId, projectId, maxDepth],
    );

    // Lấy assignees cho tất cả tasks trong tree
    const taskIds = rows.map((r) => r.id);
    let assigneeMap: Map<string, Array<{ userId: string; displayName: string; email: string; avatarUrl: string | null; assignedAt: Date }>> = new Map();

    if (taskIds.length > 0) {
      const assigneeRows: Array<{
        task_id: string;
        user_id: string;
        display_name: string;
        email: string;
        avatar_url: string | null;
        assigned_at: Date;
      }> = await this.dataSource.query(
        `
        SELECT
          ta.task_id,
          u.id AS user_id,
          u.display_name,
          u.email,
          u.avatar_url,
          ta.assigned_at
        FROM task_assignees ta
        INNER JOIN users u ON u.id = ta.user_id
        WHERE ta.task_id = ANY($1)
        `,
        [taskIds],
      );

      for (const row of assigneeRows) {
        const list = assigneeMap.get(row.task_id) ?? [];
        list.push({
          userId: row.user_id,
          displayName: row.display_name,
          email: row.email,
          avatarUrl: row.avatar_url,
          assignedAt: row.assigned_at,
        });
        assigneeMap.set(row.task_id, list);
      }
    }

    // Build flat node map
    const nodeMap = new Map<string, SubItemTreeNode>();
    for (const row of rows) {
      nodeMap.set(row.id, {
        id: row.id,
        taskId: row.task_id,
        title: row.title,
        type: row.type as TaskType,
        priority: row.priority as TaskPriority,
        stateId: row.state_id,
        state: row.state_name
          ? { id: row.state_id, name: row.state_name, color: row.state_color, group: row.state_group }
          : undefined,
        assignees: (assigneeMap.get(row.id) ?? []).map((a) => ({
          userId: a.userId,
          displayName: a.displayName,
          email: a.email,
          avatarUrl: a.avatarUrl,
          assignedAt: a.assignedAt,
        })),
        dueDate: row.due_date,
        children: [],
        childrenCount: 0,
        doneCount: 0,
        expanded: true,
      });
    }

    // Build tree structure — connect children to parents
    const directChildren: SubItemTreeNode[] = [];
    for (const row of rows) {
      const node = nodeMap.get(row.id)!;
      if (row.parent_id === taskId) {
        // Direct child of the requested task
        directChildren.push(node);
      } else {
        // Nested descendant — attach to parent node
        const parentNode = nodeMap.get(row.parent_id!);
        if (parentNode) {
          parentNode.children.push(node);
        }
      }
    }

    // Calculate childrenCount and doneCount for each node (bottom-up)
    // Process in reverse depth order so leaves are calculated first
    const sortedByDepthDesc = [...rows].sort((a, b) => b.depth - a.depth);
    for (const row of sortedByDepthDesc) {
      const node = nodeMap.get(row.id)!;
      node.childrenCount = node.children.length;
      node.doneCount = node.children.filter(
        (child) => child.state?.group === 'completed',
      ).length;
    }

    // Calculate top-level totalCount and doneCount (direct children only)
    const totalCount = directChildren.length;
    const doneCount = directChildren.filter(
      (child) => child.state?.group === 'completed',
    ).length;

    return {
      items: directChildren,
      totalCount,
      doneCount,
    };
  }
}
