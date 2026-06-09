import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ModuleLifecycleStatus,
  LIFECYCLE_TRANSITIONS,
  TERMINAL_STATUSES,
} from '@mpm/shared-types';
import { Module as ModuleEntity } from '../entities/module.entity';
import { InvalidTransitionException } from './module-lifecycle.exceptions';
import { ModuleLifecycleAuditService } from './module-lifecycle-audit.service';

export interface ModuleWithTransitions extends ModuleEntity {
  allowedTransitions: ModuleLifecycleStatus[];
}

@Injectable()
export class ModuleLifecycleService {
  private readonly logger = new Logger(ModuleLifecycleService.name);

  constructor(
    @InjectRepository(ModuleEntity)
    private readonly moduleRepo: Repository<ModuleEntity>,
    private readonly auditService: ModuleLifecycleAuditService,
  ) {}

  validateTransition(current: ModuleLifecycleStatus, target: ModuleLifecycleStatus): void {
    const allowed = LIFECYCLE_TRANSITIONS[current];
    if (!(allowed as readonly string[]).includes(target)) {
      throw new InvalidTransitionException(current, target, allowed);
    }
  }

  getAllowedTransitions(status: ModuleLifecycleStatus): ModuleLifecycleStatus[] {
    return [...LIFECYCLE_TRANSITIONS[status]];
  }

  isTerminal(status: ModuleLifecycleStatus): boolean {
    return (TERMINAL_STATUSES as readonly string[]).includes(status);
  }

  async transition(
    moduleId: string,
    targetStatus: ModuleLifecycleStatus,
    userId: string,
    reason?: string,
  ): Promise<ModuleWithTransitions> {
    const module = await this.moduleRepo.findOne({ where: { id: moduleId } });
    if (!module) {
      throw new NotFoundException({
        statusCode: 404,
        error: 'Not Found',
        message: 'Module not found',
        errorCode: 'MODULE_NOT_FOUND',
        timestamp: new Date().toISOString(),
      });
    }

    this.validateTransition(module.status as ModuleLifecycleStatus, targetStatus);

    const previousStatus = module.status as ModuleLifecycleStatus;
    module.status = targetStatus;

    const saved = await this.moduleRepo.save(module);

    this.auditService.logTransition({
      moduleId,
      previousStatus,
      newStatus: targetStatus,
      changedBy: userId,
      reason,
    });

    return {
      ...saved,
      allowedTransitions: this.getAllowedTransitions(saved.status as ModuleLifecycleStatus),
    };
  }
}
