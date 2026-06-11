import { Injectable } from '@nestjs/common';
import { Task } from '../task/entities/task.entity';
import { SprintMemberCapacity } from './entities/sprint-member-capacity.entity';
import { Sprint } from './entities/sprint.entity';
import { CapacityOverview, MemberCapacityResult } from './types/sprint.types';

@Injectable()
export class CapacityService {
  /**
   * Effective SP cho một task: estimateValue nếu > 0, ngược lại = 1 (safety fallback).
   */
  effectiveSP(task: Pick<Task, 'estimateValue'>): number {
    const val = Number(task.estimateValue);
    return val > 0 ? val : 1;
  }

  /**
   * Tính capacity tổng hợp cho sprint.
   *
   * Chế độ 'total': availableCapacity = sprint.targetCapacity (nếu có), else 0
   * Chế độ 'member-based': availableCapacity = Σ capacity của từng member
   */
  calculateCapacityOverview(
    sprint: Sprint,
    tasks: (Pick<Task, 'id' | 'estimateValue'> & { assigneeIds?: string[]; stateGroup?: string })[],
    capacities: SprintMemberCapacity[],
    capacityMode: 'total' | 'member-based',
  ): CapacityOverview {
    const capacityMap = new Map<string, number>();
    for (const c of capacities) {
      if (!c.deletedAt) {
        capacityMap.set(c.userId, Number(c.capacity));
      }
    }

    // Tính actualUsed per member
    const memberUsed = new Map<string, number>();
    let totalActualUsed = 0;
    let unestimatedTasksCount = 0;

    for (const task of tasks) {
      const sp = this.effectiveSP(task);
      if (!task.estimateValue || Number(task.estimateValue) <= 0) {
        unestimatedTasksCount++;
      }
      const assignees = task.assigneeIds ?? [];
      if (assignees.length > 0) {
        const spPerAssignee = sp / assignees.length;
        for (const uid of assignees) {
          memberUsed.set(uid, (memberUsed.get(uid) ?? 0) + spPerAssignee);
        }
      }
      totalActualUsed += sp;
    }

    // Round actualUsed per member to 1 decimal, clamp ≥ 0
    const members: MemberCapacityResult[] = [];
    for (const [userId, cap] of capacityMap.entries()) {
      const used = Math.max(0, Math.round((memberUsed.get(userId) ?? 0) * 10) / 10);
      const memberTasks = tasks.filter((t) => (t.assigneeIds ?? []).includes(userId));
      const unestimated = memberTasks.filter((t) => !t.estimateValue || Number(t.estimateValue) <= 0).length;
      members.push({ userId, capacity: cap, actualUsed: used, unestimatedTasksCount: unestimated });
    }

    totalActualUsed = Math.max(0, Math.round(totalActualUsed * 10) / 10);

    const totalCapacity =
      capacityMode === 'member-based'
        ? Array.from(capacityMap.values()).reduce((sum, v) => sum + v, 0)
        : (sprint.targetCapacity ? Number(sprint.targetCapacity) : 0);

    const availableCapacity = Math.max(0, totalCapacity - totalActualUsed);

    return {
      totalCapacity,
      totalActualUsed,
      availableCapacity,
      unestimatedTasksCount,
      members,
    };
  }
}
