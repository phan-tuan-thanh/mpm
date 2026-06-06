import { Injectable } from '@nestjs/common';
import { Project } from './entities/project.entity';
import { ProjectCreateService } from './project-create.service';
import { ProjectQueryService } from './project-query.service';
import { ProjectUpdateService } from './project-update.service';
import { ProjectDeleteService } from './project-delete.service';
import { CreateProjectDto, UpdateProjectDto } from './dto';
import { ProjectListItem, ProjectFeatures, ProjectRole } from '@mpm/shared-types';

@Injectable()
export class ProjectService {
  constructor(
    private readonly createService: ProjectCreateService,
    private readonly queryService: ProjectQueryService,
    private readonly updateService: ProjectUpdateService,
    private readonly deleteService: ProjectDeleteService,
  ) {}

  async create(userId: string, dto: CreateProjectDto, ip: string, ua: string): Promise<Project> {
    return this.createService.create(userId, dto, ip, ua);
  }

  async findAll(userId: string, query: { name?: string; status?: string; network?: string }, systemRole: string): Promise<ProjectListItem[]> {
    return this.queryService.findAll(userId, query, systemRole);
  }

  async findById(id: string, userId: string, systemRole: string): Promise<Project> {
    return this.queryService.findById(id, userId, systemRole);
  }

  async findByKey(key: string, userId: string, systemRole: string): Promise<Project> {
    return this.queryService.findByKey(key, userId, systemRole);
  }

  async update(id: string, userId: string, dto: UpdateProjectDto, systemRole: string, ip: string, ua: string): Promise<Project> {
    return this.updateService.update(id, userId, dto, systemRole, ip, ua);
  }

  async updateFeatures(id: string, userId: string, dto: any, systemRole: string, ip: string, ua: string): Promise<ProjectFeatures> {
    return this.updateService.updateFeatures(id, userId, dto, systemRole, ip, ua);
  }

  async join(projectId: string, userId: string, ip: string, ua: string): Promise<{ role: ProjectRole; projectId: string }> {
    return this.updateService.join(projectId, userId, ip, ua);
  }

  async archive(id: string, userId: string, systemRole: string, ip: string, ua: string): Promise<Project> {
    return this.deleteService.archive(id, userId, systemRole, ip, ua);
  }

  async delete(id: string, userId: string, systemRole: string, ip: string, ua: string): Promise<void> {
    return this.deleteService.delete(id, userId, systemRole, ip, ua);
  }

  async bulkDelete(ids: string[], userId: string, systemRole: string, ip: string, ua: string): Promise<{ deleted: string[]; failed: any[] }> {
    return this.deleteService.bulkDelete(ids, userId, systemRole, ip, ua);
  }
}
