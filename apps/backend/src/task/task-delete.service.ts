import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Task } from './entities/task.entity';
import { AuditService } from '../audit/audit.service';
import { AuthEvent } from '../auth/constants/auth-events';

@Injectable()
export class TaskDeleteService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
  ) {}

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
}
