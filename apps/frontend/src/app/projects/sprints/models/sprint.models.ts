export type SprintStatus = 'planning' | 'active' | 'completed';
export type CapacityMode = 'total' | 'member-based';
export type Terminology = 'sprint' | 'cycle';

export interface SprintSettings {
  terminology: Terminology;
  maxActiveSprints: number;
  /** Số tuần (1–12), không giới hạn ở preset 1/2/4 */
  defaultDurationWeeks: number;
  capacityMode: CapacityMode;
  /** Tên class PrimeIcon (vd 'pi-sync') — chọn từ kho icon dùng chung (icon-picker-panel) */
  icon: string;
}

export interface Sprint {
  id: string;
  projectId: string;
  name: string;
  goal: string | null;
  startDate: string | null;
  endDate: string | null;
  status: SprintStatus;
  targetCapacity: number | null;
  initialStoryPoints: number | null;
  initialTasksCount: number | null;
  completedAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface SprintPagination {
  data: Sprint[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface BurndownDataPoint {
  date: string;
  idealStoryPoints: number;
  idealTasksCount: number;
  remainingStoryPoints: number | null;
  remainingTasksCount: number | null;
}

export interface VelocityDataPoint {
  sprintId: string;
  sprintName: string;
  completedAt: string;
  committedStoryPoints: number;
  completedStoryPoints: number;
}

export interface VelocityReport {
  sprints: VelocityDataPoint[];
  averageVelocity: number;
}

export interface DashboardActiveSprint {
  id: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
  totalTasks: number;
  completedTasks: number;
  totalStoryPoints: number;
  completedStoryPoints: number;
  progressPercent: number;
}

export interface DashboardData {
  activeSprints: DashboardActiveSprint[];
  totalActiveSprints: number;
}

export interface CreateSprintDto {
  name: string;
  goal?: string;
  startDate?: string;
  endDate?: string;
  targetCapacity?: number;
}

export interface UpdateSprintDto extends Partial<CreateSprintDto> {}

export interface CompleteSprintDto {
  targetSprintId?: string;
  moveToBacklog?: boolean;
}

export interface UpdateSprintSettingsDto {
  terminology?: Terminology;
  maxActiveSprints?: number;
  defaultDurationWeeks?: number;
  capacityMode?: CapacityMode;
  icon?: string;
}
