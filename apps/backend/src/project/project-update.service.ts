import { Injectable, NotFoundException, ForbiddenException, ConflictException, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from './entities/project.entity';
import { ProjectMember } from '../auth/entities/project-member.entity';
import { AuditService } from '../audit/audit.service';
import { ProjectQueryService } from './project-query.service';
import { UpdateProjectDto } from './dto';
import { ProjectFeatures, ProjectNetwork, ProjectRole, UpdateFeaturesDto } from '@mpm/shared-types';
import { validateEmoji, validateTimezone } from './project.validation';
import { extractPlainText } from '../common/tiptap-extractor';

@Injectable()
export class ProjectUpdateService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(ProjectMember)
    private readonly projectMemberRepository: Repository<ProjectMember>,
    private readonly auditService: AuditService,
    private readonly queryService: ProjectQueryService,
  ) {}

  async update(id: string, userId: string, dto: UpdateProjectDto, systemRole: string, ip: string, ua: string): Promise<Project> {
    const project = await this.projectRepository.findOne({ where: { id }, relations: ['members'] });
    if (!project) throw new NotFoundException('Project not found');

    const isSM = project.members.find((m) => m.userId === userId)?.projectRole === 'Scrum_Master';
    if (!isSM && systemRole !== 'Admin') {
      throw new ForbiddenException('Only Scrum Master or Admin can perform this action.');
    }

    if (dto.name !== undefined) project.name = dto.name;
    if (dto.description !== undefined) {
      project.description = dto.description ?? null;
      project.descriptionPlain = extractPlainText(project.description);
    }
    if (dto.emoji !== undefined) {
      validateEmoji(dto.emoji);
      project.emoji = dto.emoji ?? null;
    }
    if (dto.network !== undefined) project.network = dto.network;
    if (dto.timezone !== undefined) {
      validateTimezone(dto.timezone);
      project.timezone = dto.timezone;
    }
    if (dto.leadId !== undefined) {
      if (dto.leadId !== null) await this.validateLead(id, dto.leadId);
      project.leadId = dto.leadId;
    }

    await this.projectRepository.save(project);
    this.auditService.log('project_updated' as any, userId, ip, ua, { projectId: id });
    return this.queryService.findById(id, userId, systemRole);
  }

  async updateFeatures(id: string, userId: string, dto: UpdateFeaturesDto, systemRole: string, ip: string, ua: string): Promise<ProjectFeatures> {
    const project = await this.projectRepository.findOne({ where: { id }, relations: ['members'] });
    if (!project) throw new NotFoundException('Project not found');

    const isSM = project.members.find((m) => m.userId === userId)?.projectRole === 'Scrum_Master';
    if (!isSM && systemRole !== 'Admin') {
      throw new ForbiddenException('Only Scrum Master or Admin can perform this action.');
    }

    if (dto.cycles !== undefined) project.featureCycles = dto.cycles;
    if (dto.modules !== undefined) project.featureModules = dto.modules;
    if (dto.views !== undefined) project.featureViews = dto.views;
    if (dto.pages !== undefined) project.featurePages = dto.pages;
    if (dto.intake !== undefined) project.featureIntake = dto.intake;
    if (dto.timeTracking !== undefined) project.featureTimeTracking = dto.timeTracking;

    await this.projectRepository.save(project);
    this.auditService.log('project_features_updated' as any, userId, ip, ua, { projectId: id });
    return {
      cycles: project.featureCycles, modules: project.featureModules, views: project.featureViews,
      pages: project.featurePages, intake: project.featureIntake, timeTracking: project.featureTimeTracking,
    };
  }

  async join(projectId: string, userId: string, ip: string, ua: string): Promise<{ role: ProjectRole; projectId: string }> {
    const project = await this.projectRepository.findOne({ where: { id: projectId }, relations: ['members'] });
    if (!project) throw new NotFoundException('Project not found');

    if (project.network !== ProjectNetwork.PUBLIC) {
      throw new ForbiddenException('Cannot join a secret project. You must be invited.');
    }

    if (project.members.some((m) => m.userId === userId)) {
      throw new ConflictException('You are already a member of this project');
    }

    const member = this.projectMemberRepository.create({ userId, projectId, projectRole: 'Developer' });
    await this.projectMemberRepository.save(member);
    this.auditService.log('member_joined_public' as any, userId, ip, ua, { projectId });
    return { role: 'Developer', projectId };
  }

  private async validateLead(projectId: string, leadId: string): Promise<void> {
    const isMember = await this.projectMemberRepository.findOne({ where: { projectId, userId: leadId } });
    if (!isMember) {
      throw new UnprocessableEntityException({
        statusCode: 422, error: 'Unprocessable Entity', message: 'Project lead must be a member of the project',
        errorCode: 'LEAD_NOT_MEMBER', timestamp: new Date().toISOString(),
      });
    }
  }
}
