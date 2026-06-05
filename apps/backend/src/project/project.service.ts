import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Project } from './entities/project.entity';
import { ProjectMember } from '../auth/entities/project-member.entity';
import { User } from '../auth/entities/user.entity';
import { ProjectState } from './entities/project-state.entity';
import { ProjectEstimateConfig } from './entities/project-estimate-config.entity';
import { AuditService } from '../audit/audit.service';
import { StateTemplateService } from './state-template/state-template.service';
import { AuthEvent } from '../auth/constants/auth-events';
import { CreateProjectDto, UpdateProjectDto } from './dto';
import {
  ProjectListItem,
  ProjectRole,
  ProjectStatus,
  ProjectNetwork,
  UpdateFeaturesDto,
  ProjectFeatures,
  StateGroup,
  EstimateType,
  MemberResponse,
} from '@mpm/shared-types';

@Injectable()
export class ProjectService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(ProjectMember)
    private readonly projectMemberRepository: Repository<ProjectMember>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly auditService: AuditService,
    private readonly stateTemplateService: StateTemplateService,
    private readonly dataSource: DataSource,
  ) {}

  private readonly DEFAULT_STATES = [
    { name: 'Backlog',     color: '#6B7280', group: StateGroup.BACKLOG,    isDefault: false, order: 0 },
    { name: 'Todo',        color: '#3B82F6', group: StateGroup.UNSTARTED,  isDefault: true,  order: 1 },
    { name: 'In Progress', color: '#F59E0B', group: StateGroup.STARTED,    isDefault: false, order: 2 },
    { name: 'In Review',   color: '#8B5CF6', group: StateGroup.STARTED,    isDefault: false, order: 3 },
    { name: 'Done',        color: '#10B981', group: StateGroup.COMPLETED,  isDefault: false, order: 4 },
    { name: 'Cancelled',   color: '#EF4444', group: StateGroup.CANCELLED,  isDefault: false, order: 5 },
  ];

  private validateTimezone(tz: string): void {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: tz });
    } catch (e) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        message: `Invalid IANA timezone: ${tz}`,
        errorCode: 'INVALID_TIMEZONE',
        timestamp: new Date().toISOString(),
      });
    }
  }

  private validateEmoji(emoji: string | null): void {
    if (emoji && emoji.length > 30) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Emoji or icon name must be at most 30 characters',
        errorCode: 'INVALID_EMOJI',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Tạo project mới
   */
  async create(
    userId: string,
    dto: CreateProjectDto,
    ipAddress: string,
    userAgent: string,
  ): Promise<Project> {
    const key = dto.key.toUpperCase();

    // 1. Kiểm tra duplicate key
    const existing = await this.projectRepository.findOne({
      where: { key },
    });

    if (existing) {
      throw new ConflictException({
        statusCode: 409,
        error: 'Conflict',
        message: `Project key "${key}" already exists`,
        errorCode: 'PROJECT_KEY_EXISTS',
        timestamp: new Date().toISOString(),
      });
    }

    // Validate emoji & timezone
    if (dto.emoji) this.validateEmoji(dto.emoji);
    if (dto.timezone) this.validateTimezone(dto.timezone);

    // Validate lead
    if (dto.leadId && dto.leadId !== userId) {
      throw new UnprocessableEntityException({
        statusCode: 422,
        error: 'Unprocessable Entity',
        message: 'Project lead must be a member of the project',
        errorCode: 'LEAD_NOT_MEMBER',
        timestamp: new Date().toISOString(),
      });
    }

    // 2. Insert project (sử dụng transaction)
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const project = queryRunner.manager.create(Project, {
        name: dto.name,
        key,
        description: dto.description ?? null,
        status: 'active',
        ownerId: userId,
        taskCounter: 0,
        emoji: dto.emoji ?? null,
        network: dto.network ?? ProjectNetwork.SECRET,
        leadId: dto.leadId ?? null,
        timezone: dto.timezone ?? 'Asia/Ho_Chi_Minh',
      });

      const savedProject = await queryRunner.manager.save(Project, project);

      // 3. Tự động assign Scrum_Master cho creator
      const projectMember = queryRunner.manager.create(ProjectMember, {
        userId,
        projectId: savedProject.id,
        projectRole: 'Scrum_Master',
      });

      await queryRunner.manager.save(ProjectMember, projectMember);

      // Seeding states: từ workspace template hoặc mặc định
      let statesSeeded = false;
      if (dto.stateTemplate === 'workspace' && savedProject.workspaceId) {
        const result = await this.stateTemplateService.applyToProject(
          savedProject.workspaceId,
          savedProject.id,
        );
        // Nếu workspace có templates → sử dụng, không seed defaults
        if (result.addedCount > 0) {
          statesSeeded = true;
        }
      }

      // Fallback: seed 6 default states nếu không dùng template hoặc workspace không có template
      if (!statesSeeded) {
        for (const state of this.DEFAULT_STATES) {
          const ps = queryRunner.manager.create(ProjectState, {
            ...state,
            projectId: savedProject.id,
          });
          await queryRunner.manager.save(ProjectState, ps);
        }
      }

      // Seeding default estimate config
      const pec = queryRunner.manager.create(ProjectEstimateConfig, {
        projectId: savedProject.id,
        estimateType: EstimateType.POINTS,
        values: [0, 0.5, 1, 2, 3, 5, 8, 13, 21],
      });
      await queryRunner.manager.save(ProjectEstimateConfig, pec);

      await queryRunner.commitTransaction();

      // 4. Ghi audit log
      this.auditService.log(
        AuthEvent.PROJECT_CREATED,
        userId,
        ipAddress,
        userAgent,
        { projectId: savedProject.id },
      );

      // Populate features and stateStats directly to prevent finding again (and fix unit testing mocks)
      savedProject.features = {
        cycles: savedProject.featureCycles,
        modules: savedProject.featureModules,
        views: savedProject.featureViews,
        pages: savedProject.featurePages,
        intake: savedProject.featureIntake,
        timeTracking: savedProject.featureTimeTracking,
      };
      savedProject.stateStats = {
        [StateGroup.BACKLOG]: 0,
        [StateGroup.UNSTARTED]: 0,
        [StateGroup.STARTED]: 0,
        [StateGroup.COMPLETED]: 0,
        [StateGroup.CANCELLED]: 0,
      };
      return savedProject;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Xem danh sách project có bộ lọc
   */
  async findAll(
    userId: string,
    query: { name?: string; status?: string; network?: string },
    systemRole: string,
  ): Promise<ProjectListItem[]> {
    const queryBuilder = this.projectRepository.createQueryBuilder('project')
      .leftJoinAndSelect('project.members', 'member', 'member.userId = :userId', { userId })
      .leftJoinAndSelect('project.lead', 'lead');

    if (systemRole !== 'Admin') {
      // Normal user chỉ thấy public projects HOẶC project mình là member
      queryBuilder.andWhere('(member.userId IS NOT NULL OR project.network = :publicNetwork)', {
        publicNetwork: ProjectNetwork.PUBLIC,
      });
    }

    if (query.name) {
      queryBuilder.andWhere('project.name ILIKE :name', { name: `%${query.name}%` });
    }

    if (query.status && query.status !== 'all') {
      queryBuilder.andWhere('project.status = :status', { status: query.status });
    }

    if (query.network && query.network !== 'all') {
      queryBuilder.andWhere('project.network = :network', { network: query.network });
    }

    queryBuilder.orderBy('project.createdAt', 'DESC');

    const projects = await queryBuilder.getMany();

    if (projects.length === 0) {
      return [];
    }

    // Bulk query state stats for all returned projects
    const projectIds = projects.map((p) => p.id);
    const stateStatsRaw = await this.dataSource.query(`
      SELECT ps.project_id as "projectId", ps.group as "group", COUNT(t.id) as "count"
      FROM project_states ps
      LEFT JOIN tasks t ON t.state_id = ps.id
      WHERE ps.project_id IN (${projectIds.map((id) => `'${id}'`).join(',')})
      GROUP BY ps.project_id, ps.group
    `);

    const statsMap: Record<string, Record<StateGroup, number>> = {};
    for (const p of projects) {
      statsMap[p.id] = {
        [StateGroup.BACKLOG]: 0,
        [StateGroup.UNSTARTED]: 0,
        [StateGroup.STARTED]: 0,
        [StateGroup.COMPLETED]: 0,
        [StateGroup.CANCELLED]: 0,
      };
    }
    for (const row of stateStatsRaw) {
      if (statsMap[row.projectId]) {
        statsMap[row.projectId][row.group as StateGroup] = parseInt(row.count, 10);
      }
    }

    return projects.map((p) => {
      const member = p.members && p.members[0];
      const myRole = member ? member.projectRole : (systemRole === 'Admin' ? 'Scrum_Master' : null);
      
      let leadUser: MemberResponse | null = null;
      if (p.lead) {
        leadUser = {
          userId: p.lead.id,
          displayName: p.lead.displayName,
          email: p.lead.email,
          avatarUrl: p.lead.avatarUrl,
          projectRole: null as any,
          joinedAt: null as any,
        };
      }

      return {
        id: p.id,
        name: p.name,
        key: p.key,
        status: p.status,
        myRole: myRole as ProjectRole,
        createdAt: p.createdAt,
        emoji: p.emoji,
        network: p.network,
        lead: leadUser,
        features: {
          cycles: p.featureCycles,
          modules: p.featureModules,
          views: p.featureViews,
          pages: p.featurePages,
          intake: p.featureIntake,
          timeTracking: p.featureTimeTracking,
        },
        stateStats: statsMap[p.id],
      } as any;
    });
  }

  /**
   * Xem chi tiết project theo ID
   */
  async findById(id: string, userId: string, systemRole: string): Promise<Project> {
    const project = await this.projectRepository.findOne({
      where: { id },
      relations: ['owner', 'members', 'members.user', 'lead', 'estimateConfig'],
    });

    if (!project) {
      throw new NotFoundException({
        statusCode: 404,
        error: 'Not Found',
        message: 'Project not found',
        errorCode: 'PROJECT_NOT_FOUND',
        timestamp: new Date().toISOString(),
      });
    }

    const isMember = project.members.some((m) => m.userId === userId);
    const isPublic = project.network === ProjectNetwork.PUBLIC;

    if (!isMember && !isPublic && systemRole !== 'Admin') {
      throw new NotFoundException({
        statusCode: 404,
        error: 'Not Found',
        message: 'Project not found',
        errorCode: 'PROJECT_NOT_FOUND',
        timestamp: new Date().toISOString(),
      });
    }

    // Query stateStats
    const stateStatsRaw = await this.dataSource.query(`
      SELECT ps.group as "group", COUNT(t.id) as "count"
      FROM project_states ps
      LEFT JOIN tasks t ON t.state_id = ps.id
      WHERE ps.project_id = $1
      GROUP BY ps.group
    `, [project.id]);

    const stateStats = {
      [StateGroup.BACKLOG]: 0,
      [StateGroup.UNSTARTED]: 0,
      [StateGroup.STARTED]: 0,
      [StateGroup.COMPLETED]: 0,
      [StateGroup.CANCELLED]: 0,
    };
    for (const row of stateStatsRaw) {
      stateStats[row.group as StateGroup] = parseInt(row.count, 10);
    }

    // Format fields
    project.stateStats = stateStats;
    project.features = {
      cycles: project.featureCycles,
      modules: project.featureModules,
      views: project.featureViews,
      pages: project.featurePages,
      intake: project.featureIntake,
      timeTracking: project.featureTimeTracking,
    } as any;

    if (project.members) {
      const member = project.members.find((m) => m.userId === userId);
      const myRole = member ? member.projectRole : (systemRole === 'Admin' ? 'Scrum_Master' : null);
      (project as any).myRole = myRole;
    }

    return project;
  }

  /**
   * Xem chi tiết project theo Key
   */
  async findByKey(key: string, userId: string, systemRole: string): Promise<Project> {
    const project = await this.projectRepository.findOne({
      where: { key: key.toUpperCase() },
      relations: ['owner', 'members', 'members.user', 'lead', 'estimateConfig'],
    });

    if (!project) {
      throw new NotFoundException({
        statusCode: 404,
        error: 'Not Found',
        message: 'Project not found',
        errorCode: 'PROJECT_NOT_FOUND',
        timestamp: new Date().toISOString(),
      });
    }

    const isMember = project.members.some((m) => m.userId === userId);
    const isPublic = project.network === ProjectNetwork.PUBLIC;

    if (!isMember && !isPublic && systemRole !== 'Admin') {
      throw new NotFoundException({
        statusCode: 404,
        error: 'Not Found',
        message: 'Project not found',
        errorCode: 'PROJECT_NOT_FOUND',
        timestamp: new Date().toISOString(),
      });
    }

    // Query stateStats
    const stateStatsRaw = await this.dataSource.query(`
      SELECT ps.group as "group", COUNT(t.id) as "count"
      FROM project_states ps
      LEFT JOIN tasks t ON t.state_id = ps.id
      WHERE ps.project_id = $1
      GROUP BY ps.group
    `, [project.id]);

    const stateStats = {
      [StateGroup.BACKLOG]: 0,
      [StateGroup.UNSTARTED]: 0,
      [StateGroup.STARTED]: 0,
      [StateGroup.COMPLETED]: 0,
      [StateGroup.CANCELLED]: 0,
    };
    for (const row of stateStatsRaw) {
      stateStats[row.group as StateGroup] = parseInt(row.count, 10);
    }

    // Format fields
    project.stateStats = stateStats;
    project.features = {
      cycles: project.featureCycles,
      modules: project.featureModules,
      views: project.featureViews,
      pages: project.featurePages,
      intake: project.featureIntake,
      timeTracking: project.featureTimeTracking,
    } as any;

    if (project.members) {
      const member = project.members.find((m) => m.userId === userId);
      const myRole = member ? member.projectRole : (systemRole === 'Admin' ? 'Scrum_Master' : null);
      (project as any).myRole = myRole;
    }

    return project;
  }

  /**
   * Cập nhật thông tin project
   */
  async update(
    id: string,
    userId: string,
    dto: UpdateProjectDto,
    systemRole: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<Project> {
    const project = await this.projectRepository.findOne({
      where: { id },
      relations: ['members'],
    });

    if (!project) {
      throw new NotFoundException({
        statusCode: 404,
        error: 'Not Found',
        message: 'Project not found',
        errorCode: 'PROJECT_NOT_FOUND',
        timestamp: new Date().toISOString(),
      });
    }

    const userMember = project.members.find((m) => m.userId === userId);
    const isScrumMaster = userMember?.projectRole === 'Scrum_Master';

    if (!isScrumMaster && systemRole !== 'Admin') {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Insufficient project role. Only Scrum Master or Admin can perform this action.',
        errorCode: 'INSUFFICIENT_PROJECT_ROLE',
        timestamp: new Date().toISOString(),
      });
    }

    // Validation
    if (dto.name !== undefined) project.name = dto.name;
    if (dto.description !== undefined) project.description = dto.description ?? null;
    if (dto.emoji !== undefined) {
      this.validateEmoji(dto.emoji);
      project.emoji = dto.emoji ?? null;
    }
    if (dto.network !== undefined) project.network = dto.network;
    if (dto.timezone !== undefined) {
      this.validateTimezone(dto.timezone);
      project.timezone = dto.timezone;
    }
    if (dto.leadId !== undefined) {
      if (dto.leadId !== null) {
        await this.validateLead(id, dto.leadId);
      }
      project.leadId = dto.leadId;
    }

    const updated = await this.projectRepository.save(project);

    // Ghi audit log
    this.auditService.log(
      AuthEvent.PROJECT_UPDATED,
      userId,
      ipAddress,
      userAgent,
      { projectId: id },
    );

    return this.findById(id, userId, systemRole);
  }

  /**
   * Cập nhật feature flags
   */
  async updateFeatures(
    id: string,
    userId: string,
    dto: UpdateFeaturesDto,
    systemRole: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<ProjectFeatures> {
    const project = await this.projectRepository.findOne({
      where: { id },
      relations: ['members'],
    });

    if (!project) {
      throw new NotFoundException({
        statusCode: 404,
        error: 'Not Found',
        message: 'Project not found',
        errorCode: 'PROJECT_NOT_FOUND',
        timestamp: new Date().toISOString(),
      });
    }

    const userMember = project.members.find((m) => m.userId === userId);
    const isScrumMaster = userMember?.projectRole === 'Scrum_Master';

    if (!isScrumMaster && systemRole !== 'Admin') {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Insufficient project role. Only Scrum Master or Admin can perform this action.',
        errorCode: 'INSUFFICIENT_PROJECT_ROLE',
        timestamp: new Date().toISOString(),
      });
    }

    if (dto.cycles !== undefined) project.featureCycles = dto.cycles;
    if (dto.modules !== undefined) project.featureModules = dto.modules;
    if (dto.views !== undefined) project.featureViews = dto.views;
    if (dto.pages !== undefined) project.featurePages = dto.pages;
    if (dto.intake !== undefined) project.featureIntake = dto.intake;
    if (dto.timeTracking !== undefined) project.featureTimeTracking = dto.timeTracking;

    await this.projectRepository.save(project);

    // Ghi audit log
    this.auditService.log(
      'project_features_updated' as any,
      userId,
      ipAddress,
      userAgent,
      { projectId: id },
    );

    return {
      cycles: project.featureCycles,
      modules: project.featureModules,
      views: project.featureViews,
      pages: project.featurePages,
      intake: project.featureIntake,
      timeTracking: project.featureTimeTracking,
    };
  }

  /**
   * User tự tham gia dự án public
   */
  async join(
    projectId: string,
    userId: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<{ role: ProjectRole; projectId: string }> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
      relations: ['members'],
    });

    if (!project) {
      throw new NotFoundException({
        statusCode: 404,
        error: 'Not Found',
        message: 'Project not found',
        errorCode: 'PROJECT_NOT_FOUND',
        timestamp: new Date().toISOString(),
      });
    }

    // Check network visibility
    if (project.network !== ProjectNetwork.PUBLIC) {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Cannot join a secret project. You must be invited.',
        errorCode: 'SECRET_PROJECT_JOIN_DENIED',
        timestamp: new Date().toISOString(),
      });
    }

    // Check if already a member
    const existingMember = project.members.find((m) => m.userId === userId);
    if (existingMember) {
      throw new ConflictException({
        statusCode: 409,
        error: 'Conflict',
        message: 'You are already a member of this project',
        errorCode: 'PROJECT_MEMBER_EXISTS',
        timestamp: new Date().toISOString(),
      });
    }

    // Add member
    const projectMember = this.projectMemberRepository.create({
      userId,
      projectId,
      projectRole: 'Developer',
    });
    await this.projectMemberRepository.save(projectMember);

    // Audit log
    this.auditService.log(
      'member_joined_public' as any,
      userId,
      ipAddress,
      userAgent,
      { projectId },
    );

    return {
      role: 'Developer',
      projectId,
    };
  }

  private async validateLead(projectId: string, leadId: string): Promise<void> {
    const isMember = await this.projectMemberRepository.findOne({
      where: { projectId, userId: leadId },
    });
    if (!isMember) {
      throw new UnprocessableEntityException({
        statusCode: 422,
        error: 'Unprocessable Entity',
        message: 'Project lead must be a member of the project',
        errorCode: 'LEAD_NOT_MEMBER',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Archive project
   */
  async archive(
    id: string,
    userId: string,
    systemRole: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<Project> {
    const project = await this.projectRepository.findOne({
      where: { id },
      relations: ['members'],
    });

    if (!project) {
      throw new NotFoundException({
        statusCode: 404,
        error: 'Not Found',
        message: 'Project not found',
        errorCode: 'PROJECT_NOT_FOUND',
        timestamp: new Date().toISOString(),
      });
    }

    const userMember = project.members.find((m) => m.userId === userId);
    const isScrumMaster = userMember?.projectRole === 'Scrum_Master';

    if (!isScrumMaster && systemRole !== 'Admin') {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Insufficient project role. Only Scrum Master or Admin can perform this action.',
        errorCode: 'INSUFFICIENT_PROJECT_ROLE',
        timestamp: new Date().toISOString(),
      });
    }

    project.status = 'archived';
    project.archivedAt = new Date();
    await this.projectRepository.save(project);

    // Ghi audit log
    this.auditService.log(
      AuthEvent.PROJECT_ARCHIVED,
      userId,
      ipAddress,
      userAgent,
      { projectId: id },
    );

    return this.findById(id, userId, systemRole);
  }

  /**
   * Xóa project vĩnh viễn
   */
  async delete(
    id: string,
    userId: string,
    systemRole: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<void> {
    const project = await this.projectRepository.findOne({
      where: { id },
      relations: ['members'],
    });

    if (!project) {
      throw new NotFoundException({
        statusCode: 404,
        error: 'Not Found',
        message: 'Project not found',
        errorCode: 'PROJECT_NOT_FOUND',
        timestamp: new Date().toISOString(),
      });
    }

    const userMember = project.members.find((m) => m.userId === userId);
    const isScrumMaster = userMember?.projectRole === 'Scrum_Master';

    if (!isScrumMaster && systemRole !== 'Admin') {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Insufficient project role. Only Scrum Master or Admin can perform this action.',
        errorCode: 'INSUFFICIENT_PROJECT_ROLE',
        timestamp: new Date().toISOString(),
      });
    }

    await this.projectRepository.remove(project);

    // Ghi audit log
    this.auditService.log(
      AuthEvent.PROJECT_DELETED,
      userId,
      ipAddress,
      userAgent,
      { projectId: id },
    );
  }

  /**
   * Bulk delete nhiều projects
   */
  async bulkDelete(
    ids: string[],
    userId: string,
    systemRole: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<{ deleted: string[]; failed: { id: string; reason: string }[] }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const deleted: string[] = [];
      for (const id of ids) {
        const project = await queryRunner.manager.findOne(Project, {
          where: { id },
          relations: ['members'],
        });

        if (!project) {
          throw new Error(`Project ${id} not found`);
        }

        const userMember = project.members.find((m) => m.userId === userId);
        const isScrumMaster = userMember?.projectRole === 'Scrum_Master';

        if (!isScrumMaster && systemRole !== 'Admin') {
          throw new Error(`Project ${id} - Insufficient project role`);
        }

        await queryRunner.manager.remove(Project, project);

        // Ghi audit log
        this.auditService.log(
          AuthEvent.PROJECT_DELETED,
          userId,
          ipAddress,
          userAgent,
          { projectId: id },
        );

        deleted.push(id);
      }

      await queryRunner.commitTransaction();
      return { deleted, failed: [] };
    } catch (error: any) {
      await queryRunner.rollbackTransaction();
      return {
        deleted: [],
        failed: ids.map((id) => ({
          id,
          reason: error.message || 'Unknown error during bulk delete',
        })),
      };
    } finally {
      await queryRunner.release();
    }
  }
}
