import { UnprocessableEntityException } from '@nestjs/common';
import type { ModuleLifecycleStatus } from '@mpm/shared-types';
import { MODULE_LIFECYCLE_STATUSES } from '@mpm/shared-types';

export class InvalidTransitionException extends UnprocessableEntityException {
  constructor(
    current: ModuleLifecycleStatus,
    requested: ModuleLifecycleStatus,
    allowed: readonly ModuleLifecycleStatus[],
  ) {
    super({
      errorCode: 'INVALID_TRANSITION',
      message: `Cannot transition from '${current}' to '${requested}'`,
      currentStatus: current,
      requestedStatus: requested,
      allowedTransitions: allowed,
    });
  }
}

export class InvalidStatusValueException extends UnprocessableEntityException {
  constructor(value: string) {
    super({
      errorCode: 'INVALID_STATUS_VALUE',
      message: `'${value}' is not a valid module lifecycle status`,
      value,
      allowedValues: MODULE_LIFECYCLE_STATUSES,
    });
  }
}
