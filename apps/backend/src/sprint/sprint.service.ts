import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, IsNull, ILike, FindManyOptions } from 'typeorm';
import { Sprint } from './entities/sprint.entity';
import { SprintMemberCapacity } from './entities/sprint-member-capacity.entity';
import { Task } from '../task/entities/task.entity';
import { Project } from '../project/entities/project.entity';
import { CreateSprintDto } from './dto/create-sprint.dto';
import { UpdateSprintDto } from './dto/update-sprint.dto';
import { CompleteSprintDto } from './dto/complete-sprint.dto';
import { UpdateMemberCapacityDto } from './dto/update-member-capacity.dto';
import { BulkDeleteSprintDto } from './dto/bulk-delete-sprint.dto';
import { AssignTasksDto, BulkRemoveTasksDto } from './dto/assign-tasks.dto';
import { UpdateSprintSettingsDto } from './dto/update-sprint-settings.dto';
import { SprintQueryDto, SprintPaginationResponseDto } from './dto/sprint-query.dto';
import { SprintSettings, DONE_STATES } from './types/sprint.types';

@Injectable()
export class SprintService {
  constructor(
    @InjectRepository(Sprint)
    private readonly sprintRepo: Repository<Sprint>,
    @InjectRepository(SprintMemberCapacity)
    private readonly capacityRepo: Repository<SprintMemberCapacity>,
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    private readonly dataSource: DataSource,
  ) {}

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private async assertProjectExists(projectId: string): Promise<Project> {
    const project = await this.projectRepo.findOne({ where: { id: projectId } });
    if (!project) throw new NotFoundException(`Project ${projectId} not found`);
    return project;
  }

  private async assertSprintInProject(sprintId: string, projectId: string): Promise<Sprint> {
    const sprint = await this.sprintRepo.findOne({
      where: { id: sprintId, deletedAt: IsNull() },
    });
    if (!sprint || sprint.projectId !== projectId) {
      throw new NotFoundException(`Sprint ${sprintId} not found`);
    }
    return sprint;
  }

  private parseSettings(project: Project): SprintSettings {
    const raw = project.sprintSettings as Record<string, any>;
    return {
      terminology: raw.terminology ?? 'sprint',
      maxActiveSprints: raw.maxActiveSprints ?? 1,
      defaultDurationWeeks: raw.defaultDurationWeeks ?? 2,
      capacityMode: raw.capacityMode ?? 'total',
      icon: raw.icon ?? 'pi-sync',
    };
  }

  // ─── CRUD ────────────────────────────────────────────────────────────────────

  async create(projectId: string, dto: CreateSprintDto, userId: string): Promise<Sprint> {
    await this.assertProjectExists(projectId);

    const sprint = this.sprintRepo.create({
      projectId,
      createdBy: userId,
      name: dto.name,
      goal: dto.goal ?? null,
      startDate: dto.startDate ?? null,
      endDate: dto.endDate ?? null,
      targetCapacity: dto.targetCapacity ?? null,
      status: 'planning',
    });

    return this.sprintRepo.save(sprint);
  }

