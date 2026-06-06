import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Task, TaskType, TaskPriority } from './entities/task.entity';
import { ProjectState } from '../project/entities/project-state.entity';
import { ActivityService } from './activity/activity.service';
import { AuditService } from '../audit/audit.service';
import { AuthEvent } from '../auth/constants/auth-events';
import { validateHierarchy, validateDates, validateAssignees, validateLabels } from './task-validation';
import { TaskQueryService } from './task-query.service';
import { extractPlainText } from '../common/tiptap-extractor';

@Injectable()
export class TaskUpdateService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly activityService: ActivityService,
    private readonly auditService: AuditService,
    private readonly queryService: TaskQueryService,
  ) {}

  async update(
    projectId: string,
    taskId: string,
    userId: string,
    dto: {
      title?: string;
      type?: TaskType;
      priority?: TaskPriority;
      description?: Record<string, any> | null;
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

      validateDates(dto.startDate !== undefined ? dto.startDate : task.startDate, dto.dueDate !== undefined ? dto.dueDate : task.dueDate);

      if (dto.parentId) {
        const parent = await em.findOne(Task, { where: { id: dto.parentId, projectId } });
        if (!parent) throw new UnprocessableEntityException('Parent task not found');
        validateHierarchy(dto.type ?? task.type, parent.type);
      }

      if (dto.stateId !== undefined) {
        const state = await em.findOne(ProjectState, { where: { id: dto.stateId, projectId } });
        if (!state) throw new UnprocessableEntityException('State does not belong to this project');
      }

      await validateAssignees(em, projectId, dto.assigneeIds);
      if (dto.labelIds !== undefined) await validateLabels(em, projectId, dto.labelIds);

      const changes: Array<{ field: string; oldValue: string; newValue: string }> = [];
      const fields: Array<keyof typeof dto> = ['title', 'description', 'type', 'priority', 'estimateValue', 'startDate', 'dueDate', 'parentId'];
      const taskAny = task as any;

      for (const field of fields) {
        if (dto[field] !== undefined && dto[field] !== taskAny[field]) {
          changes.push({ field, oldValue: String(taskAny[field] ?? ''), newValue: String(dto[field] ?? '') });
          taskAny[field] = dto[field] === undefined ? null : dto[field];
        }
      }

      if (dto.description !== undefined) {
        task.descriptionPlain = extractPlainText(dto.description);
      }

      if (dto.stateId !== undefined && dto.stateId !== task.stateId) {
        changes.push({ field: 'state', oldValue: task.stateId, newValue: dto.stateId });
        task.stateId = dto.stateId;
        const state = await em.findOne(ProjectState, { where: { id: dto.stateId } });
        task.completedAt = state?.group === 'completed' ? (task.completedAt ?? new Date()) : null;
      }

      const saved = await em.save(Task, task);

      if (dto.assigneeIds !== undefined) {
        await em.createQueryBuilder().delete().from('task_assignees').where('task_id = :id', { id: taskId }).execute();
        if (dto.assigneeIds.length > 0) {
          await em.createQueryBuilder().insert().into('task_assignees')
            .values(dto.assigneeIds.map((uid) => ({ task_id: taskId, user_id: uid }))).execute();
        }
      }

      if (dto.labelIds !== undefined) {
        await em.createQueryBuilder().delete().from('task_labels').where('task_id = :id', { id: taskId }).execute();
        if (dto.labelIds.length > 0) {
          await em.createQueryBuilder().insert().into('task_labels')
            .values(dto.labelIds.map((lid) => ({ task_id: taskId, label_id: lid }))).execute();
        }
      }

      capturedChanges = changes;
      return saved;
    });

    const entryTypeMap: Record<string, string> = {
      title: 'title_changed', description: 'description_changed',
      type: 'type_changed', priority: 'priority_changed',
      state: 'state_changed', estimateValue: 'estimate_changed',
      startDate: 'start_date_changed', dueDate: 'due_date_changed',
      parentId: 'parent_changed',
    };

    for (const change of capturedChanges) {
      await this.activityService.log(taskId, userId, (entryTypeMap[change.field] ?? 'title_changed') as any, change);
    }
    this.auditService.log(AuthEvent.TASK_UPDATED, userId, 'internal', 'system', { projectId, fields: capturedChanges.map((c) => c.field) });

    return this.queryService.findById(projectId, taskId);
  }
}
