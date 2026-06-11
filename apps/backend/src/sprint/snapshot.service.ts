import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SprintSnapshot } from './entities/sprint-snapshot.entity';
import { Sprint } from './entities/sprint.entity';
import { BurndownDataPointDto } from './dto/sprint-query.dto';

@Injectable()
export class SnapshotService {
  constructor(
    @InjectRepository(SprintSnapshot)
    private readonly snapshotRepo: Repository<SprintSnapshot>,
  ) {}

  /**
   * Upsert snapshot cho một sprint vào một ngày cụ thể (idempotent theo unique index).
   */
  async upsertSnapshot(
    sprintId: string,
    snapshotDate: string,
    remainingStoryPoints: number,
    remainingTasksCount: number,
  ): Promise<SprintSnapshot> {
    let snapshot = await this.snapshotRepo.findOne({
      where: { sprintId, snapshotDate, deletedAt: null as unknown as undefined },
    });

    if (snapshot) {
      snapshot.remainingStoryPoints = Math.max(0, Math.round(remainingStoryPoints * 10) / 10);
      snapshot.remainingTasksCount = Math.max(0, remainingTasksCount);
    } else {
      snapshot = this.snapshotRepo.create({
        sprintId,
        snapshotDate,
        remainingStoryPoints: Math.max(0, Math.round(remainingStoryPoints * 10) / 10),
        remainingTasksCount: Math.max(0, remainingTasksCount),
      });
    }

    return this.snapshotRepo.save(snapshot);
  }

  /**
   * Xây burndown chart data từ sprint + snapshots.
   *
   * - 1 điểm/ngày từ startDate → endDate
   * - ideal line giảm tuyến tính từ initialStoryPoints → 0, kẹp [0, initial]
   * - actual: carry-forward giá trị gần nhất; ngày tương lai → null
   */
  buildBurndown(sprint: Sprint, snapshots: SprintSnapshot[]): BurndownDataPointDto[] {
    if (!sprint.startDate || !sprint.endDate) {
      throw new ConflictException('Sprint must have startDate and endDate to build burndown');
    }

    const initial = sprint.initialStoryPoints ? Number(sprint.initialStoryPoints) : 0;
    const initialTasks = sprint.initialTasksCount ?? 0;

    const start = new Date(sprint.startDate);
    const end = new Date(sprint.endDate);

    // Tổng số ngày (bao gồm cả start và end)
    const totalDays = Math.max(
      1,
      Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1,
    );

    // Index snapshots theo ngày
    const snapshotMap = new Map<string, SprintSnapshot>();
    for (const s of snapshots) {
      snapshotMap.set(s.snapshotDate, s);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const points: BurndownDataPointDto[] = [];
    let lastActualSP: number | null = null;
    let lastActualTasks: number | null = null;

    for (let i = 0; i < totalDays; i++) {
      const current = new Date(start);
      current.setDate(start.getDate() + i);
      const dateStr = current.toISOString().split('T')[0];

      // Ideal line: tuyến tính từ initial → 0 qua totalDays ngày, kẹp [0, initial]
      const ratio = totalDays > 1 ? i / (totalDays - 1) : 1;
      const idealSP = Math.max(0, Math.round((initial * (1 - ratio)) * 10) / 10);
      const idealTasks = Math.max(0, Math.round(initialTasks * (1 - ratio)));

      // Actual: dùng snapshot nếu có, ngược lại carry-forward; tương lai → null
      let remainingSP: number | null = null;
      let remainingTasks: number | null = null;

      const isPast = current <= today;

      if (isPast) {
        const snap = snapshotMap.get(dateStr);
        if (snap) {
          lastActualSP = Number(snap.remainingStoryPoints);
          lastActualTasks = snap.remainingTasksCount;
        }
        remainingSP = lastActualSP;
        remainingTasks = lastActualTasks;
      }

      points.push({
        date: dateStr,
        idealStoryPoints: idealSP,
        idealTasksCount: idealTasks,
        remainingStoryPoints: remainingSP,
        remainingTasksCount: remainingTasks,
      });
    }

    return points;
  }
}
