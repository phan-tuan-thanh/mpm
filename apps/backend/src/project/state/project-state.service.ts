import {
  Injectable,
  NotFoundException,
  ConflictException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ProjectState } from '../entities/project-state.entity';
import { Task } from '../../task/entities/task.entity';
import { AuditService } from '../../audit/audit.service';
import {
  CreateStateDto,
  UpdateStateDto,
  ReorderItem,
  ProjectStateGrouped,
  StateGroup,
} from '@mpm/shared-types';
import {
  assertStateExists,
  assertNotDefaultState,
  assertMinStatesCount,
  assertStateNotInUse,
} from './project-state-validation';

@Injectable()
export class ProjectStateService {
  constructor(
    @InjectRepository(ProjectState)
    private readonly stateRepository: Repository<ProjectState>,
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    private readonly auditService: AuditService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Lấy danh sách states grouped theo StateGroup
   */
  async findAll(projectId: string): Promise<ProjectStateGrouped> {
    const states = await this.stateRepository.find({
      where: { projectId },
      order: { order: 'ASC' },
    });

    const grouped: ProjectStateGrouped = {
      backlog: [],
      unstarted: [],
      started: [],
      completed: [],
      cancelled: [],
    };

    for (const state of states) {
      if (grouped[state.group]) {
        grouped[state.group].push(state);
      }
    }

    return grouped;
  }

  /**
   * Tạo state mới
   */
  async create(
    projectId: string,
    userId: string,
    dto: CreateStateDto,
    ip: string,
    ua: string,
  ): Promise<ProjectState> {
    // Check name uniqueness
    const existing = await this.stateRepository.findOne({
      where: { projectId, name: dto.name },
    });
    if (existing) {
      throw new ConflictException({
        statusCode: 409,
        error: 'Conflict',
        message: `State name "${dto.name}" already exists in this project`,
        errorCode: 'STATE_NAME_EXISTS',
        timestamp: new Date().toISOString(),
      });
    }

    // Check max states (20)
    const count = await this.stateRepository.count({
      where: { projectId },
    });
    if (count >= 20) {
      throw new UnprocessableEntityException({
        statusCode: 422,
        error: 'Unprocessable Entity',
        message: 'A project can have at most 20 states',
        errorCode: 'MAX_STATES_REACHED',
        timestamp: new Date().toISOString(),
      });
    }

    // Get max order
    const maxOrderState = await this.stateRepository.findOne({
      where: { projectId },
      order: { order: 'DESC' },
    });
    const nextOrder = maxOrderState ? maxOrderState.order + 1 : 0;

    const state = this.stateRepository.create({
      projectId,
      name: dto.name,
      colorLight: dto.colorLight,
      colorDark: dto.colorDark,
      group: dto.group,
      icon: dto.icon ?? null,
      isDefault: false,
      order: nextOrder,
    });

    const saved = await this.stateRepository.save(state);

    // Audit log
    this.auditService.log(
      'project_state_created' as any,
      userId,
      ip,
      ua,
      { projectId, stateId: saved.id, name: saved.name },
    );

    return saved;
  }

  /**
   * Cập nhật state
   */
  async update(
    projectId: string,
    stateId: string,
    userId: string,
    dto: UpdateStateDto,
    ip: string,
    ua: string,
  ): Promise<ProjectState> {
    const state = await this.stateRepository.findOne({
      where: { id: stateId, projectId },
    });

    if (!state) {
      throw new NotFoundException({
        statusCode: 404,
        error: 'Not Found',
        message: 'Project state not found',
        errorCode: 'STATE_NOT_FOUND',
        timestamp: new Date().toISOString(),
      });
    }

    // Check name uniqueness if changed
    if (dto.name && dto.name !== state.name) {
      const existing = await this.stateRepository.findOne({
        where: { projectId, name: dto.name },
      });
      if (existing) {
        throw new ConflictException({
          statusCode: 409,
          error: 'Conflict',
          message: `State name "${dto.name}" already exists in this project`,
          errorCode: 'STATE_NAME_EXISTS',
          timestamp: new Date().toISOString(),
        });
      }
      state.name = dto.name;
    }

    if (dto.colorLight !== undefined) state.colorLight = dto.colorLight;
    if (dto.colorDark !== undefined) state.colorDark = dto.colorDark;
    if (dto.icon !== undefined) state.icon = dto.icon;
    if (dto.group !== undefined) state.group = dto.group;
    if (dto.order !== undefined) state.order = dto.order;
    if (dto.isDefault !== undefined) state.isDefault = dto.isDefault;

    const saved = await this.stateRepository.save(state);

    // Audit log
    this.auditService.log(
      'project_state_updated' as any,
      userId,
      ip,
      ua,
      { projectId, stateId: saved.id, name: saved.name },
    );

    return saved;
  }

  /**
   * Reorder states
   */
  async reorder(
    projectId: string,
    items: ReorderItem[],
    userId: string,
    ip: string,
    ua: string,
  ): Promise<number> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let updatedCount = 0;
      for (const item of items) {
        const state = await queryRunner.manager.findOne(ProjectState, {
          where: { id: item.stateId, projectId },
        });
        if (state) {
          state.order = item.order;
          await queryRunner.manager.save(ProjectState, state);
          updatedCount++;
        }
      }
      await queryRunner.commitTransaction();

      // Audit log
      this.auditService.log(
        'project_state_updated' as any,
        userId,
        ip,
        ua,
        { projectId, reorderedCount: updatedCount },
      );

      return updatedCount;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Xóa state
   */
  async delete(
    projectId: string,
    stateId: string,
    userId: string,
    ip: string,
    ua: string,
  ): Promise<void> {
    const state = await this.stateRepository.findOne({
      where: { id: stateId, projectId },
    });

    assertStateExists(state);
    assertNotDefaultState(state);

    // Check total states count in project (min 1)
    const count = await this.stateRepository.count({
      where: { projectId },
    });
    assertMinStatesCount(count);

    // Check if in use by tasks
    const tasksCount = await this.taskRepository.count({
      where: { stateId },
    });
    assertStateNotInUse(tasksCount);

    await this.stateRepository.remove(state);

    // Audit log
    this.auditService.log(
      'project_state_deleted' as any,
      userId,
      ip,
      ua,
      { projectId, stateId, name: state.name },
    );
  }

  /**
   * Migrate tasks from one state to another, and then delete the old state
   */
  async migrate(
    projectId: string,
    fromStateId: string,
    toStateId: string,
    userId: string,
    ip: string,
    ua: string,
  ): Promise<void> {
    const fromState = await this.stateRepository.findOne({
      where: { id: fromStateId, projectId },
    });
    const toState = await this.stateRepository.findOne({
      where: { id: toStateId, projectId },
    });

    if (!fromState || !toState) {
      throw new NotFoundException({
        statusCode: 404,
        error: 'Not Found',
        message: 'One or both project states not found',
        errorCode: 'STATE_NOT_FOUND',
        timestamp: new Date().toISOString(),
      });
    }

    assertNotDefaultState(fromState);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Update tasks state
      await queryRunner.manager.update(
        Task,
        { stateId: fromStateId },
        { stateId: toStateId },
      );

      // Delete fromState
      await queryRunner.manager.remove(ProjectState, fromState);

      await queryRunner.commitTransaction();

      // Audit log
      this.auditService.log(
        'project_state_deleted' as any,
        userId,
        ip,
        ua,
        { projectId, stateId: fromStateId, name: fromState.name, migratedTo: toStateId },
      );
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
