import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskActivity, TaskActivityType } from '../entities/task-activity.entity';

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
