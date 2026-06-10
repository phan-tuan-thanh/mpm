import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Task, TaskType, TaskPriority } from './entities/task.entity';
import { Project } from '../project/entities/project.entity';
import { ProjectState } from '../project/entities/project-state.entity';
import { ActivityService } from './activity/activity.service';
import { AuditService } from '../audit/audit.service';
import { AuthEvent } from '../auth/constants/auth-events';
import { validateHierarchy, validateDates, validateAssignees, validateLabels } from './task-validation';
import { TaskQueryService } from './task-query.service';
import { extractPlainText } from '../common/tiptap-extractor';

@Injectable()
export class TaskCreateService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly activityService: ActivityService,
    private readonly auditService: AuditService,
    private readonly queryService: TaskQueryService,
  ) {}

  async create(
    projectId: string,
    reporterId: string,
    dto: {
      title: string;
      type?: TaskType;
      priority?: TaskPriority;
      description?: Record<string, any>;
      stateId?: string;
      assigneeIds?: string[];
      labelIds?: string[];
      moduleIds?: string[];
      estimateValue?: number;
      startDate?: string;
      dueDate?: string;
      parentId?: string;
      isDraft?: boolean;
    },
  ): Promise<Task> {
    const title = dto.title?.trim() ? dto.title.trim() : (dto.isDraft ? 'Task nháp' : '');
    if (!title && !dto.isDraft) {
      throw new UnprocessableEntityException('Title is required');
    }

    const result = await this.dataSource.transaction(async (em) => {
      const project = await em.findOne(Project, {
        where: { id: projectId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!project) throw new NotFoundException('Project not found');

      if (dto.parentId) {
        const parent = await em.findOne(Task, { where: { id: dto.parentId, projectId } });
        if (!parent) throw new UnprocessableEntityException('Parent task not found in this project');
        validateHierarchy(dto.type ?? 'task', parent.type);
      }

      validateDates(dto.startDate, dto.dueDate);
      await validateAssignees(em, projectId, dto.assigneeIds);

      let stateId = dto.stateId;
      if (!stateId) {
        const defState = await em.findOne(ProjectState, { where: { projectId, isDefault: true } });
        if (!defState) throw new UnprocessableEntityException('No default state configured');
        stateId = defState.id;
      } else {
        const state = await em.findOne(ProjectState, { where: { id: stateId, projectId } });
        if (!state) throw new UnprocessableEntityException('State does not belong to this project');
      }

      const maxOrder = await em
        .createQueryBuilder(Task, 't')
        .select('MAX(t.backlogOrder)', 'max')
        .where('t.projectId = :projectId', { projectId })
        .getRawOne<{ max: string | null }>();
      const backlogOrder = maxOrder?.max != null ? parseFloat(maxOrder.max) + 1000 : 1000;

      project.taskCounter += 1;
      await em.save(Project, project);

      const task = em.create(Task, {
        projectId,
        reporterId,
        taskId: `${project.key}-${project.taskCounter}`,
        type: dto.type ?? 'task',
        title,
        description: dto.description ?? null,
        descriptionPlain: extractPlainText(dto.description ?? null),
        priority: dto.priority ?? 'none',
        stateId,
        estimateValue: dto.estimateValue ?? null,
        startDate: dto.startDate ?? null,
        dueDate: dto.dueDate ?? null,
        parentId: dto.parentId ?? null,
        backlogOrder,
        isDraft: dto.isDraft ?? false,
      });

      const saved = await em.save(Task, task);

      if (dto.assigneeIds?.length) {
        await em.createQueryBuilder().insert().into('task_assignees')
          .values(dto.assigneeIds.map((uid) => ({ task_id: saved.id, user_id: uid }))).execute();
      }

      if (dto.labelIds?.length) {
        await validateLabels(em, projectId, dto.labelIds);
        await em.createQueryBuilder().insert().into('task_labels')
          .values(dto.labelIds.map((lid) => ({ task_id: saved.id, label_id: lid }))).execute();
      }

      if (dto.moduleIds?.length) {
        await em.createQueryBuilder().insert().into('task_modules')
          .values(dto.moduleIds.map((mid) => ({ task_id: saved.id, module_id: mid }))).execute();
      }

      return saved;
    });

    await this.activityService.log(result.id, reporterId, 'created');
    this.auditService.log(AuthEvent.TASK_CREATED, reporterId, 'internal', 'system', { projectId, taskId: result.taskId });

    return this.queryService.findById(projectId, result.id);
  }
}
