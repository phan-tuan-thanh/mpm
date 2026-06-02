import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectEstimateConfig } from '../entities/project-estimate-config.entity';
import { Task } from '../../task/entities/task.entity';
import { AuditService } from '../../audit/audit.service';
import {
  UpdateEstimateConfigDto,
  EstimateType,
} from '@mpm/shared-types';

@Injectable()
export class EstimateConfigService {
  constructor(
    @InjectRepository(ProjectEstimateConfig)
    private readonly configRepository: Repository<ProjectEstimateConfig>,
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    private readonly auditService: AuditService,
  ) {}

  private readonly templates = {
    fibonacci: [0, 0.5, 1, 2, 3, 5, 8, 13, 21],
    linear: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    squares: [1, 4, 9, 16, 25],
  };

  /**
   * Lấy cấu hình estimate
   */
  async getConfig(projectId: string) {
    const config = await this.configRepository.findOne({
      where: { projectId },
    });

    if (!config) {
      throw new NotFoundException({
        statusCode: 404,
        error: 'Not Found',
        message: 'Estimate configuration not found for this project',
        errorCode: 'ESTIMATE_CONFIG_NOT_FOUND',
        timestamp: new Date().toISOString(),
      });
    }

    return {
      estimateType: config.estimateType,
      values: config.values,
      templates: this.templates,
    };
  }

  /**
   * Cập nhật cấu hình estimate
   */
  async updateConfig(
    projectId: string,
    userId: string,
    dto: UpdateEstimateConfigDto,
    ip: string,
    ua: string,
  ) {
    const config = await this.configRepository.findOne({
      where: { projectId },
    });

    if (!config) {
      throw new NotFoundException({
        statusCode: 404,
        error: 'Not Found',
        message: 'Estimate configuration not found for this project',
        errorCode: 'ESTIMATE_CONFIG_NOT_FOUND',
        timestamp: new Date().toISOString(),
      });
    }

    const { estimateType, values } = dto;

    // Validate values length: min 2, max 12
    if (!values || !Array.isArray(values) || values.length < 2 || values.length > 12) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Values must be an array of length between 2 and 12',
        errorCode: 'INVALID_VALUES_LENGTH',
        timestamp: new Date().toISOString(),
      });
    }

    // Validate based on type
    if (estimateType === EstimateType.POINTS || estimateType === EstimateType.TIME) {
      for (const val of values) {
        if (typeof val !== 'number' || isNaN(val) || val < 0) {
          throw new BadRequestException({
            statusCode: 400,
            error: 'Bad Request',
            message: `${estimateType} values must be positive numbers`,
            errorCode: 'INVALID_NUMERIC_VALUES',
            timestamp: new Date().toISOString(),
          });
        }
      }

      if (estimateType === EstimateType.POINTS) {
        // Points must have unique values
        const unique = new Set(values);
        if (unique.size !== values.length) {
          throw new BadRequestException({
            statusCode: 400,
            error: 'Bad Request',
            message: 'Points values must not contain duplicate values',
            errorCode: 'DUPLICATE_POINTS_VALUES',
            timestamp: new Date().toISOString(),
          });
        }
      }
    } else if (estimateType === EstimateType.CATEGORIES) {
      for (const val of values) {
        if (typeof val !== 'string' || val.trim().length === 0 || val.length > 20) {
          throw new BadRequestException({
            statusCode: 400,
            error: 'Bad Request',
            message: 'Categories values must be strings between 1 and 20 characters',
            errorCode: 'INVALID_CATEGORY_VALUES',
            timestamp: new Date().toISOString(),
          });
        }
      }
    } else {
      throw new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Invalid estimate type',
        errorCode: 'INVALID_ESTIMATE_TYPE',
        timestamp: new Date().toISOString(),
      });
    }

    const typeChanged = config.estimateType !== estimateType;
    let willResetEstimates = false;
    let affectedTaskCount = 0;

    if (typeChanged) {
      willResetEstimates = true;
      // Get affected tasks count
      affectedTaskCount = await this.taskRepository.count({
        where: { projectId }, // Count all tasks since all will have their estimates reset
      });

      // Background reset estimates
      setImmediate(async () => {
        try {
          await this.taskRepository.update(
            { projectId },
            { estimateValue: null },
          );
        } catch (err) {
          console.error(`Failed to reset estimates for project ${projectId}`, err);
        }
      });
    }

    config.estimateType = estimateType;
    config.values = values;

    const saved = await this.configRepository.save(config);

    // Audit log
    this.auditService.log(
      'project_estimate_updated' as any,
      userId,
      ip,
      ua,
      { projectId, estimateType, values },
    );

    return {
      estimateType: saved.estimateType,
      values: saved.values,
      willResetEstimates,
      affectedTaskCount,
    };
  }
}
