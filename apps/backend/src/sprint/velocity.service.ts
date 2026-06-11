import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sprint } from './entities/sprint.entity';
import { Task } from '../task/entities/task.entity';
import { DONE_STATES } from './types/sprint.types';

export interface VelocityDataPoint {
  sprintId: string;
  sprintName: string;
  completedAt: Date;
  committedStoryPoints: number;
  completedStoryPoints: number;
}

export interface VelocityReport {
  sprints: VelocityDataPoint[];
  averageVelocity: number;
}

export interface DashboardData {
  activeSprints: {
    id: string;
    name: string;
    startDate: string | null;
    endDate: string | null;
    totalTasks: number;
    completedTasks: number;
    totalStoryPoints: number;
    completedStoryPoints: number;
    progressPercent: number;
  }[];
  totalActiveSprints: number;
}

@Injectable()
export class VelocityService {
  constructor(
    @InjectRepository(Sprint)
    private readonly sprintRepo: Repository<Sprint>,
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
  ) {}

  /**
   * Velocity report: committed SP vs completed SP cho các sprint đã hoàn thành,
   * bao gồm cả sprint soft-deleted (để bảo toàn lịch sử velocity).
   */
  async getVelocity(projectId: string): Promise<VelocityReport> {
    // withDeleted() để bao gồm sprint soft-deleted
    const completedSprints = await this.sprintRepo.find({
      where: { projectId, status: 'completed' },
      order: { completedAt: 'ASC' },
      withDeleted: true,
    });

    const dataPoints: VelocityDataPoint[] = [];

    for (const sprint of completedSprints) {
      const tasks = await this.taskRepo
        .createQueryBuilder('t')
        .leftJoinAndSelect('t.state', 'state')
        .where('t.sprint_id = :sprintId', { sprintId: sprint.id })
        .getMany();

      const doneTasks = tasks.filter(
        (t) => t.state && DONE_STATES.includes(t.state.group),
      );

      let completedSP = 0;
      for (const t of doneTasks) {
        completedSP += Number(t.estimateValue) > 0 ? Number(t.estimateValue) : 1;
      }
      completedSP = Math.round(completedSP * 10) / 10;

      dataPoints.push({
        sprintId: sprint.id,
        sprintName: sprint.name,
        completedAt: sprint.completedAt!,
        committedStoryPoints: sprint.initialStoryPoints ? Number(sprint.initialStoryPoints) : 0,
        completedStoryPoints: completedSP,
      });
    }

    const average =
      dataPoints.length > 0
        ? Math.round(
            (dataPoints.reduce((sum, d) => sum + d.completedStoryPoints, 0) / dataPoints.length) *
              10,
          ) / 10
        : 0;

    return { sprints: dataPoints, averageVelocity: average };
  }

  /**
   * Dashboard: tổng hợp tiến độ cho tất cả sprint đang active trong project.
   */
  async getDashboard(projectId: string): Promise<DashboardData> {
    const activeSprints = await this.sprintRepo.find({
      where: { projectId, status: 'active', deletedAt: null as unknown as undefined },
      order: { startDate: 'ASC' },
    });

    const items = await Promise.all(
      activeSprints.map(async (sprint) => {
        const tasks = await this.taskRepo
          .createQueryBuilder('t')
          .leftJoinAndSelect('t.state', 'state')
          .where('t.sprint_id = :sprintId', { sprintId: sprint.id })
          .getMany();

        const doneTasks = tasks.filter(
          (t) => t.state && DONE_STATES.includes(t.state.group),
        );

        let totalSP = 0;
        let doneSP = 0;
        for (const t of tasks) {
          const sp = Number(t.estimateValue) > 0 ? Number(t.estimateValue) : 1;
          totalSP += sp;
          if (doneTasks.includes(t)) doneSP += sp;
        }
        totalSP = Math.round(totalSP * 10) / 10;
        doneSP = Math.round(doneSP * 10) / 10;

        const progressPercent =
          tasks.length > 0 ? Math.round((doneTasks.length / tasks.length) * 100) : 0;

        return {
          id: sprint.id,
          name: sprint.name,
          startDate: sprint.startDate,
          endDate: sprint.endDate,
          totalTasks: tasks.length,
          completedTasks: doneTasks.length,
          totalStoryPoints: totalSP,
          completedStoryPoints: doneSP,
          progressPercent,
        };
      }),
    );

    return { activeSprints: items, totalActiveSprints: activeSprints.length };
  }
}
