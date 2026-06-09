import { Injectable } from '@nestjs/common';
import { Task } from './entities/task.entity';
import { TaskQueryService } from './task-query.service';
import { TaskCreateService } from './task-create.service';
import { TaskUpdateService } from './task-update.service';
import { TaskDeleteService } from './task-delete.service';
import { TaskOrderService } from './task-order.service';
import type { SubItemsTreeResponse } from '@mpm/shared-types';

@Injectable()
export class TaskService {
  constructor(
    private readonly queryService: TaskQueryService,
    private readonly createService: TaskCreateService,
    private readonly updateService: TaskUpdateService,
    private readonly deleteService: TaskDeleteService,
    private readonly orderService: TaskOrderService,
  ) {}

  async create(projectId: string, reporterId: string, dto: any): Promise<Task> {
    return this.createService.create(projectId, reporterId, dto);
  }

  async update(projectId: string, taskId: string, userId: string, dto: any): Promise<Task> {
    return this.updateService.update(projectId, taskId, userId, dto);
  }

  async delete(projectId: string, taskId: string, userId: string): Promise<void> {
    return this.deleteService.delete(projectId, taskId, userId);
  }

  async bulkDelete(projectId: string, taskIds: string[], userId: string) {
    return this.deleteService.bulkDelete(projectId, taskIds, userId);
  }

  async reorder(projectId: string, items: any[], userId: string): Promise<void> {
    return this.orderService.reorder(projectId, items, userId);
  }

  async findAll(projectId: string, query: any) {
    return this.queryService.findAll(projectId, query);
  }

  async findById(projectId: string, taskIdOrUuid: string): Promise<Task> {
    return this.queryService.findById(projectId, taskIdOrUuid);
  }

  async search(projectId: string, query: string): Promise<Task[]> {
    return this.queryService.search(projectId, query);
  }

  async getChildrenTree(projectId: string, taskId: string, depth?: number): Promise<SubItemsTreeResponse> {
    return this.queryService.getChildrenTree(projectId, taskId, depth);
  }
}
