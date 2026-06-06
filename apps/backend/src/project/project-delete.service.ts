import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Project } from './entities/project.entity';
import { AuditService } from '../audit/audit.service';
import { ProjectQueryService } from './project-query.service';
import { AuthEvent } from '../auth/constants/auth-events';

@Injectable()
export class ProjectDeleteService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    private readonly auditService: AuditService,
    private readonly dataSource: DataSource,
    private readonly queryService: ProjectQueryService,
  ) {}

  async archive(id: string, userId: string, systemRole: string, ip: string, ua: string): Promise<Project> {
    const project = await this.projectRepository.findOne({ where: { id }, relations: ['members'] });
    if (!project) throw new NotFoundException('Project not found');

    const isSM = project.members.find((m) => m.userId === userId)?.projectRole === 'Scrum_Master';
    if (!isSM && systemRole !== 'Admin') {
      throw new ForbiddenException('Only Scrum Master or Admin can perform this action.');
    }

    project.status = 'archived';
    project.archivedAt = new Date();
    await this.projectRepository.save(project);
    this.auditService.log(AuthEvent.PROJECT_ARCHIVED, userId, ip, ua, { projectId: id });
    return this.queryService.findById(id, userId, systemRole);
  }

  async delete(id: string, userId: string, systemRole: string, ip: string, ua: string): Promise<void> {
    const project = await this.projectRepository.findOne({ where: { id }, relations: ['members'] });
    if (!project) throw new NotFoundException('Project not found');

    const isSM = project.members.find((m) => m.userId === userId)?.projectRole === 'Scrum_Master';
    if (!isSM && systemRole !== 'Admin') {
      throw new ForbiddenException('Only Scrum Master or Admin can perform this action.');
    }

    await this.projectRepository.remove(project);
    this.auditService.log(AuthEvent.PROJECT_DELETED, userId, ip, ua, { projectId: id });
  }

  async bulkDelete(
    ids: string[],
    userId: string,
    systemRole: string,
    ip: string,
    ua: string,
  ): Promise<{ deleted: string[]; failed: { id: string; reason: string }[] }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const deleted: string[] = [];
      for (const id of ids) {
        const project = await queryRunner.manager.findOne(Project, { where: { id }, relations: ['members'] });
        if (!project) throw new Error(`Project ${id} not found`);

        const isSM = project.members.find((m) => m.userId === userId)?.projectRole === 'Scrum_Master';
        if (!isSM && systemRole !== 'Admin') throw new Error(`Project ${id} - Insufficient project role`);

        await queryRunner.manager.remove(Project, project);
        this.auditService.log(AuthEvent.PROJECT_DELETED, userId, ip, ua, { projectId: id });
        deleted.push(id);
      }
      await queryRunner.commitTransaction();
      return { deleted, failed: [] };
    } catch (error: any) {
      await queryRunner.rollbackTransaction();
      return {
        deleted: [],
        failed: ids.map((id) => ({ id, reason: error.message || 'Unknown error during bulk delete' })),
      };
    } finally {
      await queryRunner.release();
    }
  }
}
