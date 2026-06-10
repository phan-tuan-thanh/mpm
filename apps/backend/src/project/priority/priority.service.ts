import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { ProjectPriority } from '../entities/project-priority.entity';
import { Task } from '../../task/entities/task.entity';
import { AuditService } from '../../audit/audit.service';
import { CreatePriorityDto } from './dto/create-priority.dto';
import { UpdatePriorityDto } from './dto/update-priority.dto';
import { DeletePriorityDto } from './dto/delete-priority.dto';
import { ReorderPrioritiesDto } from './dto/reorder-priorities.dto';
import { DEFAULT_PRIORITIES } from './priority.constants';

@Injectable()
export class PriorityService {
  constructor(
    @InjectRepository(ProjectPriority)
    private readonly repo: Repository<ProjectPriority>,
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
    private readonly auditService: AuditService,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(projectId: string): Promise<ProjectPriority[]> {
    return this.repo.find({
      where: { projectId },
      order: { order: 'ASC' },
    });
  }

  async create(
    projectId: string,
    userId: string,
    dto: CreatePriorityDto,
    ip: string,
    ua: string,
  ): Promise<ProjectPriority> {
    const existing = await this.repo.findOne({ where: { projectId, value: dto.value } });
    if (existing) {
      throw new ConflictException({
        statusCode: 409,
        error: 'Conflict',
        message: `Priority value "${dto.value}" already exists in this project`,
        errorCode: 'PRIORITY_VALUE_EXISTS',
        timestamp: new Date().toISOString(),
      });
    }

    const maxOrder = await this.repo
      .createQueryBuilder('p')
      .select('MAX(p.order)', 'max')
      .where('p.projectId = :projectId', { projectId })
      .getRawOne<{ max: number | null }>();

    const priority = this.repo.create({
      ...dto,
      projectId,
      order: (maxOrder?.max ?? 0) + 1,
    });
    const saved = await this.repo.save(priority);

    this.auditService.log(
      'project_state_created' as any,
      userId, ip, ua,
      { projectId, priorityId: saved.id, value: saved.value },
    );
    return saved;
  }

  async update(
    projectId: string,
    priorityId: string,
    userId: string,
    dto: UpdatePriorityDto,
    ip: string,
    ua: string,
  ): Promise<ProjectPriority> {
    const priority = await this.repo.findOne({ where: { id: priorityId, projectId } });
    if (!priority) {
      throw new NotFoundException({
        statusCode: 404, error: 'Not Found',
        message: 'Priority not found', errorCode: 'PRIORITY_NOT_FOUND',
        timestamp: new Date().toISOString(),
      });
    }

    if (dto.name !== undefined) priority.name = dto.name;
    if (dto.colorLight !== undefined) priority.colorLight = dto.colorLight;
    if (dto.colorDark !== undefined) priority.colorDark = dto.colorDark;
    if (dto.icon !== undefined) priority.icon = dto.icon;

    const saved = await this.repo.save(priority);

    this.auditService.log(
      'project_state_updated' as any,
      userId, ip, ua,
      { projectId, priorityId: saved.id },
    );
    return saved;
  }

  async delete(
    projectId: string,
    priorityId: string,
    userId: string,
    dto: DeletePriorityDto,
    ip: string,
    ua: string,
  ): Promise<void> {
    const priority = await this.repo.findOne({ where: { id: priorityId, projectId } });
    if (!priority) {
      throw new NotFoundException({
        statusCode: 404, error: 'Not Found',
        message: 'Priority not found', errorCode: 'PRIORITY_NOT_FOUND',
        timestamp: new Date().toISOString(),
      });
    }

    if (priority.isSystem) {
      throw new ForbiddenException({
        statusCode: 403, error: 'Forbidden',
        message: 'System priorities cannot be deleted', errorCode: 'PRIORITY_IS_SYSTEM',
        timestamp: new Date().toISOString(),
      });
    }

    const count = await this.repo.count({ where: { projectId } });
    if (count <= 2) {
      throw new UnprocessableEntityException({
        statusCode: 422, error: 'Unprocessable Entity',
        message: 'Project must have at least 2 priorities',
        errorCode: 'MIN_PRIORITIES_REQUIRED',
        timestamp: new Date().toISOString(),
      });
    }

    const migrateTarget = await this.repo.findOne({ where: { projectId, value: dto.migrateToValue } });
    if (!migrateTarget) {
      throw new NotFoundException({
        statusCode: 404, error: 'Not Found',
        message: 'Migration target priority not found', errorCode: 'PRIORITY_NOT_FOUND',
        timestamp: new Date().toISOString(),
      });
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await queryRunner.manager
        .createQueryBuilder()
        .update(Task)
        .set({ priority: dto.migrateToValue })
        .where('"project_id" = :projectId AND "priority" = :value', { projectId, value: priority.value })
        .execute();

      await queryRunner.manager.remove(ProjectPriority, priority);
      await queryRunner.commitTransaction();

      this.auditService.log(
        'project_state_deleted' as any,
        userId, ip, ua,
        { projectId, priorityId, value: priority.value, migratedTo: dto.migrateToValue },
      );
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async reorder(
    projectId: string,
    userId: string,
    dto: ReorderPrioritiesDto,
    ip: string,
    ua: string,
  ): Promise<number> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let count = 0;
      for (const item of dto.items) {
        const p = await queryRunner.manager.findOne(ProjectPriority, {
          where: { id: item.priorityId, projectId },
        });
        if (p) {
          p.order = item.order;
          await queryRunner.manager.save(ProjectPriority, p);
          count++;
        }
      }
      await queryRunner.commitTransaction();

      this.auditService.log(
        'project_state_updated' as any,
        userId, ip, ua,
        { projectId, reorderedCount: count },
      );
      return count;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async seedDefaults(projectId: string, manager?: EntityManager): Promise<void> {
    const m = manager ?? this.repo.manager;
    for (const p of DEFAULT_PRIORITIES) {
      const priority = m.create(ProjectPriority, { ...p, projectId });
      await m.save(ProjectPriority, priority);
    }
  }
}
