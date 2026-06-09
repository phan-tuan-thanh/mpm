import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { ModuleLifecycleStatus } from '@mpm/shared-types';
import { ModuleLifecycleLog } from '../entities/module-lifecycle-log.entity';

@Injectable()
export class ModuleLifecycleAuditService {
  private readonly logger = new Logger(ModuleLifecycleAuditService.name);

  constructor(
    @InjectRepository(ModuleLifecycleLog)
    private readonly logRepo: Repository<ModuleLifecycleLog>,
  ) {}

  logTransition(params: {
    moduleId: string;
    previousStatus: ModuleLifecycleStatus;
    newStatus: ModuleLifecycleStatus;
    changedBy: string;
    reason?: string;
  }): void {
    this.logRepo
      .insert({
        moduleId: params.moduleId,
        previousStatus: params.previousStatus,
        newStatus: params.newStatus,
        changedBy: params.changedBy,
        reason: params.reason ?? null,
      })
      .catch((err) =>
        this.logger.error('Failed to write lifecycle audit log', {
          ...params,
          err,
        }),
      );
  }
}
