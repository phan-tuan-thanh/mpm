import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { TaskActivity, TaskActivityType } from '../entities/task-activity.entity';
import type { ActivityFilterType } from '@mpm/shared-types';

export interface LogOptions {
  field?: string;
  oldValue?: string;
  newValue?: string;
  comment?: string;
}

export interface ActivityDto {
  id: string;
  taskId: string;
  actorId: string;
  actorName: string | null;
  actorAvatar: string | null;
  entryType: string;
  field: string | null;
  oldValue: string | null;
  newValue: string | null;
  comment: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ActivityPage {
  data: ActivityDto[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ActivityFilteredPage {
  data: ActivityDto[];
  total: number;
  page: number;
  hasMore: boolean;
}

/** Entry types classified as system-generated activity */
const ACTIVITY_ENTRY_TYPES: TaskActivityType[] = [
  'state_changed',
  'priority_changed',
  'type_changed',
  'parent_changed',
  'estimate_changed',
  'start_date_changed',
  'due_date_changed',
  'assignee_added',
  'assignee_removed',
  'label_added',
  'label_removed',
  'created',
  'completed',
  'reopened',
];

/** Entry types classified as comments */
const COMMENT_ENTRY_TYPES: TaskActivityType[] = [
  'comment_added',
  'comment_edited',
  'comment_deleted',
];

/** Entry types classified as history (state transitions only) */
const HISTORY_ENTRY_TYPES: TaskActivityType[] = [
  'state_changed',
];

@Injectable()
export class ActivityService {
  constructor(
    @InjectRepository(TaskActivity)
    private readonly activityRepo: Repository<TaskActivity>,
  ) {}

  async log(
    taskId: string,
    actorId: string,
    entryType: TaskActivityType,
    options: LogOptions = {},
  ): Promise<void> {
    const entry = this.activityRepo.create({
      taskId,
      actorId,
      entryType,
      field: options.field ?? null,
      oldValue: options.oldValue ?? null,
      newValue: options.newValue ?? null,
      comment: options.comment ?? null,
    });
    await this.activityRepo.save(entry);
  }

  async getTimeline(taskId: string, page = 1, limit = 50): Promise<ActivityPage> {
    const [data, total] = await this.activityRepo.findAndCount({
      where: { taskId },
      relations: ['actor'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data: data.map(this.toDto), total, page, pageSize: limit };
  }

  async getFilteredActivity(
    taskId: string,
    type: ActivityFilterType = 'all',
    page = 1,
    limit = 30,
  ): Promise<ActivityFilteredPage> {
    const whereCondition = this.buildFilterCondition(taskId, type);

    const [data, total] = await this.activityRepo.findAndCount({
      where: whereCondition,
      relations: ['actor'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: data.map(this.toDto),
      total,
      page,
      hasMore: page * limit < total,
    };
  }

  private buildFilterCondition(taskId: string, type: ActivityFilterType) {
    switch (type) {
      case 'activity':
        return { taskId, entryType: In(ACTIVITY_ENTRY_TYPES) };
      case 'comments':
        return { taskId, entryType: In(COMMENT_ENTRY_TYPES) };
      case 'history':
        return { taskId, entryType: In(HISTORY_ENTRY_TYPES) };
      case 'all':
      default:
        return { taskId };
    }
  }

  private toDto(entry: TaskActivity): ActivityDto {
    return {
      id: entry.id,
      taskId: entry.taskId,
      actorId: entry.actorId,
      actorName: entry.actor?.displayName ?? null,
      actorAvatar: entry.actor?.avatarUrl ?? null,
      entryType: entry.entryType,
      field: entry.field,
      oldValue: entry.oldValue,
      newValue: entry.newValue,
      comment: entry.comment,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    };
  }

  async addComment(taskId: string, actorId: string, content: string): Promise<ActivityDto> {
    const entry = this.activityRepo.create({
      taskId,
      actorId,
      entryType: 'comment_added',
      comment: content,
      field: null,
      oldValue: null,
      newValue: null,
    });
    const saved = await this.activityRepo.save(entry);
    const withActor = await this.activityRepo.findOne({ where: { id: saved.id }, relations: ['actor'] });
    return this.toDto(withActor!);
  }

  async editComment(commentId: string, actorId: string, content: string): Promise<ActivityDto> {
    const entry = await this.activityRepo.findOne({ where: { id: commentId } });
    if (!entry) throw new NotFoundException('Comment not found');
    if (entry.actorId !== actorId) throw new ForbiddenException('Cannot edit another user\'s comment');
    if (entry.entryType !== 'comment_added' && entry.entryType !== 'comment_edited') throw new NotFoundException('Comment not found');

    entry.comment = content;
    entry.entryType = 'comment_edited';
    const saved = await this.activityRepo.save(entry);
    const withActor = await this.activityRepo.findOne({ where: { id: saved.id }, relations: ['actor'] });
    return this.toDto(withActor!);
  }

  async deleteComment(
    commentId: string,
    actorId: string,
    callerRole?: string,
  ): Promise<void> {
    const entry = await this.activityRepo.findOne({ where: { id: commentId } });
    if (!entry) throw new NotFoundException('Comment not found');

    const isOwn = entry.actorId === actorId;
    const isPrivileged = callerRole === 'Scrum_Master' || callerRole === 'Admin';
    if (!isOwn && !isPrivileged) {
      throw new ForbiddenException('Cannot delete another user\'s comment');
    }

    await this.activityRepo.delete(commentId);
  }
}
