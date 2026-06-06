import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Module as ModuleEntity } from '../entities/module.entity';
import { TaskModule } from '../entities/task-module.entity';

/**
 * Module Task Service — quản lý việc gán/gỡ tasks vào/khỏi modules
 *
 * Chịu trách nhiệm:
 * - addTasks: batch gán tasks vào module (idempotent)
 * - removeTask: gỡ một task khỏi module
 */
@Injectable()
export class ModuleTaskService {
  constructor(
    @InjectRepository(ModuleEntity)
    private readonly moduleRepo: Repository<ModuleEntity>,
    @InjectRepository(TaskModule)
    private readonly taskModuleRepo: Repository<TaskModule>,
  ) {}

  /**
   * Batch gán tasks vào module — idempotent (ON CONFLICT DO NOTHING)
   * Trả về số tasks thực sự thêm mới và số đã tồn tại
   */
  async addTasks(
    moduleId: string,
    taskIds: string[],
  ): Promise<{ added: number; alreadyExists: number }> {
    // Verify module tồn tại
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

    if (!taskIds.length) {
      return { added: 0, alreadyExists: 0 };
    }

    // Batch INSERT với ON CONFLICT DO NOTHING (idempotent)
    const result = await this.taskModuleRepo
      .createQueryBuilder()
      .insert()
      .into(TaskModule)
      .values(
        taskIds.map((taskId) => ({
          taskId,
          moduleId,
        })),
      )
      .orIgnore() // ON CONFLICT DO NOTHING
      .execute();

    const added = result.identifiers.length;
    const alreadyExists = taskIds.length - added;

    return { added, alreadyExists };
  }

  /**
   * Gỡ một task khỏi module
   */
  async removeTask(moduleId: string, taskId: string): Promise<void> {
    const taskModule = await this.taskModuleRepo.findOne({
      where: { moduleId, taskId },
    });

    if (!taskModule) {
      throw new NotFoundException({
        statusCode: 404,
        error: 'Not Found',
        message: 'Task is not assigned to this module',
        errorCode: 'TASK_MODULE_NOT_FOUND',
        timestamp: new Date().toISOString(),
      });
    }

    await this.taskModuleRepo.remove(taskModule);
  }
}
