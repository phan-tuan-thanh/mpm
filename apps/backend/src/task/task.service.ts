import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { Task, TaskType, TaskPriority } from './entities/task.entity';
import { Label } from './entities/label.entity';
import { Module } from './entities/module.entity';
import { Project } from '../project/entities/project.entity';
import { ProjectState } from '../project/entities/project-state.entity';
import { ProjectMember } from '../auth/entities/project-member.entity';
import { User } from '../auth/entities/user.entity';
import { ActivityService } from './activity/activity.service';
import { AuditService } from '../audit/audit.service';
import { AuthEvent } from '../auth/constants/auth-events';

const VALID_PARENTS: Record<TaskType, TaskType[]> = {
  epic: [],
  story: ['epic'],
  task: ['epic', 'story'],
  subtask: ['task'],
};

function validateHierarchy(childType: TaskType, parentType: TaskType): void {
  const allowed = VALID_PARENTS[childType];
  if (!allowed.includes(parentType)) {
    throw new UnprocessableEntityException(
      `A ${childType} cannot be a child of a ${parentType}`,
    );
  }
}

@Injectable()
export class TaskService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
    @InjectRepository(Label)
    private readonly labelRepo: Repository<Label>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(ProjectMember)
    private readonly memberRepo: Repository<ProjectMember>,
    private readonly dataSource: DataSource,
    private readonly activityService: ActivityService,
    private readonly auditService: AuditService,
  ) {}

  async create(
    projectId: string,
    reporterId: string,
    dto: {
      title: string;
      type?: TaskType;
      priority?: TaskPriority;
      description?: string;
      stateId?: string;
      assigneeIds?: string[];
      labelIds?: string[];
      estimateValue?: number;
      startDate?: string;
      dueDate?: string;
      parentId?: string;
    },
  ): Promise<Task> {
    const result = await this.dataSource.transaction(async (em) => {
      // Atomic task counter
      const project = await em.findOne(Project, {
        where: { id: projectId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!project) throw new NotFoundException('Project not found');

      // Validate parent & hierarchy
      let parent: Task | null = null;
      if (dto.parentId) {
        parent = await em.findOne(Task, { where: { id: dto.parentId, projectId } });
        if (!parent) throw new UnprocessableEntityException('Parent task not found in this project');
        validateHierarchy(dto.type ?? 'task', parent.type);
      }

      // Validate date range
      if (dto.startDate && dto.dueDate && dto.startDate > dto.dueDate) {
        throw new UnprocessableEntityException('start_date must be before or equal to due_date');
      }

      // Validate assignees are project members
      if (dto.assigneeIds?.length) {
        const memberCount = await em.count(ProjectMember, {
          where: { projectId, userId: In(dto.assigneeIds) },
        });
        if (memberCount !== dto.assigneeIds.length) {
          throw new UnprocessableEntityException('One or more assignees are not project members');
        }
      }

      // Resolve state
      let stateId = dto.stateId;
      if (!stateId) {
        const defState = await em.findOne(ProjectState, { where: { projectId, isDefault: true } });
        if (!defState) throw new UnprocessableEntityException('No default state configured');
        stateId = defState.id;
      } else {
        const state = await em.findOne(ProjectState, { where: { id: stateId, projectId } });
        if (!state) throw new UnprocessableEntityException('State does not belong to this project');
      }

      // Resolve backlog order (max + 1000 for float gap)
      const maxOrder = await em
        .createQueryBuilder(Task, 't')
        .select('MAX(t.backlogOrder)', 'max')
        .where('t.projectId = :projectId', { projectId })
        .getRawOne<{ max: string | null }>();
      const backlogOrder = maxOrder?.max != null ? parseFloat(maxOrder.max) + 1000 : 1000;

      // Increment counter
      project.taskCounter += 1;
      await em.save(Project, project);

      const task = em.create(Task, {
        projectId,
        reporterId,
        taskId: `${project.key}-${project.taskCounter}`,
        type: dto.type ?? 'task',
        title: dto.title,
        description: dto.description ?? null,
        priority: dto.priority ?? 'none',
        stateId,
        estimateValue: dto.estimateValue ?? null,
        startDate: dto.startDate ?? null,
        dueDate: dto.dueDate ?? null,
        parentId: dto.parentId ?? null,
        backlogOrder,
      });

      const saved = await em.save(Task, task);

      // Insert assignees
      if (dto.assigneeIds?.length) {
        await em
          .createQueryBuilder()
          .insert()
          .into('task_assignees')
          .values(dto.assigneeIds.map((uid) => ({ task_id: saved.id, user_id: uid })))
          .execute();
      }

      // Insert labels
      if (dto.labelIds?.length) {
        const labels = await em.find(Label, { where: { id: In(dto.labelIds), projectId } });
        if (labels.length !== dto.labelIds.length) {
          throw new UnprocessableEntityException('One or more labels not found in this project');
        }
        await em
          .createQueryBuilder()
          .insert()
          .into('task_labels')
          .values(dto.labelIds.map((lid) => ({ task_id: saved.id, label_id: lid })))
          .execute();
      }

      return saved;
    });

    // Log activity AFTER transaction commits (avoids connection pool deadlock under concurrency)
    await this.activityService.log(result.id, reporterId, 'created');
    this.auditService.log(AuthEvent.TASK_CREATED, reporterId, 'internal', 'system', { projectId, taskId: result.taskId });

    return result;
  }

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
        `(to_tsvector('simple', t.title) @@ plainto_tsquery('simple', :search) OR t.taskId ILIKE :taskIdSearch)`,
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
        'state', 'reporter', 'assignees', 'labels',
        'parent', 'children', 'children.state',
        'attachments', 'attachments.uploader',
        'links', 'relations', 'relations.targetTask', 'relations.targetTask.state',
      ],
    });
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  async update(
    projectId: string,
    taskId: string,
    userId: string,
    dto: {
      title?: string;
      type?: TaskType;
      priority?: TaskPriority;
      description?: string | null;
      stateId?: string;
      assigneeIds?: string[];
      labelIds?: string[];
      estimateValue?: number | null;
      startDate?: string | null;
      dueDate?: string | null;
      parentId?: string | null;
    },
  ): Promise<Task> {
    let capturedChanges: Array<{ field: string; oldValue: string; newValue: string }> = [];

    const result = await this.dataSource.transaction(async (em) => {
      const task = await em.findOne(Task, { where: { id: taskId, projectId } });
      if (!task) throw new NotFoundException('Task not found');

      // Validate date range
      const newStart = dto.startDate !== undefined ? dto.startDate : task.startDate;
      const newDue = dto.dueDate !== undefined ? dto.dueDate : task.dueDate;
      if (newStart && newDue && newStart > newDue) {
        throw new UnprocessableEntityException('start_date must be before or equal to due_date');
      }

      // Validate parent change
      if (dto.parentId !== undefined && dto.parentId !== null) {
        const parent = await em.findOne(Task, { where: { id: dto.parentId, projectId } });
        if (!parent) throw new UnprocessableEntityException('Parent task not found');
        validateHierarchy(dto.type ?? task.type, parent.type);
      }

      // Validate stateId
      if (dto.stateId !== undefined) {
        const state = await em.findOne(ProjectState, { where: { id: dto.stateId, projectId } });
        if (!state) throw new UnprocessableEntityException('State does not belong to this project');
      }

      // Validate assignees
      if (dto.assigneeIds !== undefined) {
        if (dto.assigneeIds.length > 0) {
          const memberCount = await em.count(ProjectMember, {
            where: { projectId, userId: In(dto.assigneeIds) },
          });
          if (memberCount !== dto.assigneeIds.length) {
            throw new UnprocessableEntityException('One or more assignees are not project members');
          }
        }
      }

      // Track changes for activity log
      const changes: Array<{ field: string; oldValue: string; newValue: string }> = [];

      if (dto.title !== undefined && dto.title !== task.title) {
        changes.push({ field: 'title', oldValue: task.title, newValue: dto.title });
        task.title = dto.title;
      }
      if (dto.description !== undefined && dto.description !== task.description) {
        changes.push({ field: 'description', oldValue: task.description ?? '', newValue: dto.description ?? '' });
        task.description = dto.description ?? null;
      }
      if (dto.type !== undefined && dto.type !== task.type) {
        changes.push({ field: 'type', oldValue: task.type, newValue: dto.type });
        task.type = dto.type;
      }
      if (dto.priority !== undefined && dto.priority !== task.priority) {
        changes.push({ field: 'priority', oldValue: task.priority, newValue: dto.priority });
        task.priority = dto.priority;
      }
      if (dto.stateId !== undefined && dto.stateId !== task.stateId) {
        changes.push({ field: 'state', oldValue: task.stateId, newValue: dto.stateId });
        task.stateId = dto.stateId;
        // Set/clear completedAt based on state group
        const state = await em.findOne(ProjectState, { where: { id: dto.stateId } });
        if (state?.group === 'completed' && !task.completedAt) {
          task.completedAt = new Date();
        } else if (state?.group !== 'completed') {
          task.completedAt = null;
        }
      }
      if (dto.estimateValue !== undefined && dto.estimateValue !== task.estimateValue) {
        changes.push({ field: 'estimate', oldValue: String(task.estimateValue ?? ''), newValue: String(dto.estimateValue ?? '') });
        task.estimateValue = dto.estimateValue ?? null;
      }
      if (dto.startDate !== undefined && dto.startDate !== task.startDate) {
        changes.push({ field: 'start_date', oldValue: task.startDate ?? '', newValue: dto.startDate ?? '' });
        task.startDate = dto.startDate ?? null;
      }
      if (dto.dueDate !== undefined && dto.dueDate !== task.dueDate) {
        changes.push({ field: 'due_date', oldValue: task.dueDate ?? '', newValue: dto.dueDate ?? '' });
        task.dueDate = dto.dueDate ?? null;
      }
      if (dto.parentId !== undefined && dto.parentId !== task.parentId) {
        changes.push({ field: 'parent', oldValue: task.parentId ?? '', newValue: dto.parentId ?? '' });
        task.parentId = dto.parentId ?? null;
      }

      const saved = await em.save(Task, task);

      // Update assignees
      if (dto.assigneeIds !== undefined) {
        await em.createQueryBuilder().delete().from('task_assignees').where('task_id = :id', { id: taskId }).execute();
        if (dto.assigneeIds.length > 0) {
          await em
            .createQueryBuilder()
            .insert()
            .into('task_assignees')
            .values(dto.assigneeIds.map((uid) => ({ task_id: taskId, user_id: uid })))
            .execute();
        }
      }

      // Update labels
      if (dto.labelIds !== undefined) {
        await em.createQueryBuilder().delete().from('task_labels').where('task_id = :id', { id: taskId }).execute();
        if (dto.labelIds.length > 0) {
          await em
            .createQueryBuilder()
            .insert()
            .into('task_labels')
            .values(dto.labelIds.map((lid) => ({ task_id: taskId, label_id: lid })))
            .execute();
        }
      }

      capturedChanges = changes;
      return saved;
    });

    // Log activity AFTER transaction commits
    const entryTypeMap: Record<string, string> = {
      title: 'title_changed', description: 'description_changed',
      type: 'type_changed', priority: 'priority_changed',
      state: 'state_changed', estimate: 'estimate_changed',
      start_date: 'start_date_changed', due_date: 'due_date_changed',
      parent: 'parent_changed',
    };
    for (const change of capturedChanges) {
      const entryType = (entryTypeMap[change.field] ?? 'title_changed') as any;
      await this.activityService.log(taskId, userId, entryType, {
        field: change.field,
        oldValue: change.oldValue,
        newValue: change.newValue,
      });
    }
    this.auditService.log(AuthEvent.TASK_UPDATED, userId, 'internal', 'system', { projectId, fields: capturedChanges.map((c) => c.field) });

    return result;
  }

  async delete(projectId: string, taskId: string, userId: string): Promise<void> {
    const task = await this.taskRepo.findOne({ where: { id: taskId, projectId } });
    if (!task) throw new NotFoundException('Task not found');

    await this.taskRepo.delete(taskId);

    this.auditService.log(AuthEvent.TASK_DELETED, userId, 'internal', 'system', { projectId, taskDisplayId: task.taskId });
  }

  async bulkDelete(
    projectId: string,
    taskIds: string[],
    userId: string,
  ): Promise<{ succeeded: string[]; failed: string[] }> {
    const succeeded: string[] = [];
    const failed: string[] = [];

    await this.dataSource.transaction(async (em) => {
      for (const id of taskIds) {
        const task = await em.findOne(Task, { where: { id, projectId } });
        if (!task) { failed.push(id); continue; }
        await em.delete(Task, id);
        succeeded.push(id);
      }
    });

    if (succeeded.length > 0) {
      this.auditService.log(AuthEvent.TASK_DELETED, userId, 'internal', 'system', { projectId, deletedCount: succeeded.length });
    }

    return { succeeded, failed };
  }

  async reorder(
    projectId: string,
    items: Array<{ taskId: string; backlogOrder: number }>,
    userId: string,
  ): Promise<void> {
    await this.dataSource.transaction(async (em) => {
      for (const item of items) {
        await em.update(Task, { id: item.taskId, projectId }, { backlogOrder: item.backlogOrder });
      }

      // Detect gaps < 0.001 and rebalance async
      const minGap = items.reduce((min, cur, i) => {
        if (i === 0) return min;
        const gap = Math.abs(cur.backlogOrder - items[i - 1].backlogOrder);
        return gap < min ? gap : min;
      }, Infinity);

      if (minGap < 0.001) {
        setImmediate(() => this.rebalanceOrder(projectId));
      }
    });

    this.auditService.log(AuthEvent.TASK_REORDERED, userId, 'internal', 'system', { projectId, count: items.length });
  }

  private async rebalanceOrder(projectId: string): Promise<void> {
    const tasks = await this.taskRepo.find({
      where: { projectId },
      order: { backlogOrder: 'ASC' },
      select: ['id'],
    });
    await this.dataSource.transaction(async (em) => {
      for (let i = 0; i < tasks.length; i++) {
        await em.update(Task, { id: tasks[i].id }, { backlogOrder: (i + 1) * 1000 });
      }
    });
  }

  async search(projectId: string, query: string): Promise<Task[]> {
    return this.taskRepo
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.state', 'state')
      .where('t.projectId = :projectId', { projectId })
      .andWhere(
        `(to_tsvector('simple', t.title) @@ plainto_tsquery('simple', :q) OR t.taskId ILIKE :like)`,
        { q: query, like: `%${query}%` },
      )
      .orderBy('t.backlogOrder', 'ASC')
      .limit(20)
      .getMany();
  }
}
