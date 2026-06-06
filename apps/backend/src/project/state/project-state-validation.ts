import {
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { ProjectState } from '../entities/project-state.entity';

/**
 * Project State Validation — pure helper functions
 *
 * Tập hợp các validation logic tái sử dụng cho ProjectStateService.
 * Pure functions — không có side effects, không inject dependencies.
 */

/**
 * Kiểm tra state tồn tại — throw NotFoundException nếu không tìm thấy
 */
export function assertStateExists(
  state: ProjectState | null | undefined,
): asserts state is ProjectState {
  if (!state) {
    throw new NotFoundException({
      statusCode: 404,
      error: 'Not Found',
      message: 'Project state not found',
      errorCode: 'STATE_NOT_FOUND',
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Kiểm tra không được xóa/migrate default state
 */
export function assertNotDefaultState(state: ProjectState): void {
  if (state.isDefault) {
    throw new UnprocessableEntityException({
      statusCode: 422,
      error: 'Unprocessable Entity',
      message: 'Cannot delete the default project state',
      errorCode: 'DEFAULT_STATE',
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Kiểm tra project còn ít nhất 1 state (sau khi xóa không được về 0)
 */
export function assertMinStatesCount(count: number): void {
  if (count <= 1) {
    throw new UnprocessableEntityException({
      statusCode: 422,
      error: 'Unprocessable Entity',
      message: 'Project must have at least 1 state',
      errorCode: 'LAST_STATE',
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Kiểm tra state không đang được sử dụng bởi tasks
 */
export function assertStateNotInUse(tasksCount: number): void {
  if (tasksCount > 0) {
    throw new UnprocessableEntityException({
      statusCode: 422,
      error: 'Unprocessable Entity',
      message: 'State is in use by tasks. Please migrate tasks first.',
      errorCode: 'STATE_IN_USE',
      affectedCount: tasksCount,
      timestamp: new Date().toISOString(),
    });
  }
}
