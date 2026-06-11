export type SprintStatus = 'planning' | 'active' | 'completed';
export type CapacityMode = 'total' | 'member-based';
export type Terminology = 'sprint' | 'cycle';

export interface SprintSettings {
  terminology: Terminology;
  maxActiveSprints: number;
  /** Số tuần (1–12), không giới hạn ở preset 1/2/4 */
  defaultDurationWeeks: number;
  capacityMode: CapacityMode;
  /** Tên class PrimeIcon (vd 'pi-sync') — validate bằng pattern, kho icon ở frontend */
  icon: string;
}

export interface MemberCapacityResult {
  userId: string;
  capacity: number;
  actualUsed: number;
  unestimatedTasksCount: number;
}

export interface CapacityOverview {
  totalCapacity: number;
  totalActualUsed: number;
  availableCapacity: number;
  unestimatedTasksCount: number;
  members: MemberCapacityResult[];
}

/**
 * StateGroup values treated as "done" for sprint velocity/snapshot calculations.
 * Matches the StateGroup enum in ProjectState entity: 'completed' | 'cancelled'.
 */
export const DONE_STATES: readonly string[] = ['completed', 'cancelled'] as const;
