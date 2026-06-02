import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { TaskRelation, TaskRelationType } from '../entities/task-relation.entity';
import { Task } from '../entities/task.entity';
import { ActivityService } from '../activity/activity.service';

const INVERSE_TYPE: Record<TaskRelationType, TaskRelationType> = {
  blocking: 'blocked_by',
  blocked_by: 'blocking',
  relates_to: 'relates_to',
  duplicate_of: 'duplicate_of',
};

@Injectable()
export class RelationService {
  constructor(
    @InjectRepository(TaskRelation)
    private readonly relationRepo: Repository<TaskRelation>,
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
    private readonly dataSource: DataSource,
    private readonly activityService: ActivityService,
  ) {}

  async create(
    sourceTaskId: string,
    userId: string,
    projectId: string,
    dto: { targetTaskId: string; relationType: TaskRelationType },
  ): Promise<TaskRelation> {
    if (sourceTaskId === dto.targetTaskId) {
      throw new UnprocessableEntityException('A task cannot be related to itself');
    }

    // Verify target task exists in same project
    const targetTask = await this.taskRepo.findOne({
      where: { id: dto.targetTaskId, projectId },
    });
    if (!targetTask) throw new NotFoundException('Target task not found in this project');

    // Check for circular blocking dependency
    if (dto.relationType === 'blocking') {
      const circular = await this.relationRepo.findOne({
        where: {
          sourceTaskId: dto.targetTaskId,
          targetTaskId: sourceTaskId,
          relationType: 'blocking',
        },
      });
      if (circular) {
        throw new UnprocessableEntityException('CIRCULAR_DEPENDENCY: This relation would create a circular blocking dependency');
      }
    }

    return this.dataSource.transaction(async (em) => {
      // Check duplicate
      const existing = await em.findOne(TaskRelation, {
        where: { sourceTaskId, targetTaskId: dto.targetTaskId, relationType: dto.relationType },
      });
      if (existing) throw new UnprocessableEntityException('This relation already exists');

      const relation = em.create(TaskRelation, {
        sourceTaskId,
        targetTaskId: dto.targetTaskId,
        relationType: dto.relationType,
        createdBy: userId,
      });
      const saved = await em.save(TaskRelation, relation);

      // Create inverse relation
      const inverseType = INVERSE_TYPE[dto.relationType];
      if (dto.relationType !== inverseType) {
        const inverseExists = await em.findOne(TaskRelation, {
          where: { sourceTaskId: dto.targetTaskId, targetTaskId: sourceTaskId, relationType: inverseType },
        });
        if (!inverseExists) {
          const inverse = em.create(TaskRelation, {
            sourceTaskId: dto.targetTaskId,
            targetTaskId: sourceTaskId,
            relationType: inverseType,
            createdBy: userId,
          });
          await em.save(TaskRelation, inverse);
        }
      }

      await this.activityService.log(sourceTaskId, userId, 'relation_added', {
        field: 'relation',
        newValue: `${dto.relationType}:${dto.targetTaskId}`,
      });

      return saved;
    });
  }

  async delete(relationId: string, sourceTaskId: string, userId: string): Promise<void> {
    const relation = await this.relationRepo.findOne({ where: { id: relationId, sourceTaskId } });
    if (!relation) throw new NotFoundException('Relation not found');

    await this.dataSource.transaction(async (em) => {
      await em.delete(TaskRelation, { id: relationId });

      // Remove inverse relation
      const inverseType = INVERSE_TYPE[relation.relationType];
      if (relation.relationType !== inverseType) {
        await em.delete(TaskRelation, {
          sourceTaskId: relation.targetTaskId,
          targetTaskId: relation.sourceTaskId,
          relationType: inverseType,
        });
      }
    });

    await this.activityService.log(sourceTaskId, userId, 'relation_removed', {
      field: 'relation',
      oldValue: `${relation.relationType}:${relation.targetTaskId}`,
    });
  }
}
