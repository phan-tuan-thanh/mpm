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

export interface ActivityPage {
  data: TaskActivity[];
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
    return { data, total, page, pageSize: limit };
  }

  async addComment(taskId: string, actorId: string, content: string): Promise<TaskActivity> {
    const entry = this.activityRepo.create({
      taskId,
      actorId,
      entryType: 'comment_added',
      comment: content,
      field: null,
      oldValue: null,
      newValue: null,
    });
    return this.activityRepo.save(entry);
  }

  async editComment(commentId: string, actorId: string, content: string): Promise<TaskActivity> {
    const entry = await this.activityRepo.findOne({ where: { id: commentId } });
    if (!entry) throw new NotFoundException('Comment not found');
    if (entry.actorId !== actorId) throw new ForbiddenException('Cannot edit another user\'s comment');
    if (entry.entryType !== 'comment_added') throw new NotFoundException('Comment not found');

    entry.comment = content;
    entry.entryType = 'comment_edited';
    return this.activityRepo.save(entry);
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
