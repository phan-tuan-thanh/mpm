import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { Sprint } from './entities/sprint.entity';
import { Task } from '../task/entities/task.entity';
import { SnapshotService } from './snapshot.service';
import { DONE_STATES } from './types/sprint.types';

/**
 * SnapshotCronJob: chụp snapshot cho tất cả sprint active mỗi ngày 23:59 (giờ server).
 */
@Injectable()
export class SnapshotCronJob {
  private readonly logger = new Logger(SnapshotCronJob.name);

  constructor(
    @InjectRepository(Sprint)
    private readonly sprintRepo: Repository<Sprint>,
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
    private readonly snapshotService: SnapshotService,
  ) {}

  @Cron('59 23 * * *')
  async takeActiveSprintSnapshots(): Promise<void> {
    const todayStr = new Date().toISOString().split('T')[0];

    const activeSprints = await this.sprintRepo.find({
      where: { status: 'active', deletedAt: null as unknown as undefined },
    });

    this.logger.log(`Snapshot cron: ${activeSprints.length} active sprint(s) on ${todayStr}`);

    let processed = 0;

    for (const sprint of activeSprints) {
      try {
        const tasks = await this.taskRepo
          .createQueryBuilder('t')
          .leftJoinAndSelect('t.state', 'state')
          .where('t.sprint_id = :sprintId', { sprintId: sprint.id })
          .getMany();

        const incompleteTasks = tasks.filter(
          (t) => !t.state || !DONE_STATES.includes(t.state.group),
        );

        let remainingSP = 0;
        for (const t of incompleteTasks) {
          remainingSP += Number(t.estimateValue) > 0 ? Number(t.estimateValue) : 1;
        }

        await this.snapshotService.upsertSnapshot(
          sprint.id,
          todayStr,
          remainingSP,
          incompleteTasks.length,
        );

        processed++;
      } catch (err) {
        this.logger.error(`Snapshot failed for sprint ${sprint.id}: ${(err as Error).message}`);
      }
    }

    this.logger.log(`Snapshot cron done: ${processed}/${activeSprints.length} succeeded`);
  }
}
