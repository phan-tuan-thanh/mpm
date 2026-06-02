import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Task } from './entities/task.entity';
import { Project } from '../project/entities/project.entity';
import { ProjectState } from '../project/entities/project-state.entity';

@Injectable()
export class TaskService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Tạo task mới
   */
  async create(
    projectId: string,
    reporterId: string,
    dto: { title: string; description?: string; estimateValue?: number; stateId?: string },
  ): Promise<Task> {
    return this.dataSource.transaction(async (em) => {
      // 1. Get project with write lock for atomic task counter
      const project = await em.findOne(Project, {
        where: { id: projectId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!project) {
        throw new NotFoundException('Project not found');
      }

      // 2. Increment task counter
      project.taskCounter += 1;
      await em.save(Project, project);

      // 3. Resolve stateId
      let stateId = dto.stateId;
      if (!stateId) {
        const defState = await em.findOne(ProjectState, {
          where: { projectId, isDefault: true },
        });
        if (!defState) {
          throw new UnprocessableEntityException('No default state configured for this project');
        }
        stateId = defState.id;
      } else {
        // Validate state belongs to project
        const state = await em.findOne(ProjectState, {
          where: { id: stateId, projectId },
        });
        if (!state) {
          throw new UnprocessableEntityException('State does not belong to this project');
        }
      }

      // 4. Create task
      const task = em.create(Task, {
        projectId,
        reporterId,
        taskId: `${project.key}-${project.taskCounter}`,
        title: dto.title,
        description: dto.description ?? null,
        estimateValue: dto.estimateValue ?? null,
        stateId,
      });

      return em.save(Task, task);
    });
  }

  /**
   * Lấy danh sách tasks của project
   */
  async findAll(
    projectId: string,
    query?: { isBacklog?: boolean; stateGroup?: string },
  ): Promise<Task[]> {
    const qb = this.taskRepository.createQueryBuilder('task')
      .leftJoinAndSelect('task.state', 'state')
      .leftJoinAndSelect('task.reporter', 'reporter')
      .where('task.projectId = :projectId', { projectId });

    if (query?.isBacklog === true || query?.stateGroup === 'backlog') {
      qb.andWhere('state.group IN (:...groups)', {
        groups: ['backlog', 'unstarted', 'started'],
      });
    }

    qb.orderBy('task.createdAt', 'DESC');
    return qb.getMany();
  }

  /**
   * Cập nhật task
   */
  async update(
    projectId: string,
    taskId: string,
    dto: { title?: string; description?: string; estimateValue?: number | null; stateId?: string },
  ): Promise<Task> {
    const task = await this.taskRepository.findOne({
      where: { id: taskId, projectId },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (dto.title !== undefined) task.title = dto.title;
    if (dto.description !== undefined) task.description = dto.description ?? null;
    if (dto.estimateValue !== undefined) task.estimateValue = dto.estimateValue;

    if (dto.stateId !== undefined) {
      const state = await this.dataSource.getRepository(ProjectState).findOne({
        where: { id: dto.stateId, projectId },
      });
      if (!state) {
        throw new UnprocessableEntityException('State does not belong to this project');
      }
      task.stateId = dto.stateId;
    }

    return this.taskRepository.save(task);
  }
}