  async findAll(
    projectId: string,
    query: SprintQueryDto,
  ): Promise<SprintPaginationResponseDto<Sprint>> {
    await this.assertProjectExists(projectId);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const options: FindManyOptions<Sprint> = {
      where: {
        projectId,
        deletedAt: IsNull(),
        ...(query.status ? { status: query.status } : {}),
        ...(query.search ? { name: ILike(`%${query.search}%`) } : {}),
      },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    };

    const [data, total] = await this.sprintRepo.findAndCount(options);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(projectId: string, sprintId: string): Promise<Sprint> {
    const sprint = await this.sprintRepo.findOne({
      where: { id: sprintId, projectId, deletedAt: IsNull() },
      relations: ['memberCapacities', 'snapshots'],
    });
    if (!sprint) throw new NotFoundException(`Sprint ${sprintId} not found`);
    return sprint;
  }

  async update(projectId: string, sprintId: string, dto: UpdateSprintDto): Promise<Sprint> {
    const sprint = await this.assertSprintInProject(sprintId, projectId);

    // status không được update qua đây
    if (dto.name !== undefined) sprint.name = dto.name;
    if (dto.goal !== undefined) sprint.goal = dto.goal ?? null;
    if (dto.startDate !== undefined) sprint.startDate = dto.startDate ?? null;
    if (dto.endDate !== undefined) sprint.endDate = dto.endDate ?? null;
    if (dto.targetCapacity !== undefined) sprint.targetCapacity = dto.targetCapacity ?? null;

    return this.sprintRepo.save(sprint);
  }

  // ─── Soft delete ─────────────────────────────────────────────────────────────

  async bulkDelete(projectId: string, dto: BulkDeleteSprintDto): Promise<void> {
    if (dto.ids.length === 0) throw new BadRequestException('ids must not be empty');
    if (dto.ids.length > 100) throw new BadRequestException('ids must not exceed 100');

    await this.dataSource.transaction(async (manager) => {
      for (const id of dto.ids) {
        const sprint = await manager.findOne(Sprint, {
          where: { id, projectId, deletedAt: IsNull() },
        });
        if (!sprint) throw new NotFoundException(`Sprint ${id} not found`);
      }

      await manager
        .createQueryBuilder()
        .update(Task)
        .set({ sprintId: null })
        .where('sprint_id IN (:...ids)', { ids: dto.ids })
        .execute();

      await manager
        .createQueryBuilder()
        .update(Sprint)
        .set({ deletedAt: new Date() })
        .where('id IN (:...ids) AND project_id = :projectId AND deleted_at IS NULL', {
          ids: dto.ids,
          projectId,
        })
        .execute();
    });
  }

  // ─── Lifecycle ───────────────────────────────────────────────────────────────

  async startSprint(projectId: string, sprintId: string): Promise<Sprint> {
    const project = await this.assertProjectExists(projectId);
    const settings = this.parseSettings(project);

    return this.dataSource.transaction(async (manager) => {
      const sprint = await manager.findOne(Sprint, {
        where: { id: sprintId, projectId, deletedAt: IsNull() },
      });
      if (!sprint) throw new NotFoundException(`Sprint ${sprintId} not found`);
      if (sprint.status !== 'planning') {
        throw new ConflictException(`Sprint must be in 'planning' status to start`);
      }

      const activeCount = await manager.count(Sprint, {
        where: { projectId, status: 'active', deletedAt: IsNull() },
      });

      if (activeCount >= settings.maxActiveSprints) {
        throw new BadRequestException(
          `Project already has ${activeCount} active sprint(s). maxActiveSprints = ${settings.maxActiveSprints}`,
        );
      }

      const tasks = await manager
        .createQueryBuilder(Task, 't')
        .where('t.sprint_id = :sprintId', { sprintId })
        .getMany();

      let totalSP = 0;
      for (const t of tasks) {
        totalSP += Number(t.estimateValue) > 0 ? Number(t.estimateValue) : 1;
      }

      sprint.status = 'active';
      sprint.startDate = sprint.startDate ?? new Date().toISOString().split('T')[0];
      sprint.initialStoryPoints = Math.round(totalSP * 10) / 10;
      sprint.initialTasksCount = tasks.length;

      return manager.save(Sprint, sprint);
    });
  }

  async completeSprint(
    projectId: string,
    sprintId: string,
    dto: CompleteSprintDto,
  ): Promise<Sprint> {
    await this.assertProjectExists(projectId);

    return this.dataSource.transaction(async (manager) => {
      const sprint = await manager.findOne(Sprint, {
        where: { id: sprintId, projectId, deletedAt: IsNull() },
      });
      if (!sprint) throw new NotFoundException(`Sprint ${sprintId} not found`);
      if (sprint.status !== 'active') {
        throw new ConflictException(`Sprint must be 'active' to complete`);
      }

      const allTasks = await manager
        .createQueryBuilder(Task, 't')
        .leftJoinAndSelect('t.state', 'state')
        .where('t.sprint_id = :sprintId', { sprintId })
        .getMany();

      const incompleteTasks = allTasks.filter(
        (t) => !t.state || !DONE_STATES.includes(t.state.group),
      );

      if (incompleteTasks.length > 0) {
        const hasTarget = !!dto.targetSprintId;
        const hasBacklog = dto.moveToBacklog === true;

        if ((!hasTarget && !hasBacklog) || (hasTarget && hasBacklog)) {
          throw new BadRequestException(
            'Exactly one of targetSprintId or moveToBacklog must be provided when there are incomplete tasks',
          );
        }

        if (hasTarget) {
          const target = await manager.findOne(Sprint, {
            where: { id: dto.targetSprintId!, deletedAt: IsNull() },
          });
          if (!target) throw new NotFoundException(`Target sprint ${dto.targetSprintId} not found`);
          if (target.projectId !== projectId) {
            throw new NotFoundException(`Target sprint ${dto.targetSprintId} not found`);
          }
          if (target.status !== 'planning') {
            throw new BadRequestException(`Target sprint must be in 'planning' status`);
          }

          await manager
            .createQueryBuilder()
            .update(Task)
            .set({ sprintId: dto.targetSprintId! })
            .whereInIds(incompleteTasks.map((t) => t.id))
            .execute();
        } else {
          await manager
            .createQueryBuilder()
            .update(Task)
            .set({ sprintId: null })
            .whereInIds(incompleteTasks.map((t) => t.id))
            .execute();
        }
      }

      sprint.status = 'completed';
      sprint.completedAt = new Date();

      return manager.save(Sprint, sprint);
    });
  }

  // ─── Member capacity ─────────────────────────────────────────────────────────

  async upsertMemberCapacity(
    projectId: string,
    sprintId: string,
    dto: UpdateMemberCapacityDto,
  ): Promise<SprintMemberCapacity> {
    await this.assertSprintInProject(sprintId, projectId);

    let record = await this.capacityRepo.findOne({
      where: { sprintId, userId: dto.userId, deletedAt: IsNull() },
    });

    if (record) {
      record.capacity = dto.capacity;
    } else {
      record = this.capacityRepo.create({
        sprintId,
        userId: dto.userId,
        capacity: dto.capacity,
      });
    }

    return this.capacityRepo.save(record);
  }

  async getMemberCapacities(projectId: string, sprintId: string): Promise<SprintMemberCapacity[]> {
    await this.assertSprintInProject(sprintId, projectId);
    return this.capacityRepo.find({
      where: { sprintId, deletedAt: IsNull() },
      relations: ['user'],
    });
  }

  // ─── Task assignment ─────────────────────────────────────────────────────────

  async assignTask(projectId: string, sprintId: string, taskId: string): Promise<Task> {
    const sprint = await this.assertSprintInProject(sprintId, projectId);
    if (sprint.status === 'completed') {
      throw new ConflictException('Cannot assign tasks to a completed sprint');
    }

    const task = await this.taskRepo.findOne({
      where: { id: taskId, projectId },
    });
    if (!task) throw new NotFoundException(`Task ${taskId} not found`);

    task.sprintId = sprintId;
    return this.taskRepo.save(task);
  }

  async addTasks(projectId: string, sprintId: string, dto: AssignTasksDto): Promise<void> {
    if (dto.taskIds.length === 0) throw new BadRequestException('taskIds must not be empty');
    if (dto.taskIds.length > 100) throw new BadRequestException('taskIds must not exceed 100');

    const sprint = await this.assertSprintInProject(sprintId, projectId);
    if (sprint.status === 'completed') {
      throw new ConflictException('Cannot assign tasks to a completed sprint');
    }

    await this.dataSource.transaction(async (manager) => {
      for (const taskId of dto.taskIds) {
        const task = await manager.findOne(Task, { where: { id: taskId, projectId } });
        if (!task) throw new NotFoundException(`Task ${taskId} not found`);
      }

      await manager
        .createQueryBuilder()
        .update(Task)
        .set({ sprintId })
        .where('id IN (:...ids) AND project_id = :projectId', {
          ids: dto.taskIds,
          projectId,
        })
        .execute();
    });
  }

  async bulkRemoveTasks(
    projectId: string,
    sprintId: string,
    dto: BulkRemoveTasksDto,
  ): Promise<void> {
    if (dto.taskIds.length === 0) throw new BadRequestException('taskIds must not be empty');
    if (dto.taskIds.length > 100) throw new BadRequestException('taskIds must not exceed 100');

    await this.assertSprintInProject(sprintId, projectId);

    await this.dataSource.transaction(async (manager) => {
      for (const taskId of dto.taskIds) {
        const task = await manager.findOne(Task, { where: { id: taskId, projectId } });
        if (!task) throw new NotFoundException(`Task ${taskId} not found`);
      }

      await manager
        .createQueryBuilder()
        .update(Task)
        .set({ sprintId: null })
        .where('id IN (:...ids) AND sprint_id = :sprintId AND project_id = :projectId', {
          ids: dto.taskIds,
          sprintId,
          projectId,
        })
        .execute();
    });
  }

  // ─── Settings ─────────────────────────────────────────────────────────────────

  async getSettings(projectId: string): Promise<SprintSettings> {
    const project = await this.assertProjectExists(projectId);
    return this.parseSettings(project);
  }

  async updateSettings(
    projectId: string,
    dto: UpdateSprintSettingsDto,
  ): Promise<SprintSettings> {
    const project = await this.assertProjectExists(projectId);
    const current = this.parseSettings(project);

    const updated: SprintSettings = {
      ...current,
      ...(dto.terminology !== undefined && { terminology: dto.terminology }),
      ...(dto.maxActiveSprints !== undefined && { maxActiveSprints: dto.maxActiveSprints }),
      ...(dto.defaultDurationWeeks !== undefined && { defaultDurationWeeks: dto.defaultDurationWeeks }),
      ...(dto.capacityMode !== undefined && { capacityMode: dto.capacityMode }),
      ...(dto.icon !== undefined && { icon: dto.icon }),
    };

    await this.dataSource
      .createQueryBuilder()
      .update(Project)
      .set({ sprintSettings: () => `'${JSON.stringify(updated)}'::jsonb` })
      .where('id = :id', { id: projectId })
      .execute();

    return updated;
  }
}
