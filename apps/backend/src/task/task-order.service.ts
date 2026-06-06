import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Task } from './entities/task.entity';
import { AuditService } from '../audit/audit.service';
import { AuthEvent } from '../auth/constants/auth-events';

@Injectable()
export class TaskOrderService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
  ) {}

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

  async rebalanceOrder(projectId: string): Promise<void> {
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
}
