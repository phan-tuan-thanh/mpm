import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskLink } from '../entities/task-link.entity';
import { Task } from '../entities/task.entity';
import { ActivityService } from '../activity/activity.service';

const ALLOWED_SCHEMES = ['http:', 'https:'];

@Injectable()
export class LinkService {
  constructor(
    @InjectRepository(TaskLink)
    private readonly linkRepo: Repository<TaskLink>,
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
    private readonly activityService: ActivityService,
  ) {}

  private async checkTaskNotCompleted(taskId: string): Promise<void> {
    const task = await this.taskRepo.findOne({ where: { id: taskId }, relations: ['state'] });
    if (!task) throw new NotFoundException('Task not found');
    if (task.state?.group === 'completed') {
      throw new UnprocessableEntityException('Cannot modify links of a completed/closed task');
    }
  }

  async create(
    taskId: string,
    userId: string,
    dto: { url: string; title?: string },
  ): Promise<TaskLink> {
    await this.checkTaskNotCompleted(taskId);

    let parsed: URL;
    try {
      parsed = new URL(dto.url);
    } catch {
      throw new UnprocessableEntityException('Invalid URL');
    }
    if (!ALLOWED_SCHEMES.includes(parsed.protocol)) {
      throw new UnprocessableEntityException('URL must use http or https scheme');
    }

    const link = this.linkRepo.create({
      taskId,
      url: dto.url,
      title: dto.title ?? null,
      createdBy: userId,
    });
    const saved = await this.linkRepo.save(link);

    await this.activityService.log(taskId, userId, 'link_added', {
      field: 'link',
      newValue: dto.url,
    });

    return saved;
  }

  async delete(linkId: string, taskId: string, userId: string): Promise<void> {
    await this.checkTaskNotCompleted(taskId);

    const link = await this.linkRepo.findOne({ where: { id: linkId, taskId } });
    if (!link) throw new NotFoundException('Link not found');

    await this.linkRepo.delete(linkId);

    await this.activityService.log(taskId, userId, 'link_removed', {
      field: 'link',
      oldValue: link.url,
    });
  }
}
