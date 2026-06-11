import { Injectable, ConflictException, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Project } from './entities/project.entity';
import { ProjectMember } from '../auth/entities/project-member.entity';
import { User } from '../auth/entities/user.entity';
import { ProjectState } from './entities/project-state.entity';
import { ProjectEstimateConfig } from './entities/project-estimate-config.entity';
import { AuditService } from '../audit/audit.service';
import { StateTemplateService } from './state-template/state-template.service';
import { PriorityService } from './priority/priority.service';
import { AuthEvent } from '../auth/constants/auth-events';
import { CreateProjectDto } from './dto';
import { ProjectNetwork, EstimateType, StateGroup } from '@mpm/shared-types';
import { validateEmoji, validateTimezone } from './project.validation';
import { DEFAULT_STATES } from './project.constants';
import { extractPlainText } from '../common/tiptap-extractor';

@Injectable()
export class ProjectCreateService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(ProjectMember)
    private readonly projectMemberRepository: Repository<ProjectMember>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly auditService: AuditService,
    private readonly stateTemplateService: StateTemplateService,
    private readonly priorityService: PriorityService,
    private readonly dataSource: DataSource,
  ) {}

  async create(userId: string, dto: CreateProjectDto, ipAddress: string, userAgent: string): Promise<Project> {
    const key = dto.key.toUpperCase();
    const existing = await this.projectRepository.findOne({ where: { key } });
    if (existing) {
      throw new ConflictException({
        statusCode: 409, error: 'Conflict', message: `Project key "${key}" already exists`,
        errorCode: 'PROJECT_KEY_EXISTS', timestamp: new Date().toISOString(),
      });
    }

    if (dto.emoji) validateEmoji(dto.emoji);
    if (dto.timezone) validateTimezone(dto.timezone);
    if (dto.leadId && dto.leadId !== userId) {
      throw new UnprocessableEntityException({
        statusCode: 422, error: 'Unprocessable Entity', message: 'Project lead must be a member of the project',
        errorCode: 'LEAD_NOT_MEMBER', timestamp: new Date().toISOString(),
      });
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const project = queryRunner.manager.create(Project, {
        name: dto.name, key, description: dto.description ?? null,
        descriptionPlain: extractPlainText(dto.description ?? null), status: 'active',
        ownerId: userId, taskCounter: 0, emoji: dto.emoji ?? null, network: dto.network ?? ProjectNetwork.SECRET,
        leadId: dto.leadId ?? null, timezone: dto.timezone ?? 'Asia/Ho_Chi_Minh',
      });
      const saved = await queryRunner.manager.save(Project, project);

      const member = queryRunner.manager.create(ProjectMember, { userId, projectId: saved.id, projectRole: 'Scrum_Master' });
      await queryRunner.manager.save(ProjectMember, member);

      let statesSeeded = false;
      if (dto.stateTemplate === 'workspace' && saved.workspaceId) {
        const result = await this.stateTemplateService.applyToProject(saved.workspaceId, saved.id);
        if (result.addedCount > 0) statesSeeded = true;
      }

      if (!statesSeeded) {
        for (const state of DEFAULT_STATES) {
          const ps = queryRunner.manager.create(ProjectState, { ...state, projectId: saved.id });
          await queryRunner.manager.save(ProjectState, ps);
        }
      }

      const pec = queryRunner.manager.create(ProjectEstimateConfig, {
        projectId: saved.id, estimateType: EstimateType.POINTS, values: [0, 0.5, 1, 2, 3, 5, 8, 13, 21],
      });
      await queryRunner.manager.save(ProjectEstimateConfig, pec);

      await this.priorityService.seedDefaults(saved.id, queryRunner.manager);

      await queryRunner.commitTransaction();

      this.auditService.log(AuthEvent.PROJECT_CREATED, userId, ipAddress, userAgent, { projectId: saved.id });

      saved.features = {
        cycles: saved.featureCycles, modules: saved.featureModules, views: saved.featureViews,
        pages: saved.featurePages, intake: saved.featureIntake, timeTracking: saved.featureTimeTracking,
      };
      saved.stateStats = {
        [StateGroup.BACKLOG]: 0, [StateGroup.UNSTARTED]: 0, [StateGroup.STARTED]: 0,
        [StateGroup.COMPLETED]: 0, [StateGroup.CANCELLED]: 0,
      };
      return saved;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
